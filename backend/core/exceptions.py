"""
All application-level custom exceptions in one place.
"""


class APIError(Exception):
    """Generic API error with status code."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


class LLMServiceError(APIError):
    """Custom exception for LLM service errors"""
    pass


class LlamaCloudServiceError(Exception):
    """Custom exception for LlamaCloud document extraction errors."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


class TwilioServiceError(Exception):
    """Custom exception for Twilio service errors"""
    pass


class S3ServiceError(Exception):
    """Custom exception for S3 service errors"""
    pass


class SupabaseServiceError(Exception):
    """Custom exception for Supabase service errors"""
    pass


class AuthServiceError(Exception):
    """Auth flow exception with HTTP-compatible status code."""

    def __init__(self, message: str, status_code: int = 401):
        super().__init__(message)
        self.status_code = status_code


class OTPServiceError(Exception):
    """Raised when OTP send/verify fails."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code
