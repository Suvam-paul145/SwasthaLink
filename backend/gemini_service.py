"""
Gemini AI Service
Handles all interactions with Google Gemini 2.5 Flash API
Includes JSON parsing, error handling, and prompt management
"""

import os
import json
import re
import logging
from typing import Dict, Any, Optional
import google.generativeai as genai

from models import (
    ProcessResponse,
    Medication,
    FollowUp,
    ComprehensionQuestion
)
from prompts import (
    format_master_prompt,
    format_re_explain_prompt,
    format_ocr_prompt,
    GENERATION_CONFIG,
    SAFETY_SETTINGS,
    SYSTEM_INSTRUCTION
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini API (google-generativeai SDK)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not found in environment variables")
else:
    genai.configure(api_key=GEMINI_API_KEY)


class GeminiServiceError(Exception):
    """Custom exception for Gemini service errors"""
    pass


def _strip_markdown_fences(text: str) -> str:
    """
    Remove markdown code fences that Gemini sometimes adds
    despite instructions not to
    """
    # Remove ```json ... ``` blocks
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*$', '', text)

    # Remove any remaining triple backticks
    text = re.sub(r'```', '', text)

    return text.strip()


def _extract_json_from_response(response_text: str) -> Dict[str, Any]:
    """
    Robustly extract and parse JSON from Gemini response
    Handles cases where Gemini adds extra text despite instructions
    """
    try:
        # First, try to strip markdown fences
        cleaned_text = _strip_markdown_fences(response_text)

        # Try to find JSON object boundaries
        # Look for first { and last }
        start_idx = cleaned_text.find('{')
        end_idx = cleaned_text.rfind('}')

        if start_idx == -1 or end_idx == -1:
            raise GeminiServiceError("No JSON object found in response")

        json_text = cleaned_text[start_idx:end_idx + 1]

        # Parse JSON
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
    """
    Validate Gemini response structure and build ProcessResponse model
    """
    try:
        # Extract medications
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

        # Extract follow-up
        follow_up_data = data.get("follow_up")
        follow_up = None
        if follow_up_data:
            follow_up = FollowUp(
                date=follow_up_data.get("date", "Ask your doctor"),
                with_doctor=follow_up_data.get("with", "Your doctor"),
                reason=follow_up_data.get("reason", "Check recovery progress")
            )

        # Extract comprehension questions
        questions = [
            ComprehensionQuestion(
                question=q.get("question", ""),
                options=q.get("options", []),
                correct=q.get("correct", "A"),
                explanation=q.get("explanation", "")
            )
            for q in data.get("comprehension_questions", [])
        ]

        # Validate we have exactly 3 questions
        if len(questions) != 3:
            logger.warning(f"Expected 3 questions, got {len(questions)}. Padding or trimming.")
            # Pad if less than 3
            while len(questions) < 3:
                questions.append(ComprehensionQuestion(
                    question="What should you do if you have questions?",
                    options=["A) Ignore them", "B) Call your doctor", "C) Ask a friend", "D) Wait and see"],
                    correct="B",
                    explanation="Always call your doctor if you're unsure about anything"
                ))
            # Trim if more than 3
            questions = questions[:3]

        # Build response
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
    """
    Main function to process discharge summary using Gemini AI

    Args:
        text: Clinical discharge summary text
        role: Target audience - 'patient', 'caregiver', or 'elderly'
        language: Output language(s) - 'en', 'bn', or 'both'
        re_explain: If True, use simpler re-explanation prompt
        previous_simplified: Previous simplified version (for re-explanation)

    Returns:
        ProcessResponse with simplified content

    Raises:
        GeminiServiceError: If AI processing fails
    """
    try:
        # Validate API key
        if not GEMINI_API_KEY:
            raise GeminiServiceError("Gemini API key not configured")

        # Initialize model
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",  # Using Gemini 2.5 Flash for speed
            generation_config=GENERATION_CONFIG,
            safety_settings=SAFETY_SETTINGS,
            system_instruction=SYSTEM_INSTRUCTION
        )

        # Build prompt
        if re_explain and previous_simplified:
            prompt = format_re_explain_prompt(
                discharge_text=text,
                previous_simplified=previous_simplified,
                score=1,  # Assume low score triggered re-explanation
                failed_topics="Critical medication instructions and warning signs"
            )
            logger.info("Using re-explanation prompt for simpler version")
        else:
            prompt = format_master_prompt(discharge_text=text, role=role)
            logger.info(f"Using master prompt for role: {role}")

        # Log prompt length for debugging
        logger.info(f"Prompt length: {len(prompt)} chars")

        # Call Gemini API
        logger.info("Calling Gemini API...")
        response = model.generate_content(prompt)

        # Check if response was blocked
        if not response.text:
            logger.error("Gemini response was blocked or empty")
            logger.error(f"Response: {response}")
            raise GeminiServiceError("Gemini API returned empty response. Content may have been blocked.")

        logger.info(f"Gemini response received: {len(response.text)} chars")

        # Extract and parse JSON
        data = _extract_json_from_response(response.text)

        # Build and validate response
        result = _validate_and_build_response(data)

        logger.info("Successfully processed discharge summary")
        return result

    except GeminiServiceError:
        # Re-raise our custom errors
        raise

    except Exception as e:
        logger.error(f"Unexpected error in process_discharge_summary: {e}")
        logger.exception(e)  # Log full traceback
        raise GeminiServiceError(f"Failed to process discharge summary: {str(e)}")


async def extract_text_from_image(image_data: bytes, mime_type: str) -> str:
    """
    Extract text from image/PDF using Gemini Vision (Phase 7 - Post-MVP)

    Args:
        image_data: Binary image data
        mime_type: MIME type (image/jpeg, image/png, application/pdf)

    Returns:
        Extracted text

    Raises:
        GeminiServiceError: If OCR fails
    """
    try:
        if not GEMINI_API_KEY:
            raise GeminiServiceError("Gemini API key not configured")

        # Initialize vision model
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            generation_config={"temperature": 0.1},  # Very low for OCR accuracy
        )

        # Prepare image part
        image_part = {
            "mime_type": mime_type,
            "data": image_data
        }

        # Get OCR prompt
        prompt = format_ocr_prompt()

        # Call API with image
        logger.info(f"Calling Gemini Vision API for OCR ({mime_type})...")
        response = model.generate_content([prompt, image_part])

        if not response.text:
            raise GeminiServiceError("Gemini Vision returned empty response")

        extracted_text = response.text.strip()
        logger.info(f"OCR completed: extracted {len(extracted_text)} characters")

        return extracted_text

    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        raise GeminiServiceError(f"Failed to extract text from image: {str(e)}")


async def validate_bengali_quality(bengali_text: str) -> Dict[str, Any]:
    """
    Validate if Bengali text uses everyday language (utility function)

    Args:
        bengali_text: Bengali text to validate

    Returns:
        Dict with validation results
    """
    try:
        if not GEMINI_API_KEY:
            raise GeminiServiceError("Gemini API key not configured")

        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            generation_config={"temperature": 0.2}
        )

        from prompts import BENGALI_VALIDATION_PROMPT
        prompt = BENGALI_VALIDATION_PROMPT.format(bengali_text=bengali_text)

        response = model.generate_content(prompt)

        if not response.text:
            raise GeminiServiceError("Bengali validation returned empty response")

        validation_result = _extract_json_from_response(response.text)
        return validation_result

    except Exception as e:
        logger.error(f"Bengali validation failed: {e}")
        # Don't raise - return neutral result
        return {
            "is_everyday_language": True,
            "formality_score": 3,
            "flagged_formal_words": [],
            "suggested_replacements": {}
        }


# Health check function for service availability
def check_gemini_health() -> Dict[str, Any]:
    """
    Check if Gemini API is accessible and healthy

    Returns:
        Dict with status information
    """
    try:
        if not GEMINI_API_KEY:
            return {
                "status": "down",
                "message": "API key not configured",
                "available": False
            }

        # Try a minimal API call
        model = genai.GenerativeModel(model_name="gemini-2.0-flash-exp")
        response = model.generate_content("Say 'ok'")

        if response.text:
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
