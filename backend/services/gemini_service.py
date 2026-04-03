"""
Gemini AI Service
Handles all interactions with Google Gemini 2.5 Flash API
Includes JSON parsing, error handling, and prompt management

Fallback: When Gemini rate limits are exhausted, automatically
falls back to Groq (Llama 3.3 70B) to prevent service disruption.
"""

import os
import json
import re
from services.rate_limiter_service import (
    gemini_rate_limiter, 
    groq_rate_limiter,
    RateLimitExceeded,
    multi_provider_limiter,
)
import logging
from typing import Dict, Any, Optional

try:
    import google.genai as genai
    from google.genai import types
    GENAI_SDK = "google.genai"
except ImportError:
    try:
        from google import genai
        from google.genai import types
        GENAI_SDK = "google.genai"
    except ImportError:
        genai = None
        types = None
        GENAI_SDK = None

if GENAI_SDK is None:
    try:
        import google.generativeai as genai
        GENAI_SDK = "google.generativeai"
    except ImportError:
        genai = None
        GENAI_SDK = None

from models import (
    ProcessResponse,
    Medication,
    FollowUp,
    ComprehensionQuestion
)
from ai.prompts import (
    format_master_prompt,
    format_re_explain_prompt,
    format_ocr_prompt,
    GENERATION_CONFIG,
    SAFETY_SETTINGS,
    SYSTEM_INSTRUCTION
)
from core.exceptions import GeminiServiceError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-2.5-flash"

# Initialize Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai_client = None

if GENAI_SDK is None:
    logger.warning("No Gemini SDK installed. Install `google-genai` (recommended) or `google-generativeai`.")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not found in environment variables")
else:
    if GENAI_SDK == "google.genai":
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
    elif GENAI_SDK == "google.generativeai":
        genai.configure(api_key=GEMINI_API_KEY)


def _build_new_sdk_config(
    generation_config: Optional[Dict[str, Any]] = None,
    system_instruction: Optional[str] = None,
    safety_settings: Optional[list[Dict[str, Any]]] = None,
):
    """Build GenerateContentConfig for google.genai SDK."""
    config_payload: Dict[str, Any] = {
        "temperature": 0.3,
        "max_output_tokens": 4096,
    }

    if generation_config:
        config_payload.update(generation_config)

    if system_instruction:
        config_payload["system_instruction"] = system_instruction

    if safety_settings:
        config_payload["safety_settings"] = safety_settings

    return types.GenerateContentConfig(**config_payload)


def _try_groq_fallback(
    prompt: str,
    system_instruction: Optional[str] = None,
    temperature: float = 0.3,
) -> str:
    """
    Attempt to use Groq as fallback when Gemini is rate limited.
    Returns response text or raises GeminiServiceError if Groq also fails.
    """
    try:
        from services.groq_service import generate_text_groq_sync, is_groq_available
        
        if not is_groq_available():
            raise GeminiServiceError(
                "Both Gemini and Groq rate limits exhausted. "
                "Please wait until UTC midnight for limits to reset."
            )
        
        logger.info("Gemini rate limit reached. Falling back to Groq...")
        return generate_text_groq_sync(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=temperature,
        )
    except ImportError:
        raise GeminiServiceError(
            "Gemini rate limit reached and Groq fallback not available. "
            "Install groq package: pip install groq"
        )


def _generate_text(
    prompt: str,
    generation_config: Optional[Dict[str, Any]] = None,
    safety_settings: Optional[list[Dict[str, Any]]] = None,
    system_instruction: Optional[str] = None,
    model_name: str = MODEL_NAME,
) -> str:
    """
    Generate text using Gemini API with automatic Groq fallback.
    
    If Gemini rate limits are reached, automatically falls back to Groq
    to prevent service disruption.
    """
    # Check if we should use Gemini or fallback
    if not gemini_rate_limiter.can_make_request():
        logger.warning("Gemini rate limit approaching/exceeded, using Groq fallback")
        return _try_groq_fallback(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=generation_config.get("temperature", 0.3) if generation_config else 0.3,
        )
    
    if not GEMINI_API_KEY:
        # No Gemini key, try Groq
        return _try_groq_fallback(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=generation_config.get("temperature", 0.3) if generation_config else 0.3,
        )

    # Rate limit check — blocks before hitting API quota
    try:
        gemini_rate_limiter.check_and_record(context="text_generation")
    except RateLimitExceeded as exc:
        logger.warning(f"Gemini rate limit exceeded: {exc}")
        return _try_groq_fallback(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=generation_config.get("temperature", 0.3) if generation_config else 0.3,
        )

    if GENAI_SDK == "google.genai":
        if not genai_client:
            raise GeminiServiceError("Gemini client not initialized")

        config = _build_new_sdk_config(
            generation_config=generation_config,
            safety_settings=safety_settings,
            system_instruction=system_instruction,
        )

        response = genai_client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=config,
        )
        return (getattr(response, "text", None) or "").strip()

    if GENAI_SDK == "google.generativeai":
        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config,
            safety_settings=safety_settings,
            system_instruction=system_instruction,
        )
        response = model.generate_content(prompt)
        return (getattr(response, "text", None) or "").strip()

    raise GeminiServiceError(
        f"Gemini SDK not properly initialized. Current GENAI_SDK: {GENAI_SDK}. Install `google-genai` (recommended)."
    )


def _generate_multimodal_text(
    prompt: str,
    image_data: bytes,
    mime_type: str,
    generation_config: Optional[Dict[str, Any]] = None,
    model_name: str = MODEL_NAME,
) -> str:
    """
    Generate text for multimodal input (prompt + image/pdf).
    
    Note: Multimodal requires Gemini - Groq doesn't support image input.
    Will fail if Gemini rate limit is exceeded.
    """
    if not GEMINI_API_KEY:
        raise GeminiServiceError(
            "Gemini API key not configured. Multimodal (image) processing requires Gemini."
        )

    # Check rate limit before proceeding (no fallback for multimodal)
    if not gemini_rate_limiter.can_make_request():
        usage = gemini_rate_limiter.get_usage()
        raise GeminiServiceError(
            f"Gemini rate limit exhausted (RPD: {usage['rpd_pct']}% used). "
            f"Image processing requires Gemini - no fallback available. "
            f"Limits reset at {usage['reset_at_utc']}."
        )

    # Rate limit check — blocks before hitting API quota
    try:
        gemini_rate_limiter.check_and_record(context="multimodal_ocr")
    except RateLimitExceeded as exc:
        raise GeminiServiceError(
            f"Gemini rate limit exceeded: {exc}. "
            "Image processing requires Gemini - please wait for limits to reset."
        )

    if GENAI_SDK == "google.genai":
        if not genai_client:
            raise GeminiServiceError("Gemini client not initialized")

        config = _build_new_sdk_config(generation_config=generation_config)

        response = genai_client.models.generate_content(
            model=model_name,
            contents=[
                prompt,
                types.Part.from_bytes(data=image_data, mime_type=mime_type),
            ],
            config=config,
        )
        return (getattr(response, "text", None) or "").strip()

    if GENAI_SDK == "google.generativeai":
        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config,
        )
        image_part = {
            "mime_type": mime_type,
            "data": image_data,
        }
        response = model.generate_content([prompt, image_part])
        return (getattr(response, "text", None) or "").strip()

    raise GeminiServiceError(
        f"Gemini SDK not properly initialized. Current GENAI_SDK: {GENAI_SDK}. Install `google-genai` (recommended)."
    )


def _strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences that Gemini sometimes adds."""
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*$', '', text)
    text = re.sub(r'```', '', text)
    return text.strip()


def _extract_json_from_response(response_text: str) -> Dict[str, Any]:
    """Robustly extract and parse JSON from Gemini response."""
    try:
        cleaned_text = _strip_markdown_fences(response_text)

        start_idx = cleaned_text.find('{')
        end_idx = cleaned_text.rfind('}')

        if start_idx == -1 or end_idx == -1:
            raise GeminiServiceError("No JSON object found in response")

        json_text = cleaned_text[start_idx:end_idx + 1]
        parsed = json.loads(json_text)
        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing failed: {e}")
        logger.error(f"Raw response: {response_text[:500]}...")
        raise GeminiServiceError(f"Failed to parse Gemini response as JSON: {str(e)}")

    except Exception as e:
        logger.error(f"Unexpected error extracting JSON: {e}")
        raise GeminiServiceError(f"Unexpected error processing Gemini response: {str(e)}")


def _validate_and_build_response(data: Dict[str, Any], session_id: Optional[str] = None) -> ProcessResponse:
    """Validate Gemini response structure and build ProcessResponse model."""
    try:
        medications = [
            Medication(
                name=med.get("name", "Unknown medication"),
                dose=med.get("dose", "As prescribed"),
                timing=med.get("timing", ["Check with doctor"]),
                reason=med.get("reason", "See doctor for details"),
                important=med.get("important")
            )
            for med in data.get("medications", [])
        ]

        follow_up_data = data.get("follow_up")
        follow_up = None
        if follow_up_data:
            follow_up = FollowUp(
                date=follow_up_data.get("date", "Ask your doctor"),
                with_doctor=follow_up_data.get("with", "Your doctor"),
                reason=follow_up_data.get("reason", "Check recovery progress")
            )

        questions = [
            ComprehensionQuestion(
                question=q.get("question", ""),
                options=q.get("options", []),
                correct=q.get("correct", "A"),
                explanation=q.get("explanation", "")
            )
            for q in data.get("comprehension_questions", [])
        ]

        if len(questions) != 3:
            logger.warning(f"Expected 3 questions, got {len(questions)}. Padding or trimming.")
            while len(questions) < 3:
                questions.append(ComprehensionQuestion(
                    question="What should you do if you have questions?",
                    options=["A) Ignore them", "B) Call your doctor", "C) Ask a friend", "D) Wait and see"],
                    correct="B",
                    explanation="Always call your doctor if you're unsure about anything"
                ))
            questions = questions[:3]

        response = ProcessResponse(
            simplified_english=data.get("simplified_english", "Unable to simplify. Please contact your doctor."),
            simplified_bengali=data.get("simplified_bengali", "দুঃখিত, আপনার ডাক্তারের সাথে যোগাযোগ করুন।"),
            medications=medications,
            follow_up=follow_up,
            warning_signs=data.get("warning_signs", [
                "Severe chest pain",
                "Difficulty breathing",
                "Sudden severe headache",
                "Loss of consciousness",
                "Any symptoms that worry you"
            ]),
            comprehension_questions=questions,
            whatsapp_message=data.get("whatsapp_message", "SwasthaLink: Please contact your doctor for discharge instructions."),
            session_id=session_id
        )

        return response

    except Exception as e:
        logger.error(f"Error building response model: {e}")
        raise GeminiServiceError(f"Failed to validate Gemini response structure: {str(e)}")


async def process_discharge_summary(
    text: str,
    role: str,
    language: str = "both",
    re_explain: bool = False,
    previous_simplified: Optional[str] = None
) -> ProcessResponse:
    """Main function to process discharge summary using Gemini AI."""
    try:
        if re_explain and previous_simplified:
            prompt = format_re_explain_prompt(
                discharge_text=text,
                previous_simplified=previous_simplified,
                score=1,
                failed_topics="Critical medication instructions and warning signs"
            )
            logger.info("Using re-explanation prompt for simpler version")
        else:
            prompt = format_master_prompt(discharge_text=text, role=role)
            logger.info(f"Using master prompt for role: {role}")

        logger.info(f"Prompt length: {len(prompt)} chars")
        logger.info("Calling Gemini API...")

        response_text = _generate_text(
            prompt=prompt,
            generation_config=GENERATION_CONFIG,
            safety_settings=SAFETY_SETTINGS,
            system_instruction=SYSTEM_INSTRUCTION,
        )

        if not response_text:
            logger.error("Gemini response was blocked or empty")
            raise GeminiServiceError("Gemini API returned empty response. Content may have been blocked.")

        logger.info(f"Gemini response received: {len(response_text)} chars")

        data = _extract_json_from_response(response_text)
        result = _validate_and_build_response(data)

        logger.info("Successfully processed discharge summary")
        return result

    except GeminiServiceError:
        raise

    except Exception as e:
        logger.error(f"Unexpected error in process_discharge_summary: {e}")
        logger.exception(e)
        raise GeminiServiceError(f"Failed to process discharge summary: {str(e)}")


async def extract_text_from_image(image_data: bytes, mime_type: str) -> str:
    """Extract text from image/PDF using Gemini Vision."""
    try:
        prompt = format_ocr_prompt()

        logger.info(f"Calling Gemini Vision API for OCR ({mime_type})...")
        extracted_text = _generate_multimodal_text(
            prompt=prompt,
            image_data=image_data,
            mime_type=mime_type,
            generation_config={"temperature": 0.0},
        )

        if not extracted_text:
            raise GeminiServiceError("Gemini Vision returned empty response")

        logger.info(f"OCR completed: extracted {len(extracted_text)} characters")
        return extracted_text

    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        raise GeminiServiceError(f"Failed to extract text from image: {str(e)}")


async def validate_bengali_quality(bengali_text: str) -> Dict[str, Any]:
    """Validate if Bengali text uses everyday language (utility function)."""
    try:
        from ai.prompts import BENGALI_VALIDATION_PROMPT
        prompt = BENGALI_VALIDATION_PROMPT.format(bengali_text=bengali_text)

        response_text = _generate_text(
            prompt=prompt,
            generation_config={"temperature": 0.2},
        )

        if not response_text:
            raise GeminiServiceError("Bengali validation returned empty response")

        validation_result = _extract_json_from_response(response_text)
        return validation_result

    except Exception as e:
        logger.error(f"Bengali validation failed: {e}")
        return {
            "is_everyday_language": True,
            "formality_score": 3,
            "flagged_formal_words": [],
            "suggested_replacements": {}
        }


def check_gemini_health() -> Dict[str, Any]:
    """
    Check if Gemini API is accessible and healthy.
    Includes rate limit status and fallback provider availability.
    """
    gemini_usage = gemini_rate_limiter.get_usage()
    
    # Import Groq health check
    try:
        from services.groq_service import check_groq_health, is_groq_available
        groq_status = check_groq_health() if is_groq_available() else {"available": False}
    except ImportError:
        groq_status = {"available": False, "message": "Groq SDK not installed"}
    
    result = {
        "gemini": {
            "rate_limit": gemini_usage,
        },
        "groq": groq_status,
        "active_provider": multi_provider_limiter.get_available_provider() or "none",
    }
    
    # Check Gemini health
    if not GEMINI_API_KEY:
        result["gemini"]["status"] = "down"
        result["gemini"]["message"] = "API key not configured"
        result["gemini"]["available"] = False
        return result
    
    if not gemini_rate_limiter.can_make_request():
        result["gemini"]["status"] = "rate_limited"
        result["gemini"]["message"] = (
            f"Rate limit reached ({gemini_usage['rpd_pct']}% of daily limit). "
            f"Resets at {gemini_usage['reset_at_utc']}"
        )
        result["gemini"]["available"] = False
        
        # Check if fallback is available
        if groq_status.get("available"):
            result["status"] = "degraded"
            result["message"] = "Gemini rate limited, using Groq fallback"
        else:
            result["status"] = "critical"
            result["message"] = "All LLM providers exhausted"
        return result
    
    try:
        # Quick health ping (this will use rate limiter)
        response_text = _generate_text(
            prompt="Say 'ok'",
            generation_config={"temperature": 0},
        )

        if response_text:
            result["gemini"]["status"] = "ok"
            result["gemini"]["message"] = "Gemini API is healthy"
            result["gemini"]["available"] = True
            result["status"] = "ok"
            result["message"] = "Primary provider healthy"
        else:
            result["gemini"]["status"] = "degraded"
            result["gemini"]["message"] = "API responding but content blocked"
            result["gemini"]["available"] = False

    except Exception as e:
        logger.error(f"Gemini health check failed: {e}")
        result["gemini"]["status"] = "down"
        result["gemini"]["message"] = str(e)
        result["gemini"]["available"] = False
    
    return result


def get_rate_limit_status() -> Dict[str, Any]:
    """
    Get current rate limit status for all providers.
    Useful for monitoring dashboards and alerts.
    """
    return {
        "providers": multi_provider_limiter.get_status(),
        "active_provider": multi_provider_limiter.get_available_provider(),
        "all_exhausted": multi_provider_limiter.get_available_provider() is None,
    }
