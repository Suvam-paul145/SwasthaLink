"""
User profile CRUD helpers — extracted from supabase_service.py.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


def _get_client():
    """Lazy import to avoid circular dependencies."""
    from db.supabase_service import supabase_client
    return supabase_client


async def create_patient_profile(
    user_id: str,
    name: str,
    email: str,
    phone: str,
    role: str = "patient",
) -> Dict[str, Any]:
    """Insert a row into the profiles table for a new patient."""
    try:
        client = _get_client()
        if not client:
            return {"success": False, "error": "Supabase not configured"}

        profile_data = {
            "user_id": user_id,
            "full_name": name,
            "email": email.strip().lower(),
            "role": role,
            "phone": phone,
            "phone_verified": False,
        }

        result = client.table("profiles").insert(profile_data).execute()
        logger.info(f"Patient profile created for {email}")
        return {"success": True, "data": result.data[0] if result.data else profile_data}
    except Exception as e:
        logger.error(f"Failed to create patient profile: {e}")
        return {"success": False, "error": str(e)}


async def update_phone_verified(user_id: str, phone: str) -> Dict[str, Any]:
    """Mark a phone number as verified in the profiles table."""
    try:
        client = _get_client()
        if not client:
            return {"success": False, "error": "Supabase not configured"}

        query = client.table("profiles").update({"phone_verified": True})
        if user_id:
            query = query.eq("user_id", user_id)
        else:
            query = query.eq("phone", phone)
        query.execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update phone_verified for {phone}: {e}")
        return {"success": False, "error": str(e)}


async def update_phone_verified_for_account(
    phone: str,
    user_id: str = "",
    email: str = "",
) -> Dict[str, Any]:
    """Mark a single profile as phone-verified, preferring user_id/email over phone-only matching."""
    try:
        client = _get_client()
        if not client:
            return {"success": False, "error": "Supabase not configured"}

        query = client.table("profiles").update({"phone_verified": True})
        if user_id:
            query = query.eq("user_id", user_id)
        elif email:
            query = query.eq("email", email.strip().lower()).eq("phone", phone)
        else:
            query = query.eq("phone", phone)

        query.execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update phone_verified for account {email or user_id or phone}: {e}")
        return {"success": False, "error": str(e)}


async def list_patients() -> List[Dict[str, Any]]:
    """Return all profiles with role=patient."""
    try:
        client = _get_client()
        if not client:
            return []
        result = (
            client
            .table("profiles")
            .select("user_id, full_name, name, email, phone, phone_verified")
            .eq("role", "patient")
            .order("full_name")
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to list patients: {e}")
        return []


async def link_patient_pid(user_id: str, pid: str) -> dict:
    """Associate a patient profile with a system-generated PID."""
    try:
        from db.supabase_service import supabase_client
        if not supabase_client:
            return {"success": False, "error": "Supabase not configured"}

        supabase_client.table("profiles").update({"pid": pid}).eq("user_id", user_id).execute()
        
        logger.info(f"Linked PID {pid} to user {user_id}")
        return {"success": True, "pid": pid}
    except Exception as e:
        logger.error(f"Failed to link PID {pid} to user {user_id}: {e}")
        return {"success": False, "error": str(e)}


async def update_profile(user_id: str, name: str = None, phone: str = None) -> Dict[str, Any]:
    """Update a user's profile (name and/or phone). Resets phone_verified when phone changes."""
    try:
        client = _get_client()
        if not client:
            return {"success": False, "error": "Supabase not configured"}

        update_data = {}
        if name is not None:
            update_data["full_name"] = name

        if phone is not None:
            # Fetch current phone to check if it changed
            current = (
                client.table("profiles")
                .select("phone")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            current_phone = current.data[0]["phone"] if current.data else None
            update_data["phone"] = phone
            if phone != current_phone:
                update_data["phone_verified"] = False

        if not update_data:
            return {"success": True, "message": "Nothing to update"}

        result = (
            client.table("profiles")
            .update(update_data)
            .eq("user_id", user_id)
            .execute()
        )
        logger.info(f"Profile updated for user {user_id}: {list(update_data.keys())}")
        return {"success": True, "data": result.data[0] if result.data else update_data}
    except Exception as e:
        logger.error(f"Failed to update profile for {user_id}: {e}")
        return {"success": False, "error": str(e)}


async def get_user_pid(user_id: str) -> str:
    """Fetch the linked PID for a user profile."""
    try:
        from db.supabase_service import supabase_client
        if not supabase_client:
            return None
        
        result = supabase_client.table("profiles").select("pid").eq("user_id", user_id).single().execute()
        return result.data.get("pid") if result.data else None
    except Exception as e:
        logger.error(f"Failed to fetch PID for user {user_id}: {e}")
        return None
