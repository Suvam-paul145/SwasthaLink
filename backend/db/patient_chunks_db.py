"""
Patient Data Chunks CRUD — storage for chunked patient-optimised data.
Created post-admin-approval to power the patient dashboard and chatbot.
"""

import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


def _get_client():
    """Lazy import to avoid circular dependencies."""
    from db.supabase_service import supabase_client
    return supabase_client


async def create_chunk(chunk_data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new patient data chunk."""
    try:
        client = _get_client()
        if not client:
            logger.warning("DB not available — chunk not persisted")
            return {"success": False, "error": "DB not configured"}

        result = client.table("patient_data_chunks").insert(chunk_data).execute()
        logger.info(f"Chunk persisted: {chunk_data.get('chunk_id')} (type={chunk_data.get('chunk_type')})")
        return {"success": True, "data": result.data[0] if result.data else chunk_data}
    except Exception as e:
        logger.error(f"Failed to persist chunk: {e}")
        return {"success": False, "error": str(e)}


async def create_chunks_batch(chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Insert multiple chunks in a batch."""
    results = []
    for chunk in chunks:
        result = await create_chunk(chunk)
        results.append(result)
    success_count = sum(1 for r in results if r.get("success"))
    return {"success": success_count == len(chunks), "total": len(chunks), "stored": success_count}


async def get_chunks_by_patient(patient_id: str) -> List[Dict[str, Any]]:
    """Retrieve all chunks for a patient."""
    try:
        client = _get_client()
        if not client:
            return []
        result = (
            client
            .table("patient_data_chunks")
            .select("*")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get chunks for patient {patient_id}: {e}")
        return []


async def get_chunks_by_type(patient_id: str, chunk_type: str) -> List[Dict[str, Any]]:
    """Retrieve chunks for a patient filtered by type."""
    try:
        client = _get_client()
        if not client:
            return []
        result = (
            client
            .table("patient_data_chunks")
            .select("*")
            .eq("patient_id", patient_id)
            .eq("chunk_type", chunk_type)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get {chunk_type} chunks for patient {patient_id}: {e}")
        return []


async def get_chunks_for_prescription(prescription_id: str) -> List[Dict[str, Any]]:
    """Retrieve all chunks generated from a specific prescription."""
    try:
        client = _get_client()
        if not client:
            return []
        result = (
            client
            .table("patient_data_chunks")
            .select("*")
            .eq("prescription_id", prescription_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get chunks for prescription {prescription_id}: {e}")
        return []


async def delete_chunks_for_prescription(prescription_id: str) -> bool:
    """Delete all chunks for a prescription (used on re-processing)."""
    try:
        client = _get_client()
        if not client:
            return False
        # For SQLite mock, we need direct SQL; for real Supabase, use .delete()
        from db.local import get_connection
        conn = get_connection()
        c = conn.cursor()
        c.execute("DELETE FROM patient_data_chunks WHERE prescription_id = ?", (prescription_id,))
        conn.commit()
        conn.close()
        logger.info(f"Deleted chunks for prescription {prescription_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete chunks for prescription {prescription_id}: {e}")
        return False
