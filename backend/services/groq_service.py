"""
Groq AI Service - Fallback provider for when Gemini limits are exhausted.

Groq offers fast inference for Llama and other open-source models.
Free tier: 14,400 RPD, 30 RPM, varies by model TPM.

Usage:
    from services.groq_service import generate_text_groq
    response = await generate_text_groq(prompt)
"""

import os
import logging
from typing import Optional, Dict, Any

from services.rate_limiter_service import groq_rate_limiter, RateLimitExceeded
from core.exceptions import GeminiServiceError  # Reuse exception for consistency

logger = logging.getLogger(__name__)

# Groq API configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Available Groq models (free tier):
# - llama-3.3-70b-versatile: Best quality, 6K TPM
# - llama-3.1-70b-versatile: Good quality, 6K TPM  
# - llama-3.1-8b-instant: Fast, 131K TPM
# - mixtral-8x7b-32768: Good for longer context, 5K TPM
# - gemma2-9b-it: Google's open model, 15K TPM

try:
    from groq import Groq
    GROQ_SDK_AVAILABLE = True
except ImportError:
    Groq = None
    GROQ_SDK_AVAILABLE = False
    logger.warning("Groq SDK not installed. Install with: pip install groq")


def _get_groq_client():
    """Get or create Groq client."""
    if not GROQ_SDK_AVAILABLE:
        return None
    if not GROQ_API_KEY:
        return None
    return Groq(api_key=GROQ_API_KEY)


def is_groq_available() -> bool:
    """Check if Groq can be used as a fallback."""
    return (
        GROQ_SDK_AVAILABLE 
        and bool(GROQ_API_KEY) 
        and groq_rate_limiter.can_make_request()
    )


def generate_text_groq_sync(
    prompt: str,
    system_instruction: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 4096,
    model: str = GROQ_MODEL,
) -> str:
    """
    Generate text using Groq API (synchronous).
    
    Args:
        prompt: The user prompt
        system_instruction: Optional system message
        temperature: Sampling temperature (0-2)
        max_tokens: Maximum output tokens
        model: Model to use
        
    Returns:
        Generated text response
        
    Raises:
        GeminiServiceError: If generation fails
    """
    if not GROQ_SDK_AVAILABLE:
        raise GeminiServiceError("Groq SDK not installed. Install with: pip install groq")
    
    if not GROQ_API_KEY:
        raise GeminiServiceError("GROQ_API_KEY not configured in environment variables")
    
    # Rate limit check
    try:
        groq_rate_limiter.check_and_record(context="text_generation")
    except RateLimitExceeded as exc:
        raise GeminiServiceError(f"Groq rate limit exceeded: {exc}")
    
    try:
        client = _get_groq_client()
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        raise GeminiServiceError(f"Groq API request failed: {str(e)}")


async def generate_text_groq(
    prompt: str,
    system_instruction: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 4096,
    model: str = GROQ_MODEL,
) -> str:
    """
    Generate text using Groq API (async wrapper).
    
    Note: Groq SDK is synchronous, so this wraps the sync function.
    For true async, use httpx to call the REST API directly.
    """
    import asyncio
    return await asyncio.to_thread(
        generate_text_groq_sync,
        prompt=prompt,
        system_instruction=system_instruction,
        temperature=temperature,
        max_tokens=max_tokens,
        model=model,
    )


def check_groq_health() -> Dict[str, Any]:
    """Check if Groq API is accessible and healthy."""
    if not GROQ_SDK_AVAILABLE:
        return {
            "status": "down",
            "message": "Groq SDK not installed",
            "available": False,
        }
    
    if not GROQ_API_KEY:
        return {
            "status": "down",
            "message": "API key not configured",
            "available": False,
        }
    
    if not groq_rate_limiter.can_make_request():
        usage = groq_rate_limiter.get_usage()
        return {
            "status": "rate_limited",
            "message": f"Rate limit reached ({usage['rpd_pct']}% of daily limit used)",
            "available": False,
            "usage": usage,
        }
    
    try:
        # Quick health check
        response = generate_text_groq_sync(
            prompt="Say 'ok'",
            temperature=0,
            max_tokens=10,
        )
        
        if response:
            return {
                "status": "ok",
                "message": "Groq API is healthy",
                "available": True,
                "model": GROQ_MODEL,
            }
        else:
            return {
                "status": "degraded",
                "message": "API responding but empty response",
                "available": False,
            }
            
    except Exception as e:
        logger.error(f"Groq health check failed: {e}")
        return {
            "status": "down",
            "message": str(e),
            "available": False,
        }
