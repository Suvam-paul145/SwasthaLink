"""
Audit Log CRUD — full lifecycle tracking for prescriptions.
Every action (upload, extract, approve, reject, escalate, chunk) is logged.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


def _get_client():
    """Lazy import to avoid circular dependencies."""
    from db.supabase_service import supabase_client
    return supabase_client


async def create_audit_entry(
    prescription_id: str,
    action: str,
    actor_role: str,
    actor_id: str,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Log a single audit event."""
    try:
        client = _get_client()
        if not client:
            logger.warning("DB not available — audit entry not persisted")
            return {"success": False, "error": "DB not configured"}

        entry = {
            "id": str(uuid.uuid4()),
            "prescription_id": prescription_id,
            "action": action,
            "actor_role": actor_role,
            "actor_id": actor_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": details or {},
        }

        result = client.table("audit_log").insert(entry).execute()
        logger.info(f"Audit: {action} on {prescription_id} by {actor_role}/{actor_id}")
        return {"success": True, "data": result.data[0] if result.data else entry}
    except Exception as e:
        logger.error(f"Failed to create audit entry: {e}")
        return {"success": False, "error": str(e)}


async def get_audit_log(prescription_id: str) -> List[Dict[str, Any]]:
    """Retrieve full audit trail for a prescription, ordered chronologically."""
    try:
        client = _get_client()
        if not client:
            return []
        result = (
            client
            .table("audit_log")
            .select("*")
            .eq("prescription_id", prescription_id)
            .order("timestamp", desc=False)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get audit log for {prescription_id}: {e}")
        return []


async def get_recent_audit_entries(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve most recent audit entries across all prescriptions."""
    try:
        client = _get_client()
        if not client:
            return []
        result = (
            client
            .table("audit_log")
            .select("*")
            .order("timestamp", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get recent audit entries: {e}")
        return []
