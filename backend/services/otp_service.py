"""
OTP service for WhatsApp and SMS delivery through Twilio Verify.
"""

import logging
from typing import Any, Dict

from core.config import read_env
from core.exceptions import OTPServiceError

logger = logging.getLogger(__name__)

try:
    from twilio.base.exceptions import TwilioRestException
    from twilio.rest import Client

    TWILIO_SDK_AVAILABLE = True
except ImportError:
    Client = None

    class TwilioRestException(Exception):
        """Fallback exception when the Twilio SDK is unavailable."""

    TWILIO_SDK_AVAILABLE = False


TWILIO_ACCOUNT_SID = read_env("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = read_env("TWILIO_AUTH_TOKEN")
TWILIO_API_KEY_SID = read_env("TWILIO_API_KEY_SID", "TWILIO_API_KEY")
TWILIO_API_KEY_SECRET = read_env("TWILIO_API_KEY_SECRET", "TWILIO_API_SECRET")
TWILIO_VERIFY_SERVICE_SID = read_env("TWILIO_VERIFY_SERVICE_SID")

_twilio_client = None
if TWILIO_SDK_AVAILABLE:
    if TWILIO_ACCOUNT_SID and TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET:
        try:
            _twilio_client = Client(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_ACCOUNT_SID)
        except Exception as exc:
            logger.error(f"OTP service: failed to create Twilio client with API key: {exc}")
    elif TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        except Exception as exc:
            logger.error(f"OTP service: failed to create Twilio client with auth token: {exc}")


_DEMO_OTP_STORE: Dict[str, str] = {}
_DEMO_OTP_CODE = "123456"
SUPPORTED_CHANNELS = {"whatsapp", "sms"}


def _normalize_channel(channel: str) -> str:
    normalized = (channel or "").strip().lower()
    if normalized not in SUPPORTED_CHANNELS:
        raise OTPServiceError("OTP channel must be either 'whatsapp' or 'sms'", 400)
    return normalized


def _is_verify_configured() -> bool:
    return bool(_twilio_client and TWILIO_VERIFY_SERVICE_SID)


def _should_fallback_to_demo(exc: Exception) -> bool:
    message = str(exc).lower()
    return (
        "unverified" in message
        or "trial account" in message
        or "phone number is unverified" in message
        or "verify it at twilio.com/user/account/phone-numbers/verified" in message
    )


async def send_otp(phone_number: str, channel: str = "whatsapp") -> Dict[str, Any]:
    """Send an OTP to the given phone number."""
    if not phone_number or not phone_number.startswith("+"):
        raise OTPServiceError("Phone number must be in E.164 format (for example +919876543210)", 400)

    normalized_channel = _normalize_channel(channel)

    if _is_verify_configured():
        try:
            verification = (
                _twilio_client.verify
                .v2
                .services(TWILIO_VERIFY_SERVICE_SID)
                .verifications
                .create(to=phone_number, channel=normalized_channel)
            )

            logger.info(f"OTP sent to {phone_number} via {normalized_channel}; SID: {verification.sid}")
            return {
                "success": True,
                "message": f"OTP sent to {phone_number} via {normalized_channel}",
                "demo_mode": False,
                "channel": normalized_channel,
                "phone_number": phone_number,
                "configured": True,
            }
        except TwilioRestException as exc:
            logger.error(f"Twilio Verify error: {exc}")
            if _should_fallback_to_demo(exc):
                logger.warning(f"Falling back to demo OTP for {phone_number} after Twilio trial restriction")
                _DEMO_OTP_STORE[phone_number] = _DEMO_OTP_CODE
                return {
                    "success": True,
                    "message": (
                        f"Demo OTP ({_DEMO_OTP_CODE}) assigned for {phone_number} via {normalized_channel}. "
                        "Twilio trial accounts can only send to verified numbers."
                    ),
                    "demo_mode": True,
                    "fallback_reason": "twilio_trial_unverified_number",
                    "channel": normalized_channel,
                    "phone_number": phone_number,
                    "configured": True,
                }
            detail = getattr(exc, "msg", str(exc))
            raise OTPServiceError(f"Failed to send OTP: {detail}", 502)
        except Exception as exc:
            logger.error(f"Unexpected OTP send error: {exc}")
            raise OTPServiceError(f"Failed to send OTP: {str(exc)}", 500)

    logger.warning(f"Twilio Verify not configured; using demo OTP for {phone_number}")
    _DEMO_OTP_STORE[phone_number] = _DEMO_OTP_CODE
    return {
        "success": True,
        "message": f"Demo OTP ({_DEMO_OTP_CODE}) assigned for {phone_number} via {normalized_channel}",
        "demo_mode": True,
        "channel": normalized_channel,
        "phone_number": phone_number,
        "configured": False,
    }


async def verify_otp(phone_number: str, code: str) -> Dict[str, Any]:
    """Verify a previously sent OTP."""
    if not phone_number or not phone_number.startswith("+"):
        raise OTPServiceError("Phone number must be in E.164 format", 400)
    if not code or len(code) < 4:
        raise OTPServiceError("OTP code is required (minimum 4 digits)", 400)

    expected = _DEMO_OTP_STORE.get(phone_number)
    if expected is not None:
        verified = code == expected
        if verified:
            del _DEMO_OTP_STORE[phone_number]

        return {
            "success": True,
            "verified": verified,
            "status": "approved" if verified else "pending",
            "demo_mode": True,
        }

    if _is_verify_configured():
        try:
            verification_check = (
                _twilio_client.verify
                .v2
                .services(TWILIO_VERIFY_SERVICE_SID)
                .verification_checks
                .create(to=phone_number, code=code)
            )

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
            detail = getattr(exc, "msg", str(exc))
            return {
                "success": False,
                "verified": False,
                "error": detail,
                "demo_mode": False,
            }
        except Exception as exc:
            logger.error(f"Unexpected OTP verify error: {exc}")
            raise OTPServiceError(f"OTP verification failed: {str(exc)}", 500)

    return {
        "success": False,
        "verified": False,
        "error": "No OTP was sent for this number. Send OTP first.",
        "demo_mode": False,
    }
