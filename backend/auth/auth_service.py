"""
Authentication service for role-based login.

Uses Supabase purely as a Postgres database — no Supabase Auth.
All auth is handled via the `profiles` table + bcrypt + our own JWT.
"""

import logging
import random
import string
import uuid
from typing import Any, Dict, Optional

import bcrypt
import hashlib
import base64

from db.supabase_service import supabase_client
from core.exceptions import AuthServiceError
from auth.jwt_utils import create_access_token

logger = logging.getLogger(__name__)

SUPPORTED_ROLES = {"patient", "doctor", "admin"}


def _generate_patient_id() -> str:
    """Generate a unique patient ID in format PID-XXXXXX."""
    chars = string.ascii_uppercase + string.digits
    code = ''.join(random.choices(chars, k=6))
    return f"PID-{code}"


def _normalize_role(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = value.strip().lower()
    if normalized in SUPPORTED_ROLES:
        return normalized
    return None


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_pbkdf2_sha256(plain: str, stored: str) -> bool:
    """Verify a Django-style pbkdf2_sha256$iterations$salt$hash password."""
    parts = stored.split("$")
    if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
        return False
    iterations = int(parts[1])
    salt = parts[2]
    stored_hash = parts[3]
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt.encode("utf-8"), iterations)
    computed = base64.b64encode(dk).decode("utf-8")
    return computed == stored_hash


def _verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    # Support legacy pbkdf2_sha256 hashes
    if hashed.startswith("pbkdf2_sha256$"):
        return _verify_pbkdf2_sha256(plain, hashed)
    # bcrypt hashes start with $2b$ or $2a$
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _fetch_profile_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Look up a profile row by email."""
    if not supabase_client:
        return None
    try:
        result = (
            supabase_client
            .table("profiles")
            .select("id, user_id, email, role, full_name, name, phone, phone_verified, password_hash, pid")
            .eq("email", email.strip().lower())
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as exc:
        logger.error(f"Profile lookup failed: {exc}")
        return None


def login_user(email: str, password: str, role: str) -> Dict[str, Any]:
    """Authenticate a user with role + email + password against the profiles table."""
    expected_role = _normalize_role(role)
    if not expected_role:
        raise AuthServiceError("Invalid role selected", status_code=400)

    if not email or not password:
        raise AuthServiceError("Email and password are required", status_code=400)

    if not supabase_client:
        raise AuthServiceError("Database is not configured.", status_code=500)

    profile = _fetch_profile_by_email(email)
    if not profile:
        raise AuthServiceError("Invalid email, password, or role", status_code=401)

    if not _verify_password(password, profile.get("password_hash", "")):
        raise AuthServiceError("Invalid email, password, or role", status_code=401)

    profile_role = _normalize_role(profile.get("role"))
    if profile_role != expected_role:
        raise AuthServiceError(
            f"Role mismatch. This account is assigned to '{profile_role or 'unknown'}'.",
            status_code=403,
        )

    user_id = profile.get("user_id") or profile.get("id")
    resolved_name = profile.get("full_name") or profile.get("name") or "User"

    access_token = create_access_token(
        user_id=user_id,
        email=email.strip().lower(),
        role=profile_role,
        name=resolved_name,
    )

    return {
        "user": {
            "id": user_id,
            "name": resolved_name,
            "email": profile.get("email", email.strip().lower()),
            "role": profile_role,
            "phone": profile.get("phone"),
            "phone_verified": bool(profile.get("phone_verified", False)),
            "pid": profile.get("pid"),
        },
        "access_token": access_token,
        "is_demo": False,
    }


def signup_user(name: str, email: str, password: str, phone: str, role: str = "patient") -> Dict[str, Any]:
    """Create a new user account directly in the profiles table."""
    if not name or not email or not password or not phone:
        raise AuthServiceError("Name, email, password, and phone are required", status_code=400)

    validated_role = _normalize_role(role)
    if not validated_role:
        raise AuthServiceError("Invalid role selected", status_code=400)

    normalized_email = email.strip().lower()

    if not supabase_client:
        raise AuthServiceError("Database is not configured.", status_code=500)

    # Check for existing account
    existing = _fetch_profile_by_email(normalized_email)
    if existing:
        raise AuthServiceError("An account with this email already exists", status_code=409)

    user_id = str(uuid.uuid4())
    hashed_pw = _hash_password(password)

    # Auto-generate a PID for patient accounts so doctors can search by ID
    patient_pid = _generate_patient_id() if validated_role == "patient" else None

    payload = {
        "id": user_id,
        "user_id": user_id,
        "email": normalized_email,
        "full_name": name.strip(),
        "name": name.strip(),
        "role": validated_role,
        "phone": phone,
        "phone_verified": False,
        "password_hash": hashed_pw,
    }
    if patient_pid:
        payload["pid"] = patient_pid

    try:
        supabase_client.table("profiles").insert(payload).execute()
    except Exception as exc:
        logger.error(f"Signup insert failed: {exc}")
        error_msg = str(exc).lower()
        if "duplicate" in error_msg or "unique" in error_msg:
            raise AuthServiceError("An account with this email already exists", status_code=409)
        raise AuthServiceError("Failed to create account — please try again", status_code=500)

    access_token = create_access_token(
        user_id=user_id,
        email=normalized_email,
        role=validated_role,
        name=name.strip(),
    )

    return {
        "user_id": user_id,
        "user": {
            "id": user_id,
            "name": name.strip(),
            "email": normalized_email,
            "role": validated_role,
            "phone": phone,
            "phone_verified": False,
            "pid": patient_pid,
        },
        "access_token": access_token,
        "is_demo": False,
    }
