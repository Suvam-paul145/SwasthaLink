"""
OTP Service — WhatsApp / SMS OTP via Twilio Verify API.

Usage:
    result = await send_otp("+919876543210")
    verified = await verify_otp("+919876543210", "123456")
"""

import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Twilio Verify setup
# ---------------------------------------------------------------------------

try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioRestException
    TWILIO_SDK_AVAILABLE = True
except ImportError:
    Client = None

    class TwilioRestException(Exception):
        """Fallback when Twilio SDK is missing."""

    TWILIO_SDK_AVAILABLE = False


def _read_env(*names: str) -> Optional[str]:
    for name in names:
        raw = os.getenv(name)
        if raw and raw.strip():
            return raw.strip()
    return None


TWILIO_ACCOUNT_SID = _read_env("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = _read_env("TWILIO_AUTH_TOKEN")
TWILIO_API_KEY_SID = _read_env("TWILIO_API_KEY_SID", "TWILIO_API_KEY")
TWILIO_API_KEY_SECRET = _read_env("TWILIO_API_KEY_SECRET", "TWILIO_API_SECRET")
TWILIO_VERIFY_SERVICE_SID = _read_env("TWILIO_VERIFY_SERVICE_SID")

# Build the Twilio client (reuse the same logic as twilio_service.py)
_twilio_client = None
if TWILIO_SDK_AVAILABLE:
    if TWILIO_ACCOUNT_SID and TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET:
        try:
            _twilio_client = Client(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_ACCOUNT_SID)
        except Exception as exc:
            logger.error(f"OTP service: Failed to create Twilio client (API Key): {exc}")
    elif TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        except Exception as exc:
            logger.error(f"OTP service: Failed to create Twilio client (Auth Token): {exc}")


class OTPServiceError(Exception):
    """Raised when OTP send/verify fails."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


# ---------------------------------------------------------------------------
# In-memory OTP fallback (for demo/testing without Twilio Verify)
# ---------------------------------------------------------------------------
_DEMO_OTP_STORE: Dict[str, str] = {}
_DEMO_OTP_CODE = "123456"  # fixed demo code for testing


def _is_verify_configured() -> bool:
    return bool(_twilio_client and TWILIO_VERIFY_SERVICE_SID)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def send_otp(phone_number: str, channel: str = "whatsapp") -> Dict[str, Any]:
    """
    Send an OTP to the given phone number.

    Args:
        phone_number: E.164 format, e.g. "+919876543210"
        channel: 'whatsapp' | 'sms' (default: whatsapp)

    Returns:
        {"success": True/False, "message": ..., "demo_mode": True/False}
    """
    if not phone_number or not phone_number.startswith("+"):
        raise OTPServiceError("Phone number must be in E.164 format (e.g. +919876543210)", 400)

    # --- Real Twilio Verify ---
    if _is_verify_configured():
        try:
            verification = _twilio_client.verify \
                .v2 \
                .services(TWILIO_VERIFY_SERVICE_SID) \
                .verifications \
                .create(to=phone_number, channel=channel)

            logger.info(f"OTP sent to {phone_number} via {channel} — SID: {verification.sid}")
            return {
                "success": True,
                "message": f"OTP sent to {phone_number} via {channel}",
                "demo_mode": False,
            }
        except TwilioRestException as exc:
            logger.error(f"Twilio Verify error: {exc}")
            raise OTPServiceError(f"Failed to send OTP: {exc.msg}", 502)
        except Exception as exc:
            logger.error(f"Unexpected OTP send error: {exc}")
            raise OTPServiceError(f"Failed to send OTP: {str(exc)}", 500)

    # --- Demo fallback ---
    logger.warning(f"Twilio Verify not configured — using demo OTP for {phone_number}")
    _DEMO_OTP_STORE[phone_number] = _DEMO_OTP_CODE
    return {
        "success": True,
        "message": f"Demo OTP ({_DEMO_OTP_CODE}) assigned for {phone_number}",
        "demo_mode": True,
    }


async def verify_otp(phone_number: str, code: str) -> Dict[str, Any]:
    """
    Verify a previously sent OTP.

    Args:
        phone_number: E.164 format
        code: 6-digit code entered by the user

    Returns:
        {"success": True/False, "verified": True/False, ...}
    """
    if not phone_number or not phone_number.startswith("+"):
        raise OTPServiceError("Phone number must be in E.164 format", 400)
    if not code or len(code) < 4:
        raise OTPServiceError("OTP code is required (minimum 4 digits)", 400)

    # --- Real Twilio Verify ---
    if _is_verify_configured():
        try:
            verification_check = _twilio_client.verify \
                .v2 \
                .services(TWILIO_VERIFY_SERVICE_SID) \
                .verification_checks \
                .create(to=phone_number, code=code)

            approved = verification_check.status == "approved"
            logger.info(f"OTP verification for {phone_number}: {verification_check.status}")
            return {
                "success": True,
                "verified": approved,
                "status": verification_check.status,
                "demo_mode": False,
            }
        except TwilioRestException as exc:
            logger.error(f"Twilio Verify check error: {exc}")
            return {
                "success": False,
                "verified": False,
                "error": str(exc.msg),
                "demo_mode": False,
            }
        except Exception as exc:
            logger.error(f"Unexpected OTP verify error: {exc}")
            raise OTPServiceError(f"OTP verification failed: {str(exc)}", 500)

    # --- Demo fallback ---
    expected = _DEMO_OTP_STORE.get(phone_number)
    if expected is None:
        return {
            "success": False,
            "verified": False,
            "error": "No OTP was sent for this number (demo mode). Send OTP first.",
            "demo_mode": True,
        }

    verified = code == expected
    if verified:
        del _DEMO_OTP_STORE[phone_number]

    return {
        "success": True,
        "verified": verified,
        "status": "approved" if verified else "pending",
        "demo_mode": True,
    }
