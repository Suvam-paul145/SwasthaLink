"""
Pydantic models for WhatsApp messaging.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal


class WhatsAppRequest(BaseModel):
    """Request model for /api/send-whatsapp endpoint"""
    phone_number: str = Field(..., description="E.164 format: +919876543210")
    message: str = Field(..., min_length=10, max_length=1600, description="Message content")
    session_id: Optional[str] = Field(None, description="Session tracking ID for persistent timeline")

    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v):
        import re
        # Strip common formatting chars
        cleaned = re.sub(r'[-\s()]', '', v)
        # Add + prefix if missing
        if not cleaned.startswith('+'):
            cleaned = '+' + cleaned
        # Validate E.164 format
        if not re.match(r'^\+\d{10,15}$', cleaned):
            raise ValueError('Phone number must be E.164 format (e.g. +919876543210)')
        return cleaned


class WhatsAppResponse(BaseModel):
    """Response model for WhatsApp send operation"""
    status: Literal["sent", "failed"]
    message: str
    sid: Optional[str] = Field(None, description="Twilio message SID if successful")
