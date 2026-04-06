"""
Groq chat service for grounded patient chatbot answers.

Uses Groq's OpenAI-compatible chat completions endpoint and keeps the
API key on the backend so patient chat requests never expose secrets in
the browser.
"""

import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from core.config import read_env

logger = logging.getLogger(__name__)

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_GROQ_CHAT_MODEL = "llama-3.3-70b-versatile"
DEFAULT_NO_CONTEXT_ANSWER = (
    "I don't have enough information in your approved medical records to answer that. "
    "Please consult your doctor."
)


def get_configured_groq_api_key() -> Optional[str]:
    """Return the configured Groq API key, if available."""
    return read_env("GROQ_API_KEY")


def get_configured_groq_model() -> str:
    """Return the configured Groq model name with a production-safe default."""
    return read_env("GROQ_CHAT_MODEL") or DEFAULT_GROQ_CHAT_MODEL


def is_groq_configured() -> bool:
    """Return True when a usable Groq API key is configured."""
    return bool(get_configured_groq_api_key())


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
    """Build a compact grounded context document for Groq."""
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
    """Answer a patient question using Groq and only approved patient context."""
    api_key = get_configured_groq_api_key()
    if not api_key:
        raise ValueError("Groq API key not configured")

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

    payload = {
        "model": get_configured_groq_model(),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "top_p": 1,
        "max_completion_tokens": 256,
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    timeout = httpx.Timeout(30.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            GROQ_CHAT_COMPLETIONS_URL,
            headers=headers,
            json=payload,
        )

    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        details = exc.response.text[:500] if exc.response is not None else str(exc)
        logger.error("Groq chat request failed: %s", details)
        raise ValueError(f"Groq chat request failed: {details}") from exc

    body = response.json()
    message = (
        body.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )

    if not message:
        raise ValueError("Groq returned an empty chatbot response")

    return message


async def answer_general_question(question: str) -> str:
    """Answer a general health question using Groq when no patient records exist."""
    api_key = get_configured_groq_api_key()
    if not api_key:
        raise ValueError("Groq API key not configured")

    system_prompt = (
        "You are SwasthaLink's patient assistant, a friendly and knowledgeable health helper. "
        "The patient does not have any approved prescription records in the system yet. "
        "Answer their question using general medical and health knowledge. "
        "Be helpful, accurate, and reassuring. "
        "For any serious medical concern, always recommend consulting a doctor. "
        "Keep answers concise and in plain language."
    )

    payload = {
        "model": get_configured_groq_model(),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question.strip()},
        ],
        "temperature": 0.3,
        "top_p": 1,
        "max_completion_tokens": 300,
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    timeout = httpx.Timeout(30.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            GROQ_CHAT_COMPLETIONS_URL,
            headers=headers,
            json=payload,
        )

    try:
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        details = exc.response.text[:500] if exc.response is not None else str(exc)
        logger.error("Groq general chat request failed: %s", details)
        raise ValueError(f"Groq general chat request failed: {details}") from exc

    body = response.json()
    message = (
        body.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )

    if not message:
        raise ValueError("Groq returned an empty response")

    return message
