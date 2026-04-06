"""
Shared enums and common response models.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class RoleEnum(str, Enum):
    """User roles for tailored simplification"""
    PATIENT = "patient"
    CAREGIVER = "caregiver"
    ELDERLY = "elderly"


class LanguageEnum(str, Enum):
    """Supported output languages"""
    ENGLISH = "en"
    BENGALI = "bn"
    HINDI = "hi"
    TAMIL = "ta"
    TELUGU = "te"
    MARATHI = "mr"
    BOTH = "both"


class HealthResponse(BaseModel):
    """Health check response"""
    status: Literal["ok", "degraded", "down"]
    service: str = "SwasthaLink"
    version: str = "1.0.0"
    checks: Optional[dict] = Field(None, description="Individual service health checks")


class UploadRequest(BaseModel):
    """Request model for /api/upload endpoint (Phase 7 - Post-MVP)"""
    file_type: Literal["pdf", "jpg", "png"]
    session_id: str


class UploadResponse(BaseModel):
    """Response model for upload OCR extraction"""
    extracted_text: str = Field(..., description="OCR extracted text from PDF/image")
    file_type: str
    session_id: str
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="OCR confidence score if available")
