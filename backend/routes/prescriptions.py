"""Prescription RAG pipeline routes."""

import json
import logging
import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from models import (
    PrescriptionExtractResponse, PrescriptionApproveRequest,
    PrescriptionRejectRequest, PrescriptionPatientViewResponse,
    PrescriptionEscalateRequest,
)
from services.gemini_service import extract_text_from_image
from services.s3_service import upload_file
from services.rate_alert_service import rate_alert_service
from services.image_preprocessor import preprocess_image
from services.prescription_rag_service import (
    extract_prescription_data, create_prescription_record,
    list_pending_records, approve_record, reject_record, escalate_record,
    get_record, get_approved_record,
    list_records_by_doctor, list_approved_for_patient,
)
from core.exceptions import GeminiServiceError, S3ServiceError

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/patients")
async def list_patients():
    """Return all registered patients (used by Doctor Panel patient dropdown)."""
    try:
        from db.supabase_service import supabase_client
        if not supabase_client:
            return {"count": 0, "items": []}
        result = (
            supabase_client
            .table("profiles")
            .select("*")
            .eq("role", "patient")
            .execute()
        )
        rows = result.data or []
        return {"count": len(rows), "items": rows}
    except Exception as exc:
        logger.error(f"Error listing patients: {exc}")
        return {"count": 0, "items": []}


@router.get("/api/prescriptions/by-doctor/{doctor_id}")
async def get_prescriptions_by_doctor(doctor_id: str):
    """Return all prescriptions uploaded by a specific doctor."""
    try:
        records = await list_records_by_doctor(doctor_id)
        return {"count": len(records), "items": [r.model_dump() for r in records]}
    except Exception as exc:
        logger.error(f"Error fetching doctor prescriptions: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch prescriptions")


@router.get("/api/prescriptions/for-patient/{patient_id}")
async def get_prescriptions_for_patient(patient_id: str):
    """Return all approved prescriptions for a patient."""
    try:
        records = await list_approved_for_patient(patient_id)
        return {"count": len(records), "items": [r.model_dump() for r in records]}
    except Exception as exc:
        logger.error(f"Error fetching patient prescriptions: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch prescriptions")


@router.post("/api/prescriptions/extract", response_model=PrescriptionExtractResponse)
async def extract_prescription(
    file: UploadFile = File(...),
    doctor_id: str = Form(...),
    patient_id: str = Form(None),
    report_type: str = Form("prescription"),
    linked_prescription_id: str = Form(None),
):
    """Extract structured information from a handwritten prescription."""
    try:
        allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, JPG, PNG")
        if not doctor_id or not doctor_id.strip():
            raise HTTPException(status_code=400, detail="doctor_id is required")

        logger.info(f"Prescription upload by doctor {doctor_id}: {file.filename} (type={report_type})")
        file_content = await file.read()

        # --- Image preprocessing (OpenCV + Pillow) (Asynchronous wrapped) ---
        preprocessed_content = await asyncio.to_thread(
            preprocess_image,
            image_data=file_content,
            mime_type=file.content_type,
            apply_clahe=True,
            apply_denoise=True,
            apply_binarize=False,
        )

        s3_key: Optional[str] = None
        try:
            s3_result = await upload_file(file_content=file_content, filename=file.filename,
                                          session_id=f"rx_{doctor_id}", content_type=file.content_type)
            s3_key = s3_result.get("s3_key")
            rate_alert_service.track_usage("s3", context="/api/prescriptions/extract")
        except S3ServiceError as exc:
            logger.warning(f"S3 upload failed (non-critical): {exc}")

        # --- OCR extraction with preprocessed image ---
        ocr_text = await extract_text_from_image(image_data=preprocessed_content, mime_type="image/jpeg")
        rate_alert_service.track_usage("gemini", context="ocr:/api/prescriptions/extract")

        # --- RAG structured extraction ---
        extracted_data = await extract_prescription_data(ocr_text)
        rate_alert_service.track_usage("gemini", context="rag:/api/prescriptions/extract")

        # Override report_type from form field
        extracted_data.report_type = report_type or "prescription"

        # If patient_id provided via form, set it on extracted data
        if patient_id and patient_id.strip():
            extracted_data.patient_id = patient_id.strip()

        record = await create_prescription_record(
            extracted_data=extracted_data,
            doctor_id=doctor_id.strip(),
            s3_key=s3_key,
            linked_prescription_id=linked_prescription_id,
        )
        logger.info(f"Prescription record created: {record.prescription_id} (type={report_type})")

        return PrescriptionExtractResponse(
            prescription_id=record.prescription_id, status=record.status.value, extracted_data=record.extracted_data,
        )
    except GeminiServiceError as exc:
        logger.error(f"Gemini error during prescription extraction: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Unexpected error during prescription extraction: {exc}")
        raise HTTPException(status_code=500, detail=f"Prescription extraction failed: {str(exc)}")


@router.get("/api/prescriptions/pending")
async def get_pending_prescriptions():
    """List all prescriptions awaiting admin review."""
    try:
        records = await list_pending_records()
        return {"count": len(records), "items": [r.model_dump() for r in records]}
    except Exception as exc:
        logger.error(f"Error fetching pending prescriptions: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending prescriptions")


@router.get("/api/prescriptions/all")
async def get_all_prescriptions():
    """Admin: list ALL prescriptions (pending + approved + rejected)."""
    try:
        from db.supabase_service import supabase_client
        if not supabase_client:
            return {"count": 0, "items": []}
        result = (
            supabase_client
            .table("prescriptions")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        rows = result.data or []
        return {"count": len(rows), "items": rows}
    except Exception as exc:
        logger.error(f"Error fetching all prescriptions: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch prescriptions")


@router.post("/api/prescriptions/{prescription_id}/approve")
async def approve_prescription(prescription_id: str, request: PrescriptionApproveRequest):
    """Admin approves a pending prescription and triggers patient insights generation."""
    try:
        record = await approve_record(prescription_id, request.admin_id)
        if record is None:
            raise HTTPException(status_code=404, detail=f"Prescription {prescription_id} not found")
        logger.info(f"Prescription {prescription_id} approved by admin {request.admin_id}")

        # --- Generate patient insights on approval ---
        try:
            from services.patient_insights_service import generate_patient_insights
            insights = await generate_patient_insights(record.extracted_data)
            if insights:
                # Persist insights to DB
                from db.supabase_service import supabase_client
                if supabase_client:
                    supabase_client.table("prescriptions").update({
                        "patient_insights": json.dumps(insights) if isinstance(insights, dict) else insights,
                    }).eq("prescription_id", prescription_id).execute()
                    logger.info(f"Patient insights saved for {prescription_id}")
        except Exception as insights_exc:
            logger.warning(f"Insights generation failed (non-critical): {insights_exc}")

        return {"prescription_id": record.prescription_id, "status": record.status.value,
                "reviewed_at": record.reviewed_at, "message": "Prescription approved and delivered to patient"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error approving prescription {prescription_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to approve prescription")


@router.post("/api/prescriptions/{prescription_id}/reject")
async def reject_prescription(prescription_id: str, request: PrescriptionRejectRequest):
    """Admin rejects a pending prescription with a reason."""
    try:
        record = await reject_record(prescription_id, request.admin_id, request.reason)
        if record is None:
            raise HTTPException(status_code=404, detail=f"Prescription {prescription_id} not found")
        logger.info(f"Prescription {prescription_id} rejected by admin {request.admin_id}")
        return {"prescription_id": record.prescription_id, "status": record.status.value,
                "reviewed_at": record.reviewed_at, "rejection_reason": record.rejection_reason,
                "message": "Prescription rejected"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error rejecting prescription {prescription_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to reject prescription")


@router.post("/api/prescriptions/{prescription_id}/escalate")
async def escalate_prescription(prescription_id: str, request: PrescriptionEscalateRequest):
    """Admin escalates a pending prescription back to doctor for clarification."""
    try:
        record = await escalate_record(prescription_id, request.admin_id, request.reason)
        if record is None:
            raise HTTPException(status_code=404, detail=f"Prescription {prescription_id} not found")
        logger.info(f"Prescription {prescription_id} escalated to doctor by admin {request.admin_id}")
        return {"prescription_id": record.prescription_id, "status": record.status.value,
                "reviewed_at": record.reviewed_at, "rejection_reason": record.rejection_reason,
                "message": "Prescription escalated to doctor"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error escalating prescription {prescription_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to escalate prescription")


@router.get("/api/prescriptions/{prescription_id}/patient-view", response_model=PrescriptionPatientViewResponse)
async def get_patient_prescription_view(prescription_id: str):
    """Return an approved prescription in patient-readable format with insights."""
    try:
        raw = await get_record(prescription_id)
        if raw is None:
            raise HTTPException(status_code=404, detail="Prescription not found")
        if raw.status.value == "pending_admin_review":
            raise HTTPException(status_code=403, detail="Prescription is awaiting admin approval")
        if raw.status.value == "rejected":
            raise HTTPException(status_code=403, detail="Prescription was rejected by admin")

        record = await get_approved_record(prescription_id)
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
            tests=data.tests or [],
            notes=data.notes,
            approved_at=record.reviewed_at,
            patient_insights=data.patient_insights,
            report_type=data.report_type or "prescription",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error fetching patient view for {prescription_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to retrieve prescription")


@router.get("/api/prescriptions/{prescription_id}/doctor-view")
async def get_doctor_prescription_view(prescription_id: str):
    """Return structured doctor dashboard payload for a prescription."""
    try:
        record = await get_record(prescription_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Prescription not found")

        from services.payload_transformer import build_doctor_dashboard_payload
        payload = build_doctor_dashboard_payload(record)
        return payload.model_dump()
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error fetching doctor view for {prescription_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to retrieve prescription")


@router.get("/api/prescriptions/{prescription_id}/admin-view")
async def get_admin_prescription_view(prescription_id: str):
    """Return full-visibility admin payload with raw+processed+risk flags+audit."""
    try:
        record = await get_record(prescription_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Prescription not found")

        from services.payload_transformer import build_admin_panel_payload
        from db.audit_db import get_audit_log

        # Get raw snapshot from DB
        from db.prescription_db import get_prescription_by_id
        raw_row = await get_prescription_by_id(prescription_id)
        raw_snapshot = None
        if raw_row and raw_row.get("raw_extraction_snapshot"):
            import json as _json
            try:
                raw_snapshot = _json.loads(raw_row["raw_extraction_snapshot"])
            except Exception:
                pass

        audit_entries = await get_audit_log(prescription_id)
        payload = build_admin_panel_payload(record, audit_entries, raw_snapshot)
        return payload.model_dump()
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error fetching admin view for {prescription_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to retrieve prescription")


@router.get("/api/patients/{patient_id}/chunks")
async def get_patient_chunks(patient_id: str):
    """Return all data chunks for a patient (post-approval)."""
    try:
        from db.patient_chunks_db import get_chunks_by_patient
        chunks = await get_chunks_by_patient(patient_id)
        return {"count": len(chunks), "items": chunks}
    except Exception as exc:
        logger.error(f"Error fetching chunks for patient {patient_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch patient data")


@router.get("/api/patients/{patient_id}/chunks/{chunk_type}")
async def get_patient_chunks_by_type(patient_id: str, chunk_type: str):
    """Return patient chunks filtered by type (medication|routine|explanation|faq_context)."""
    valid_types = {"medication", "routine", "explanation", "faq_context"}
    if chunk_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid chunk type. Valid: {', '.join(valid_types)}")
    try:
        from db.patient_chunks_db import get_chunks_by_type
        chunks = await get_chunks_by_type(patient_id, chunk_type)
        return {"count": len(chunks), "items": chunks}
    except Exception as exc:
        logger.error(f"Error fetching {chunk_type} chunks for patient {patient_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch patient data")


@router.get("/api/patients/{patient_id}/chatbot-context")
async def get_chatbot_context(patient_id: str):
    """Return RAG-ready chatbot context using ONLY stored patient data."""
    try:
        from services.chatbot_context_service import get_patient_context
        context = await get_patient_context(patient_id)
        return context.model_dump()
    except Exception as exc:
        logger.error(f"Error fetching chatbot context for patient {patient_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to build chatbot context")


@router.get("/api/patients/{patient_id}/faq-suggestions")
async def get_patient_faq_suggestions(patient_id: str):
    """Return pre-built FAQ question/answer pairs for chatbot display."""
    try:
        from services.chatbot_context_service import get_faq_suggestions
        suggestions = await get_faq_suggestions(patient_id)
        return {"count": len(suggestions), "items": suggestions}
    except Exception as exc:
        logger.error(f"Error fetching FAQ suggestions for patient {patient_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch FAQ suggestions")


@router.get("/api/prescriptions/{prescription_id}/audit-log")
async def get_prescription_audit_log(prescription_id: str):
    """Return full audit trail for a prescription (admin use)."""
    try:
        from db.audit_db import get_audit_log
        entries = await get_audit_log(prescription_id)
        return {"count": len(entries), "items": entries}
    except Exception as exc:
        logger.error(f"Error fetching audit log for {prescription_id}: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch audit log")


@router.get("/api/rate-limit-status")
async def get_rate_limit_status():
    """Return current Gemini API rate limit usage."""
    from services.rate_limiter_service import gemini_rate_limiter
    return gemini_rate_limiter.get_usage()

