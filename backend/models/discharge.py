"""
Pydantic models for discharge summary processing, quiz, and comprehension.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional

from models.common import RoleEnum, LanguageEnum


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
    patient_id: str = Field(default="", description="Patient ID to associate this summary")
    doctor_id: str = Field(default="", description="Doctor ID submitting the summary")
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
    risk_score: Optional[int] = Field(None, description="Readmission risk score 0-100")
    risk_level: Optional[str] = Field(None, description="'low', 'moderate', or 'high'")


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
