"""
CRUD operations for the patient_context_chunks table.
Handles chunked, patient-optimized prescription data.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from db.local import get_connection

logger = logging.getLogger(__name__)


async def create_chunk(chunk: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new patient data chunk."""
    conn = get_connection()
    c = conn.cursor()
    data_json = json.dumps(chunk["data"]) if isinstance(chunk["data"], dict) else chunk["data"]
    c.execute(
        "INSERT OR REPLACE INTO patient_context_chunks "
        "(chunk_id, prescription_id, patient_id, chunk_type, data, version, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            chunk["chunk_id"],
            chunk["prescription_id"],
            chunk["patient_id"],
            chunk["chunk_type"],
            data_json,
            chunk.get("version", 1),
            chunk["created_at"],
        ),
    )
    conn.commit()
    conn.close()
    logger.info(f"Chunk created: {chunk['chunk_id']} (type={chunk['chunk_type']})")
    return chunk


async def get_chunks_by_patient(patient_id: str) -> List[Dict[str, Any]]:
    """Retrieve all chunks for a patient."""
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT * FROM patient_context_chunks WHERE patient_id = ? ORDER BY created_at DESC",
        (patient_id,),
    )
    rows = []
    for r in c.fetchall():
        d = dict(r)
        if isinstance(d.get("data"), str):
            try:
                d["data"] = json.loads(d["data"])
            except (json.JSONDecodeError, TypeError):
                pass
        rows.append(d)
    conn.close()
    return rows


async def get_chunks_by_type(patient_id: str, chunk_type: str) -> List[Dict[str, Any]]:
    """Retrieve chunks filtered by type for a patient."""
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT * FROM patient_context_chunks WHERE patient_id = ? AND chunk_type = ? ORDER BY created_at DESC",
        (patient_id, chunk_type),
    )
    rows = []
    for r in c.fetchall():
        d = dict(r)
        if isinstance(d.get("data"), str):
            try:
                d["data"] = json.loads(d["data"])
            except (json.JSONDecodeError, TypeError):
                pass
        rows.append(d)
    conn.close()
    return rows


async def get_chunks_for_prescription(prescription_id: str) -> List[Dict[str, Any]]:
    """Retrieve all chunks for a specific prescription."""
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT * FROM patient_context_chunks WHERE prescription_id = ? ORDER BY chunk_type",
        (prescription_id,),
    )
    rows = []
    for r in c.fetchall():
        d = dict(r)
        if isinstance(d.get("data"), str):
            try:
                d["data"] = json.loads(d["data"])
            except (json.JSONDecodeError, TypeError):
                pass
        rows.append(d)
    conn.close()
    return rows
