"""
Chatbot Context Service
Retrieves RAG-ready context from stored patient chunks.
Enforces strict no-hallucination policy — responses based on stored data ONLY.
"""

import logging
from typing import Any, Dict, List

from models.prescription import ChatbotContextPayload, PatientDataChunk

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


async def retrieve_chunks_for_query(
    patient_id: str, query: str
) -> List[Dict[str, Any]]:
    """Simple keyword-based matching against stored patient chunks."""
    from db.patient_chunks_db import get_chunks_by_patient

    all_chunks = await get_chunks_by_patient(patient_id)
    query_lower = query.lower()
    query_words = set(query_lower.split())

    scored = []
    for chunk in all_chunks:
        data_str = str(chunk.get("data", "")).lower()
        # Score by keyword overlap
        score = sum(1 for w in query_words if w in data_str)
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:5]]


async def get_faq_suggestions(patient_id: str) -> List[Dict[str, str]]:
    """Return pre-built FAQ question/answer pairs from stored faq_context chunks."""
    from db.patient_chunks_db import get_chunks_by_type

    faq_chunks = await get_chunks_by_type(patient_id, "faq_context")
    faqs = []
    for chunk in faq_chunks:
        chunk_data = chunk.get("data", {})
        if isinstance(chunk_data, dict):
            for faq in chunk_data.get("faqs", []):
                faqs.append({
                    "question": faq.get("question", ""),
                    "answer": faq.get("answer", ""),
                })
    return faqs


async def answer_from_context(patient_id: str, question: str) -> Dict[str, Any]:
    """Answer a question using stored chunks only — no hallucination."""
    # First check FAQ matches
    faqs = await get_faq_suggestions(patient_id)
    question_lower = question.lower()

    for faq in faqs:
        if question_lower in faq["question"].lower() or faq["question"].lower() in question_lower:
            return {
                "answer": faq["answer"],
                "source": "faq_context",
                "confidence": 0.9,
            }

    # Fall back to keyword search across all chunks
    relevant = await retrieve_chunks_for_query(patient_id, question)
    if relevant:
        # Build answer from top chunk
        top = relevant[0]
        chunk_data = top.get("data", {})
        return {
            "answer": f"Based on your medical records: {_summarize_chunk(chunk_data, top.get('chunk_type', ''))}",
            "source": top.get("chunk_type", "unknown"),
            "confidence": 0.7,
        }

    return {
        "answer": "I don't have enough information in your medical records to answer that. Please consult your doctor.",
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
        exps = data.get("explanations", [])
        if exps:
            return exps[0].get("reason", "See your prescription for details.")
    return "Please refer to your prescription details."
