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
Extract structured information from the following OCR text of a handwritten medical document.
Return ONLY a valid JSON object — no markdown, no backticks, no explanation.

MANDATORY CANONICAL FORMATS (use EXACTLY these):
  Frequency: "OD" → "Once daily (morning)", "BD" → "Twice daily (morning & evening)",
             "TDS" → "Three times daily", "QID" → "Four times daily",
             "SOS" → "As needed", "HS" → "At bedtime", "STAT" → "Immediately once"
  Form:      "Tab" → "Tablet", "Cap" → "Capsule", "Syp" → "Syrup",
             "Inj" → "Injection", "Drops" → "Drops", "Cream" → "Cream",
             "Ointment" → "Ointment"
  Strength:  Always add space: "500mg" → "500 mg", "5ml" → "5 ml"
  Instructions: "AC" → "Before food", "PC" → "After food", "HS" → "At bedtime"
  Names:     Use Title Case for all drug names. Prefer generic names when identifiable.
  Gender:    Always output exactly "Male" or "Female" or "Other"
  Date:      Keep the original date string exactly as written

OCR TEXT:
{ocr_text}

Return this EXACT JSON structure:
{{
  "report_type": "prescription",
  "doctor_name": "Full name with title (e.g. 'Dr. Sukriti Mukherjee'), or null",
  "patient_id": "UHID / MRN / Patient ID as a string, or null",
  "patient_name": "Full patient name with title (e.g. 'Mr. Suvam Paul'), or null",
  "patient_age": "Age as string with unit (e.g. '35 yrs'), or null",
  "patient_gender": "Male / Female / Other, or null",
  "prescription_date": "Date string exactly as written, or null",
  "medications": [
    {{
      "name": "Drug name in Title Case (e.g. 'Venlafaxine XL')",
      "strength": "e.g. '500 mg', '5 ml', or null",
      "form": "Use canonical form (Tablet/Capsule/Syrup/Injection/etc.), or null",
      "frequency": "Use canonical frequency (e.g. 'Once daily (morning)'), or null",
      "duration": "e.g. '5 days', '2 weeks', or null",
      "instructions": "Use canonical instructions (e.g. 'Before food'), or null",
      "purpose": "Brief reason why this is prescribed based on diagnosis context, or null"
    }}
  ],
  "tests": [
    {{
      "name": "Test name (e.g. 'ECG', 'Blood Test', 'MRI')",
      "reason": "Why this test is needed, or null",
      "urgency": "Routine / Urgent / STAT, or null"
    }}
  ],
  "diagnosis": "Diagnosis with ICD code if visible (e.g. 'F42.2 - OCD'), or null",
  "notes": "Any other important notes, advice, or follow-up instructions, or null",
  "extraction_confidence": 0.0
}}

Rules:
1. Set extraction_confidence between 0.0 (fully illegible) and 1.0 (fully clear).
2. Use null for any field that cannot be reliably read — NEVER guess drug names.
3. Count filled fields to calculate confidence: confidence = filled_fields / total_fields.
4. If the document mentions tests (ECG, blood test, MRI, etc.), list them in the "tests" array.
5. If no tests are mentioned, return an empty array [].
6. The "purpose" field should be inferred from the diagnosis/context — keep it brief.
7. Return ONLY the JSON. No other text whatsoever."""


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


# ---------------------------------------------------------------------------
# Post-processing normalization maps
# ---------------------------------------------------------------------------

_FREQ_MAP = {
    "od": "Once daily (morning)", "o.d": "Once daily (morning)", "o.d.": "Once daily (morning)",
    "bd": "Twice daily (morning & evening)", "b.d": "Twice daily (morning & evening)",
    "tds": "Three times daily", "t.d.s": "Three times daily", "tid": "Three times daily",
    "qid": "Four times daily", "q.i.d": "Four times daily",
    "sos": "As needed", "s.o.s": "As needed", "prn": "As needed",
    "hs": "At bedtime", "h.s": "At bedtime",
    "stat": "Immediately once",
    "once daily": "Once daily (morning)", "twice daily": "Twice daily (morning & evening)",
    "thrice daily": "Three times daily",
}

_FORM_MAP = {
    "tab": "Tablet", "tab.": "Tablet", "tablet": "Tablet", "t.": "Tablet",
    "cap": "Capsule", "cap.": "Capsule", "capsule": "Capsule",
    "syp": "Syrup", "syp.": "Syrup", "syrup": "Syrup",
    "inj": "Injection", "inj.": "Injection", "injection": "Injection",
    "drops": "Drops", "drop": "Drops",
    "cream": "Cream", "ointment": "Ointment", "oint": "Ointment",
}

_INSTR_MAP = {
    "ac": "Before food", "a.c": "Before food", "before food": "Before food",
    "pc": "After food", "p.c": "After food", "after food": "After food",
    "hs": "At bedtime", "at bedtime": "At bedtime",
    "empty stomach": "On empty stomach",
}


def _normalize_field(value, lookup: dict):
    if not value:
        return value
    key = str(value).strip().lower()
    return lookup.get(key, value)


def _normalize_strength(value):
    if not value:
        return value
    return re.sub(r"(\d+)\s*(mg|ml|mcg|g|iu|%)", r"\1 \2", str(value).strip(), flags=re.IGNORECASE)


def _normalize_name(name):
    if not name:
        return name
    return str(name).strip().title()


def _deduplicate_meds(meds: list) -> list:
    seen = set()
    unique = []
    for med in meds:
        key = (med.name.lower(), (med.strength or "").lower())
        if key not in seen:
            seen.add(key)
            unique.append(med)
    return unique


def _calculate_confidence(data: dict) -> float:
    fields = ["doctor_name", "patient_name", "patient_age", "patient_gender",
              "prescription_date", "diagnosis"]
    filled = sum(1 for f in fields if data.get(f))
    med_count = len(data.get("medications") or [])
    if med_count > 0:
        filled += 1
    total = len(fields) + 1
    raw = filled / total
    ai_conf = float(data.get("extraction_confidence") or 0.5)
    return round(min(1.0, max(0.1, (raw * 0.4 + ai_conf * 0.6))), 2)


def _parse_gemini_to_extracted_data(data: Dict[str, Any]) -> PrescriptionExtractedData:
    """Convert a parsed JSON dict into a PrescriptionExtractedData model with normalization."""
    medications: List[PrescriptionMedication] = []
    for med in data.get("medications") or []:
        medications.append(
            PrescriptionMedication(
                name=_normalize_name(med.get("name")) or "Unknown",
                strength=_normalize_strength(med.get("strength")),
                form=_normalize_field(med.get("form"), _FORM_MAP),
                frequency=_normalize_field(med.get("frequency"), _FREQ_MAP),
                duration=med.get("duration"),
                instructions=_normalize_field(med.get("instructions"), _INSTR_MAP),
                purpose=med.get("purpose"),
            )
        )
    medications = _deduplicate_meds(medications)

    tests = []
    for t in data.get("tests") or []:
        tests.append({
            "name": (t.get("name") or "Unknown").strip(),
            "reason": t.get("reason"),
            "urgency": t.get("urgency") or "Routine",
        })

    confidence = _calculate_confidence(data)

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
        extraction_confidence=confidence,
        tests=tests,
        report_type=data.get("report_type", "prescription"),
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
    from services.gemini_service import (  # local import to avoid circular
        GEMINI_API_KEY,
        _generate_text,
    )
    from core.exceptions import GeminiServiceError

    if not GEMINI_API_KEY:
        raise GeminiServiceError("Gemini API key not configured")

    context_snippets = retrieve_context(ocr_text, top_k=4)
    context_text = "\n\n".join(f"• {s}" for s in context_snippets)

    prompt = _PRESCRIPTION_EXTRACTION_PROMPT.format(
        context=context_text,
        ocr_text=ocr_text,
    )

    # --- Attempt 1 (deterministic: temperature=0.0) ---
    logger.info("Calling Gemini for prescription RAG extraction (attempt 1, t=0.0)...")
    response_text = _generate_text(
        prompt=prompt,
        generation_config={"temperature": 0.0, "max_output_tokens": 4096},
    )

    if not response_text:
        raise GeminiServiceError("Gemini returned empty response for prescription extraction")

    logger.info(f"Gemini prescription response (attempt 1): {len(response_text)} chars")

    try:
        data = _extract_json(response_text)
        result = _parse_gemini_to_extracted_data(data)
        result.raw_ocr_text = ocr_text
        return result
    except ValueError as exc:
        logger.warning(f"Attempt 1 JSON parse failed: {exc}")
        logger.warning(f"Raw response (attempt 1): {response_text[:500]}")

    # --- Attempt 2: Retry with reinforced prompt ---
    logger.info("Retrying Gemini with reinforced JSON-only prompt (attempt 2)...")
    retry_prompt = _RETRY_PROMPT.format(ocr_text=ocr_text)

    try:
        response_text_2 = _generate_text(
            prompt=retry_prompt,
            generation_config={"temperature": 0.0, "max_output_tokens": 4096},
        )

        if response_text_2:
            logger.info(f"Gemini prescription response (attempt 2): {len(response_text_2)} chars")
            try:
                data = _extract_json(response_text_2)
                result = _parse_gemini_to_extracted_data(data)
                result.raw_ocr_text = ocr_text
                return result
            except ValueError as exc2:
                logger.warning(f"Attempt 2 JSON parse also failed: {exc2}")
                logger.warning(f"Raw response (attempt 2): {response_text_2[:500]}")
    except Exception as retry_exc:
        logger.warning(f"Retry Gemini call failed: {retry_exc}")

    # --- Fallback: regex extraction from OCR ---
    logger.warning("Both Gemini attempts failed to return JSON. Using fallback regex extraction.")
    fallback = _fallback_extraction_from_ocr(ocr_text)
    fallback.raw_ocr_text = ocr_text
    return fallback


# ---------------------------------------------------------------------------
# Prescription workflow store — Supabase-backed with in-memory fallback
# ---------------------------------------------------------------------------

from db import (
    supabase_client,
    create_prescription as _db_create,
    list_pending_prescriptions as _db_list_pending,
    list_prescriptions_by_doctor as _db_list_by_doctor,
    list_approved_prescriptions_for_patient as _db_list_for_patient,
    approve_prescription_db as _db_approve,
    reject_prescription_db as _db_reject,
    get_prescription_by_id as _db_get,
)



def _record_to_db_row(record: PrescriptionRecord) -> Dict[str, Any]:
    """Flatten a PrescriptionRecord into a dict suitable for the DB table."""
    ed = record.extracted_data
    row = {
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
        "tests": ed.tests or [],
        "report_type": ed.report_type or "prescription",
        "raw_ocr_text": ed.raw_ocr_text,
        "patient_insights": ed.patient_insights.model_dump() if ed.patient_insights else None,
        "linked_prescription_id": record.linked_prescription_id,
        "payload_version": 1,
        "raw_extraction_snapshot": json.dumps(ed.model_dump()),
    }
    return row


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
            purpose=m.get("purpose"),
            warnings=m.get("warnings"),
        ))

    # Parse tests
    tests = row.get("tests") or []
    if isinstance(tests, str):
        try:
            tests = json.loads(tests)
        except (json.JSONDecodeError, TypeError):
            tests = []

    # Parse patient_insights
    insights_raw = row.get("patient_insights")
    patient_insights = None
    if insights_raw:
        if isinstance(insights_raw, str):
            try:
                insights_raw = json.loads(insights_raw)
            except (json.JSONDecodeError, TypeError):
                insights_raw = None
        if isinstance(insights_raw, dict):
            from models.prescription import PatientInsights
            patient_insights = PatientInsights(**insights_raw)

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
        tests=tests,
        report_type=row.get("report_type", "prescription"),
        raw_ocr_text=row.get("raw_ocr_text"),
        patient_insights=patient_insights,
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
        linked_prescription_id=row.get("linked_prescription_id"),
    )


async def create_prescription_record(
    extracted_data: PrescriptionExtractedData,
    doctor_id: str,
    s3_key: Optional[str] = None,
    linked_prescription_id: Optional[str] = None,
) -> PrescriptionRecord:
    """Create a new pending prescription record and persist in Supabase (or memory)."""
    record = PrescriptionRecord(
        prescription_id=str(uuid.uuid4()),
        status="pending_admin_review",
        doctor_id=doctor_id,
        extracted_data=extracted_data,
        s3_key=s3_key,
        created_at=datetime.now(timezone.utc).isoformat(),
        linked_prescription_id=linked_prescription_id,
    )

    if not supabase_client:
        raise ValueError("Supabase client is required but not configured.")
    await _db_create(_record_to_db_row(record))

    # Audit: log upload event
    try:
        from db.audit_db import create_audit_entry
        await create_audit_entry(
            prescription_id=record.prescription_id,
            action="uploaded",
            actor_role="doctor",
            actor_id=doctor_id,
            details={"report_type": extracted_data.report_type, "confidence": extracted_data.extraction_confidence},
        )
    except Exception as audit_exc:
        logger.warning(f"Audit log failed (non-critical): {audit_exc}")

    logger.info(f"Prescription record created: {record.prescription_id}")
    return record


async def list_pending_records() -> List[PrescriptionRecord]:
    """Return all records with status pending_admin_review."""
    if not supabase_client:
        return []
    rows = await _db_list_pending()
    return [_db_row_to_record(r) for r in rows]


async def list_records_by_doctor(doctor_id: str) -> List[PrescriptionRecord]:
    """Return all prescriptions uploaded by a specific doctor."""
    if not supabase_client:
        return []
    rows = await _db_list_by_doctor(doctor_id)
    return [_db_row_to_record(r) for r in rows]


async def list_approved_for_patient(patient_id: str) -> List[PrescriptionRecord]:
    """Return approved prescriptions for a patient."""
    if not supabase_client:
        return []
    rows = await _db_list_for_patient(patient_id)
    return [_db_row_to_record(r) for r in rows]


async def approve_record(prescription_id: str, admin_id: str) -> Optional[PrescriptionRecord]:
    """Approve a pending prescription record and trigger chunking pipeline."""
    if not supabase_client:
        return None
    row = await _db_approve(prescription_id, admin_id)
    if not row:
        return None
    record = _db_row_to_record(row)

    # Audit: log approval
    try:
        from db.audit_db import create_audit_entry
        await create_audit_entry(
            prescription_id=prescription_id,
            action="approved",
            actor_role="admin",
            actor_id=admin_id,
        )
    except Exception as audit_exc:
        logger.warning(f"Audit log failed (non-critical): {audit_exc}")

    # Auto-trigger chunking pipeline
    try:
        from services.data_chunker_service import chunk_and_store
        insights_raw = record.extracted_data.patient_insights
        insights_dict = insights_raw.model_dump() if insights_raw else None
        chunks = await chunk_and_store(record, insights_dict)
        logger.info(f"Auto-chunked {len(chunks)} chunks for prescription {prescription_id}")

        # Audit: log chunking
        from db.audit_db import create_audit_entry as _audit
        await _audit(
            prescription_id=prescription_id,
            action="chunked",
            actor_role="system",
            actor_id="auto-pipeline",
            details={"chunk_count": len(chunks)},
        )
    except Exception as chunk_exc:
        logger.warning(f"Chunking pipeline failed (non-critical): {chunk_exc}")

    return record


async def reject_record(
    prescription_id: str, admin_id: str, rejection_reason: str
) -> Optional[PrescriptionRecord]:
    """Reject a pending prescription record."""
    if not supabase_client:
        return None
    row = await _db_reject(prescription_id, admin_id, rejection_reason)
    if not row:
        return None
    record = _db_row_to_record(row)

    # Audit: log rejection
    try:
        from db.audit_db import create_audit_entry
        await create_audit_entry(
            prescription_id=prescription_id,
            action="rejected",
            actor_role="admin",
            actor_id=admin_id,
            details={"reason": rejection_reason},
        )
    except Exception as audit_exc:
        logger.warning(f"Audit log failed (non-critical): {audit_exc}")

    return record


async def get_record(prescription_id: str) -> Optional[PrescriptionRecord]:
    """Return a prescription record by ID regardless of status."""
    if not supabase_client:
        return None
    row = await _db_get(prescription_id)
    return _db_row_to_record(row) if row else None


async def get_approved_record(prescription_id: str) -> Optional[PrescriptionRecord]:
    """Return a prescription record only if it has been approved."""
    record = await get_record(prescription_id)
    if record and record.status == "approved":
        return record
    return None
