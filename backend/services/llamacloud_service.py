"""
LlamaCloud document extraction service for prescription uploads.

This service is preferred over Gemini for upload-time prescription
extraction because LlamaCloud is built for document OCR/parsing and
schema-based extraction on PDFs and scans.
"""

import asyncio
import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from core.config import read_env
from core.exceptions import LlamaCloudServiceError
from models.prescription import PrescriptionExtractedData
from services.prescription_rag_service import _parse_gemini_to_extracted_data

logger = logging.getLogger(__name__)


class _LlamaCloudMedication(BaseModel):
    name: str = Field(description="Medicine name exactly as seen or inferred safely from the document")
    strength: Optional[str] = Field(default=None, description="Strength like 500 mg or 5 ml")
    form: Optional[str] = Field(default=None, description="Tablet, Capsule, Syrup, Injection, Drops, Cream, Ointment")
    frequency: Optional[str] = Field(default=None, description="How often to take it")
    duration: Optional[str] = Field(default=None, description="How long to take it")
    instructions: Optional[str] = Field(default=None, description="Extra usage instructions like after food")
    purpose: Optional[str] = Field(default=None, description="Short reason it was prescribed")


class _LlamaCloudTest(BaseModel):
    name: str = Field(description="Recommended test name")
    reason: Optional[str] = Field(default=None, description="Why the test was recommended")
    urgency: Optional[str] = Field(default=None, description="Routine, Urgent, or STAT")


class _LlamaCloudPrescriptionExtract(BaseModel):
    report_type: str = Field(default="prescription", description="Document type")
    doctor_name: Optional[str] = Field(default=None, description="Prescribing doctor's full name")
    patient_id: Optional[str] = Field(default=None, description="UHID, MRN, or patient ID")
    patient_name: Optional[str] = Field(default=None, description="Patient full name")
    patient_age: Optional[str] = Field(default=None, description="Age string like 35 yrs")
    patient_gender: Optional[str] = Field(default=None, description="Male, Female, or Other")
    prescription_date: Optional[str] = Field(default=None, description="Date on the prescription")
    medications: list[_LlamaCloudMedication] = Field(default_factory=list, description="List of prescribed medicines")
    tests: list[_LlamaCloudTest] = Field(default_factory=list, description="Recommended tests if present")
    diagnosis: Optional[str] = Field(default=None, description="Diagnosis or presenting complaint")
    notes: Optional[str] = Field(default=None, description="Other important doctor notes")
    extraction_confidence: float = Field(default=0.7, description="Confidence from 0.0 to 1.0")


_MIME_SUFFIX_MAP = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
}


def get_configured_llamacloud_api_key() -> Optional[str]:
    """Return the configured LlamaCloud API key, if available."""
    return read_env("LLAMA_CLOUD_API_KEY")


def is_llamacloud_configured() -> bool:
    """Return True when a usable LlamaCloud API key is configured."""
    return bool(get_configured_llamacloud_api_key())


def _coerce_extract_result(extract_result: Any) -> Dict[str, Any]:
    """Normalize SDK output into a plain dict."""
    if extract_result is None:
        raise LlamaCloudServiceError("LlamaCloud returned no extract result")

    if isinstance(extract_result, dict):
        return extract_result

    for attr in ("model_dump", "dict"):
        method = getattr(extract_result, attr, None)
        if callable(method):
            data = method()
            if isinstance(data, dict):
                return data

    for attr in ("data", "result", "value"):
        value = getattr(extract_result, attr, None)
        if isinstance(value, dict):
            return value

    if isinstance(extract_result, str):
        try:
            data = json.loads(extract_result)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError as exc:
            raise LlamaCloudServiceError(f"Invalid JSON returned by LlamaCloud: {exc}") from exc

    raise LlamaCloudServiceError(
        f"Unsupported LlamaCloud extract result type: {type(extract_result).__name__}"
    )


def _resolve_suffix(filename: str, mime_type: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix:
        return suffix
    return _MIME_SUFFIX_MAP.get(mime_type, ".bin")


def _run_llamacloud_extract_job(file_content: bytes, filename: str, mime_type: str) -> Dict[str, Any]:
    """Upload a document to LlamaCloud and run schema-based extraction."""
    if not is_llamacloud_configured():
        raise LlamaCloudServiceError("LlamaCloud API key not configured")

    try:
        from llama_cloud import LlamaCloud
    except ImportError as exc:
        raise LlamaCloudServiceError(
            "LlamaCloud SDK is not installed. Add `llama-cloud>=2.1` to backend dependencies."
        ) from exc

    client = LlamaCloud()
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=_resolve_suffix(filename, mime_type)) as temp_file:
            temp_file.write(file_content)
            temp_path = temp_file.name

        uploaded = client.files.create(file=temp_path, purpose="extract")
        job = client.extract.create(
            document_input_value=uploaded.id,
            config={
                "extract_options": {
                    "data_schema": _LlamaCloudPrescriptionExtract.model_json_schema(),
                    "tier": "agentic",
                }
            },
        )
        return _coerce_extract_result(getattr(job, "extract_result", None))
    except LlamaCloudServiceError:
        raise
    except Exception as exc:
        logger.error("LlamaCloud extraction failed: %s", exc)
        raise LlamaCloudServiceError(f"LlamaCloud extraction failed: {exc}") from exc
    finally:
        if temp_path:
            try:
                os.unlink(temp_path)
            except OSError:
                pass


async def extract_prescription_data_with_llamacloud(
    file_content: bytes,
    filename: str,
    mime_type: str,
    report_type: str = "prescription",
) -> PrescriptionExtractedData:
    """Extract structured prescription data from a document using LlamaCloud."""
    result = await asyncio.to_thread(_run_llamacloud_extract_job, file_content, filename, mime_type)

    if not isinstance(result, dict):
        raise LlamaCloudServiceError("LlamaCloud extraction returned an invalid response payload")

    result["report_type"] = report_type or result.get("report_type") or "prescription"
    extracted = _parse_gemini_to_extracted_data(result)
    return extracted
