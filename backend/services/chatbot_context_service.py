"""
Chatbot context and grounded answer helpers for the patient assistant.
"""

import logging
import re
from typing import Any, Dict, List, Optional

from models.prescription import ChatbotContextPayload
from services.groq_chat_service import (
    DEFAULT_NO_CONTEXT_ANSWER,
    answer_with_groq,
    answer_general_question,
    is_groq_configured,
)

logger = logging.getLogger(__name__)


async def get_patient_context(patient_id: str) -> ChatbotContextPayload:
    """Build RAG-ready context payload from stored chunks."""
    from db.patient_chunks_db import get_chunks_by_patient

    all_chunks = await get_chunks_by_patient(patient_id)
    context_sources = list({c["chunk_type"] for c in all_chunks})

    return ChatbotContextPayload(
        patient_id=patient_id,
        context_sources=context_sources,
        retrieval_mode="keyword_match",
        response_policy={"strict_context_usage": True, "allow_hallucination": False},
    )


def _tokenize(text: str) -> set[str]:
    """Tokenize lower-case alphanumeric words for lightweight retrieval."""
    return set(re.findall(r"[a-z0-9]+", (text or "").lower()))


def _score_match(query: str, candidate: str) -> int:
    """Score relevance using direct phrase matches plus token overlap."""
    query_text = (query or "").strip().lower()
    candidate_text = (candidate or "").strip().lower()
    if not query_text or not candidate_text:
        return 0

    score = 0
    if query_text in candidate_text:
        score += 6
    if candidate_text in query_text:
        score += 3

    score += len(_tokenize(query_text) & _tokenize(candidate_text))
    return score


async def retrieve_chunks_for_query(
    patient_id: str,
    query: str,
    all_chunks: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Find the most relevant patient chunks for a question."""
    from db.patient_chunks_db import get_chunks_by_patient

    if all_chunks is None:
        all_chunks = await get_chunks_by_patient(patient_id)

    scored: List[tuple[int, Dict[str, Any]]] = []
    for chunk in all_chunks:
        chunk_text = " ".join(
            [
                chunk.get("chunk_type", ""),
                str(chunk.get("data", "")),
            ]
        )
        score = _score_match(query, chunk_text)
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [chunk for _, chunk in scored[:5]]


async def get_faq_suggestions(patient_id: str) -> List[Dict[str, str]]:
    """Return pre-built FAQ question/answer pairs from stored faq_context chunks."""
    from db.patient_chunks_db import get_chunks_by_type

    faq_chunks = await get_chunks_by_type(patient_id, "faq_context")
    faqs = []
    for chunk in faq_chunks:
        chunk_data = chunk.get("data", {})
        if isinstance(chunk_data, dict):
            for faq in chunk_data.get("faqs", []):
                faqs.append(
                    {
                        "question": faq.get("question", ""),
                        "answer": faq.get("answer", ""),
                    }
                )
    return faqs


def _get_matching_faqs(
    question: str,
    faqs: List[Dict[str, str]],
    limit: int = 3,
) -> List[Dict[str, str]]:
    """Return the strongest FAQ matches for a patient question."""
    scored: List[tuple[int, Dict[str, str]]] = []
    for faq in faqs:
        combined = " ".join([faq.get("question", ""), faq.get("answer", "")])
        score = _score_match(question, combined)
        if score > 0:
            scored.append((score, faq))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [faq for _, faq in scored[:limit]]


def _select_recent_chunks(all_chunks: List[Dict[str, Any]], limit: int = 3) -> List[Dict[str, Any]]:
    """Use the newest chunks when keyword retrieval finds nothing useful."""
    return list(all_chunks[:limit])


def _build_source_label(
    relevant_chunks: List[Dict[str, Any]],
    faq_matches: List[Dict[str, str]],
) -> str:
    """Build a short source summary for UI display."""
    labels: List[str] = []
    if faq_matches:
        labels.append("faq_context")

    for chunk in relevant_chunks:
        chunk_type = chunk.get("chunk_type")
        if chunk_type and chunk_type not in labels:
            labels.append(chunk_type)

    if not labels:
        return "none"
    if len(labels) <= 2:
        return ", ".join(labels)
    return f"{', '.join(labels[:2])} + more"


async def answer_from_context(patient_id: str, question: str) -> Dict[str, Any]:
    """Answer a question using approved patient chunks, with general knowledge fallback."""
    from db.patient_chunks_db import get_chunks_by_patient

    all_chunks = await get_chunks_by_patient(patient_id)
    if not all_chunks:
        # No prescription data — fall back to general knowledge via Groq
        if is_groq_configured():
            try:
                answer = await answer_general_question(question)
                return {
                    "answer": answer,
                    "source": "general_knowledge",
                    "confidence": 0.6,
                }
            except Exception as exc:
                logger.warning("Groq general knowledge fallback failed: %s", exc)
        return {
            "answer": DEFAULT_NO_CONTEXT_ANSWER,
            "source": "none",
            "confidence": 0.0,
        }

    faqs = await get_faq_suggestions(patient_id)
    faq_matches = _get_matching_faqs(question, faqs)

    relevant = await retrieve_chunks_for_query(patient_id, question, all_chunks=all_chunks)
    if not relevant:
        relevant = _select_recent_chunks(all_chunks)

    if is_groq_configured() and (faq_matches or relevant):
        try:
            answer = await answer_with_groq(
                patient_id=patient_id,
                question=question,
                faq_matches=faq_matches,
                relevant_chunks=relevant,
            )
            return {
                "answer": answer,
                "source": f"groq ({_build_source_label(relevant, faq_matches)})",
                "confidence": 0.92 if faq_matches else 0.84,
            }
        except Exception as exc:
            logger.warning("Groq grounded chat failed; using local fallback: %s", exc)

    if faq_matches:
        return {
            "answer": faq_matches[0].get("answer") or DEFAULT_NO_CONTEXT_ANSWER,
            "source": "faq_context",
            "confidence": 0.9,
        }

    if relevant:
        top = relevant[0]
        chunk_data = top.get("data", {})
        return {
            "answer": f"Based on your medical records: {_summarize_chunk(chunk_data, top.get('chunk_type', ''))}",
            "source": top.get("chunk_type", "unknown"),
            "confidence": 0.7,
        }

    # No matching context found — try general knowledge
    if is_groq_configured():
        try:
            answer = await answer_general_question(question)
            return {
                "answer": answer,
                "source": "general_knowledge",
                "confidence": 0.5,
            }
        except Exception as exc:
            logger.warning("Groq general fallback failed: %s", exc)

    return {
        "answer": DEFAULT_NO_CONTEXT_ANSWER,
        "source": "none",
        "confidence": 0.0,
    }


def _summarize_chunk(data: Dict[str, Any], chunk_type: str) -> str:
    """Summarize a chunk for chatbot display."""
    if chunk_type == "medication":
        meds = data.get("medications", [])
        if meds:
            names = [m.get("name", "") for m in meds[:3]]
            return f"Your medications include: {', '.join(names)}."
    elif chunk_type == "routine":
        steps = data.get("steps", [])
        if steps:
            return f"You have {len(steps)} care steps in your daily routine."
    elif chunk_type == "explanation":
        explanations = data.get("explanations", [])
        if explanations:
            return explanations[0].get("reason", "See your prescription for details.")
    return "Please refer to your prescription details."
