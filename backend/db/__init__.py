"""
Database package — Supabase client, session/prescription/profile CRUD.
"""

from db.supabase_service import (
    supabase_client,
    log_session,
    persist_session_history,
    append_session_event,
    get_session_history,
    list_recent_histories,
    update_session_quiz_score,
    update_session_whatsapp_status,
    get_session_count,
    get_analytics,
    generate_session_id,
    check_supabase_health,
)

from db.prescription_db import (
    create_prescription,
    list_pending_prescriptions,
    list_prescriptions_by_doctor,
    list_approved_prescriptions_for_patient,
    approve_prescription_db,
    reject_prescription_db,
    escalate_prescription_db,
    get_prescription_by_id,
)

from db.profile_db import (
    create_patient_profile,
    update_phone_verified,
    list_patients,
)

from db.patient_chunks_db import (
    create_chunk,
    create_chunks_batch,
    get_chunks_by_patient,
    get_chunks_by_type,
    get_chunks_for_prescription,
    delete_chunks_for_prescription,
)

from db.audit_db import (
    create_audit_entry,
    get_audit_log,
    get_recent_audit_entries,
)

__all__ = [
    "supabase_client",
    "log_session", "persist_session_history", "append_session_event",
    "get_session_history", "list_recent_histories",
    "update_session_quiz_score", "update_session_whatsapp_status",
    "get_session_count", "get_analytics",
    "generate_session_id", "check_supabase_health",
    "create_prescription", "list_pending_prescriptions",
    "list_prescriptions_by_doctor", "list_approved_prescriptions_for_patient",
    "approve_prescription_db", "reject_prescription_db", "escalate_prescription_db", "get_prescription_by_id",
    "create_patient_profile", "update_phone_verified", "list_patients",
    # Patient chunks
    "create_chunk", "create_chunks_batch",
    "get_chunks_by_patient", "get_chunks_by_type",
    "get_chunks_for_prescription", "delete_chunks_for_prescription",
    # Audit log
    "create_audit_entry", "get_audit_log", "get_recent_audit_entries",
]
