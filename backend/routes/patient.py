"""
Patient-specific profile and PID mapping routes.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from auth.jwt_utils import get_current_user
from db.profile_db import link_patient_pid, get_user_pid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/patient", tags=["patient"])


class LinkPIDRequest(BaseModel):
    pid: str = Field(..., description="The PID-XXXXXX code to link")


@router.post("/link-pid")
async def link_records(payload: LinkPIDRequest, user: dict = Depends(get_current_user)):
    """
    Associate a system-generated PID with the current user's profile.
    This allows the Family Dashboard to show those records automatically.
    """
    if user.get("role") != "patient":
         raise HTTPException(status_code=403, detail="Only patients can link records")

    user_id = user.get("id")
    pid = payload.pid.strip().upper()

    # Basic format validation
    import re
    if not re.match(r"^PID-[A-Z0-9]{6}$", pid):
         raise HTTPException(status_code=400, detail="Invalid PID format. Expected PID-XXXXXX")

    result = await link_patient_pid(user_id, pid)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to link PID"))

    return {"message": f"Successfully linked PID {pid} to your account", "pid": pid}


@router.get("/profile")
async def get_patient_profile(user: dict = Depends(get_current_user)):
    """
    Fetch the logged-in patient's profile details, including their linked PID.
    """
    user_id = user.get("id")
    pid = await get_user_pid(user_id)
    
    return {
        "user_id": user_id,
        "email": user.get("email"),
        "full_name": user.get("name"),
        "linked_pid": pid
    }
