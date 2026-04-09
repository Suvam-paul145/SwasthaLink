"""
Chat service for grounded patient chatbot answers.

Uses Qwen (primary) with Groq as the fast fallback and Cerebras as an extra
backup. All providers are called from the backend so patient chat requests
never expose secrets in the browser.
"""

import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from core.config import FRONTEND_URL, read_env

logger = logging.getLogger(__name__)

QWEN_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions"
GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
CEREBRAS_CHAT_COMPLETIONS_URL = "https://api.cerebras.ai/v1/chat/completions"
DEFAULT_QWEN_CHAT_MODEL = read_env("QWEN_MODEL_NAME") or "qwen/qwen-2.5-72b-instruct"
DEFAULT_GROQ_CHAT_MODEL = "llama-3.3-70b-versatile"
DEFAULT_CEREBRAS_CHAT_MODEL = "llama3.1-8b"
DEFAULT_NO_CONTEXT_ANSWER = (
    "I don't have enough information in your approved medical records to answer that. "
    "Please consult your doctor."
)


def get_configured_qwen_api_key() -> Optional[str]:
    """Return the configured Qwen/OpenRouter API key, if available."""
    return read_env("QWEN_API_KEY")


def get_configured_cerebras_api_key() -> Optional[str]:
    """Return the configured Cerebras API key, if available."""
    return read_env("CEREBRAS_API_KEY")


def get_configured_groq_api_key() -> Optional[str]:
    """Return the configured Groq API key, if available."""
    return read_env("GROQ_API_KEY")


def get_configured_qwen_chat_model() -> str:
    """Return the configured Qwen chat model name."""
    return read_env("QWEN_CHAT_MODEL", "QWEN_MODEL_NAME") or DEFAULT_QWEN_CHAT_MODEL


def get_configured_chat_model() -> str:
    """Return the configured chat model name for the active provider."""
    if get_configured_qwen_api_key():
        return get_configured_qwen_chat_model()
    if get_configured_groq_api_key():
        return read_env("GROQ_CHAT_MODEL") or DEFAULT_GROQ_CHAT_MODEL
    if get_configured_cerebras_api_key():
        return read_env("CEREBRAS_CHAT_MODEL") or DEFAULT_CEREBRAS_CHAT_MODEL
    return read_env("QWEN_CHAT_MODEL", "QWEN_MODEL_NAME", "GROQ_CHAT_MODEL", "CEREBRAS_CHAT_MODEL") or DEFAULT_QWEN_CHAT_MODEL


def get_preferred_chat_provider_name() -> str:
    """Return the label for the preferred configured chat provider."""
    if get_configured_qwen_api_key():
        return "qwen"
    if get_configured_groq_api_key():
        return "groq"
    if get_configured_cerebras_api_key():
        return "cerebras"
    return "chat_model"


def _build_chat_completions_url(base_url: str) -> str:
    trimmed = base_url.rstrip("/")
    if trimmed.endswith("/chat/completions"):
        return trimmed
    return f"{trimmed}/chat/completions"


def _build_chat_headers(api_key: str, base_url: str) -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if "openrouter.ai" in base_url:
        headers["HTTP-Referer"] = FRONTEND_URL
        headers["X-Title"] = "SwasthaLink"
    return headers


def _get_chat_providers() -> list[tuple[str, str, str, str]]:
    """Return (provider_name, api_key, base_url, model) tuples in priority order."""
    providers = []

    qwen_key = get_configured_qwen_api_key()
    if qwen_key:
        qwen_base_url = _build_chat_completions_url(read_env("QWEN_BASE_URL") or "https://openrouter.ai/api/v1")
        providers.append(("qwen", qwen_key, qwen_base_url, get_configured_qwen_chat_model()))

    groq_key = get_configured_groq_api_key()
    if groq_key:
        model = read_env("GROQ_CHAT_MODEL") or DEFAULT_GROQ_CHAT_MODEL
        providers.append(("groq", groq_key, GROQ_CHAT_COMPLETIONS_URL, model))

    cerebras_key = get_configured_cerebras_api_key()
    if cerebras_key:
        model = read_env("CEREBRAS_CHAT_MODEL") or DEFAULT_CEREBRAS_CHAT_MODEL
        providers.append(("cerebras", cerebras_key, CEREBRAS_CHAT_COMPLETIONS_URL, model))

    if not providers:
        raise ValueError("No chat LLM API key configured (set QWEN_API_KEY, GROQ_API_KEY, or CEREBRAS_API_KEY)")

    return providers


def _get_chat_provider() -> tuple[str, str, str, str]:
    """Return (provider_name, api_key, base_url, model) for the best available chat provider."""
    providers = _get_chat_providers()
    return providers[0]


def is_groq_configured() -> bool:
    """Return True when any usable chat LLM API key is configured."""
    return bool(get_configured_qwen_api_key() or get_configured_groq_api_key() or get_configured_cerebras_api_key())


def _format_faq_matches(faq_matches: List[Dict[str, str]]) -> str:
    lines: List[str] = []
    for index, faq in enumerate(faq_matches, start=1):
        question = (faq.get("question") or "").strip()
        answer = (faq.get("answer") or "").strip()
        if not question and not answer:
            continue
        lines.append(f"FAQ {index}")
        lines.append(f"Question: {question or 'Unknown'}")
        lines.append(f"Answer: {answer or 'Unknown'}")
    return "\n".join(lines).strip()


def _format_relevant_chunks(relevant_chunks: List[Dict[str, Any]]) -> str:
    blocks: List[str] = []
    for index, chunk in enumerate(relevant_chunks, start=1):
        chunk_type = chunk.get("chunk_type", "unknown")
        prescription_id = chunk.get("prescription_id", "unknown")
        chunk_data = chunk.get("data", {})
        data_text = json.dumps(chunk_data, ensure_ascii=False, indent=2)

        blocks.append(
            "\n".join(
                [
                    f"Chunk {index}",
                    f"Type: {chunk_type}",
                    f"Prescription ID: {prescription_id}",
                    "Data:",
                    data_text,
                ]
            )
        )
    return "\n\n".join(blocks).strip()


def build_grounded_chat_context(
    faq_matches: List[Dict[str, str]],
    relevant_chunks: List[Dict[str, Any]],
    max_chars: int = 12000,
) -> str:
    """Build a compact grounded context document for the LLM."""
    sections: List[str] = []

    faq_text = _format_faq_matches(faq_matches)
    if faq_text:
        sections.append("FAQ MATCHES\n" + faq_text)

    chunk_text = _format_relevant_chunks(relevant_chunks)
    if chunk_text:
        sections.append("PATIENT RECORD CHUNKS\n" + chunk_text)

    context = "\n\n".join(section for section in sections if section).strip()
    if len(context) > max_chars:
        return context[:max_chars].rstrip() + "\n\n[Context truncated]"
    return context


async def answer_with_groq(
    patient_id: str,
    question: str,
    faq_matches: List[Dict[str, str]],
    relevant_chunks: List[Dict[str, Any]],
) -> str:
    """Answer a patient question using the configured chat stack and approved patient context."""
    providers = _get_chat_providers()

    context_document = build_grounded_chat_context(faq_matches, relevant_chunks)
    if not context_document:
        return DEFAULT_NO_CONTEXT_ANSWER

    system_prompt = (
        "You are SwasthaLink's patient assistant. "
        "Your PRIMARY source of truth is the approved patient record context provided below. "
        "Always prefer information from the patient records when answering. "
        "If the patient's question is about their specific prescriptions, medications, or treatment plan, "
        "answer strictly from the provided context. "
        "However, if the question is a general health or wellness question that the records do not cover, "
        "you may provide a helpful general answer based on widely accepted medical knowledge, "
        "but clearly note that it is general advice and recommend consulting their doctor for personalized guidance. "
        "Keep the answer short, plain-language, and reassuring."
    )

    user_prompt = (
        f"Patient ID: {patient_id}\n"
        f"Patient question: {question.strip()}\n\n"
        "Approved record context:\n"
        f"{context_document}"
    )

    last_error = None
    for provider_name, api_key, base_url, model in providers:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
            "top_p": 1,
            "max_tokens": 256,
            "stream": False,
        }

        headers = _build_chat_headers(api_key, base_url)

        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                base_url,
                headers=headers,
                json=payload,
            )

        if response.status_code in (401, 403):
            logger.warning("Chat provider %s returned %s, trying next provider...", provider_name, response.status_code)
            last_error = f"Auth failed ({response.status_code}) for {provider_name}"
            continue

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            details = exc.response.text[:500] if exc.response is not None else str(exc)
            logger.error("Chat request failed: %s", details)
            raise ValueError(f"Chat request failed: {details}") from exc

        body = response.json()
        message = (
            body.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )

        if not message:
            raise ValueError("LLM returned an empty chatbot response")

        return message

    raise ValueError(f"All chat providers failed: {last_error}")


async def answer_general_question(question: str) -> str:
    """Answer a general health question using the configured chat stack."""
    providers = _get_chat_providers()

    system_prompt = (
        "You are SwasthaLink's patient assistant, a friendly and knowledgeable health helper. "
        "The patient does not have any approved prescription records in the system yet. "
        "Answer their question using general medical and health knowledge. "
        "Be helpful, accurate, and reassuring. "
        "For any serious medical concern, always recommend consulting a doctor. "
        "Keep answers concise and in plain language."
    )

    last_error = None
    for provider_name, api_key, base_url, model in providers:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question.strip()},
            ],
            "temperature": 0.3,
            "top_p": 1,
            "max_tokens": 300,
            "stream": False,
        }

        headers = _build_chat_headers(api_key, base_url)

        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                base_url,
                headers=headers,
                json=payload,
            )

        if response.status_code in (401, 403):
            logger.warning("General chat provider %s returned %s, trying next provider...", provider_name, response.status_code)
            last_error = f"Auth failed ({response.status_code}) for {provider_name}"
            continue

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            details = exc.response.text[:500] if exc.response is not None else str(exc)
            logger.error("General chat request failed: %s", details)
            raise ValueError(f"General chat request failed: {details}") from exc

        body = response.json()
        message = (
            body.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )

        if not message:
            raise ValueError("LLM returned an empty response")

        return message

    raise ValueError(f"All chat providers failed: {last_error}")
