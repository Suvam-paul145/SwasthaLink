"""
Pydantic models for request/response validation
Maintains strict type safety and API contracts
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
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
    BOTH = "both"


class Medication(BaseModel):
    """Simplified medication information"""
    name: str = Field(..., description="Plain language name (e.g., 'heart tablet' not 'Metoprolol')")
    dose: str = Field(..., description="e.g., '1 tablet (75mg)'")
    timing: List[str] = Field(..., description="e.g., ['morning', 'evening']")
    reason: str = Field(..., description="Plain language explanation of purpose")
    important: Optional[str] = Field(None, description="Critical warning if any")


class FollowUp(BaseModel):
    """Follow-up appointment information"""
    date: str = Field(..., description="Exact date or 'Ask your doctor'")
    with_doctor: str = Field(..., alias="with", description="Doctor name or department")
    reason: str = Field(..., description="Plain language reason for follow-up")

    class Config:
        populate_by_name = True


class ComprehensionQuestion(BaseModel):
    """MCQ for comprehension testing"""
    question: str = Field(..., min_length=10)
    options: List[str] = Field(..., min_length=4, max_length=4, description="Must have exactly 4 options")
    correct: str = Field(..., pattern="^[A-D]$", description="Correct answer: A, B, C, or D")
    explanation: str = Field(..., description="Why this answer matters")

    @field_validator('options')
    @classmethod
    def validate_options(cls, v):
        if len(v) != 4:
            raise ValueError('Must have exactly 4 options')
        return v


class ProcessRequest(BaseModel):
    """Request model for /api/process endpoint"""
    discharge_text: str = Field(..., min_length=50, max_length=10000, description="Clinical discharge summary")
    role: RoleEnum = Field(..., description="Target audience for simplification")
    language: LanguageEnum = Field(default=LanguageEnum.BOTH, description="Output language(s)")
    re_explain: bool = Field(default=False, description="Trigger simpler re-explanation after low quiz score")
    previous_simplified: Optional[str] = Field(None, description="Previous simplified text for re-explanation context")

    @field_validator('discharge_text')
    @classmethod
    def validate_discharge_text(cls, v):
        v = v.strip()
        if len(v) < 50:
            raise ValueError('Discharge summary too short — minimum 50 characters required')
        return v


class ProcessResponse(BaseModel):
    """Response model for /api/process endpoint"""
    simplified_english: str = Field(..., description="Plain English version")
    simplified_bengali: str = Field(..., description="Everyday Bengali version")
    medications: List[Medication] = Field(default_factory=list, description="Medication list")
    follow_up: Optional[FollowUp] = Field(None, description="Follow-up instructions")
    warning_signs: List[str] = Field(default_factory=list, description="Emergency symptoms to watch for")
    comprehension_questions: List[ComprehensionQuestion] = Field(
        ...,
        min_length=3,
        max_length=3,
        description="Exactly 3 MCQs for comprehension testing"
    )
    whatsapp_message: str = Field(..., max_length=1600, description="WhatsApp-formatted message under 1600 chars")
    session_id: Optional[str] = Field(None, description="Session tracking ID")


class WhatsAppRequest(BaseModel):
    """Request model for /api/send-whatsapp endpoint"""
    phone_number: str = Field(..., pattern=r'^\+\d{10,15}$', description="E.164 format: +919876543210")
    message: str = Field(..., min_length=10, max_length=1600, description="Message content")
    session_id: Optional[str] = Field(None, description="Session tracking ID for persistent timeline")

    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v):
        if not v.startswith('+'):
            raise ValueError('Phone number must start with + and country code')
        return v


class WhatsAppResponse(BaseModel):
    """Response model for WhatsApp send operation"""
    status: Literal["sent", "failed"]
    message: str
    sid: Optional[str] = Field(None, description="Twilio message SID if successful")


class QuizSubmitRequest(BaseModel):
    """Request model for /api/quiz/submit endpoint"""
    session_id: str = Field(..., description="Session tracking ID")
    answers: List[str] = Field(..., min_length=3, max_length=3, description="User's answers: ['A', 'B', 'D']")
    correct_answers: List[str] = Field(..., min_length=3, max_length=3, description="Correct answers from API")

    @field_validator('answers', 'correct_answers')
    @classmethod
    def validate_answers(cls, v):
        for answer in v:
            if answer not in ['A', 'B', 'C', 'D']:
                raise ValueError('Answers must be A, B, C, or D')
        return v


class QuizSubmitResponse(BaseModel):
    """Response model for quiz submission"""
    score: int = Field(..., ge=0, le=3, description="Score out of 3")
    out_of: int = Field(default=3, description="Total questions")
    passed: bool = Field(..., description="True if score >= 2")
    needs_re_explain: bool = Field(..., description="True if score < 2, triggers simpler explanation")
    feedback: str = Field(..., description="Encouraging feedback based on score")


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


class HealthResponse(BaseModel):
    """Health check response"""
    status: Literal["ok", "degraded", "down"]
    service: str = "SwasthaLink"
    version: str = "1.0.0"
    checks: Optional[dict] = Field(None, description="Individual service health checks")


# ---------------------------------------------------------------------------
# Authentication models
# ---------------------------------------------------------------------------

class AuthLoginRequest(BaseModel):
    """Role-based login request"""
    role: Literal["patient", "doctor", "admin"]
    email: str = Field(..., min_length=5, max_length=320, description="User email address")
    password: str = Field(..., min_length=6, max_length=128, description="Account password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        trimmed = value.strip().lower()
        if "@" not in trimmed or "." not in trimmed.split("@")[-1]:
            raise ValueError("Invalid email format")
        return trimmed


class AuthUser(BaseModel):
    """Authenticated user profile"""
    id: Optional[str] = None
    name: str
    email: str
    role: Literal["patient", "doctor", "admin"]
    phone: Optional[str] = None
    phone_verified: bool = False


class AuthLoginResponse(BaseModel):
    """Login response payload"""
    success: bool = True
    message: str = "Login successful"
    user: AuthUser
    access_token: Optional[str] = None
    is_demo: bool = False


# ---------------------------------------------------------------------------
# Prescription RAG pipeline models
# ---------------------------------------------------------------------------

class PrescriptionMedication(BaseModel):
    """Single medication extracted from a handwritten prescription"""
    name: str = Field(..., description="Drug name (generic preferred)")
    strength: Optional[str] = Field(None, description="e.g. '500mg', '5ml'")
    form: Optional[str] = Field(None, description="Tab / Cap / Syrup / Inj / Drops etc.")
    frequency: Optional[str] = Field(None, description="e.g. 'OD', 'BD', 'TDS', 'QID'")
    duration: Optional[str] = Field(None, description="e.g. '5 days', '2 weeks'")
    instructions: Optional[str] = Field(None, description="e.g. 'After food', 'At bedtime'")


class PrescriptionExtractedData(BaseModel):
    """All fields extracted from a handwritten prescription via RAG pipeline"""
    doctor_name: Optional[str] = Field(None, description="Prescribing doctor's full name")
    patient_id: Optional[str] = Field(None, description="UHID / MRN / Patient ID")
    patient_name: Optional[str] = Field(None, description="Patient's full name")
    patient_age: Optional[str] = Field(None, description="Age string, e.g. '35 yrs' or '35/M'")
    patient_gender: Optional[str] = Field(None, description="Male / Female / Other")
    prescription_date: Optional[str] = Field(None, description="Date on prescription")
    medications: List[PrescriptionMedication] = Field(
        default_factory=list, description="List of prescribed medications"
    )
    diagnosis: Optional[str] = Field(None, description="Diagnosis or presenting complaint")
    notes: Optional[str] = Field(None, description="Additional instructions or notes")
    extraction_confidence: float = Field(
        default=0.5, ge=0.0, le=1.0, description="Overall OCR/extraction confidence score"
    )


class PrescriptionStatusEnum(str, Enum):
    """Lifecycle status of a prescription record"""
    PENDING = "pending_admin_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class PrescriptionRecord(BaseModel):
    """Full prescription workflow record stored in the backend"""
    prescription_id: str = Field(..., description="Unique UUID for this prescription")
    status: PrescriptionStatusEnum = Field(
        default=PrescriptionStatusEnum.PENDING, description="Current workflow status"
    )
    doctor_id: str = Field(..., description="ID of the uploading doctor")
    extracted_data: PrescriptionExtractedData = Field(
        ..., description="RAG-extracted prescription fields"
    )
    s3_key: Optional[str] = Field(None, description="S3 object key of the original file")
    created_at: str = Field(..., description="ISO-8601 creation timestamp")
    admin_id: Optional[str] = Field(None, description="Admin who reviewed the record")
    reviewed_at: Optional[str] = Field(None, description="ISO-8601 review timestamp")
    rejection_reason: Optional[str] = Field(None, description="Reason if rejected")


class PrescriptionExtractResponse(BaseModel):
    """Response returned after prescription extraction + record creation"""
    prescription_id: str
    status: str
    extracted_data: PrescriptionExtractedData
    message: str = "Prescription submitted for admin review"


class PrescriptionApproveRequest(BaseModel):
    """Admin approval request"""
    admin_id: str = Field(..., description="ID of the approving admin")


class PrescriptionRejectRequest(BaseModel):
    """Admin rejection request"""
    admin_id: str = Field(..., description="ID of the rejecting admin")
    reason: str = Field(..., min_length=5, description="Reason for rejection")


class PrescriptionPatientViewResponse(BaseModel):
    """Patient-facing readable view of an approved prescription"""
    prescription_id: str
    doctor_name: str = Field(default="Your doctor")
    patient_name: str = Field(default="Patient")
    patient_age: Optional[str] = None
    prescription_date: Optional[str] = None
    diagnosis: Optional[str] = None
    medications: List[PrescriptionMedication]
    notes: Optional[str] = None
    approved_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Patient Signup & OTP models
# ---------------------------------------------------------------------------

class PatientSignupRequest(BaseModel):
    """Patient registration request"""
    name: str = Field(..., min_length=2, max_length=100, description="Full name")
    email: str = Field(..., min_length=5, max_length=320, description="Email address")
    password: str = Field(..., min_length=6, max_length=128, description="Account password")
    phone: str = Field(
        ..., pattern=r'^\+\d{10,15}$',
        description="WhatsApp phone in E.164 format, e.g. +919876543210",
    )

    @field_validator("email")
    @classmethod
    def validate_signup_email(cls, value: str) -> str:
        trimmed = value.strip().lower()
        if "@" not in trimmed or "." not in trimmed.split("@")[-1]:
            raise ValueError("Invalid email format")
        return trimmed


class PatientSignupResponse(BaseModel):
    """Patient registration response"""
    success: bool = True
    message: str = "Account created successfully"
    user_id: Optional[str] = None
    is_demo: bool = False


class OTPSendRequest(BaseModel):
    """Request to send an OTP"""
    phone: str = Field(
        ..., pattern=r'^\+\d{10,15}$',
        description="Phone in E.164 format",
    )
    channel: Literal["whatsapp", "sms"] = "whatsapp"


class OTPVerifyRequest(BaseModel):
    """Request to verify an OTP"""
    phone: str = Field(
        ..., pattern=r'^\+\d{10,15}$',
        description="Phone in E.164 format",
    )
    code: str = Field(
        ..., min_length=4, max_length=8,
        description="OTP code received",
    )
