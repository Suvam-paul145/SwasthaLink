"""
Pydantic models for authentication, signup, and OTP flows.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal


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


class SignupRequest(BaseModel):
    """Role-based registration request"""
    role: Literal["patient", "doctor", "admin"] = "patient"
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


# Backward compat alias
PatientSignupRequest = SignupRequest


class SignupResponse(BaseModel):
    """Registration response"""
    success: bool = True
    message: str = "Account created successfully"
    user_id: Optional[str] = None
    is_demo: bool = False


# Backward compat alias
PatientSignupResponse = SignupResponse


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
    user_id: Optional[str] = Field(None, description="Optional user ID to mark a single profile as verified")
    email: Optional[str] = Field(None, description="Optional email to disambiguate duplicate phone numbers")


class PasswordResetOTPRequest(BaseModel):
    """Request to send an OTP for password reset"""
    email: str = Field(..., min_length=5, max_length=320, description="User email address")
    phone: str = Field(
        ..., pattern=r'^\+\d{10,15}$',
        description="Phone in E.164 format",
    )

class PasswordResetConfirmRequest(BaseModel):
    """Request to verify OTP and set new password"""
    email: str = Field(..., min_length=5, max_length=320, description="User email address")
    phone: str = Field(
        ..., pattern=r'^\+\d{10,15}$',
        description="Phone in E.164 format",
    )
    code: str = Field(
        ..., min_length=4, max_length=8,
        description="OTP code received",
    )
    new_password: str = Field(..., min_length=6, max_length=128, description="New password")

    @field_validator("email")
    @classmethod
    def validate_reset_email(cls, value: str) -> str:
        trimmed = value.strip().lower()
        if "@" not in trimmed or "." not in trimmed.split("@")[-1]:
            raise ValueError("Invalid email format")
        return trimmed


class ProfileUpdateRequest(BaseModel):
    """Request to update user profile (name and/or phone)."""
    name: Optional[str] = Field(None, min_length=2, max_length=100, description="Display name")
    phone: Optional[str] = Field(
        None, pattern=r'^\+\d{10,15}$',
        description="Phone in E.164 format",
    )
