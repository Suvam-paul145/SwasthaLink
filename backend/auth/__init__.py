"""
Auth package — login, signup, OTP services.
"""

from auth.auth_service import login_user, signup_user
from core.exceptions import AuthServiceError

# Backward compat alias
signup_patient = signup_user

__all__ = ["login_user", "signup_user", "signup_patient", "AuthServiceError"]
