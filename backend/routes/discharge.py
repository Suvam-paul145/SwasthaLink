"""Discharge processing, quiz, and file upload routes."""

import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from models import (
    ProcessRequest, ProcessResponse,
    QuizSubmitRequest, QuizSubmitResponse,
    UploadResponse,
)
from services.gemini_service import process_discharge_summary, extract_text_from_image
from services.s3_service import upload_file
from services.rate_alert_service import rate_alert_service
from core.exceptions import GeminiServiceError, S3ServiceError
from db.supabase_service import (
    log_session, persist_session_history, append_session_event,
    update_session_quiz_score, generate_session_id, save_discharge_result,
    get_patient_discharge_history,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/process", response_model=ProcessResponse)
async def process_summary(request: ProcessRequest):
    """Core endpoint: Simplify discharge summary using Gemini AI."""
    try:
        if len(request.discharge_text.strip()) < 50:
            raise HTTPException(status_code=400, detail="Discharge summary too short — minimum 50 characters required")

        logger.info(f"Processing discharge summary (role: {request.role}, language: {request.language})")
        session_id = generate_session_id()

        result = await process_discharge_summary(
            text=request.discharge_text, role=request.role.value,
            language=request.language.value, re_explain=request.re_explain,
            previous_simplified=request.previous_simplified,
        )
        rate_alert_service.track_usage("gemini", context="/api/process")
        from services.risk_scoring import compute_risk_score
        
        # Calculate worst-case baseline risk score since the quiz has not been taken yet (quiz_score = 0)
        r_score, r_level = compute_risk_score(
            quiz_score=0,
            medication_count=len(result.medications),
            role=request.role.value,
            warning_count=len(result.warning_signs)
        )
        
        result.risk_score = r_score
        result.risk_level = r_level
        result.session_id = session_id

        if request.patient_id:
            try:
                await save_discharge_result(
                    patient_id=request.patient_id,
                    doctor_id=request.doctor_id,
                    gemini_result=result.model_dump(by_alias=True)
                )
            except Exception as e:
                logger.warning(f"Failed to save discharge result to Supabase: {e}")

        try:
            await log_session(role=request.role.value, language=request.language.value,
                              session_id=session_id, log_format="text")
            rate_alert_service.track_usage("supabase", context="log_session:/api/process")
            await persist_session_history(
                session_id=session_id, role=request.role.value, language=request.language.value,
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
        raise HTTPException(status_code=getattr(e, "status_code", 500), detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing summary: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/api/quiz/submit", response_model=QuizSubmitResponse)
async def submit_quiz(request: QuizSubmitRequest):
    """Submit quiz answers and get score."""
    try:
        score = sum(1 for u, c in zip(request.answers, request.correct_answers) if u.upper() == c.upper())
        passed = score >= 2
        needs_re_explain = score < 2
        feedback_messages = {
            3: "Excellent! You understand your discharge instructions perfectly. 🎉",
            2: "Good job! You understand most of it. Review a few points. ✅",
            1: "Let's try explaining this differently. Don't worry, we'll make it clearer! 💪",
            0: "No worries — we'll explain this in simpler words. Your health is important! ❤️",
        }
        feedback = feedback_messages.get(score, "Quiz completed.")

        try:
            await update_session_quiz_score(session_id=request.session_id, quiz_score=score, re_explained=needs_re_explain)
            rate_alert_service.track_usage("supabase", context="update_session_quiz_score")
            await append_session_event(session_id=request.session_id, event_type="quiz_submitted",
                                       event_data={"score": score, "out_of": 3, "passed": passed, "needs_re_explain": needs_re_explain})
            rate_alert_service.track_usage("supabase", context="append_session_event:quiz")
        except Exception as e:
            logger.warning(f"Quiz score logging failed (non-critical): {e}")

        logger.info(f"Quiz submitted. Session: {request.session_id}, Score: {score}/3")
        return QuizSubmitResponse(score=score, out_of=3, passed=passed, needs_re_explain=needs_re_explain, feedback=feedback)

    except Exception as e:
        logger.error(f"Error submitting quiz: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to submit quiz: {str(e)}")


@router.post("/api/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...), session_id: str = Form(None)):
    """Upload PDF/image for OCR extraction."""
    try:
        allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, JPG, PNG")

        if not session_id:
            session_id = generate_session_id()

        logger.info(f"Uploading file: {file.filename} ({file.content_type})")
        file_content = await file.read()

        try:
            s3_result = await upload_file(file_content=file_content, filename=file.filename,
                                          session_id=session_id, content_type=file.content_type)
            logger.info(f"File uploaded to S3: {s3_result.get('s3_key')}")
            rate_alert_service.track_usage("s3", context="/api/upload")
        except S3ServiceError as e:
            logger.warning(f"S3 upload failed (non-critical): {e}")

        extracted_text = await extract_text_from_image(image_data=file_content, mime_type=file.content_type)
        rate_alert_service.track_usage("gemini", context="extract_text_from_image:/api/upload")

        file_type_map = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png"}
        file_type = file_type_map.get(file.content_type, "unknown")

        logger.info(f"Text extracted successfully: {len(extracted_text)} characters")
        return UploadResponse(extracted_text=extracted_text, file_type=file_type, session_id=session_id)

    except GeminiServiceError as e:
        logger.error(f"OCR extraction failed: {e}")
        raise HTTPException(
            status_code=getattr(e, "status_code", 500),
            detail=f"Failed to extract text: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error uploading file: {e}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@router.get("/api/patient/{patient_id}/history")
async def get_patient_history(patient_id: str):
    """Get history of discharge results for a patient."""
    try:
        result = await get_patient_discharge_history(patient_id=patient_id, limit=50)
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to fetch patient history"))
        return {"patient_id": patient_id, "history": result.get("history", [])}
    except Exception as e:
        logger.error(f"Error fetching patient history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
