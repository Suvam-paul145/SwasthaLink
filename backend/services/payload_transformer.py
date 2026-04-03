"""
Payload Transformer Service
Transforms raw prescription data into role-specific payloads for
Doctor Dashboard, Admin Panel, and Patient views.
"""

import logging
from typing import Any, Dict, List, Optional

from models.prescription import (
    DoctorDashboardPayload,
    AdminPanelPayload,
    RawExtractionPayload,
    PrescriptionRecord,
)

logger = logging.getLogger(__name__)


def build_raw_extraction_payload(record: PrescriptionRecord) -> RawExtractionPayload:
    """Build Layer 1: immutable raw extraction snapshot."""
    ed = record.extracted_data
    return RawExtractionPayload(
        patient_id=ed.patient_id,
        doctor_id=record.doctor_id,
        timestamp=record.created_at,
        source_type=ed.report_type or "prescription",
        raw_extraction=ed.model_dump(),
        confidence_score=ed.extraction_confidence,
        status="extracted",
    )


def build_doctor_dashboard_payload(record: PrescriptionRecord) -> DoctorDashboardPayload:
    """Build Layer 2a: structured clinical summary for doctors."""
    ed = record.extracted_data
    summary = {
        "diagnosis": ed.diagnosis,
        "key_medications": [
            {"name": m.name, "strength": m.strength, "dosage": m.frequency}
            for m in ed.medications[:5]
        ],
        "treatment_plan": ed.notes,
        "patient_info": {
            "name": ed.patient_name,
            "age": ed.patient_age,
            "gender": ed.patient_gender,
        },
    }
    detailed_view = {
        "medications": [m.model_dump() for m in ed.medications],
        "tests": ed.tests or [],
        "notes": ed.notes,
        "raw_ocr_text": ed.raw_ocr_text,
    }
    return DoctorDashboardPayload(
        patient_id=ed.patient_id,
        summary=summary,
        detailed_view=detailed_view,
        editable=(record.status.value if hasattr(record.status, "value") else record.status)
                 == "pending_admin_review",
        status=record.status.value if hasattr(record.status, "value") else record.status,
    )


def detect_risk_flags(record: PrescriptionRecord) -> List[str]:
    """Identify quality / safety risk flags."""
    flags = []
    ed = record.extracted_data
    if ed.extraction_confidence < 0.5:
        flags.append("⚠️ Low extraction confidence (<50%)")
    if not ed.patient_name:
        flags.append("⚠️ Patient name missing")
    if not ed.patient_id:
        flags.append("⚠️ Patient ID missing")
    if not ed.diagnosis:
        flags.append("⚠️ Diagnosis field empty")
    for med in ed.medications:
        if not med.strength:
            flags.append(f"⚠️ Missing dosage for {med.name}")
        if not med.frequency:
            flags.append(f"⚠️ Missing frequency for {med.name}")
    if ed.raw_ocr_text and ("illegible" in ed.raw_ocr_text.lower() or "unclear" in ed.raw_ocr_text.lower()):
        flags.append("⚠️ OCR flagged unreadable sections")
    return flags


def build_admin_panel_payload(
    record: PrescriptionRecord,
    audit_entries: Optional[List[Dict[str, Any]]] = None,
) -> AdminPanelPayload:
    """Build Layer 2b: full visibility payload with risk flags + audit."""
    ed = record.extracted_data
    raw_data = ed.model_dump()
    processed_data = {
        "patient_info": {
            "name": ed.patient_name, "age": ed.patient_age,
            "gender": ed.patient_gender, "id": ed.patient_id,
        },
        "clinical": {
            "diagnosis": ed.diagnosis,
            "medications": [m.model_dump() for m in ed.medications],
            "tests": ed.tests or [],
            "notes": ed.notes,
        },
        "confidence": ed.extraction_confidence,
        "report_type": ed.report_type,
    }
    return AdminPanelPayload(
        patient_id=ed.patient_id,
        doctor_id=record.doctor_id,
        raw_data=raw_data,
        processed_data=processed_data,
        risk_flags=detect_risk_flags(record),
        approval_status=record.status.value if hasattr(record.status, "value") else record.status,
        audit_log=audit_entries or [],
    )
