"""WhatsApp messaging routes."""

import os
import logging
from fastapi import APIRouter, HTTPException

from models import WhatsAppRequest, WhatsAppResponse
from services.twilio_service import send_whatsapp_message, get_sandbox_instructions
from services.rate_alert_service import rate_alert_service
from core.exceptions import TwilioServiceError
from db.supabase_service import append_session_event, update_session_whatsapp_status

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/send-whatsapp", response_model=WhatsAppResponse)
async def send_whatsapp(request: WhatsAppRequest):
    """Send simplified summary to WhatsApp via Twilio."""
    try:
        logger.info(f"Sending WhatsApp message to {request.phone_number}")
        result = await send_whatsapp_message(request.phone_number, request.message)

        if not result.get("success"):
            error_msg = result.get("error", "WhatsApp delivery failed")
            # Return sandbox-specific detail so frontend can guide the user
            if result.get("sandbox_mode"):
                raise HTTPException(status_code=422, detail=error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        rate_alert_service.track_usage("twilio", context="/api/send-whatsapp")

        logger.info(f"WhatsApp message sent successfully. SID: {result.get('sid')}")

        if request.session_id:
            await append_session_event(
                session_id=request.session_id, event_type="whatsapp_sent",
                event_data={"sid": result.get("sid"), "status": result.get("status"), "to": request.phone_number},
            )
            await update_session_whatsapp_status(session_id=request.session_id, whatsapp_sent=True)
            rate_alert_service.track_usage("supabase", context="append_session_event:whatsapp")

        return WhatsAppResponse(status="sent", message="Message delivered successfully", sid=result.get("sid"))

    except TwilioServiceError as e:
        logger.error(f"Twilio service error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error sending WhatsApp: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send WhatsApp message: {str(e)}")


@router.get("/api/whatsapp/sandbox-instructions")
async def whatsapp_sandbox_info():
    """Get instructions for joining Twilio WhatsApp sandbox."""
    return {
        "instructions": get_sandbox_instructions(),
        "sandbox_number": os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886"),
    }
