"""
Authentication service for role-based login.

Primary mode:
  - Local SQLite via MockSupabaseClient (with bcrypt + JWT)
  - Falls back gracefully if dependencies are missing
"""

import logging
from typing import Any, Dict, Optional

from db.mock_supabase import MockSupabaseClient
from core.exceptions import AuthServiceError

# Import JWT utility for generating tokens on signup
try:
    from auth.jwt_utils import create_access_token
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False

supabase_client = MockSupabaseClient()
logger = logging.getLogger(__name__)

SUPPORTED_ROLES = {"patient", "doctor", "admin"}


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


def login_user(email: str, password: str, role: str) -> Dict[str, Any]:
    """Authenticate a user with role + email + password."""
    expected_role = _normalize_role(role)
    if not expected_role:
        raise AuthServiceError("Invalid role selected", status_code=400)

    if not email or not password:
        raise AuthServiceError("Email and password are required", status_code=400)

    if not supabase_client:
        raise AuthServiceError("Supabase client is not configured.", status_code=500)

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
        raise AuthServiceError("Invalid email, password, or role", status_code=401)


def signup_user(name: str, email: str, password: str, phone: str, role: str = "patient") -> Dict[str, Any]:
    """Create a new user account with the specified role."""
    if not name or not email or not password or not phone:
        raise AuthServiceError("Name, email, password, and phone are required", status_code=400)

    validated_role = _normalize_role(role)
    if not validated_role:
        raise AuthServiceError("Invalid role selected", status_code=400)

    normalized_email = email.strip().lower()

    if not supabase_client:
        raise AuthServiceError("Supabase client is not configured.", status_code=500)

    try:
        auth_response = supabase_client.auth.sign_up({
            "email": normalized_email,
            "password": password,
            "options": {
                "data": {
                    "full_name": name.strip(),
                    "role": validated_role,
                    "phone": phone,
                },
            },
        })

        auth_user = getattr(auth_response, "user", None)
        if auth_user is None:
            raise AuthServiceError("Failed to create account — please try again", status_code=500)

        user_id = getattr(auth_user, "id", None)

        # Generate a JWT token for the new user
        access_token = None
        if JWT_AVAILABLE:
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
            },
            "access_token": access_token,
            "is_demo": False,
        }

    except AuthServiceError:
        raise
    except Exception as exc:
        error_msg = str(exc)
        if "already registered" in error_msg.lower() or "duplicate" in error_msg.lower():
            raise AuthServiceError("An account with this email already exists", status_code=409)
        logger.error(f"Signup failed: {exc}")
        raise AuthServiceError(f"Signup failed: {error_msg}", status_code=500)
