"""Auth routes — login, signup, OTP, session verification."""

import logging
from fastapi import APIRouter, HTTPException, Depends

from models import (
    AuthLoginRequest, AuthLoginResponse,
    OTPSendRequest, OTPVerifyRequest,
)
from models.auth import SignupRequest, SignupResponse, PasswordResetOTPRequest, PasswordResetConfirmRequest, ProfileUpdateRequest
from auth.auth_service import login_user, signup_user
from db.supabase_service import supabase_client
from auth.jwt_utils import get_current_user
from core.exceptions import AuthServiceError, OTPServiceError
from services.otp_service import send_otp, verify_otp
from db.profile_db import update_phone_verified_for_account, update_profile

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/auth/login", response_model=AuthLoginResponse)
async def auth_login(request: AuthLoginRequest):
    """Authenticate by role + email + password. Returns a 24-hour JWT token."""
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
    """Register a new user account with the specified role. Returns a JWT token."""
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


@router.get("/api/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    """
    Verify JWT token and return the current user profile.
    Used by the frontend to restore sessions on page reload.
    """
    try:
        # Optionally fetch fresh profile data from DB
        profile = None
        if supabase_client and user.get("id"):
            try:
                result = (
                    supabase_client
                    .table("profiles")
                    .select("*")
                    .eq("user_id", user["id"])
                    .limit(1)
                    .execute()
                )
                if result.data:
                    profile = result.data[0]
            except Exception:
                pass

        return {
            "success": True,
            "user": {
                "id": user.get("id"),
                "name": profile.get("full_name", user.get("name", "User")) if profile else user.get("name", "User"),
                "email": profile.get("email", user.get("email", "")) if profile else user.get("email", ""),
                "role": profile.get("role", user.get("role", "")) if profile else user.get("role", ""),
                "phone": profile.get("phone", "") if profile else "",
                "phone_verified": bool(profile.get("phone_verified", False)) if profile else False,
            },
        }
    except Exception as exc:
        logger.error(f"Error fetching user profile: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch user profile")


@router.patch("/api/auth/profile")
async def auth_update_profile(request: ProfileUpdateRequest, user: dict = Depends(get_current_user)):
    """Update current user's profile (name and/or phone). Resets phone_verified when phone changes."""
    try:
        user_id = user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in token")

        result = await update_profile(
            user_id=user_id,
            name=request.name,
            phone=request.phone,
        )
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Profile update failed"))

        # Fetch fresh profile to return
        profile_data = result.get("data", {})
        return {
            "success": True,
            "message": "Profile updated",
            "user": {
                "id": user_id,
                "name": profile_data.get("full_name", request.name or user.get("name")),
                "email": user.get("email", ""),
                "role": user.get("role", ""),
                "phone": profile_data.get("phone", request.phone or ""),
                "phone_verified": profile_data.get("phone_verified", False),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Profile update error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


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
            await update_phone_verified_for_account(
                user_id=request.user_id or "",
                email=request.email or "",
                phone=request.phone,
            )
        return result
    except OTPServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
    except Exception as exc:
        logger.error(f"OTP verify error: {exc}")
        raise HTTPException(status_code=500, detail="OTP verification failed")


@router.post("/api/auth/forgot-password")
async def auth_forgot_password(request: PasswordResetOTPRequest):
    """Find user by email and phone and send OTP."""
    try:
        # Check if user exists with this email and phone
        profile = (
            supabase_client
            .table("profiles")
            .select("id")
            .eq("email", request.email.lower().strip())
            .eq("phone", request.phone)
            .limit(1)
            .execute()
        )

        if not profile.data:
            raise AuthServiceError("No account found matching this email and phone number", 404)

        # Send OTP
        return await send_otp(request.phone, channel='sms')
    except AuthServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
    except Exception as exc:
        logger.error(f"Forgot password error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to process forgot password request")


@router.post("/api/auth/reset-password")
async def auth_reset_password(request: PasswordResetConfirmRequest):
    """Verify OTP and update user's password."""
    try:
        # First verify OTP
        result = await verify_otp(request.phone, request.code)
        if not result.get("verified"):
            raise AuthServiceError("Invalid or expired OTP", 400)

        # Hash the new password before storing
        try:
            import bcrypt
            hashed_password = bcrypt.hashpw(
                request.new_password.encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8")
        except ImportError:
            hashed_password = request.new_password

        # Update user password in profile
        update_res = (
            supabase_client
            .table("profiles")
            .update({"password_hash": hashed_password})
            .eq("email", request.email.lower().strip())
            .eq("phone", request.phone)
            .execute()
        )

        if not getattr(update_res, "data", []):
            pass

        return {"success": True, "message": "Password reset successfully"}
    except (OTPServiceError, AuthServiceError) as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
    except Exception as exc:
        logger.error(f"Reset password error: {exc}")
        raise HTTPException(status_code=500, detail="Password reset failed")
