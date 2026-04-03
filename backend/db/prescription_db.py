"""
Prescription CRUD helpers — extracted from supabase_service.py.
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


def _get_client():
    """Lazy import to avoid circular dependencies."""
    from db.supabase_service import supabase_client
    return supabase_client


async def create_prescription(record_data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new prescription record."""
    try:
        client = _get_client()
        if not client:
            logger.warning("Supabase not available — prescription not persisted")
            return {"success": False, "error": "Supabase not configured"}

        result = client.table("prescriptions").insert(record_data).execute()
        logger.info(f"Prescription persisted: {record_data.get('prescription_id')}")
        return {"success": True, "data": result.data[0] if result.data else record_data}
    except Exception as e:
        logger.error(f"Failed to persist prescription: {e}")
        return {"success": False, "error": str(e)}


async def list_pending_prescriptions() -> List[Dict[str, Any]]:
    """Return all prescriptions with status pending_admin_review."""
    try:
        client = _get_client()
        if not client:
            return []
        result = (
            client
            .table("prescriptions")
            .select("*")
            .eq("status", "pending_admin_review")
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to list pending prescriptions: {e}")
        return []


async def list_prescriptions_by_doctor(doctor_id: str) -> List[Dict[str, Any]]:
    """Return all prescriptions uploaded by a specific doctor."""
    try:
        client = _get_client()
        if not client:
            return []
        result = (
            client
            .table("prescriptions")
            .select("*")
            .eq("doctor_id", doctor_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to list prescriptions for doctor {doctor_id}: {e}")
        return []


async def list_approved_prescriptions_for_patient(patient_id: str) -> List[Dict[str, Any]]:
    """Return all approved prescriptions for a given patient."""
    try:
        client = _get_client()
        if not client:
            return []
        result = (
            client
            .table("prescriptions")
            .select("*")
            .eq("patient_id", patient_id)
            .eq("status", "approved")
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to list prescriptions for patient {patient_id}: {e}")
        return []


async def approve_prescription_db(prescription_id: str, admin_id: str) -> Optional[Dict[str, Any]]:
    """Approve a prescription."""
    try:
        client = _get_client()
        if not client:
            return None
        result = (
            client
            .table("prescriptions")
            .update({
                "status": "approved",
                "admin_id": admin_id,
                "reviewed_at": datetime.utcnow().isoformat(),
            })
            .eq("prescription_id", prescription_id)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Failed to approve prescription {prescription_id}: {e}")
        return None


async def reject_prescription_db(
    prescription_id: str, admin_id: str, reason: str
) -> Optional[Dict[str, Any]]:
    """Reject a prescription."""
    try:
        client = _get_client()
        if not client:
            return None
        result = (
            client
            .table("prescriptions")
            .update({
                "status": "rejected",
                "admin_id": admin_id,
                "rejection_reason": reason,
                "reviewed_at": datetime.utcnow().isoformat(),
            })
            .eq("prescription_id", prescription_id)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Failed to reject prescription {prescription_id}: {e}")
        return None


async def escalate_prescription_db(
    prescription_id: str, admin_id: str, reason: str
) -> Optional[Dict[str, Any]]:
    """Escalate a prescription back to doctor."""
    try:
        client = _get_client()
        if not client:
            return None
        result = (
            client
            .table("prescriptions")
            .update({
                "status": "escalated_to_doctor",
                "admin_id": admin_id,
                "rejection_reason": reason,
                "reviewed_at": datetime.utcnow().isoformat(),
            })
            .eq("prescription_id", prescription_id)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Failed to escalate prescription {prescription_id}: {e}")
        return None


async def get_prescription_by_id(prescription_id: str) -> Optional[Dict[str, Any]]:
    """Get a single prescription record by its prescription_id."""
    try:
        client = _get_client()
        if not client:
            return None
        result = (
            client
            .table("prescriptions")
            .select("*")
            .eq("prescription_id", prescription_id)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        logger.error(f"Failed to get prescription {prescription_id}: {e}")
        return None
