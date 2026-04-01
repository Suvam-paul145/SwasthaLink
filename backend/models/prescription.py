"""
Pydantic models for the prescription RAG pipeline.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class PrescriptionTest(BaseModel):
    """Medical test extracted from prescription"""
    name: str = Field(..., description="Test name (e.g. ECG, Blood Test, MRI)")
    reason: Optional[str] = Field(None, description="Why this test is needed")
    urgency: Optional[str] = Field(None, description="Routine / Urgent / STAT")


class DosageSchedule(BaseModel):
    """Structured timing for a medication"""
    morning: Optional[str] = Field(None, description="Morning dose instruction")
    afternoon: Optional[str] = Field(None, description="Afternoon dose instruction")
    evening: Optional[str] = Field(None, description="Evening dose instruction")
    night: Optional[str] = Field(None, description="Night/bedtime dose instruction")


class PrescriptionMedication(BaseModel):
    """Single medication extracted from a handwritten prescription"""
    name: str = Field(..., description="Drug name (generic preferred)")
    strength: Optional[str] = Field(None, description="e.g. '500 mg', '5 ml'")
    form: Optional[str] = Field(None, description="Tablet / Capsule / Syrup / Injection / Drops etc.")
    frequency: Optional[str] = Field(None, description="e.g. 'Once daily (morning)', 'Twice daily'")
    duration: Optional[str] = Field(None, description="e.g. '5 days', '2 weeks'")
    instructions: Optional[str] = Field(None, description="e.g. 'After food', 'At bedtime'")
    purpose: Optional[str] = Field(None, description="Brief reason why prescribed")
    schedule: Optional[DosageSchedule] = Field(None, description="Structured timing")
    warnings: Optional[str] = Field(None, description="Important warnings for this medication")


class PatientInsights(BaseModel):
    """Patient-friendly transformation of the prescription"""
    medication_guide: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of {name, what, why, when, caution} for each medication"
    )
    test_guide: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of {name, why, what_to_expect} for each test"
    )
    health_summary: Optional[str] = Field(
        None, description="Plain-language health summary"
    )
    dos_and_donts: Optional[Dict[str, List[str]]] = Field(
        None, description="{'do': [...], 'dont': [...]}"
    )


class PrescriptionExtractedData(BaseModel):
    """All fields extracted from a handwritten prescription via RAG pipeline"""
    doctor_name: Optional[str] = Field(None, description="Prescribing doctor's full name")
    patient_id: Optional[str] = Field(None, description="UHID / MRN / Patient ID")
    patient_name: Optional[str] = Field(None, description="Patient's full name")
    patient_age: Optional[str] = Field(None, description="Age string, e.g. '35 yrs'")
    patient_gender: Optional[str] = Field(None, description="Male / Female / Other")
    prescription_date: Optional[str] = Field(None, description="Date on prescription")
    medications: List[PrescriptionMedication] = Field(
        default_factory=list, description="List of prescribed medications"
    )
    tests: List[Dict[str, Any]] = Field(
        default_factory=list, description="List of recommended tests"
    )
    diagnosis: Optional[str] = Field(None, description="Diagnosis or presenting complaint")
    notes: Optional[str] = Field(None, description="Additional instructions or notes")
    extraction_confidence: float = Field(
        default=0.5, ge=0.0, le=1.0, description="Overall extraction confidence score"
    )
    report_type: str = Field(
        default="prescription",
        description="prescription / ecg / echo / ct_scan / mri / blood_test / other"
    )
    raw_ocr_text: Optional[str] = Field(None, description="Raw OCR text for audit purposes")
    patient_insights: Optional[PatientInsights] = Field(
        None, description="Patient-friendly content (generated on approval)"
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
    linked_prescription_id: Optional[str] = Field(
        None, description="Parent prescription ID for linked reports"
    )


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
    tests: List[Dict[str, Any]] = Field(default_factory=list)
    notes: Optional[str] = None
    approved_at: Optional[str] = None
    patient_insights: Optional[PatientInsights] = None
    report_type: str = "prescription"
