"""
Authentication service for role-based login.

Primary mode:
  - Supabase email/password authentication
  - Optional role + name from user metadata or profiles table

Fallback mode:
  - Demo users (for local testing without Supabase auth setup)
"""

import logging
from typing import Any, Dict, Optional

from supabase_service import supabase_client

logger = logging.getLogger(__name__)

SUPPORTED_ROLES = {"patient", "doctor", "admin"}

DEMO_USERS = [
    {
        "id": "demo-patient-1007",
        "name": "Rahat Karim",
        "email": "patient@swasthalink.demo",
        "password": "Patient@123",
        "role": "patient",
    },
    {
        "id": "demo-doctor-004",
        "name": "Dr. Nusrat Jahan",
        "email": "doctor@swasthalink.demo",
        "password": "Doctor@123",
        "role": "doctor",
    },
    {
        "id": "demo-admin-001",
        "name": "Afiya Rahman",
        "email": "admin@swasthalink.demo",
        "password": "Admin@123",
        "role": "admin",
    },
]


class AuthServiceError(Exception):
    """Auth flow exception with HTTP-compatible status code."""

    def __init__(self, message: str, status_code: int = 401):
        super().__init__(message)
        self.status_code = status_code


def _normalize_role(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = value.strip().lower()
    if normalized in SUPPORTED_ROLES:
        return normalized
    return None


def _extract_name_from_user(user: Any) -> Optional[str]:
    metadata = getattr(user, "user_metadata", None) or {}
    if isinstance(metadata, dict):
        return metadata.get("full_name") or metadata.get("name")
    return None


def _extract_role_from_user(user: Any) -> Optional[str]:
    metadata = getattr(user, "user_metadata", None) or {}
    app_metadata = getattr(user, "app_metadata", None) or {}

    for source in (metadata, app_metadata):
        if not isinstance(source, dict):
            continue
        for key in ("role", "user_role", "panel_role"):
            role_value = _normalize_role(source.get(key))
            if role_value:
                return role_value

    return None


def _fetch_profile_row(user_id: Optional[str], email: str) -> Optional[Dict[str, Any]]:
    if not supabase_client:
        return None

    lookup_attempts = []
    if user_id:
        lookup_attempts.extend([("id", user_id), ("user_id", user_id)])
    lookup_attempts.append(("email", email))

    for column, value in lookup_attempts:
        try:
            result = (
                supabase_client
                .table("profiles")
                .select("id, user_id, email, role, full_name, name")
                .eq(column, value)
                .limit(1)
                .execute()
            )
            if result.data:
                return result.data[0]
        except Exception:
            continue

    return None


def _resolve_user_identity(user: Any, expected_role: str) -> Dict[str, Optional[str]]:
    user_id = getattr(user, "id", None)
    email = getattr(user, "email", None)
    profile_row = _fetch_profile_row(user_id, email or "")

    profile_name = None
    profile_role = None
    if isinstance(profile_row, dict):
        profile_name = profile_row.get("full_name") or profile_row.get("name")
        profile_role = _normalize_role(profile_row.get("role"))

    resolved_name = profile_name or _extract_name_from_user(user)
    if not resolved_name and email:
        resolved_name = email.split("@")[0]

    resolved_role = profile_role or _extract_role_from_user(user) or expected_role

    return {
        "id": user_id,
        "email": email,
        "name": resolved_name,
        "role": resolved_role,
    }


def _authenticate_demo_user(email: str, password: str, role: str) -> Optional[Dict[str, Any]]:
    normalized_email = email.strip().lower()
    for demo_user in DEMO_USERS:
        if (
            demo_user["email"].lower() == normalized_email
            and demo_user["password"] == password
            and demo_user["role"] == role
        ):
            return {
                "user": {
                    "id": demo_user["id"],
                    "name": demo_user["name"],
                    "email": demo_user["email"],
                    "role": demo_user["role"],
                },
                "access_token": f"demo-token-{demo_user['id']}",
                "is_demo": True,
            }
    return None


def login_user(email: str, password: str, role: str) -> Dict[str, Any]:
    """
    Authenticate a user with role + email + password.
    """
    expected_role = _normalize_role(role)
    if not expected_role:
        raise AuthServiceError("Invalid role selected", status_code=400)

    if not email or not password:
        raise AuthServiceError("Email and password are required", status_code=400)

    # Try Supabase auth first.
    if supabase_client:
        try:
            auth_response = supabase_client.auth.sign_in_with_password(
                {"email": email.strip(), "password": password}
            )
            auth_user = getattr(auth_response, "user", None)
            auth_session = getattr(auth_response, "session", None)

            if auth_user is None:
                raise AuthServiceError("Invalid email or password", status_code=401)

            resolved = _resolve_user_identity(auth_user, expected_role)
            resolved_role = _normalize_role(resolved.get("role"))
            if resolved_role != expected_role:
                raise AuthServiceError(
                    f"Role mismatch. This account is assigned to '{resolved_role or 'unknown'}'.",
                    status_code=403,
                )

            resolved_name = resolved.get("name") or "User"
            access_token = getattr(auth_session, "access_token", None) if auth_session else None

            return {
                "user": {
                    "id": resolved.get("id"),
                    "name": resolved_name,
                    "email": resolved.get("email") or email.strip(),
                    "role": resolved_role,
                },
                "access_token": access_token,
                "is_demo": False,
            }
        except AuthServiceError:
            raise
        except Exception as exc:
            logger.warning(f"Supabase auth failed: {exc}")

    # Fallback: demo users.
    demo_result = _authenticate_demo_user(email, password, expected_role)
    if demo_result:
        return demo_result

    raise AuthServiceError("Invalid email, password, or role", status_code=401)

