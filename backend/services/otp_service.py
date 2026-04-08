"""
OTP service for WhatsApp and SMS delivery.

WhatsApp OTPs are sent via the Twilio Messaging API (works with the sandbox)
because Twilio Verify's WhatsApp channel requires an approved Business sender
which trial accounts lack.  SMS OTPs still go through Twilio Verify.
"""

import asyncio
import logging
import secrets
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
TWILIO_WHATSAPP_NUMBER = read_env("TWILIO_WHATSAPP_NUMBER") or "whatsapp:+14155238886"

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
# Store for self-generated OTPs sent via WhatsApp Messaging API
_WA_OTP_STORE: Dict[str, str] = {}
SUPPORTED_CHANNELS = {"whatsapp", "sms"}


def _generate_otp(length: int = 6) -> str:
    """Generate a cryptographically random numeric OTP."""
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


def _normalize_channel(channel: str) -> str:
    normalized = (channel or "").strip().lower()
    if normalized not in SUPPORTED_CHANNELS:
        raise OTPServiceError("OTP channel must be either 'whatsapp' or 'sms'", 400)
    return normalized


def _is_verify_configured() -> bool:
    return bool(_twilio_client and TWILIO_VERIFY_SERVICE_SID)


def _is_messaging_configured() -> bool:
    return bool(_twilio_client)


def _format_whatsapp(phone: str) -> str:
    if phone.startswith("whatsapp:"):
        return phone
    return f"whatsapp:{phone}"


def _should_fallback_to_demo(exc: Exception) -> bool:
    message = str(exc).lower()
    return (
        "unverified" in message
        or "trial account" in message
        or "phone number is unverified" in message
        or "verify it at twilio.com/user/account/phone-numbers/verified" in message
    )


# Twilio WhatsApp Sandbox number
_SANDBOX_NUMBER = "+14155238886"


def _is_sandbox_number() -> bool:
    """Check if the configured WhatsApp number is the Twilio sandbox."""
    return _SANDBOX_NUMBER in (TWILIO_WHATSAPP_NUMBER or "")


async def _check_message_delivery(msg_sid: str, max_wait: float = 4.0) -> dict | None:
    """Poll Twilio message status to detect quick delivery failures.

    Returns the message resource if a terminal failure is detected,
    otherwise None (message is still in transit or delivered).
    """
    if not _twilio_client:
        return None
    # Wait briefly for Twilio to process the message
    await asyncio.sleep(max_wait)
    try:
        updated = _twilio_client.messages(msg_sid).fetch()
        if updated.status in ("failed", "undelivered"):
            return {
                "status": updated.status,
                "error_code": updated.error_code,
                "error_message": updated.error_message,
            }
    except Exception as exc:
        logger.warning(f"Could not check message status for {msg_sid}: {exc}")
    return None


def _sandbox_instructions() -> str:
    return (
        "To receive WhatsApp OTPs, you must first join the Twilio Sandbox: "
        "open WhatsApp, send 'join <your-sandbox-keyword>' to +14155238886. "
        "Check your Twilio Console for the exact keyword. "
        "After joining, resend the OTP."
    )


async def send_otp(phone_number: str, channel: str = "whatsapp") -> Dict[str, Any]:
    """Send an OTP to the given phone number.

    WhatsApp: sends OTP via Twilio Messaging API (sandbox-compatible).
    SMS: sends OTP via Twilio Verify API.
    """
    if not phone_number or not phone_number.startswith("+"):
        raise OTPServiceError("Phone number must be in E.164 format (for example +919876543210)", 400)

    normalized_channel = _normalize_channel(channel)

    # ── WhatsApp: use Messaging API (works with sandbox on trial accounts) ──
    if normalized_channel == "whatsapp":
        if _is_messaging_configured():
            otp_code = _generate_otp()
            body = f"Your SwasthaLink verification code is: *{otp_code}*\n\nThis code expires in 10 minutes. Do not share it with anyone."
            try:
                from_number = _format_whatsapp(TWILIO_WHATSAPP_NUMBER)
                to_number = _format_whatsapp(phone_number)
                msg = _twilio_client.messages.create(
                    from_=from_number,
                    to=to_number,
                    body=body,
                )
                logger.info(f"WhatsApp OTP queued for {phone_number}; SID: {msg.sid}")

                # Check delivery status to detect sandbox/unverified failures
                delivery_fail = await _check_message_delivery(msg.sid)
                if delivery_fail:
                    error_code = delivery_fail.get("error_code")
                    logger.warning(
                        f"WhatsApp OTP delivery failed for {phone_number}: "
                        f"status={delivery_fail['status']}, error_code={error_code}"
                    )
                    # 63016 = user not in sandbox / no WhatsApp account
                    # 63015 = number not in sandbox participants
                    # 63007 = sandbox session expired
                    if error_code in (63016, 63015, 63007) or _is_sandbox_number():
                        # Remove the undelivered OTP and use demo OTP instead
                        _WA_OTP_STORE.pop(phone_number, None)
                        _DEMO_OTP_STORE[phone_number] = _DEMO_OTP_CODE
                        sandbox_msg = _sandbox_instructions()
                        return {
                            "success": True,
                            "message": (
                                f"WhatsApp delivery failed for {phone_number}. "
                                f"Using demo OTP: {_DEMO_OTP_CODE}. {sandbox_msg}"
                            ),
                            "demo_mode": True,
                            "fallback_reason": "whatsapp_sandbox_not_joined",
                            "sandbox_instructions": sandbox_msg,
                            "channel": "whatsapp",
                            "phone_number": phone_number,
                            "configured": True,
                        }
                    # Other delivery failure — still fall back to demo
                    _WA_OTP_STORE.pop(phone_number, None)
                    _DEMO_OTP_STORE[phone_number] = _DEMO_OTP_CODE
                    return {
                        "success": True,
                        "message": (
                            f"WhatsApp delivery failed (error {error_code}). "
                            f"Using demo OTP: {_DEMO_OTP_CODE} for {phone_number}."
                        ),
                        "demo_mode": True,
                        "fallback_reason": "whatsapp_delivery_failed",
                        "channel": "whatsapp",
                        "phone_number": phone_number,
                        "configured": True,
                    }

                _WA_OTP_STORE[phone_number] = otp_code
                logger.info(f"WhatsApp OTP confirmed sent to {phone_number}")
                return {
                    "success": True,
                    "message": f"OTP sent to {phone_number} via WhatsApp",
                    "demo_mode": False,
                    "channel": "whatsapp",
                    "phone_number": phone_number,
                    "configured": True,
                }
            except TwilioRestException as exc:
                logger.error(f"Twilio WhatsApp message error: {exc}")
                if _should_fallback_to_demo(exc):
                    logger.warning(f"Falling back to demo OTP for {phone_number} (WhatsApp trial restriction)")
                    _DEMO_OTP_STORE[phone_number] = _DEMO_OTP_CODE
                    return {
                        "success": True,
                        "message": (
                            f"Demo OTP ({_DEMO_OTP_CODE}) assigned for {phone_number} via WhatsApp. "
                            "Twilio trial accounts can only send to sandbox-joined numbers."
                        ),
                        "demo_mode": True,
                        "fallback_reason": "twilio_trial_unverified_number",
                        "channel": "whatsapp",
                        "phone_number": phone_number,
                        "configured": True,
                    }
                detail = getattr(exc, "msg", str(exc))
                raise OTPServiceError(f"Failed to send OTP via WhatsApp: {detail}", 502)
            except Exception as exc:
                logger.error(f"Unexpected WhatsApp OTP error: {exc}")
                raise OTPServiceError(f"Failed to send OTP via WhatsApp: {str(exc)}", 500)

        # Messaging API not configured — fall back to demo mode
        logger.warning(f"Twilio not configured; using demo OTP for {phone_number}")
        _DEMO_OTP_STORE[phone_number] = _DEMO_OTP_CODE
        return {
            "success": True,
            "message": f"Demo OTP ({_DEMO_OTP_CODE}) assigned for {phone_number} via whatsapp",
            "demo_mode": True,
            "channel": "whatsapp",
            "phone_number": phone_number,
            "configured": False,
        }

    # ── SMS: use Twilio Verify API ──
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

    # Check WhatsApp Messaging API OTP store first
    wa_expected = _WA_OTP_STORE.get(phone_number)
    if wa_expected is not None:
        verified = code == wa_expected
        if verified:
            del _WA_OTP_STORE[phone_number]
        return {
            "success": True,
            "verified": verified,
            "status": "approved" if verified else "pending",
            "demo_mode": False,
        }

    # Check demo OTP store
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
