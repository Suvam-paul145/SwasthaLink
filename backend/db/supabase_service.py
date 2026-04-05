"""
Supabase Service — Session logging + analytics.
Prescription and profile CRUD have been moved to db.prescription_db and db.profile_db.
"""

import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta, timezone
import uuid
import inspect
from db.mock_supabase import MockSupabaseClient

try:
    from supabase import create_client
    SUPABASE_SDK_AVAILABLE = True
except ImportError:
    create_client = None
    SUPABASE_SDK_AVAILABLE = False

from core.config import read_env

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if not SUPABASE_SDK_AVAILABLE:
    logger.warning("Supabase SDK not installed. Install with: pip install supabase==2.8.1")


# Load Supabase credentials
SUPABASE_URL = read_env("VITE_SUPABASE_URL", "SUPABASE_URL")
SUPABASE_KEY = read_env(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
)

# Initialize Supabase client (local mock)
supabase_client = MockSupabaseClient()

logger.info("Local SQLite mock client initialized successfully")


class SupabaseServiceError(Exception):
    """Custom exception for Supabase service errors"""
    pass


async def _execute_query(query):
    """Execute Supabase query in both async (real) and sync (mock) modes."""
    result = query.execute()
    if inspect.isawaitable(result):
        return await result
    return result


def _history_enabled() -> bool:
    """Feature flag for full persistent history storage."""
    return os.getenv("STORE_FULL_HISTORY", "true").strip().lower() == "true"


def generate_session_id() -> str:
    """Generate unique session ID."""
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
    """Log session metadata."""
    try:
        if not supabase_client:
            logger.warning("Supabase client not available - skipping session logging")
            return {
                "success": False,
                "session_id": session_id or generate_session_id(),
                "error": "Supabase not configured"
            }

        if not session_id:
            session_id = generate_session_id()

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

        result = supabase_client.table("sessions").insert(session_data).execute()
        logger.info(f"Session logged successfully: {session_id}")

        return {
            "success": True,
            "session_id": session_id,
            "data": result.data[0] if result.data else session_data
        }

    except Exception as e:
        logger.error(f"Failed to log session: {e}")
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
    """Persist full clinical request + AI response for long-term history continuity."""
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
    """Append timeline events (quiz, whatsapp, etc.) for historical traceability."""
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
    """Fetch full persisted history and events for a specific session."""
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
    """List recent persisted histories for admin/recovery workflows."""
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
    """Update session with quiz score after quiz submission."""
    try:
        if not supabase_client:
            logger.warning("Supabase client not available")
            return {"success": False, "error": "Supabase not configured"}

        supabase_client.table("sessions").update({
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
    """Update session with WhatsApp delivery status."""
    try:
        if not supabase_client:
            logger.warning("Supabase client not available")
            return {"success": False, "error": "Supabase not configured"}

        supabase_client.table("sessions").update({
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
    """Get total number of sessions processed."""
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
    """Get aggregated analytics."""
    try:
        if not supabase_client:
            return {"error": "Supabase not configured"}

        total_result = supabase_client.table("sessions").select("id", count="exact").execute()
        total = total_result.count if hasattr(total_result, 'count') else len(total_result.data)

        sessions_result = supabase_client.table("sessions").select("*").execute()
        sessions = sessions_result.data

        by_role = {"patient": 0, "caregiver": 0, "elderly": 0}
        by_language = {"en": 0, "bn": 0, "both": 0}
        whatsapp_count = 0
        re_explained_count = 0
        quiz_scores = []

        for session in sessions:
            role = session.get("role")
            if role in by_role:
                by_role[role] += 1

            language = session.get("language")
            if language in by_language:
                by_language[language] += 1

            if session.get("whatsapp_sent"):
                whatsapp_count += 1

            if session.get("re_explained"):
                re_explained_count += 1

            score = session.get("quiz_score")
            if score is not None:
                quiz_scores.append(score)

        avg_quiz_score = sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0

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
    """Check if Supabase service is accessible and healthy."""
    try:
        if not supabase_client:
            return {
                "status": "down",
                "message": "Supabase client not initialized. Check credentials.",
                "available": False
            }

        supabase_client.table("sessions").select("id").limit(1).execute()

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


def get_schema_sql() -> str:
    """Get SQL schema for creating Supabase tables."""
    return """
create extension if not exists pgcrypto;

create table if not exists public.discharge_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  patient_id text not null,
  doctor_id text,
  simplified_english text not null,
  simplified_bengali text not null,
  medications jsonb not null default '[]'::jsonb,
  follow_up jsonb,
  warning_signs jsonb not null default '[]'::jsonb,
  quiz_questions jsonb not null default '[]'::jsonb,
  risk_score int,
  risk_level text
);

create index if not exists idx_discharge_results_patient_created
  on public.discharge_results (patient_id, created_at desc);

create table if not exists public.share_tokens (
  token text primary key,
  session_id uuid not null,
  patient_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_share_tokens_session
  on public.share_tokens (session_id);

create index if not exists idx_share_tokens_expires_at
  on public.share_tokens (expires_at);

create table if not exists public.followup_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid not null,
  patient_id text not null,
  patient_name text,
  phone_number text not null,
  day_offset int not null,
  scheduled_for timestamptz not null,
  message_text text not null,
  medications jsonb not null default '[]'::jsonb,
  status text not null default 'pending', -- pending|sent|failed
  sent_at timestamptz,
  twilio_sid text,
  error text
);

create index if not exists idx_followup_messages_status_scheduled
  on public.followup_messages (status, scheduled_for);
"""


async def save_discharge_result(patient_id: str, doctor_id: Optional[str], gemini_result: Dict[str, Any]) -> Dict[str, Any]:
    """Save the final discharge result to Supabase."""
    try:
        if not supabase_client:
            return {"success": False, "error": "Supabase not configured"}

        data = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.utcnow().isoformat(),
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "simplified_english": gemini_result.get("simplified_english"),
            "simplified_bengali": gemini_result.get("simplified_bengali"),
            "medications": gemini_result.get("medications", []),
            "follow_up": gemini_result.get("follow_up", {}),
            "warning_signs": gemini_result.get("warning_signs", []),
            "quiz_questions": (
                gemini_result.get("quiz_questions")
                or gemini_result.get("comprehension_questions", [])
            ),
            "risk_score": gemini_result.get("risk_score"),
            "risk_level": gemini_result.get("risk_level"),
        }

        result = await _execute_query(
            supabase_client.table("discharge_results").insert(data)
        )

        return {
            "success": True,
            "data": result.data[0] if getattr(result, "data", None) else data
        }
    except Exception as e:
        logger.error(f"Failed to save discharge result: {e}")
        return {"success": False, "error": str(e)}


async def create_share_token(
    session_id: str,
    patient_id: str,
    expires_in_days: int = 30,
) -> Dict[str, Any]:
    """Create an 8-char unique share token mapped to one session."""
    try:
        if not supabase_client:
            return {"success": False, "error": "Supabase not configured"}

        try:
            import shortuuid  # type: ignore
        except Exception as exc:
            logger.error(f"shortuuid import failed: {exc}")
            return {"success": False, "error": "shortuuid is not installed"}

        expires_at = (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat()

        token = None
        for _ in range(10):
            candidate = shortuuid.ShortUUID().random(length=8)
            exists_result = await _execute_query(
                supabase_client.table("share_tokens").select("token").eq("token", candidate).limit(1)
            )
            if not (getattr(exists_result, "data", None) or []):
                token = candidate
                break

        if not token:
            return {"success": False, "error": "Unable to generate unique token"}

        payload = {
            "token": token,
            "session_id": session_id,
            "patient_id": patient_id,
            "expires_at": expires_at,
        }

        insert_result = await _execute_query(
            supabase_client.table("share_tokens").insert(payload)
        )

        return {
            "success": True,
            "token": token,
            "data": (insert_result.data[0] if getattr(insert_result, "data", None) else payload),
        }
    except Exception as e:
        logger.error(f"Failed to create share token: {e}")
        return {"success": False, "error": str(e)}


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    """Parse ISO timestamp safely."""
    if not value or not isinstance(value, str):
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


async def get_share_payload_by_token(token: str) -> Optional[Dict[str, Any]]:
    """Fetch non-PHI share payload for a valid (non-expired) token."""
    try:
        if not supabase_client:
            return None

        token_result = await _execute_query(
            supabase_client.table("share_tokens").select("*").eq("token", token).limit(1)
        )
        token_rows = token_result.data if getattr(token_result, "data", None) else []
        if not token_rows:
            return None

        token_row = token_rows[0]
        expires_at = _parse_iso_datetime(token_row.get("expires_at"))
        now_utc = datetime.now(timezone.utc)
        if not expires_at:
            return None
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now_utc:
            return None

        session_id = token_row.get("session_id")
        patient_id = token_row.get("patient_id")

        history_result = await _execute_query(
            supabase_client
            .table("session_history")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", desc=True)
            .limit(1)
        )
        history_rows = history_result.data if getattr(history_result, "data", None) else []
        history_row = history_rows[0] if history_rows else {}

        risk_score = None
        try:
            dr_result = await _execute_query(
                supabase_client
                .table("discharge_results")
                .select("*")
                .eq("patient_id", patient_id)
                .order("created_at", desc=True)
                .limit(1)
            )
            dr_rows = dr_result.data if getattr(dr_result, "data", None) else []
            if dr_rows:
                risk_score = dr_rows[0].get("risk_score")
        except Exception as dr_exc:
            logger.warning(f"Could not fetch risk_score from discharge_results: {dr_exc}")

        return {
            "medications": history_row.get("medications", []),
            "follow_up": history_row.get("follow_up"),
            "warning_signs": history_row.get("warning_signs", []),
            "risk_score": risk_score,
        }
    except Exception as e:
        logger.error(f"Failed to fetch share payload: {e}")
        return None


async def get_patient_discharge_history(patient_id: str, limit: int = 50) -> Dict[str, Any]:
    """Fetch discharge history for one patient."""
    try:
        if not supabase_client:
            return {"success": False, "error": "Supabase not configured", "history": []}

        result = await _execute_query(
            supabase_client
            .table("discharge_results")
            .select("*")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        return {
            "success": True,
            "patient_id": patient_id,
            "history": result.data if getattr(result, "data", None) else []
        }
    except Exception as e:
        logger.error(f"Failed to fetch patient discharge history: {e}")
        return {"success": False, "error": str(e), "history": []}


async def create_followup_message_jobs(jobs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Insert follow-up WhatsApp jobs for future delivery."""
    try:
        if not supabase_client:
            return {"success": False, "error": "Supabase not configured", "jobs": []}

        payload: List[Dict[str, Any]] = []
        for job in jobs:
            payload.append(
                {
                    "id": str(uuid.uuid4()),
                    "created_at": datetime.utcnow().isoformat(),
                    "session_id": job.get("session_id"),
                    "patient_id": job.get("patient_id"),
                    "patient_name": job.get("patient_name"),
                    "phone_number": job.get("phone_number"),
                    "day_offset": job.get("day_offset"),
                    "scheduled_for": job.get("scheduled_for"),
                    "message_text": job.get("message_text"),
                    "medications": job.get("medications", []),
                    "status": "pending",
                }
            )

        result = await _execute_query(
            supabase_client.table("followup_messages").insert(payload)
        )
        return {
            "success": True,
            "jobs": result.data if getattr(result, "data", None) else payload,
        }
    except Exception as e:
        logger.error(f"Failed to create follow-up jobs: {e}")
        return {"success": False, "error": str(e), "jobs": []}


async def get_pending_followup_jobs(limit: int = 200) -> List[Dict[str, Any]]:
    """Return pending follow-up jobs ordered by schedule time."""
    try:
        if not supabase_client:
            return []

        result = await _execute_query(
            supabase_client
            .table("followup_messages")
            .select("*")
            .eq("status", "pending")
            .order("scheduled_for", desc=False)
            .limit(limit)
        )
        return result.data if getattr(result, "data", None) else []
    except Exception as e:
        logger.error(f"Failed to list pending follow-up jobs: {e}")
        return []


async def get_followup_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Fetch one follow-up job by ID."""
    try:
        if not supabase_client:
            return None
        result = await _execute_query(
            supabase_client.table("followup_messages").select("*").eq("id", job_id).limit(1)
        )
        rows = result.data if getattr(result, "data", None) else []
        return rows[0] if rows else None
    except Exception as e:
        logger.error(f"Failed to fetch follow-up job {job_id}: {e}")
        return None


async def mark_followup_job_sent(job_id: str, twilio_sid: Optional[str]) -> Dict[str, Any]:
    """Mark a follow-up job as sent."""
    try:
        if not supabase_client:
            return {"success": False, "error": "Supabase not configured"}

        result = await _execute_query(
            supabase_client
            .table("followup_messages")
            .update(
                {
                    "status": "sent",
                    "twilio_sid": twilio_sid,
                    "sent_at": datetime.utcnow().isoformat(),
                    "error": None,
                }
            )
            .eq("id", job_id)
        )
        return {"success": True, "data": result.data if getattr(result, "data", None) else []}
    except Exception as e:
        logger.error(f"Failed to mark follow-up job sent: {e}")
        return {"success": False, "error": str(e)}


async def mark_followup_job_failed(job_id: str, error: str) -> Dict[str, Any]:
    """Mark a follow-up job as failed."""
    try:
        if not supabase_client:
            return {"success": False, "error": "Supabase not configured"}
        result = await _execute_query(
            supabase_client
            .table("followup_messages")
            .update({"status": "failed", "error": error[:500]})
            .eq("id", job_id)
        )
        return {"success": True, "data": result.data if getattr(result, "data", None) else []}
    except Exception as e:
        logger.error(f"Failed to mark follow-up job failed: {e}")
        return {"success": False, "error": str(e)}


async def get_patient_contact(patient_id: str) -> Optional[Dict[str, Any]]:
    """Fetch patient phone/name from profiles table."""
    try:
        if not supabase_client:
            return None

        result = await _execute_query(
            supabase_client
            .table("profiles")
            .select("user_id, full_name, name, phone")
            .eq("user_id", patient_id)
            .limit(1)
        )
        rows = result.data if getattr(result, "data", None) else []
        if not rows:
            result = await _execute_query(
                supabase_client
                .table("profiles")
                .select("user_id, full_name, name, phone")
                .eq("id", patient_id)
                .limit(1)
            )
            rows = result.data if getattr(result, "data", None) else []

        if not rows:
            return None

        row = rows[0]
        return {
            "patient_id": row.get("user_id") or patient_id,
            "patient_name": row.get("full_name") or row.get("name") or "Patient",
            "phone_number": row.get("phone"),
        }
    except Exception as e:
        logger.error(f"Failed to fetch patient contact: {e}")
        return None
