"""
JWT utility functions for SwasthaLink authentication.

- create_access_token(): Signs a JWT with 24-hour expiry
- decode_access_token(): Validates and decodes a JWT
- get_current_user(): FastAPI dependency to extract user from Authorization header
"""

import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt
from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET", "swasthalink-dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


def create_access_token(
    user_id: str,
    email: str,
    role: str,
    name: str = "",
    expires_hours: int = JWT_EXPIRY_HOURS,
) -> str:
    """Create a signed JWT token with 24-hour expiry."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "name": name,
        "iat": now,
        "exp": now + timedelta(hours=expires_hours),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token.
    Raises jwt.ExpiredSignatureError if expired.
    Raises jwt.InvalidTokenError for any other issue.
    """
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def get_current_user(request: Request) -> Dict[str, Any]:
    """
    FastAPI dependency: extract and verify user from Authorization header.
    Usage:
        @router.get("/api/protected")
        async def protected(user: dict = Depends(get_current_user)):
            ...
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header[7:]  # Strip "Bearer "
    try:
        payload = decode_access_token(token)
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "name": payload.get("name"),
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")
