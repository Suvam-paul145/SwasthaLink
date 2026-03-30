"""
Supabase Service
Handles session logging + persistent history storage.

By default this service stores full session history so user context is not lost.
"""

import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid

try:
    from supabase import create_client
    SUPABASE_SDK_AVAILABLE = True
except ImportError:
    create_client = None
    SUPABASE_SDK_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if not SUPABASE_SDK_AVAILABLE:
    logger.warning("Supabase SDK not installed. Install with: pip install supabase==2.8.1")


def _read_env(*names: str) -> Optional[str]:
    """Read the first non-empty env var from a list, trimming accidental spaces."""
    for name in names:
        raw_value = os.getenv(name)
        if raw_value is None:
            continue

        value = raw_value.strip()
        if value:
            return value

    return None

# Load Supabase credentials
SUPABASE_URL = _read_env("VITE_SUPABASE_URL", "SUPABASE_URL")
SUPABASE_KEY = _read_env(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
)

# Initialize Supabase client
supabase_client: Optional[Any] = None
if not SUPABASE_SDK_AVAILABLE:
    logger.warning("Supabase client disabled because Supabase SDK is unavailable")
elif SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        if SUPABASE_KEY.startswith("sb_publishable_"):
            logger.warning(
                "Detected a publishable Supabase key. For backend server operations, "
                "prefer SUPABASE_SERVICE_ROLE_KEY (or a valid anon key with proper RLS policies)."
            )
else:
    logger.warning(
        "Supabase credentials not found. Set SUPABASE_URL + SUPABASE_KEY, "
        "or VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY."
    )


class SupabaseServiceError(Exception):
    """Custom exception for Supabase service errors"""
    pass


def _history_enabled() -> bool:
    """Feature flag for full persistent history storage."""
    return os.getenv("STORE_FULL_HISTORY", "true").strip().lower() == "true"


def generate_session_id() -> str:
    """
    Generate unique session ID

    Returns:
        UUID string
    """
    return str(uuid.uuid4())


async def log_session(
    role: str,
    language: str,
    quiz_score: Optional[int] = None,
    whatsapp_sent: bool = False,
    re_explained: bool = False,
    log_format: str = "text",
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Log session metadata to Supabase

    Args:
        role: User role ('patient', 'caregiver', 'elderly')
        language: Output language ('en', 'bn', 'both')
        quiz_score: Comprehension quiz score (0-3)
        whatsapp_sent: Whether message was sent to WhatsApp
        re_explained: Whether content was re-explained for low quiz score
        log_format: Input format ('text', 'pdf', 'image')
        session_id: Optional session ID (generated if not provided)

    Returns:
        Dict with session info including session_id

    """
    try:
        if not supabase_client:
            logger.warning("Supabase client not available - skipping session logging")
            return {
                "success": False,
                "session_id": session_id or generate_session_id(),
                "error": "Supabase not configured"
            }

        # Generate session ID if not provided
        if not session_id:
            session_id = generate_session_id()

        # Prepare session metadata
        session_data = {
            "id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "role": role,
            "language": language,
            "quiz_score": quiz_score,
            "whatsapp_sent": whatsapp_sent,
            "re_explained": re_explained,
            "log_format": log_format
        }

        # Insert into Supabase
        result = supabase_client.table("sessions").insert(session_data).execute()

        logger.info(f"Session logged successfully: {session_id}")

        return {
            "success": True,
            "session_id": session_id,
            "data": result.data[0] if result.data else session_data
        }

    except Exception as e:
        logger.error(f"Failed to log session: {e}")
        # Don't raise - session logging failure shouldn't break the main flow
        return {
            "success": False,
            "session_id": session_id or generate_session_id(),
            "error": str(e)
        }


async def persist_session_history(
    session_id: str,
    role: str,
    language: str,
    discharge_text: str,
    process_response: Dict[str, Any],
    re_explain: bool = False,
) -> Dict[str, Any]:
    """
    Persist full clinical request + AI response for long-term history continuity.
    """
    try:
        if not _history_enabled():
            return {"success": False, "session_id": session_id, "error": "History storage disabled"}

        if not supabase_client:
            logger.warning("Supabase client not available")
            return {"success": False, "session_id": session_id, "error": "Supabase not configured"}

        payload = {
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "role": role,
            "language": language,
            "discharge_text": discharge_text,
            "simplified_english": process_response.get("simplified_english"),
            "simplified_bengali": process_response.get("simplified_bengali"),
            "medications": process_response.get("medications", []),
            "follow_up": process_response.get("follow_up"),
            "warning_signs": process_response.get("warning_signs", []),
            "comprehension_questions": process_response.get("comprehension_questions", []),
            "whatsapp_message": process_response.get("whatsapp_message"),
            "re_explain": re_explain,
        }

        result = supabase_client.table("session_history").insert(payload).execute()
        return {
            "success": True,
            "session_id": session_id,
            "data": result.data[0] if result.data else payload,
        }
    except Exception as e:
        logger.error(f"Failed to persist session history: {e}")
        return {"success": False, "session_id": session_id, "error": str(e)}


async def append_session_event(
    session_id: str,
    event_type: str,
    event_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Append timeline events (quiz, whatsapp, etc.) for historical traceability.
    """
    try:
        if not _history_enabled():
            return {"success": False, "session_id": session_id, "error": "History storage disabled"}

        if not supabase_client:
            return {"success": False, "session_id": session_id, "error": "Supabase not configured"}

        payload = {
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "event_data": event_data or {},
        }

        result = supabase_client.table("session_events").insert(payload).execute()
        return {
            "success": True,
            "session_id": session_id,
            "data": result.data[0] if result.data else payload,
        }
    except Exception as e:
        logger.error(f"Failed to append session event: {e}")
        return {"success": False, "session_id": session_id, "error": str(e)}


async def get_session_history(session_id: str) -> Dict[str, Any]:
    """
    Fetch full persisted history and events for a specific session.
    """
    try:
        if not supabase_client:
            return {"success": False, "session_id": session_id, "error": "Supabase not configured"}

        history_result = (
            supabase_client
            .table("session_history")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        events_result = (
            supabase_client
            .table("session_events")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .execute()
        )

        return {
            "success": True,
            "session_id": session_id,
            "history": history_result.data[0] if history_result.data else None,
            "events": events_result.data or [],
        }
    except Exception as e:
        logger.error(f"Failed to fetch session history: {e}")
        return {"success": False, "session_id": session_id, "error": str(e)}


async def list_recent_histories(limit: int = 20) -> List[Dict[str, Any]]:
    """
    List recent persisted histories for admin/recovery workflows.
    """
    try:
        if not supabase_client:
            return []

        result = (
            supabase_client
            .table("session_history")
            .select("session_id, created_at, role, language")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to list recent histories: {e}")
        return []


async def update_session_quiz_score(session_id: str, quiz_score: int, re_explained: bool = False) -> Dict[str, Any]:
    """
    Update session with quiz score after quiz submission

    Args:
        session_id: Session ID
        quiz_score: Quiz score (0-3)
        re_explained: Whether content was re-explained

    Returns:
        Dict with update status
    """
    try:
        if not supabase_client:
            logger.warning("Supabase client not available")
            return {"success": False, "error": "Supabase not configured"}

        # Update session
        result = supabase_client.table("sessions").update({
            "quiz_score": quiz_score,
            "re_explained": re_explained
        }).eq("id", session_id).execute()

        logger.info(f"Session {session_id} updated with quiz score: {quiz_score}")

        return {
            "success": True,
            "session_id": session_id,
            "quiz_score": quiz_score
        }

    except Exception as e:
        logger.error(f"Failed to update session quiz score: {e}")
        return {
            "success": False,
            "session_id": session_id,
            "error": str(e)
        }


async def update_session_whatsapp_status(session_id: str, whatsapp_sent: bool) -> Dict[str, Any]:
    """
    Update session with WhatsApp delivery status

    Args:
        session_id: Session ID
        whatsapp_sent: Whether message was successfully sent

    Returns:
        Dict with update status
    """
    try:
        if not supabase_client:
            logger.warning("Supabase client not available")
            return {"success": False, "error": "Supabase not configured"}

        # Update session
        result = supabase_client.table("sessions").update({
            "whatsapp_sent": whatsapp_sent
        }).eq("id", session_id).execute()

        logger.info(f"Session {session_id} updated with WhatsApp status: {whatsapp_sent}")

        return {
            "success": True,
            "session_id": session_id,
            "whatsapp_sent": whatsapp_sent
        }

    except Exception as e:
        logger.error(f"Failed to update WhatsApp status: {e}")
        return {
            "success": False,
            "session_id": session_id,
            "error": str(e)
        }


async def get_session_count() -> int:
    """
    Get total number of sessions processed

    Returns:
        Total session count
    """
    try:
        if not supabase_client:
            return 0

        result = supabase_client.table("sessions").select("id", count="exact").execute()

        count = result.count if hasattr(result, 'count') else len(result.data)
        logger.info(f"Total sessions: {count}")

        return count

    except Exception as e:
        logger.error(f"Failed to get session count: {e}")
        return 0


async def get_analytics() -> Dict[str, Any]:
    """
    Get aggregated analytics (Post-MVP feature)

    Returns:
        Dict with analytics data
    """
    try:
        if not supabase_client:
            return {"error": "Supabase not configured"}

        # Get total sessions
        total_result = supabase_client.table("sessions").select("id", count="exact").execute()
        total = total_result.count if hasattr(total_result, 'count') else len(total_result.data)

        # Get all sessions for analysis
        sessions_result = supabase_client.table("sessions").select("*").execute()
        sessions = sessions_result.data

        # Calculate analytics
        by_role = {"patient": 0, "caregiver": 0, "elderly": 0}
        by_language = {"en": 0, "bn": 0, "both": 0}
        whatsapp_count = 0
        re_explained_count = 0
        avg_quiz_score = 0
        quiz_scores = []

        for session in sessions:
            # Count by role
            role = session.get("role")
            if role in by_role:
                by_role[role] += 1

            # Count by language
            language = session.get("language")
            if language in by_language:
                by_language[language] += 1

            # Count WhatsApp sent
            if session.get("whatsapp_sent"):
                whatsapp_count += 1

            # Count re-explained
            if session.get("re_explained"):
                re_explained_count += 1

            # Collect quiz scores
            score = session.get("quiz_score")
            if score is not None:
                quiz_scores.append(score)

        # Calculate average quiz score
        if quiz_scores:
            avg_quiz_score = sum(quiz_scores) / len(quiz_scores)

        analytics = {
            "total_sessions": total,
            "by_role": by_role,
            "by_language": by_language,
            "whatsapp_sent_count": whatsapp_count,
            "whatsapp_sent_percentage": round((whatsapp_count / total * 100) if total > 0 else 0, 2),
            "re_explained_count": re_explained_count,
            "re_explained_percentage": round((re_explained_count / total * 100) if total > 0 else 0, 2),
            "average_quiz_score": round(avg_quiz_score, 2),
            "quiz_scores_distribution": {
                "0": quiz_scores.count(0),
                "1": quiz_scores.count(1),
                "2": quiz_scores.count(2),
                "3": quiz_scores.count(3)
            }
        }

        logger.info("Analytics calculated successfully")
        return analytics

    except Exception as e:
        logger.error(f"Failed to get analytics: {e}")
        return {"error": str(e)}


def check_supabase_health() -> Dict[str, Any]:
    """
    Check if Supabase service is accessible and healthy

    Returns:
        Dict with status information
    """
    try:
        if not supabase_client:
            return {
                "status": "down",
                "message": "Supabase client not initialized. Check credentials.",
                "available": False
            }

        # Try to query sessions table
        result = supabase_client.table("sessions").select("id").limit(1).execute()

        return {
            "status": "ok",
            "message": "Supabase service is healthy",
            "available": True,
            "table_accessible": True
        }

    except Exception as e:
        logger.error(f"Supabase health check failed: {e}")
        return {
            "status": "down",
            "message": str(e),
            "available": False
        }


# SQL schema for Supabase table creation (documentation)
SUPABASE_SCHEMA = """
-- Create sessions table for session metadata logging
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT CHECK (role IN ('patient', 'caregiver', 'elderly')),
  language TEXT CHECK (language IN ('en', 'bn', 'both')),
  quiz_score INTEGER CHECK (quiz_score BETWEEN 0 AND 3),
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  re_explained BOOLEAN DEFAULT FALSE,
  log_format TEXT CHECK (log_format IN ('text', 'pdf', 'image')) DEFAULT 'text'
);

-- Create index on created_at for analytics queries
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- Create index on role for analytics
CREATE INDEX idx_sessions_role ON sessions(role);

-- Enable Row Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for anon access (public read/write)
-- Adjust based on your security requirements
CREATE POLICY "Allow all access for development" ON sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Persistent full-history table
CREATE TABLE IF NOT EXISTS session_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    role TEXT,
    language TEXT,
    discharge_text TEXT,
    simplified_english TEXT,
    simplified_bengali TEXT,
    medications JSONB DEFAULT '[]'::jsonb,
    follow_up JSONB,
    warning_signs JSONB DEFAULT '[]'::jsonb,
    comprehension_questions JSONB DEFAULT '[]'::jsonb,
    whatsapp_message TEXT,
    re_explain BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_session_history_session_id ON session_history(session_id);
CREATE INDEX IF NOT EXISTS idx_session_history_created_at ON session_history(created_at DESC);

ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for development history" ON session_history
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Session timeline events table
CREATE TABLE IF NOT EXISTS session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_created_at ON session_events(created_at DESC);

ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for development events" ON session_events
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- For production, restrict access appropriately

-- Prescriptions table (prescription workflow records)
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id TEXT UNIQUE NOT NULL,
    status TEXT CHECK (status IN ('pending_admin_review', 'approved', 'rejected')) DEFAULT 'pending_admin_review',
    doctor_id TEXT NOT NULL,
    patient_id TEXT,
    patient_name TEXT,
    patient_age TEXT,
    patient_gender TEXT,
    doctor_name TEXT,
    prescription_date TEXT,
    diagnosis TEXT,
    notes TEXT,
    medications JSONB DEFAULT '[]'::jsonb,
    extraction_confidence FLOAT DEFAULT 0.5,
    s3_key TEXT,
    admin_id TEXT,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for development prescriptions" ON prescriptions
    FOR ALL
    USING (true)
    WITH CHECK (true);
"""


def get_schema_sql() -> str:
    """
    Get SQL schema for creating Supabase tables

    Returns:
        SQL schema string
    """
    return SUPABASE_SCHEMA


# ---------------------------------------------------------------------------
# Prescription CRUD helpers
# ---------------------------------------------------------------------------

async def create_prescription(record_data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a new prescription record into Supabase."""
    try:
        if not supabase_client:
            logger.warning("Supabase not available — prescription not persisted")
            return {"success": False, "error": "Supabase not configured"}

        result = supabase_client.table("prescriptions").insert(record_data).execute()
        logger.info(f"Prescription persisted: {record_data.get('prescription_id')}")
        return {"success": True, "data": result.data[0] if result.data else record_data}
    except Exception as e:
        logger.error(f"Failed to persist prescription: {e}")
        return {"success": False, "error": str(e)}


async def list_pending_prescriptions() -> List[Dict[str, Any]]:
    """Return all prescriptions with status pending_admin_review."""
    try:
        if not supabase_client:
            return []
        result = (
            supabase_client
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
        if not supabase_client:
            return []
        result = (
            supabase_client
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
        if not supabase_client:
            return []
        result = (
            supabase_client
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
    """Approve a prescription in Supabase."""
    try:
        if not supabase_client:
            return None
        result = (
            supabase_client
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
    """Reject a prescription in Supabase."""
    try:
        if not supabase_client:
            return None
        result = (
            supabase_client
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


async def get_prescription_by_id(prescription_id: str) -> Optional[Dict[str, Any]]:
    """Get a single prescription record by its prescription_id."""
    try:
        if not supabase_client:
            return None
        result = (
            supabase_client
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


# ---------------------------------------------------------------------------
# Patient signup helper
# ---------------------------------------------------------------------------

async def create_patient_profile(
    user_id: str,
    name: str,
    email: str,
    phone: str,
    role: str = "patient",
) -> Dict[str, Any]:
    """Insert a row into the profiles table for a new patient."""
    try:
        if not supabase_client:
            return {"success": False, "error": "Supabase not configured"}

        profile_data = {
            "user_id": user_id,
            "full_name": name,
            "email": email.strip().lower(),
            "role": role,
            "phone": phone,
            "phone_verified": False,
        }

        result = supabase_client.table("profiles").insert(profile_data).execute()
        logger.info(f"Patient profile created for {email}")
        return {"success": True, "data": result.data[0] if result.data else profile_data}
    except Exception as e:
        logger.error(f"Failed to create patient profile: {e}")
        return {"success": False, "error": str(e)}


async def update_phone_verified(user_id: str, phone: str) -> Dict[str, Any]:
    """Mark a phone number as verified in the profiles table."""
    try:
        if not supabase_client:
            return {"success": False, "error": "Supabase not configured"}

        result = (
            supabase_client
            .table("profiles")
            .update({"phone_verified": True})
            .eq("phone", phone)
            .execute()
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update phone_verified for {phone}: {e}")
        return {"success": False, "error": str(e)}


async def list_patients() -> List[Dict[str, Any]]:
    """Return all profiles with role=patient."""
    try:
        if not supabase_client:
            return []
        result = (
            supabase_client
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
