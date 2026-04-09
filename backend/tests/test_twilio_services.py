import asyncio
import json
from types import SimpleNamespace

from services import otp_service, twilio_service


def test_send_otp_uses_sandbox_template_when_configured(monkeypatch):
    sent_payload = {}

    class _MessageCreator:
        def create(self, **kwargs):
            sent_payload.update(kwargs)
            return SimpleNamespace(sid="SM-OTP-123")

    class _ClientStub:
        def __init__(self):
            self.messages = _MessageCreator()

    async def _no_delivery_failure(_sid, max_wait=4.0):
        return None

    monkeypatch.setattr(otp_service, "_twilio_client", _ClientStub())
    monkeypatch.setattr(otp_service, "TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
    monkeypatch.setattr(otp_service, "TWILIO_WHATSAPP_OTP_TEMPLATE_SID", "HX-OTP-TEMPLATE")
    monkeypatch.setattr(otp_service, "_generate_otp", lambda length=6: "409173")
    monkeypatch.setattr(otp_service, "_check_message_delivery", _no_delivery_failure)

    otp_service._WA_OTP_STORE.clear()
    otp_service._DEMO_OTP_STORE.clear()

    result = asyncio.run(otp_service.send_otp("+919876543210", "whatsapp"))

    assert result["success"] is True
    assert result["demo_mode"] is False
    assert result["delivery_mode"] == "template"
    assert sent_payload["from_"] == "whatsapp:+14155238886"
    assert sent_payload["to"] == "whatsapp:+919876543210"
    assert sent_payload["content_sid"] == "HX-OTP-TEMPLATE"
    assert json.loads(sent_payload["content_variables"]) == {"1": "409173"}
    assert "body" not in sent_payload


def test_send_whatsapp_message_returns_sandbox_session_guidance(monkeypatch):
    class _FakeTwilioRestException(Exception):
        def __init__(self, code, msg):
            super().__init__(msg)
            self.code = code
            self.msg = msg

    class _MessageCreator:
        def create(self, **kwargs):
            raise _FakeTwilioRestException(63016, "Outside active WhatsApp session")

    class _ClientStub:
        def __init__(self):
            self.messages = _MessageCreator()

    monkeypatch.setattr(twilio_service, "TwilioRestException", _FakeTwilioRestException)
    monkeypatch.setattr(twilio_service, "twilio_client", _ClientStub())
    monkeypatch.setattr(twilio_service, "TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

    result = asyncio.run(
        twilio_service.send_whatsapp_message("+919876543210", "Test sandbox summary message")
    )

    assert result["success"] is False
    assert result["sandbox_mode"] is True
    assert result["error_code"] == 63016
    assert "24-hour WhatsApp session" in result["error"]
