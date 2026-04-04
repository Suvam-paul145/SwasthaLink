"""
Gemini AI Service
Handles all interactions with Google Gemini 2.5 Flash API
Includes JSON parsing, error handling, and prompt management
"""

import os
import json
import re
from services.rate_limiter_service import gemini_rate_limiter, RateLimitExceeded
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


def _generate_text(
    prompt: str,
    generation_config: Optional[Dict[str, Any]] = None,
    safety_settings: Optional[list[Dict[str, Any]]] = None,
    system_instruction: Optional[str] = None,
    model_name: str = MODEL_NAME,
) -> str:
    """Generate text using whichever Gemini SDK is available."""
    if not GEMINI_API_KEY:
        raise GeminiServiceError("Gemini API key not configured")

    # Rate limit check — blocks before hitting API quota
    try:
        gemini_rate_limiter.check_and_record(context="text_generation")
    except RateLimitExceeded as exc:
        raise GeminiServiceError(str(exc))

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
    """Generate text for multimodal input (prompt + image/pdf)."""
    if not GEMINI_API_KEY:
        raise GeminiServiceError("Gemini API key not configured")

    # Rate limit check — blocks before hitting API quota
    try:
        gemini_rate_limiter.check_and_record(context="multimodal_ocr")
    except RateLimitExceeded as exc:
        raise GeminiServiceError(str(exc))

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


def compute_risk_score(quiz_score: int, medication_count: int, role: str, warning_count: int) -> int:
    """Compute a readmission risk score (0-100) based on discharge output and heuristics."""
    base = (3 - quiz_score) * 20          # 0, 20, 40, or 60
    med_factor = min(medication_count * 4, 24)  # max 24 pts
    warn_factor = min(warning_count * 3, 12)    # max 12 pts
    role_factor = 4 if role == "elderly" else 0
    return min(base + med_factor + warn_factor + role_factor, 100)


def check_gemini_health() -> Dict[str, Any]:
    """Check if Gemini API is accessible and healthy."""
    try:
        if not GEMINI_API_KEY:
            return {
                "status": "down",
                "message": "API key not configured",
                "available": False
            }

        response_text = _generate_text(
            prompt="Say 'ok'",
            generation_config={"temperature": 0},
        )

        if response_text:
            return {
                "status": "ok",
                "message": "Gemini API is healthy",
                "available": True
            }
        else:
            return {
                "status": "degraded",
                "message": "API responding but content blocked",
                "available": False
            }

    except Exception as e:
        logger.error(f"Gemini health check failed: {e}")
        return {
            "status": "down",
            "message": str(e),
            "available": False
        }
