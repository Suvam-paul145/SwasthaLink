"""
SwasthaLink Backend API
FastAPI application with all routes and CORS configuration
"""

import os
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Import models
from models import (
    ProcessRequest,
    ProcessResponse,
    WhatsAppRequest,
    WhatsAppResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
    HealthResponse,
    UploadResponse,
    # Prescription RAG models
    PrescriptionExtractResponse,
    PrescriptionApproveRequest,
    PrescriptionRejectRequest,
    PrescriptionPatientViewResponse,
)

# Import services
from gemini_service import (
    process_discharge_summary,
    extract_text_from_image,
    check_gemini_health,
    GeminiServiceError
)
from twilio_service import (
    send_whatsapp_message,
    check_twilio_health,
    get_sandbox_instructions,
    TwilioServiceError
)
from supabase_service import (
    log_session,
    persist_session_history,
    append_session_event,
    get_session_history,
    list_recent_histories,
    update_session_quiz_score,
    update_session_whatsapp_status,
    get_session_count,
    get_analytics,
    generate_session_id,
    check_supabase_health
)
from s3_service import (
    upload_file,
    check_s3_health,
    S3ServiceError
)
from rate_alert_service import rate_alert_service

# Prescription RAG service
from prescription_rag_service import (
    extract_prescription_data,
    create_prescription_record,
    list_pending_records,
    approve_record,
    reject_record,
    get_record,
    get_approved_record,
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SwasthaLink API",
    description="Medical discharge summary simplification with bilingual output and WhatsApp delivery",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://swasthalink.vercel.app")
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative dev server
    "http://127.0.0.1:5173",
    FRONTEND_URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "service": "SwasthaLink API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/api/health"
    }


# Health check endpoint
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """
    Comprehensive health check for all services
    Used by UptimeRobot to prevent cold starts
    """
    # Check all services
    gemini_health = check_gemini_health()
    twilio_health = check_twilio_health()
    supabase_health = check_supabase_health()
    s3_health = check_s3_health()

    # Determine overall status
    all_ok = all(
        check.get("status") == "ok"
        for check in [gemini_health, twilio_health, supabase_health, s3_health]
    )

    # Critical services: Gemini (required for core functionality)
    critical_ok = gemini_health.get("status") == "ok"

    if critical_ok and all_ok:
        status = "ok"
    elif critical_ok:
        status = "degraded"  # Some non-critical services down
    else:
        status = "down"  # Critical services down

    return HealthResponse(
        status=status,
        service="SwasthaLink",
        version="1.0.0",
        checks={
            "gemini": gemini_health,
            "twilio": twilio_health,
            "supabase": supabase_health,
            "s3": s3_health
        }
    )


# Main processing endpoint
@app.post("/api/process", response_model=ProcessResponse)
async def process_summary(request: ProcessRequest):
    """
    Core endpoint: Simplify discharge summary using Gemini AI

    - Accepts clinical discharge text
    - Returns bilingual simplified output
    - Includes medication list, follow-up, warning signs
    - Generates 3 comprehension MCQs
    - Creates WhatsApp-formatted message
    """
    try:
        # Validate input
        if len(request.discharge_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Discharge summary too short — minimum 50 characters required"
            )

        logger.info(f"Processing discharge summary (role: {request.role}, language: {request.language})")

        # Generate session ID
        session_id = generate_session_id()

        # Process with Gemini
        result = await process_discharge_summary(
            text=request.discharge_text,
            role=request.role.value,
            language=request.language.value,
            re_explain=request.re_explain,
            previous_simplified=request.previous_simplified
        )
        rate_alert_service.track_usage("gemini", context="/api/process")

        # Add session ID to response
        result.session_id = session_id

        # Log session to Supabase (non-blocking)
        try:
            await log_session(
                role=request.role.value,
                language=request.language.value,
                session_id=session_id,
                log_format="text"
            )
            rate_alert_service.track_usage("supabase", context="log_session:/api/process")

            # Persist full session history for continuity
            await persist_session_history(
                session_id=session_id,
                role=request.role.value,
                language=request.language.value,
                discharge_text=request.discharge_text,
                process_response=result.model_dump(by_alias=True),
                re_explain=request.re_explain,
            )
            rate_alert_service.track_usage("supabase", context="persist_session_history:/api/process")
        except Exception as e:
            logger.warning(f"Session logging failed (non-critical): {e}")

        logger.info(f"Successfully processed summary. Session ID: {session_id}")

        return result

    except GeminiServiceError as e:
        logger.error(f"Gemini service error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Unexpected error processing summary: {e}")
        logger.exception(e)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# WhatsApp send endpoint
@app.post("/api/send-whatsapp", response_model=WhatsAppResponse)
async def send_whatsapp(request: WhatsAppRequest):
    """
    Send simplified summary to WhatsApp via Twilio

    - Requires phone number in E.164 format (+919876543210)
    - Supports WhatsApp formatting (*bold*, _italic_, emojis)
    - Returns delivery status and Twilio message SID
    """
    try:
        logger.info(f"Sending WhatsApp message to {request.phone_number}")

        # Send message
        result = await send_whatsapp_message(request.phone_number, request.message)

        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "WhatsApp delivery failed")
            )
        rate_alert_service.track_usage("twilio", context="/api/send-whatsapp")

        logger.info(f"WhatsApp message sent successfully. SID: {result.get('sid')}")

        # Persist event for timeline history
        if request.session_id:
            await append_session_event(
                session_id=request.session_id,
                event_type="whatsapp_sent",
                event_data={"sid": result.get("sid"), "status": result.get("status"), "to": request.phone_number}
            )
            await update_session_whatsapp_status(session_id=request.session_id, whatsapp_sent=True)
            rate_alert_service.track_usage("supabase", context="append_session_event:whatsapp")

        return WhatsAppResponse(
            status="sent",
            message="Message delivered successfully",
            sid=result.get("sid")
        )

    except TwilioServiceError as e:
        logger.error(f"Twilio service error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Unexpected error sending WhatsApp: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send WhatsApp message: {str(e)}")


# Quiz submission endpoint
@app.post("/api/quiz/submit", response_model=QuizSubmitResponse)
async def submit_quiz(request: QuizSubmitRequest):
    """
    Submit quiz answers and get score

    - Compares user answers with correct answers
    - Calculates score (0-3)
    - Determines if passed (score >= 2)
    - Triggers re-explanation if score < 2
    - Updates session in Supabase
    """
    try:
        # Calculate score
        score = sum(
            1 for user_ans, correct_ans in zip(request.answers, request.correct_answers)
            if user_ans.upper() == correct_ans.upper()
        )

        # Determine pass/fail
        passed = score >= 2
        needs_re_explain = score < 2

        # Feedback messages
        feedback_messages = {
            3: "Excellent! You understand your discharge instructions perfectly. 🎉",
            2: "Good job! You understand most of it. Review a few points. ✅",
            1: "Let's try explaining this differently. Don't worry, we'll make it clearer! 💪",
            0: "No worries — we'll explain this in simpler words. Your health is important! ❤️"
        }

        feedback = feedback_messages.get(score, "Quiz completed.")

        # Update session in Supabase (non-blocking)
        try:
            await update_session_quiz_score(
                session_id=request.session_id,
                quiz_score=score,
                re_explained=needs_re_explain
            )
            rate_alert_service.track_usage("supabase", context="update_session_quiz_score")

            await append_session_event(
                session_id=request.session_id,
                event_type="quiz_submitted",
                event_data={
                    "score": score,
                    "out_of": 3,
                    "passed": passed,
                    "needs_re_explain": needs_re_explain,
                }
            )
            rate_alert_service.track_usage("supabase", context="append_session_event:quiz")
        except Exception as e:
            logger.warning(f"Quiz score logging failed (non-critical): {e}")

        logger.info(f"Quiz submitted. Session: {request.session_id}, Score: {score}/3")

        return QuizSubmitResponse(
            score=score,
            out_of=3,
            passed=passed,
            needs_re_explain=needs_re_explain,
            feedback=feedback
        )

    except Exception as e:
        logger.error(f"Error submitting quiz: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit quiz: {str(e)}")


# File upload endpoint (Phase 7 - Post-MVP)
@app.post("/api/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Form(None)
):
    """
    Upload PDF/image for OCR extraction (Phase 7 - Post-MVP)

    - Accepts PDF, JPG, PNG files
    - Uses Gemini Vision for OCR
    - Stores file in S3 with 24-hour auto-delete
    - Returns extracted text
    """
    try:
        # Validate file type
        allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, JPG, PNG"
            )

        # Generate session ID if not provided
        if not session_id:
            session_id = generate_session_id()

        logger.info(f"Uploading file: {file.filename} ({file.content_type})")

        # Read file content
        file_content = await file.read()

        # Upload to S3 (optional - for audit trail)
        try:
            s3_result = await upload_file(
                file_content=file_content,
                filename=file.filename,
                session_id=session_id,
                content_type=file.content_type
            )
            logger.info(f"File uploaded to S3: {s3_result.get('s3_key')}")
            rate_alert_service.track_usage("s3", context="/api/upload")
        except S3ServiceError as e:
            logger.warning(f"S3 upload failed (non-critical): {e}")

        # Extract text using Gemini Vision
        extracted_text = await extract_text_from_image(
            image_data=file_content,
            mime_type=file.content_type
        )
        rate_alert_service.track_usage("gemini", context="extract_text_from_image:/api/upload")

        # Determine file type label
        file_type_map = {
            "application/pdf": "pdf",
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/png": "png"
        }
        file_type = file_type_map.get(file.content_type, "unknown")

        logger.info(f"Text extracted successfully: {len(extracted_text)} characters")

        return UploadResponse(
            extracted_text=extracted_text,
            file_type=file_type,
            session_id=session_id
        )

    except GeminiServiceError as e:
        logger.error(f"OCR extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Unexpected error uploading file: {e}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


# Analytics endpoint (Post-MVP)
@app.get("/api/analytics")
async def get_analytics_data():
    """
    Get aggregated analytics data

    - Total sessions processed
    - Breakdown by role and language
    - WhatsApp delivery rate
    - Average quiz score
    - Re-explanation rate
    """
    try:
        analytics = await get_analytics()
        return analytics

    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")


@app.get("/api/rate-alerts/status")
async def get_rate_alert_status():
    """Get current rate usage counters and threshold status"""
    return rate_alert_service.get_status()


@app.get("/api/sessions/{session_id}/history")
async def get_persisted_session_history(session_id: str):
    """Get full persisted history for a session"""
    history = await get_session_history(session_id)
    if not history.get("success"):
        raise HTTPException(status_code=404, detail=history.get("error", "Session history not found"))
    return history


@app.get("/api/sessions/history/recent")
async def get_recent_session_histories(limit: int = 20):
    """List recent persisted session histories"""
    safe_limit = min(max(limit, 1), 100)
    data = await list_recent_histories(safe_limit)
    return {"count": len(data), "items": data}


# Session count endpoint
@app.get("/api/sessions/count")
async def get_sessions_count():
    """
    Get total number of sessions processed
    Used for live counter in frontend
    """
    try:
        count = await get_session_count()
        return {"total_sessions": count}

    except Exception as e:
        logger.error(f"Error fetching session count: {e}")
        return {"total_sessions": 0}


# Twilio sandbox instructions endpoint
@app.get("/api/whatsapp/sandbox-instructions")
async def whatsapp_sandbox_info():
    """
    Get instructions for joining Twilio WhatsApp sandbox
    Useful for development and testing
    """
    return {
        "instructions": get_sandbox_instructions(),
        "sandbox_number": os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
    }


# ---------------------------------------------------------------------------
# Prescription RAG pipeline endpoints
# ---------------------------------------------------------------------------

@app.post("/api/prescriptions/extract", response_model=PrescriptionExtractResponse)
async def extract_prescription(
    file: UploadFile = File(...),
    doctor_id: str = Form(...),
):
    """
    Extract structured information from a handwritten prescription.

    Doctor uploads an image or PDF. The endpoint:
    1. Validates the file type.
    2. Runs OCR via Gemini Vision.
    3. Runs RAG extraction to identify doctor name, patient details and medications.
    4. Creates a pending-admin-review record.
    """
    try:
        allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, JPG, PNG",
            )

        if not doctor_id or not doctor_id.strip():
            raise HTTPException(status_code=400, detail="doctor_id is required")

        logger.info(f"Prescription upload by doctor {doctor_id}: {file.filename}")

        file_content = await file.read()

        # Optional S3 storage for audit trail
        s3_key: Optional[str] = None
        try:
            s3_result = await upload_file(
                file_content=file_content,
                filename=file.filename,
                session_id=f"rx_{doctor_id}",
                content_type=file.content_type,
            )
            s3_key = s3_result.get("s3_key")
            rate_alert_service.track_usage("s3", context="/api/prescriptions/extract")
        except S3ServiceError as exc:
            logger.warning(f"S3 upload failed (non-critical): {exc}")

        # OCR
        ocr_text = await extract_text_from_image(
            image_data=file_content,
            mime_type=file.content_type,
        )
        rate_alert_service.track_usage("gemini", context="ocr:/api/prescriptions/extract")

        # RAG extraction
        extracted_data = await extract_prescription_data(ocr_text)
        rate_alert_service.track_usage("gemini", context="rag:/api/prescriptions/extract")

        # Persist record
        record = create_prescription_record(
            extracted_data=extracted_data,
            doctor_id=doctor_id.strip(),
            s3_key=s3_key,
        )

        logger.info(f"Prescription record created: {record.prescription_id}")

        return PrescriptionExtractResponse(
            prescription_id=record.prescription_id,
            status=record.status.value,
            extracted_data=record.extracted_data,
        )

    except GeminiServiceError as exc:
        logger.error(f"Gemini error during prescription extraction: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

    except HTTPException:
        raise

    except Exception as exc:
        logger.error(f"Unexpected error during prescription extraction: {exc}")
        logger.exception(exc)
        raise HTTPException(status_code=500, detail=f"Prescription extraction failed: {str(exc)}")


@app.get("/api/prescriptions/pending")
async def get_pending_prescriptions():
    """
    List all prescriptions awaiting admin review.

    Returns a list of pending records so the admin can inspect extracted
    data and approve or reject each one.
    """
    try:
        records = list_pending_records()
        return {
            "count": len(records),
            "items": [r.model_dump() for r in records],
        }
    except Exception as exc:
        logger.error(f"Error fetching pending prescriptions: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending prescriptions")


@app.post("/api/prescriptions/{prescription_id}/approve")
async def approve_prescription(
    prescription_id: str,
    request: PrescriptionApproveRequest,
):
    """
    Admin approves a pending prescription.

    The record is marked as approved and becomes visible to the patient
    via the patient-view endpoint.
    """
    try:
        record = approve_record(prescription_id, request.admin_id)
        if record is None:
            raise HTTPException(
                status_code=404,
                detail=f"Prescription {prescription_id} not found",
            )
        logger.info(f"Prescription {prescription_id} approved by admin {request.admin_id}")
        return {
            "prescription_id": record.prescription_id,
            "status": record.status.value,
            "reviewed_at": record.reviewed_at,
            "message": "Prescription approved and delivered to patient",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error approving prescription {prescription_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to approve prescription")


@app.post("/api/prescriptions/{prescription_id}/reject")
async def reject_prescription(
    prescription_id: str,
    request: PrescriptionRejectRequest,
):
    """
    Admin rejects a pending prescription with a reason.

    The record is marked as rejected and is not accessible via the
    patient-view endpoint.
    """
    try:
        record = reject_record(prescription_id, request.admin_id, request.reason)
        if record is None:
            raise HTTPException(
                status_code=404,
                detail=f"Prescription {prescription_id} not found",
            )
        logger.info(f"Prescription {prescription_id} rejected by admin {request.admin_id}")
        return {
            "prescription_id": record.prescription_id,
            "status": record.status.value,
            "reviewed_at": record.reviewed_at,
            "rejection_reason": record.rejection_reason,
            "message": "Prescription rejected",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error rejecting prescription {prescription_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to reject prescription")


@app.get(
    "/api/prescriptions/{prescription_id}/patient-view",
    response_model=PrescriptionPatientViewResponse,
)
async def get_patient_prescription_view(prescription_id: str):
    """
    Return an approved prescription in patient-readable format.

    Only approved prescriptions are accessible here.  Pending or rejected
    records return 404 / 403 respectively so patients never see unreviewed
    data.
    """
    try:
        # Use public API to check record existence and status
        raw = get_record(prescription_id)
        if raw is None:
            raise HTTPException(status_code=404, detail="Prescription not found")

        if raw.status.value == "pending_admin_review":
            raise HTTPException(
                status_code=403,
                detail="Prescription is awaiting admin approval",
            )
        if raw.status.value == "rejected":
            raise HTTPException(
                status_code=403,
                detail="Prescription was rejected by admin",
            )

        record = get_approved_record(prescription_id)
        if record is None:
            raise HTTPException(status_code=403, detail="Prescription is not approved")

        data = record.extracted_data
        return PrescriptionPatientViewResponse(
            prescription_id=record.prescription_id,
            doctor_name=data.doctor_name or "Your doctor",
            patient_name=data.patient_name or "Patient",
            patient_age=data.patient_age,
            prescription_date=data.prescription_date,
            diagnosis=data.diagnosis,
            medications=data.medications,
            notes=data.notes,
            approved_at=record.reviewed_at,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error fetching patient view for {prescription_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to retrieve prescription")


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {exc}")
    logger.exception(exc)

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if os.getenv("DEBUG") == "true" else "An unexpected error occurred"
        }
    )


# Startup event
@app.on_event("startup")
async def startup_event():
    """Log startup information"""
    logger.info("=" * 50)
    logger.info("SwasthaLink API Starting...")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"Frontend URL: {FRONTEND_URL}")
    logger.info("=" * 50)

    # Check service health
    gemini_health = check_gemini_health()
    logger.info(f"Gemini API: {gemini_health.get('status')}")

    twilio_health = check_twilio_health()
    logger.info(f"Twilio API: {twilio_health.get('status')}")

    supabase_health = check_supabase_health()
    logger.info(f"Supabase: {supabase_health.get('status')}")

    s3_health = check_s3_health()
    logger.info(f"AWS S3: {s3_health.get('status')}")

    logger.info("=" * 50)


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Log shutdown information"""
    logger.info("SwasthaLink API shutting down...")


# Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        log_level="info"
    )
