"""Auth routes — login, signup, OTP."""

import logging
from fastapi import APIRouter, HTTPException

from models import (
    AuthLoginRequest, AuthLoginResponse,
    OTPSendRequest, OTPVerifyRequest,
)
from models.auth import SignupRequest, SignupResponse
from auth.auth_service import login_user, signup_user
from core.exceptions import AuthServiceError, OTPServiceError
from services.otp_service import send_otp, verify_otp
from db.profile_db import update_phone_verified

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/auth/login", response_model=AuthLoginResponse)
async def auth_login(request: AuthLoginRequest):
    """Authenticate by role + email + password."""
    try:
        result = login_user(email=request.email, password=request.password, role=request.role)
        return AuthLoginResponse(
            success=True,
            message="Login successful",
            user=result["user"],
            access_token=result.get("access_token"),
            is_demo=result.get("is_demo", False),
        )
    except AuthServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
    except Exception as exc:
        logger.error(f"Unexpected auth error: {exc}")
        raise HTTPException(status_code=500, detail="Login failed")


@router.post("/api/auth/signup", response_model=SignupResponse)
async def auth_signup(request: SignupRequest):
    """Register a new user account with the specified role."""
    try:
        result = signup_user(
            name=request.name, email=request.email,
            password=request.password, phone=request.phone,
            role=request.role,
        )
        return SignupResponse(
            success=True,
            message="Account created. Please verify your phone number.",
            user_id=result.get("user_id"),
            is_demo=result.get("is_demo", False),
        )
    except AuthServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
    except Exception as exc:
        logger.error(f"Signup error: {exc}")
        raise HTTPException(status_code=500, detail="Signup failed")


@router.post("/api/auth/send-otp")
async def auth_send_otp(request: OTPSendRequest):
    """Send OTP to phone via WhatsApp or SMS."""
    try:
        return await send_otp(request.phone, channel=request.channel)
    except OTPServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
    except Exception as exc:
        logger.error(f"OTP send error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to send OTP")


@router.post("/api/auth/verify-otp")
async def auth_verify_otp(request: OTPVerifyRequest):
    """Verify a previously sent OTP and mark phone as verified."""
    try:
        result = await verify_otp(request.phone, request.code)
        if result.get("verified"):
            await update_phone_verified(user_id="", phone=request.phone)
        return result
    except OTPServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
    except Exception as exc:
        logger.error(f"OTP verify error: {exc}")
        raise HTTPException(status_code=500, detail="OTP verification failed")
