"""
LLM AI Service
Handles interactions with Cerebras, Groq and Qwen Coder Cloud API (via OpenAI SDK)
Includes JSON parsing, error handling, and prompt management
"""

import os
import json
import re
import logging
import base64
from typing import Dict, Any, Optional

from openai import AsyncOpenAI
import httpx

from services.rate_limiter_service import llm_rate_limiter, RateLimitExceeded

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
    SYSTEM_INSTRUCTION
)
from core.config import read_env
from core.exceptions import APIError

class LLMServiceError(APIError):
    """Exception raised for errors in the LLM service."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message=message, status_code=status_code)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configured Models
CEREBRAS_MODEL_NAME = read_env("CEREBRAS_MODEL") or "llama3.1-8b"
GROQ_MODEL_NAME = read_env("GROQ_MODEL") or "llama-3.3-70b-versatile"
GROQ_FALLBACK_MODEL = read_env("GROQ_FALLBACK_MODEL") or "llama-3.1-8b-instant"
GROQ_VISION_MODEL = read_env("GROQ_VISION_MODEL") or "meta-llama/llama-4-scout-17b-16e-instruct"
QWEN_MODEL_NAME = read_env("QWEN_MODEL_NAME") or "qwen/qwen3.6-plus:free"

# Clients
cerebras_client: Optional[AsyncOpenAI] = None
groq_client: Optional[AsyncOpenAI] = None
qwen_client: Optional[AsyncOpenAI] = None

_active_cerebras_key: Optional[str] = None
_active_groq_key: Optional[str] = None
_active_qwen_key: Optional[str] = None

def get_configured_cerebras_api_key() -> Optional[str]:
    return read_env("CEREBRAS_API_KEY")

def get_configured_groq_api_key() -> Optional[str]:
    return read_env("GROQ_API_KEY")

def get_configured_qwen_api_key() -> Optional[str]:
    return read_env("QWEN_API_KEY")

def is_llm_configured() -> bool:
    """Return True if at least one usable LLM API key is configured."""
    return bool(get_configured_cerebras_api_key() or get_configured_groq_api_key() or get_configured_qwen_api_key())

if not is_llm_configured():
    logger.warning("No LLM API keys found in environment variables (CEREBRAS_API_KEY, GROQ_API_KEY, or QWEN_API_KEY)")


def _ensure_clients():
    """Ensure OpenAI clients for Cerebras, Groq and Qwen are initialized."""
    global cerebras_client, groq_client, qwen_client
    global _active_cerebras_key, _active_groq_key, _active_qwen_key

    cerebras_key = get_configured_cerebras_api_key()
    groq_key = get_configured_groq_api_key()
    qwen_key = get_configured_qwen_api_key()

    if cerebras_key and cerebras_key != _active_cerebras_key:
        cerebras_client = AsyncOpenAI(
            api_key=cerebras_key,
            base_url="https://api.cerebras.ai/v1",
        )
        _active_cerebras_key = cerebras_key

    if groq_key and groq_key != _active_groq_key:
        groq_client = AsyncOpenAI(
            api_key=groq_key,
            base_url="https://api.groq.com/openai/v1",
        )
        _active_groq_key = groq_key

    if qwen_key and qwen_key != _active_qwen_key:
        qwen_url = read_env("QWEN_BASE_URL") or "https://openrouter.ai/api/v1"
        qwen_client = AsyncOpenAI(
            api_key=qwen_key,
            base_url=qwen_url,
        )
        _active_qwen_key = qwen_key


async def _generate_text(
    prompt: str,
    system_instruction: Optional[str] = None,
    use_qwen: bool = False,
    temperature: float = 0.3,
    rate_limit_context: str = "text_generation",
) -> str:
    """Generate text using Groq or Qwen."""
    _ensure_clients()

    use_qwen = use_qwen and bool(qwen_client)

    # Determine which key to rate-limit against
    if use_qwen:
        api_key_to_check = _active_qwen_key
    elif cerebras_client:
        api_key_to_check = _active_cerebras_key
    else:
        api_key_to_check = _active_groq_key

    if not api_key_to_check:
        raise LLMServiceError("Required LLM API key not configured")

    # Rate limit check - blocks before hitting API quota
    try:
        llm_rate_limiter.check_and_record(context=rate_limit_context, api_key=api_key_to_check)
    except RateLimitExceeded as exc:
        raise LLMServiceError(str(exc), status_code=429)

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    try:
        if use_qwen:
            response = await qwen_client.chat.completions.create(
                model=QWEN_MODEL_NAME,
                messages=messages,
                temperature=temperature,
                max_tokens=4096,
                extra_body={"reasoning": {"effort": "none"}},
            )
        elif cerebras_client:
            # Cerebras is primary for text generation
            response = await cerebras_client.chat.completions.create(
                model=CEREBRAS_MODEL_NAME,
                messages=messages,
                temperature=temperature,
                max_tokens=4096,
            )
        else:
            response = await groq_client.chat.completions.create(
                model=GROQ_MODEL_NAME,
                messages=messages,
                temperature=temperature,
                max_tokens=4096,
            )

        return response.choices[0].message.content.strip()
    except Exception as e:
        # Fallback chain: Qwen -> Cerebras -> Groq primary -> Groq fallback
        if use_qwen and cerebras_client:
            logger.warning(f"Qwen failed ({e}), falling back to Cerebras")
            try:
                response = await cerebras_client.chat.completions.create(
                    model=CEREBRAS_MODEL_NAME,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=4096,
                )
                return response.choices[0].message.content.strip()
            except Exception as cerebras_e:
                logger.warning(f"Cerebras also failed ({cerebras_e}), trying Groq")
                if groq_client:
                    try:
                        response = await groq_client.chat.completions.create(
                            model=GROQ_MODEL_NAME,
                            messages=messages,
                            temperature=temperature,
                            max_tokens=4096,
                        )
                        return response.choices[0].message.content.strip()
                    except Exception as groq_e:
                        logger.error(f"All LLM fallbacks exhausted: {groq_e}")
                        raise LLMServiceError(f"LLM failed: Qwen({e}), Cerebras({cerebras_e}), Groq({groq_e})")
                raise LLMServiceError(f"LLM failed: Qwen({e}), Cerebras({cerebras_e})")

        # Cerebras failed -> try Groq
        if cerebras_client and groq_client:
            logger.warning(f"Cerebras failed ({e}), falling back to Groq")
            try:
                response = await groq_client.chat.completions.create(
                    model=GROQ_MODEL_NAME,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=4096,
                )
                return response.choices[0].message.content.strip()
            except Exception as groq_e:
                logger.warning(f"Groq primary also failed ({groq_e}), trying fallback model")
                try:
                    response = await groq_client.chat.completions.create(
                        model=GROQ_FALLBACK_MODEL,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=4096,
                    )
                    return response.choices[0].message.content.strip()
                except Exception as fallback_e:
                    logger.error(f"All LLM fallbacks exhausted: {fallback_e}")
                    raise LLMServiceError(f"LLM failed: Cerebras({e}), Groq({groq_e}), Fallback({fallback_e})")

        # Groq-only fallback path
        if groq_client:
            logger.warning(f"Primary LLM failed ({e}), trying Groq fallback model {GROQ_FALLBACK_MODEL}")
            try:
                response = await groq_client.chat.completions.create(
                    model=GROQ_FALLBACK_MODEL,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=4096,
                )
                return response.choices[0].message.content.strip()
            except Exception as fallback_e:
                logger.error(f"Groq fallback also failed: {fallback_e}")
                raise LLMServiceError(f"LLM failed: Primary({e}), Fallback({fallback_e})")
        logger.error(f"LLM Generation Error: {e}")
        raise LLMServiceError(f"LLM text generation failed: {str(e)}")


async def _generate_multimodal_text(
    prompt: str,
    image_data: bytes,
    mime_type: str,
    temperature: float = 0.0,
    rate_limit_context: str = "multimodal_ocr",
) -> str:
    """Generate text for multimodal input using Groq Vision API (Llama 3.2 90B Vision)."""
    _ensure_clients()
    if not groq_client:
        raise LLMServiceError("Groq API key not configured for vision tasks")

    try:
        llm_rate_limiter.check_and_record(context=rate_limit_context, api_key=_active_groq_key)
    except RateLimitExceeded as exc:
        raise LLMServiceError(str(exc), status_code=429)

    # Convert bytes to base64 data URI
    base64_image = base64.b64encode(image_data).decode("utf-8")
    data_uri = f"data:{mime_type};base64,{base64_image}"

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": data_uri,
                    },
                },
            ],
        }
    ]

    try:
        # Use Groq's specialized Vision model
        response = await groq_client.chat.completions.create(
            model=GROQ_VISION_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=4096,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Multimodal Generation Error: {e}")
        raise LLMServiceError(f"LLM multimodal generation failed: {str(e)}")


def _strip_markdown_fences(text: str) -> str:
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'```', '', text)
    return text.strip()


def _extract_json_from_response(response_text: str) -> Dict[str, Any]:
    try:
        cleaned_text = _strip_markdown_fences(response_text)
        start_idx = cleaned_text.find('{')
        end_idx = cleaned_text.rfind('}')
        if start_idx == -1 or end_idx == -1:
            raise LLMServiceError("No JSON object found in response")
        json_text = cleaned_text[start_idx:end_idx + 1]
        return json.loads(json_text)
    except Exception as e:
        logger.error(f"JSON parsing failed: {e}")
        logger.error(f"Raw response: {response_text[:500]}...")
        raise LLMServiceError(f"Failed to parse response as JSON: {str(e)}")


def _validate_and_build_response(data: Dict[str, Any], session_id: Optional[str] = None) -> ProcessResponse:
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
                "Loss of consciousness"
            ]),
            comprehension_questions=questions,
            whatsapp_message=data.get("whatsapp_message", "SwasthaLink: Please contact your doctor for discharge instructions."),
            session_id=session_id
        )
        return response

    except Exception as e:
        logger.error(f"Error building response model: {e}")
        raise LLMServiceError(f"Failed to validate response structure: {str(e)}")


async def process_discharge_summary(
    text: str,
    role: str,
    language: str = "both",
    re_explain: bool = False,
    previous_simplified: Optional[str] = None
) -> ProcessResponse:
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

        logger.info("Calling LLM API (Cerebras primary, Groq fallback) ...")

        # Cerebras is primary for speed; Groq/Qwen as fallbacks.
        response_text = await _generate_text(
            prompt=prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            use_qwen=False,
            rate_limit_context=f"process_discharge_summary:{role}",
        )

        if not response_text:
            raise LLMServiceError("API returned empty response.")

        logger.info(f"LLM response received: {len(response_text)} chars")

        data = _extract_json_from_response(response_text)
        result = _validate_and_build_response(data)

        logger.info("Successfully processed discharge summary")
        return result

    except LLMServiceError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise LLMServiceError(f"Failed to process discharge summary: {str(e)}")


async def extract_text_from_image(image_data: bytes, mime_type: str) -> str:
    try:
        prompt = format_ocr_prompt()
        logger.info(f"Calling Groq Vision API for OCR ({mime_type})...")
        extracted_text = await _generate_multimodal_text(
            prompt=prompt,
            image_data=image_data,
            mime_type=mime_type,
            temperature=0.0,
            rate_limit_context=f"extract_text_from_image:{mime_type}",
        )
        if not extracted_text:
            raise LLMServiceError("Vision API returned empty response")
        return extracted_text
    except LLMServiceError:
        raise
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        raise LLMServiceError(f"Failed to extract text from image: {str(e)}")


async def validate_bengali_quality(bengali_text: str) -> Dict[str, Any]:
    try:
        from ai.prompts import BENGALI_VALIDATION_PROMPT
        prompt = BENGALI_VALIDATION_PROMPT.format(bengali_text=bengali_text)
        response_text = await _generate_text(
            prompt=prompt,
            temperature=0.2,
            rate_limit_context="validate_bengali_quality",
        )
        if not response_text:
            raise LLMServiceError("Bengali validation returned empty response")
        return _extract_json_from_response(response_text)
    except Exception as e:
        logger.error(f"Bengali validation failed: {e}")
        return {
            "is_everyday_language": True,
            "formality_score": 3,
            "flagged_formal_words": [],
            "suggested_replacements": {}
        }


def compute_risk_score(quiz_score: int, medication_count: int, role: str, warning_count: int) -> int:
    base = (3 - quiz_score) * 20
    med_factor = min(medication_count * 4, 24)
    warn_factor = min(warning_count * 3, 12)
    role_factor = 4 if role == "elderly" else 0
    return min(base + med_factor + warn_factor + role_factor, 100)


async def check_llm_health() -> Dict[str, Any]:
    try:
        _ensure_clients()
        response_text = await _generate_text(
            prompt="Say 'ok'",
            temperature=0,
            rate_limit_context="health_check",
            use_qwen=False
        )
        if response_text:
            return {
                "status": "ok",
                "message": "LLM API is healthy",
                "available": True
            }
        else:
            return {"status": "degraded", "message": "API responding but empty text", "available": False}
    except Exception as e:
        logger.error(f"LLM health check failed: {e}")
        return {"status": "down", "message": str(e), "available": False}
