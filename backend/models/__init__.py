"""
Models package — backward-compatible re-exports.
``from models import ProcessRequest`` still works.
"""

# Common
from models.common import (
    RoleEnum,
    LanguageEnum,
    HealthResponse,
    UploadRequest,
    UploadResponse,
)

# Discharge / processing
from models.discharge import (
    Medication,
    FollowUp,
    ComprehensionQuestion,
    ProcessRequest,
    ProcessResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)

# Auth
from models.auth import (
    AuthLoginRequest,
    AuthUser,
    AuthLoginResponse,
    SignupRequest,
    SignupResponse,
    PatientSignupRequest,
    PatientSignupResponse,
    OTPSendRequest,
    OTPVerifyRequest,
)

# WhatsApp
from models.whatsapp import (
    WhatsAppRequest,
    WhatsAppResponse,
)

# Prescription
from models.prescription import (
    PrescriptionTest,
    DosageSchedule,
    PatientInsights,
    PrescriptionMedication,
    PrescriptionExtractedData,
    PrescriptionStatusEnum,
    PrescriptionRecord,
    PrescriptionExtractResponse,
    PrescriptionApproveRequest,
    PrescriptionRejectRequest,
    PrescriptionPatientViewResponse,
)

__all__ = [
    # Common
    "RoleEnum", "LanguageEnum", "HealthResponse", "UploadRequest", "UploadResponse",
    # Discharge
    "Medication", "FollowUp", "ComprehensionQuestion",
    "ProcessRequest", "ProcessResponse",
    "QuizSubmitRequest", "QuizSubmitResponse",
    # Auth
    "AuthLoginRequest", "AuthUser", "AuthLoginResponse",
    "SignupRequest", "SignupResponse",
    "PatientSignupRequest", "PatientSignupResponse",
    "OTPSendRequest", "OTPVerifyRequest",
    # WhatsApp
    "WhatsAppRequest", "WhatsAppResponse",
    # Prescription
    "PrescriptionMedication", "PrescriptionExtractedData", "PrescriptionStatusEnum",
    "PrescriptionRecord", "PrescriptionExtractResponse",
    "PrescriptionApproveRequest", "PrescriptionRejectRequest",
    "PrescriptionPatientViewResponse",
]
