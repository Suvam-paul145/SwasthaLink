"""
CRUD operations for the audit_events table.
Tracks every lifecycle event: upload, extraction, approval, rejection, escalation, chunking.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from db.local import get_connection

logger = logging.getLogger(__name__)


async def create_audit_entry(
    prescription_id: str,
    action: str,
    actor_role: str,
    actor_id: str,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Log an audit event for a prescription."""
    entry = {
        "id": str(uuid.uuid4()),
        "prescription_id": prescription_id,
        "action": action,
        "actor_role": actor_role,
        "actor_id": actor_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": details,
    }
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO audit_events (id, prescription_id, action, actor_role, actor_id, timestamp, details) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            entry["id"],
            entry["prescription_id"],
            entry["action"],
            entry["actor_role"],
            entry["actor_id"],
            entry["timestamp"],
            json.dumps(entry["details"]) if entry["details"] else None,
        ),
    )
    conn.commit()
    conn.close()
    logger.info(f"Audit: {action} on {prescription_id} by {actor_role}:{actor_id}")
    return entry


async def get_audit_log(prescription_id: str) -> List[Dict[str, Any]]:
    """Retrieve the full audit trail for a prescription, newest first."""
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT * FROM audit_events WHERE prescription_id = ? ORDER BY timestamp ASC",
        (prescription_id,),
    )
    rows = []
    for r in c.fetchall():
        d = dict(r)
        if isinstance(d.get("details"), str):
            try:
                d["details"] = json.loads(d["details"])
            except (json.JSONDecodeError, TypeError):
                pass
        rows.append(d)
    conn.close()
    return rows
