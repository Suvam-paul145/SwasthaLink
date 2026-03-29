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

import google.generativeai as genai

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


async def extract_prescription_data(ocr_text: str) -> PrescriptionExtractedData:
    """
    Run the RAG extraction pipeline on OCR text from a prescription image.

    1. Retrieve relevant context snippets.
    2. Build a constrained prompt and call Gemini.
    3. Parse JSON into a PrescriptionExtractedData model.
    """
    from gemini_service import GEMINI_API_KEY, GeminiServiceError  # local import to avoid circular

    if not GEMINI_API_KEY:
        raise GeminiServiceError("Gemini API key not configured")

    context_snippets = retrieve_context(ocr_text, top_k=4)
    context_text = "\n\n".join(f"• {s}" for s in context_snippets)

    prompt = _PRESCRIPTION_EXTRACTION_PROMPT.format(
        context=context_text,
        ocr_text=ocr_text,
    )

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        generation_config={"temperature": 0.1, "max_output_tokens": 2048},
    )

    logger.info("Calling Gemini for prescription RAG extraction...")
    response = model.generate_content(prompt)

    if not response.text:
        raise GeminiServiceError("Gemini returned empty response for prescription extraction")

    logger.info(f"Gemini prescription response: {len(response.text)} chars")

    try:
        data = _extract_json(response.text)
    except ValueError as exc:
        logger.error(f"Prescription JSON parse failed: {exc}")
        raise GeminiServiceError(f"Failed to parse prescription extraction JSON: {exc}") from exc

    # Build medication list
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


# ---------------------------------------------------------------------------
# In-memory prescription workflow store
# ---------------------------------------------------------------------------
# NOTE: Records reset on process restart.  Replace with a DB-backed store for
# production persistence.
# ---------------------------------------------------------------------------

_PRESCRIPTION_STORE: Dict[str, PrescriptionRecord] = {}


def create_prescription_record(
    extracted_data: PrescriptionExtractedData,
    doctor_id: str,
    s3_key: Optional[str] = None,
) -> PrescriptionRecord:
    """Create a new pending prescription record and persist in the store."""
    record = PrescriptionRecord(
        prescription_id=str(uuid.uuid4()),
        status="pending_admin_review",
        doctor_id=doctor_id,
        extracted_data=extracted_data,
        s3_key=s3_key,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    _PRESCRIPTION_STORE[record.prescription_id] = record
    logger.info(f"Prescription record created: {record.prescription_id}")
    return record


def list_pending_records() -> List[PrescriptionRecord]:
    """Return all records with status pending_admin_review."""
    return [r for r in _PRESCRIPTION_STORE.values() if r.status == "pending_admin_review"]


def approve_record(prescription_id: str, admin_id: str) -> Optional[PrescriptionRecord]:
    """Approve a pending prescription record. Returns None if not found."""
    record = _PRESCRIPTION_STORE.get(prescription_id)
    if record is None:
        return None
    record.status = "approved"
    record.admin_id = admin_id
    record.reviewed_at = datetime.now(timezone.utc).isoformat()
    logger.info(f"Prescription {prescription_id} approved by {admin_id}")
    return record


def reject_record(
    prescription_id: str, admin_id: str, rejection_reason: str
) -> Optional[PrescriptionRecord]:
    """Reject a pending prescription record. Returns None if not found."""
    record = _PRESCRIPTION_STORE.get(prescription_id)
    if record is None:
        return None
    record.status = "rejected"
    record.admin_id = admin_id
    record.rejection_reason = rejection_reason
    record.reviewed_at = datetime.now(timezone.utc).isoformat()
    logger.info(f"Prescription {prescription_id} rejected by {admin_id}")
    return record


def get_record(prescription_id: str) -> Optional[PrescriptionRecord]:
    """Return a prescription record by ID regardless of status (public API)."""
    return _PRESCRIPTION_STORE.get(prescription_id)


def get_approved_record(prescription_id: str) -> Optional[PrescriptionRecord]:
    """Return a prescription record only if it has been approved."""
    record = _PRESCRIPTION_STORE.get(prescription_id)
    if record and record.status == "approved":
        return record
    return None
