"""
Prescription RAG Service
Retrieval-Augmented Generation pipeline for extracting structured information
from handwritten prescriptions.

Pipeline:
  1. OCR text → lightweight retriever scores knowledge snippets
  2. Top-k snippets + OCR text → Gemini structured extraction
  3. Parsed result stored as a pending-admin-review record
  4. Admin approves / rejects
  5. Approved record served to patient in readable format
"""

import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from models import (
    PrescriptionExtractedData,
    PrescriptionMedication,
    PrescriptionRecord,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Knowledge corpus for retrieval
# Each snippet captures cues that help Gemini recognise prescription fields
# ---------------------------------------------------------------------------
_KNOWLEDGE_SNIPPETS: List[Dict[str, Any]] = [
    {
        "id": "doc_name",
        "topic": "doctor_name",
        "keywords": {"dr", "doctor", "mbbs", "md", "ms", "consultant", "physician",
                     "surgeon", "specialist", "hospital", "clinic", "reg", "registration"},
        "content": (
            "The prescribing doctor's name usually appears at the top of a prescription, "
            "often preceded by 'Dr.' or 'Dr' with qualifications like MBBS, MD, MS. "
            "It may also appear alongside hospital/clinic name and registration number."
        ),
    },
    {
        "id": "patient_id",
        "topic": "patient_id",
        "keywords": {"uhid", "mrn", "pid", "patient", "id", "no", "number", "ref",
                     "case", "reg", "registration", "opd", "ipd", "file"},
        "content": (
            "Patient identifiers appear as UHID, MRN, Patient ID, Case No., OPD/IPD No. "
            "They are alphanumeric codes typically near the patient information block, "
            "sometimes prefixed with a hash (#) or the hospital abbreviation."
        ),
    },
    {
        "id": "patient_name",
        "topic": "patient_name",
        "keywords": {"name", "patient", "pt", "mr", "mrs", "ms", "shri", "smt",
                     "kumari", "ku", "master"},
        "content": (
            "The patient's full name appears near 'Name:', 'Patient Name:', 'Pt. Name:', "
            "or after titles such as Mr., Mrs., Ms., Shri, Smt. "
            "It is usually the first personal detail listed."
        ),
    },
    {
        "id": "patient_age",
        "topic": "patient_age",
        "keywords": {"age", "yrs", "years", "yr", "dob", "born", "m", "f", "male",
                     "female", "sex", "gender", "old"},
        "content": (
            "Patient age is commonly written as '35 yrs', '35Y', '35/M' (age/gender), "
            "or next to 'Age:'. Date of birth (DOB) may also appear. "
            "Gender (M/F, Male/Female) typically accompanies age."
        ),
    },
    {
        "id": "medications",
        "topic": "medications",
        "keywords": {"rx", "tab", "cap", "syrup", "inj", "mg", "ml", "od", "bd", "tds",
                     "qid", "sos", "stat", "hs", "ac", "pc", "dose", "tablet", "capsule",
                     "injection", "drops", "cream", "ointment", "days", "weeks"},
        "content": (
            "Medications are listed after the Rx symbol. Each line typically contains: "
            "drug name (brand or generic), strength (mg/ml), dosage form (Tab/Cap/Syrup/Inj), "
            "frequency (OD=once daily, BD=twice, TDS=thrice, QID=four times, SOS=as needed), "
            "duration (e.g., '5 days', '1 week'), and special instructions (AC=before food, "
            "PC=after food, HS=at bedtime)."
        ),
    },
    {
        "id": "illegible",
        "topic": "uncertainty",
        "keywords": {"unclear", "illegible", "unknown", "unreadable", "?", "blurred"},
        "content": (
            "Handwritten prescriptions may contain illegible words. "
            "Mark any unreadable field as null and set 'extraction_confidence' "
            "to a lower value. Never guess a drug name — use null instead."
        ),
    },
]


# ---------------------------------------------------------------------------
# Retriever
# ---------------------------------------------------------------------------

def _tokenize(text: str) -> set:
    """Lower-case word tokeniser."""
    return set(re.findall(r"[a-z]+", text.lower()))


def retrieve_context(ocr_text: str, top_k: int = 4) -> List[str]:
    """
    Score each knowledge snippet by keyword overlap with OCR text and
    return the content strings of the top-k most relevant snippets.
    """
    tokens = _tokenize(ocr_text)
    scored = []
    for snippet in _KNOWLEDGE_SNIPPETS:
        overlap = len(tokens & snippet["keywords"])
        scored.append((overlap, snippet["content"]))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [content for _, content in scored[:top_k]]


# ---------------------------------------------------------------------------
# Gemini extraction
# ---------------------------------------------------------------------------

_PRESCRIPTION_EXTRACTION_PROMPT = """You are a medical data extraction specialist.

CONTEXT (prescription-reading heuristics):
{context}

TASK:
Extract structured information from the following OCR text of a handwritten prescription.
Return ONLY a valid JSON object — no markdown, no backticks, no explanation.

OCR TEXT:
{ocr_text}

Return this EXACT JSON structure:
{{
  "doctor_name": "Full name with title, or null if not found",
  "patient_id": "UHID / MRN / Patient ID as a string, or null",
  "patient_name": "Full patient name, or null",
  "patient_age": "Age as string (e.g. '35 yrs' or '35/M'), or null",
  "patient_gender": "Male / Female / Other, or null",
  "prescription_date": "Date string if visible, or null",
  "medications": [
    {{
      "name": "Drug name (generic preferred, brand acceptable)",
      "strength": "e.g. '500mg', '5ml', or null",
      "form": "Tab / Cap / Syrup / Inj / Drops / Cream / Other, or null",
      "frequency": "e.g. 'OD', 'BD', 'TDS', 'QID', 'SOS', or plain text",
      "duration": "e.g. '5 days', '2 weeks', or null",
      "instructions": "e.g. 'After food', 'At bedtime', or null"
    }}
  ],
  "diagnosis": "Diagnosis or presenting complaint if mentioned, or null",
  "notes": "Any other important notes or instructions, or null",
  "extraction_confidence": 0.0
}}

Rules:
1. Set extraction_confidence between 0.0 (fully illegible) and 1.0 (fully clear).
2. Use null for any field that cannot be reliably read — never guess drug names.
3. Return ONLY the JSON. No other text."""


def _strip_fences(text: str) -> str:
    """Remove markdown code fences Gemini may add despite instructions."""
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"```", "", text)
    return text.strip()


def _extract_json(response_text: str) -> Dict[str, Any]:
    """Robustly locate and parse a JSON object in the Gemini response."""
    cleaned = _strip_fences(response_text)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in Gemini response")
    try:
        return json.loads(cleaned[start : end + 1])
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON parse error: {exc}") from exc


def _fallback_extraction_from_ocr(ocr_text: str) -> PrescriptionExtractedData:
    """
    Build a minimal PrescriptionExtractedData from OCR text using regex
    when Gemini fails to return valid JSON.  The record is still created
    and queued for admin review so nothing is lost.
    """
    logger.warning("Using fallback regex extraction from OCR text")

    # Try to find doctor name (Dr. ...)
    doctor_match = re.search(r"(?:Dr\.?|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)", ocr_text)
    doctor_name = doctor_match.group(0).strip() if doctor_match else None

    # Try to find patient name (after "Name:" or "Patient's Name:")
    patient_match = re.search(
        r"(?:Patient(?:'s)?\s*Name|Name)\s*[:：]\s*(.+?)(?:\n|$)", ocr_text, re.IGNORECASE
    )
    patient_name = patient_match.group(1).strip() if patient_match else None

    # Try to find age
    age_match = re.search(r"Age\s*[:：]\s*(\d{1,3})", ocr_text, re.IGNORECASE)
    patient_age = f"{age_match.group(1)} yrs" if age_match else None

    # Try to find sex/gender
    sex_match = re.search(r"Sex\s*[:：]\s*([MFmf]|Male|Female)", ocr_text, re.IGNORECASE)
    patient_gender = None
    if sex_match:
        g = sex_match.group(1).upper()
        patient_gender = "Male" if g.startswith("M") else "Female"

    # Try to find date
    date_match = re.search(r"Date\s*[:：]\s*([\d/\-\.]+)", ocr_text, re.IGNORECASE)
    prescription_date = date_match.group(1).strip() if date_match else None

    # Try to extract medication names (lines with Tab/Cap/T./Syrup etc.)
    med_lines = re.findall(
        r"(?:Tab|Cap|Syrup|Inj|T\.)\.?\s+([A-Za-z\-]+(?:\s+[A-Za-z\-]*)?)\s*(?:\(?\d+)",
        ocr_text, re.IGNORECASE
    )
    medications = []
    for med_name in med_lines[:10]:  # cap at 10
        medications.append(PrescriptionMedication(
            name=med_name.strip(),
            strength=None,
            form=None,
            frequency=None,
            duration=None,
            instructions=None,
        ))

    return PrescriptionExtractedData(
        doctor_name=doctor_name,
        patient_id=None,
        patient_name=patient_name,
        patient_age=patient_age,
        patient_gender=patient_gender,
        prescription_date=prescription_date,
        medications=medications,
        diagnosis=None,
        notes="⚠️ Auto-extracted via fallback (Gemini did not return structured data). Please verify all fields manually.",
        extraction_confidence=0.2,
    )


_RETRY_PROMPT = """Your previous response was NOT valid JSON. You MUST return ONLY a JSON object.
Do NOT include any explanation, apology, or markdown — just the raw JSON.

Previous OCR text:
{ocr_text}

Return this EXACT JSON structure (fill in values from the OCR text above):
{{
  "doctor_name": "string or null",
  "patient_id": "string or null",
  "patient_name": "string or null",
  "patient_age": "string or null",
  "patient_gender": "string or null",
  "prescription_date": "string or null",
  "medications": [
    {{
      "name": "string",
      "strength": "string or null",
      "form": "string or null",
      "frequency": "string or null",
      "duration": "string or null",
      "instructions": "string or null"
    }}
  ],
  "diagnosis": "string or null",
  "notes": "string or null",
  "extraction_confidence": 0.0
}}

CRITICAL: Return ONLY the JSON object. No other text whatsoever."""


def _parse_gemini_to_extracted_data(data: Dict[str, Any]) -> PrescriptionExtractedData:
    """Convert a parsed JSON dict into a PrescriptionExtractedData model."""
    medications: List[PrescriptionMedication] = []
    for med in data.get("medications") or []:
        medications.append(
            PrescriptionMedication(
                name=med.get("name") or "Unknown",
                strength=med.get("strength"),
                form=med.get("form"),
                frequency=med.get("frequency"),
                duration=med.get("duration"),
                instructions=med.get("instructions"),
            )
        )

    return PrescriptionExtractedData(
        doctor_name=data.get("doctor_name"),
        patient_id=data.get("patient_id"),
        patient_name=data.get("patient_name"),
        patient_age=data.get("patient_age"),
        patient_gender=data.get("patient_gender"),
        prescription_date=data.get("prescription_date"),
        medications=medications,
        diagnosis=data.get("diagnosis"),
        notes=data.get("notes"),
        extraction_confidence=float(data.get("extraction_confidence") or 0.5),
    )


async def extract_prescription_data(ocr_text: str) -> PrescriptionExtractedData:
    """
    Run the RAG extraction pipeline on OCR text from a prescription image.

    Pipeline:
      1. Retrieve relevant context snippets.
      2. Build a constrained prompt and call Gemini.
      3. If Gemini does NOT return valid JSON → retry once with a reinforced prompt.
      4. If retry also fails → fallback to regex-based extraction from OCR text.
      5. Parse result into PrescriptionExtractedData.
    """
    from gemini_service import (  # local import to avoid circular
        GEMINI_API_KEY,
        GeminiServiceError,
        _generate_text,
    )

    if not GEMINI_API_KEY:
        raise GeminiServiceError("Gemini API key not configured")

    context_snippets = retrieve_context(ocr_text, top_k=4)
    context_text = "\n\n".join(f"• {s}" for s in context_snippets)

    prompt = _PRESCRIPTION_EXTRACTION_PROMPT.format(
        context=context_text,
        ocr_text=ocr_text,
    )

    # --- Attempt 1 ---
    logger.info("Calling Gemini for prescription RAG extraction (attempt 1)...")
    response_text = _generate_text(
        prompt=prompt,
        generation_config={"temperature": 0.1, "max_output_tokens": 4096},
    )

    if not response_text:
        raise GeminiServiceError("Gemini returned empty response for prescription extraction")

    logger.info(f"Gemini prescription response (attempt 1): {len(response_text)} chars")

    try:
        data = _extract_json(response_text)
        return _parse_gemini_to_extracted_data(data)
    except ValueError as exc:
        logger.warning(f"Attempt 1 JSON parse failed: {exc}")
        logger.warning(f"Raw response (attempt 1): {response_text[:500]}")

    # --- Attempt 2: Retry with reinforced prompt ---
    logger.info("Retrying Gemini with reinforced JSON-only prompt (attempt 2)...")
    retry_prompt = _RETRY_PROMPT.format(ocr_text=ocr_text)

    try:
        response_text_2 = _generate_text(
            prompt=retry_prompt,
            generation_config={"temperature": 0.05, "max_output_tokens": 4096},
        )

        if response_text_2:
            logger.info(f"Gemini prescription response (attempt 2): {len(response_text_2)} chars")
            try:
                data = _extract_json(response_text_2)
                return _parse_gemini_to_extracted_data(data)
            except ValueError as exc2:
                logger.warning(f"Attempt 2 JSON parse also failed: {exc2}")
                logger.warning(f"Raw response (attempt 2): {response_text_2[:500]}")
    except Exception as retry_exc:
        logger.warning(f"Retry Gemini call failed: {retry_exc}")

    # --- Fallback: regex extraction from OCR ---
    logger.warning("Both Gemini attempts failed to return JSON. Using fallback regex extraction.")
    return _fallback_extraction_from_ocr(ocr_text)


# ---------------------------------------------------------------------------
# Prescription workflow store — Supabase-backed with in-memory fallback
# ---------------------------------------------------------------------------

from supabase_service import (
    supabase_client,
    create_prescription as _db_create,
    list_pending_prescriptions as _db_list_pending,
    list_prescriptions_by_doctor as _db_list_by_doctor,
    list_approved_prescriptions_for_patient as _db_list_for_patient,
    approve_prescription_db as _db_approve,
    reject_prescription_db as _db_reject,
    get_prescription_by_id as _db_get,
)

# In-memory fallback when Supabase is not configured
_PRESCRIPTION_STORE: Dict[str, PrescriptionRecord] = {}


def _record_to_db_row(record: PrescriptionRecord) -> Dict[str, Any]:
    """Flatten a PrescriptionRecord into a dict suitable for the DB table."""
    ed = record.extracted_data
    return {
        "prescription_id": record.prescription_id,
        "status": record.status.value if hasattr(record.status, "value") else record.status,
        "doctor_id": record.doctor_id,
        "patient_id": ed.patient_id,
        "patient_name": ed.patient_name,
        "patient_age": ed.patient_age,
        "patient_gender": ed.patient_gender,
        "doctor_name": ed.doctor_name,
        "prescription_date": ed.prescription_date,
        "diagnosis": ed.diagnosis,
        "notes": ed.notes,
        "medications": [m.model_dump() for m in ed.medications],
        "extraction_confidence": ed.extraction_confidence,
        "s3_key": record.s3_key,
        "created_at": record.created_at,
    }


def _db_row_to_record(row: Dict[str, Any]) -> PrescriptionRecord:
    """Reconstruct a PrescriptionRecord from a Supabase row."""
    meds = []
    for m in (row.get("medications") or []):
        meds.append(PrescriptionMedication(
            name=m.get("name", "Unknown"),
            strength=m.get("strength"),
            form=m.get("form"),
            frequency=m.get("frequency"),
            duration=m.get("duration"),
            instructions=m.get("instructions"),
        ))

    extracted = PrescriptionExtractedData(
        doctor_name=row.get("doctor_name"),
        patient_id=row.get("patient_id"),
        patient_name=row.get("patient_name"),
        patient_age=row.get("patient_age"),
        patient_gender=row.get("patient_gender"),
        prescription_date=row.get("prescription_date"),
        medications=meds,
        diagnosis=row.get("diagnosis"),
        notes=row.get("notes"),
        extraction_confidence=float(row.get("extraction_confidence") or 0.5),
    )

    return PrescriptionRecord(
        prescription_id=row["prescription_id"],
        status=row.get("status", "pending_admin_review"),
        doctor_id=row.get("doctor_id", ""),
        extracted_data=extracted,
        s3_key=row.get("s3_key"),
        created_at=row.get("created_at", ""),
        admin_id=row.get("admin_id"),
        reviewed_at=row.get("reviewed_at"),
        rejection_reason=row.get("rejection_reason"),
    )


async def create_prescription_record(
    extracted_data: PrescriptionExtractedData,
    doctor_id: str,
    s3_key: Optional[str] = None,
) -> PrescriptionRecord:
    """Create a new pending prescription record and persist in Supabase (or memory)."""
    record = PrescriptionRecord(
        prescription_id=str(uuid.uuid4()),
        status="pending_admin_review",
        doctor_id=doctor_id,
        extracted_data=extracted_data,
        s3_key=s3_key,
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    # Try Supabase first
    if supabase_client:
        await _db_create(_record_to_db_row(record))
    else:
        _PRESCRIPTION_STORE[record.prescription_id] = record

    logger.info(f"Prescription record created: {record.prescription_id}")
    return record


async def list_pending_records() -> List[PrescriptionRecord]:
    """Return all records with status pending_admin_review."""
    if supabase_client:
        rows = await _db_list_pending()
        return [_db_row_to_record(r) for r in rows]
    return [r for r in _PRESCRIPTION_STORE.values() if r.status == "pending_admin_review"]


async def list_records_by_doctor(doctor_id: str) -> List[PrescriptionRecord]:
    """Return all prescriptions uploaded by a specific doctor."""
    if supabase_client:
        rows = await _db_list_by_doctor(doctor_id)
        return [_db_row_to_record(r) for r in rows]
    return [r for r in _PRESCRIPTION_STORE.values() if r.doctor_id == doctor_id]


async def list_approved_for_patient(patient_id: str) -> List[PrescriptionRecord]:
    """Return approved prescriptions for a patient."""
    if supabase_client:
        rows = await _db_list_for_patient(patient_id)
        return [_db_row_to_record(r) for r in rows]
    return [
        r for r in _PRESCRIPTION_STORE.values()
        if r.status == "approved" and r.extracted_data.patient_id == patient_id
    ]


async def approve_record(prescription_id: str, admin_id: str) -> Optional[PrescriptionRecord]:
    """Approve a pending prescription record."""
    if supabase_client:
        row = await _db_approve(prescription_id, admin_id)
        return _db_row_to_record(row) if row else None

    record = _PRESCRIPTION_STORE.get(prescription_id)
    if record is None:
        return None
    record.status = "approved"
    record.admin_id = admin_id
    record.reviewed_at = datetime.now(timezone.utc).isoformat()
    return record


async def reject_record(
    prescription_id: str, admin_id: str, rejection_reason: str
) -> Optional[PrescriptionRecord]:
    """Reject a pending prescription record."""
    if supabase_client:
        row = await _db_reject(prescription_id, admin_id, rejection_reason)
        return _db_row_to_record(row) if row else None

    record = _PRESCRIPTION_STORE.get(prescription_id)
    if record is None:
        return None
    record.status = "rejected"
    record.admin_id = admin_id
    record.rejection_reason = rejection_reason
    record.reviewed_at = datetime.now(timezone.utc).isoformat()
    return record


async def get_record(prescription_id: str) -> Optional[PrescriptionRecord]:
    """Return a prescription record by ID regardless of status."""
    if supabase_client:
        row = await _db_get(prescription_id)
        return _db_row_to_record(row) if row else None
    return _PRESCRIPTION_STORE.get(prescription_id)


async def get_approved_record(prescription_id: str) -> Optional[PrescriptionRecord]:
    """Return a prescription record only if it has been approved."""
    record = await get_record(prescription_id)
    if record and record.status == "approved":
        return record
    return None
