"""Reports route — server-side PDF generation."""

import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

from services.report_generator import generate_report_pdf

logger = logging.getLogger(__name__)
router = APIRouter()


class ReportRequest(BaseModel):
    """Payload accepted by POST /api/reports/generate."""
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None
    patient_age: Optional[str] = None
    patient_gender: Optional[str] = None
    doctor_name: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    prescription_date: Optional[str] = None
    medications: List[Dict[str, Any]] = Field(default_factory=list)
    tests: List[Dict[str, Any]] = Field(default_factory=list)
    patient_insights: Optional[Dict[str, Any]] = None
    discharge_history: List[Dict[str, Any]] = Field(default_factory=list)


@router.post("/api/reports/generate")
async def generate_report(payload: ReportRequest):
    """Generate a health-report PDF and return it as base64 + metadata."""
    try:
        result = generate_report_pdf(payload.model_dump())
        return {
            "success": True,
            "pdf_base64": result["pdf_base64"],
            "text_summary": result["text_summary"],
            "file_name": result["file_name"],
        }
    except Exception as exc:
        logger.exception("Report generation failed")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}")


@router.post("/api/reports/generate-pdf")
async def generate_report_download(payload: ReportRequest):
    """Generate and stream the PDF directly (for direct download)."""
    try:
        result = generate_report_pdf(payload.model_dump())
        return Response(
            content=result["pdf_bytes"],
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{result["file_name"]}"'
            },
        )
    except Exception as exc:
        logger.exception("Report PDF generation failed")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}")
