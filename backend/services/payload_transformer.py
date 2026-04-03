"""
Payload Transformer Service — transforms raw prescription data into role-specific payloads.

Provides:
  - build_raw_extraction_payload() → Layer 1 (immutable snapshot)
  - build_doctor_dashboard_payload() → Layer 2 (structured summary)
  - build_admin_panel_payload() → Layer 3 (full visibility + risk flags + audit)
  - detect_risk_flags() → automated quality checks
"""

import logging
from typing import List, Dict, Any, Optional

from models.prescription import (
    PrescriptionRecord,
    RawExtractionPayload,
    DoctorDashboardSummary,
    DoctorDashboardPayload,
    AdminPanelPayload,
    AuditLogEntry,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Risk flag detection
# ---------------------------------------------------------------------------

def detect_risk_flags(record: PrescriptionRecord) -> List[str]:
    """
    Detect quality / safety issues in extracted prescription data.
    Returns a list of human-readable warning strings.
    """
    flags = []
    ed = record.extracted_data

    # Low confidence
    if ed.extraction_confidence < 0.4:
        flags.append("⚠️ Very low extraction confidence (<40%)")
    elif ed.extraction_confidence < 0.6:
        flags.append("⚡ Moderate extraction confidence (<60%)")

    # Missing patient identity
    if not ed.patient_id:
        flags.append("🔍 Missing patient ID")
    if not ed.patient_name:
        flags.append("🔍 Missing patient name")

    # Missing critical fields
    if not ed.diagnosis:
        flags.append("📋 No diagnosis extracted")
    if not ed.doctor_name:
        flags.append("👨‍⚕️ Doctor name not identified")

    # Medication issues
    if not ed.medications or len(ed.medications) == 0:
        flags.append("💊 No medications extracted")
    else:
        for med in ed.medications:
            if not med.strength:
                flags.append(f"💊 Missing dosage for {med.name}")
            if not med.frequency:
                flags.append(f"⏰ Missing frequency for {med.name}")
            if not med.duration:
                flags.append(f"📅 Missing duration for {med.name}")
            if med.name.lower() in ("unknown", "null", "none", ""):
                flags.append("🚫 Unreadable medication name detected")

    # Requires doctor review flag
    if ed.requires_doctor_review:
        flags.append("🔄 Flagged for doctor review")

    return flags


# ---------------------------------------------------------------------------
# Layer 1 — Raw Extraction Payload (immutable)
# ---------------------------------------------------------------------------

def build_raw_extraction_payload(record: PrescriptionRecord) -> RawExtractionPayload:
    """
    Create the raw extraction snapshot. This is saved once on creation
    and NEVER mutated afterward.
    """
    ed = record.extracted_data
    raw_meds = []
    for m in ed.medications:
        raw_meds.append({
            "name": m.name,
            "dosage": m.strength or "",
            "frequency": m.frequency or "",
            "duration": m.duration or "",
        })

    return RawExtractionPayload(
        patient_id=ed.patient_id,
        doctor_id=record.doctor_id,
        timestamp=record.created_at,
        source_type=ed.report_type or "prescription",
        raw_extraction={
            "medications": raw_meds,
            "diagnosis": ed.diagnosis,
            "symptoms": [],  # Populated if OCR finds symptom mentions
            "notes": ed.notes,
            "tests": ed.tests or [],
        },
        confidence_score=ed.extraction_confidence,
        status="extracted",
    )


# ---------------------------------------------------------------------------
# Layer 2 — Doctor Dashboard Payload (structured summary)
# ---------------------------------------------------------------------------

def build_doctor_dashboard_payload(record: PrescriptionRecord) -> DoctorDashboardPayload:
    """
    Build a clean, structured payload for the doctor dashboard.
    Includes summary, detailed view, and risk warnings.
    """
    ed = record.extracted_data
    risk_warnings = detect_risk_flags(record)

    # Build summary
    key_meds = [m.name for m in ed.medications[:5]]  # top 5
    treatment_parts = []
    for m in ed.medications:
        part = m.name
        if m.frequency:
            part += f" ({m.frequency})"
        if m.duration:
            part += f" for {m.duration}"
        treatment_parts.append(part)
    treatment_plan = "; ".join(treatment_parts) if treatment_parts else None

    summary = DoctorDashboardSummary(
        diagnosis=ed.diagnosis,
        key_medications=key_meds,
        treatment_plan=treatment_plan,
    )

    # Detailed view — full medication + test data
    detailed_meds = []
    for m in ed.medications:
        detailed_meds.append({
            "name": m.name,
            "strength": m.strength,
            "form": m.form,
            "frequency": m.frequency,
            "duration": m.duration,
            "instructions": m.instructions,
            "purpose": m.purpose,
            "warnings": m.warnings,
        })

    status_map = {
        "pending_admin_review": "pending_review",
        "approved": "approved",
        "rejected": "rejected",
        "escalated_to_doctor": "escalated",
    }
    status_val = record.status.value if hasattr(record.status, "value") else record.status

    return DoctorDashboardPayload(
        patient_id=ed.patient_id,
        patient_name=ed.patient_name,
        patient_age=ed.patient_age,
        summary=summary,
        detailed_view={
            "medications": detailed_meds,
            "tests": ed.tests or [],
            "notes": ed.notes,
        },
        editable=(status_val == "pending_admin_review"),
        status=status_map.get(status_val, status_val),
        confidence_score=ed.extraction_confidence,
        risk_warnings=risk_warnings,
    )


# ---------------------------------------------------------------------------
# Layer 3 — Admin Panel Payload (full visibility)
# ---------------------------------------------------------------------------

def build_admin_panel_payload(
    record: PrescriptionRecord,
    audit_entries: Optional[List[Dict[str, Any]]] = None,
    raw_snapshot: Optional[Dict[str, Any]] = None,
) -> AdminPanelPayload:
    """
    Build the full-visibility admin payload with raw data, processed data,
    risk flags, and audit trail.
    """
    ed = record.extracted_data
    risk_flags = detect_risk_flags(record)

    # Raw data — from snapshot if available, build from current otherwise
    if raw_snapshot:
        raw_data = raw_snapshot
    else:
        raw_payload = build_raw_extraction_payload(record)
        raw_data = raw_payload.model_dump()

    # Processed data — the normalized version
    processed_meds = []
    for m in ed.medications:
        processed_meds.append(m.model_dump())

    processed_data = {
        "doctor_name": ed.doctor_name,
        "patient_name": ed.patient_name,
        "patient_age": ed.patient_age,
        "patient_gender": ed.patient_gender,
        "prescription_date": ed.prescription_date,
        "diagnosis": ed.diagnosis,
        "medications": processed_meds,
        "tests": ed.tests or [],
        "notes": ed.notes,
        "extraction_confidence": ed.extraction_confidence,
        "report_type": ed.report_type,
    }

    # Build audit log entries
    audit_log = []
    for entry in (audit_entries or []):
        audit_log.append(AuditLogEntry(
            id=entry.get("id"),
            prescription_id=entry.get("prescription_id", record.prescription_id),
            action=entry.get("action", "unknown"),
            actor_role=entry.get("actor_role", "system"),
            actor_id=entry.get("actor_id", "system"),
            timestamp=entry.get("timestamp", ""),
            details=entry.get("details"),
        ))

    status_val = record.status.value if hasattr(record.status, "value") else record.status

    return AdminPanelPayload(
        prescription_id=record.prescription_id,
        patient_id=ed.patient_id,
        doctor_id=record.doctor_id,
        raw_data=raw_data,
        processed_data=processed_data,
        risk_flags=risk_flags,
        approval_status=status_val,
        confidence_score=ed.extraction_confidence,
        audit_log=audit_log,
        created_at=record.created_at,
        reviewed_at=record.reviewed_at,
        admin_id=record.admin_id,
    )
