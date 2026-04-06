"""
Centralised configuration helpers and constants.
"""

import os
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)


def read_env(*names: str) -> Optional[str]:
    """Read the first non-empty env var from a list, trimming accidental spaces."""
    for name in names:
        raw_value = os.getenv(name)
        if raw_value is None:
            continue
        value = raw_value.strip()
        if value:
            return value
    return None


# CORS / frontend
FRONTEND_URL = (os.getenv("FRONTEND_URL") or "https://swastha-link-psi.vercel.app").rstrip("/")
ALLOWED_ORIGINS = [
    # Local development
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    # Production Vercel domains (always allowed)
    "https://swastha-link-psi.vercel.app",
    "https://swastha-link-git-testing-suvam-paul145s-projects.vercel.app",
    # From env var
    FRONTEND_URL,
]

# Include any extra Vercel preview/branch URLs from EXTRA_CORS_ORIGINS (comma-separated)
_extra = os.getenv("EXTRA_CORS_ORIGINS", "")
if _extra:
    ALLOWED_ORIGINS.extend([u.strip() for u in _extra.split(",") if u.strip()])

# Deduplicate while preserving order
ALLOWED_ORIGINS = list(dict.fromkeys(ALLOWED_ORIGINS))
