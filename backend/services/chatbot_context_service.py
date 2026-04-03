"""
Chatbot Context Service — retrieves RAG-ready context for patient chatbot.

CRITICAL RULES:
  - ALL responses come from STORED JSON only (no fresh API calls)
  - strict_context_usage = True (no hallucination)
  - personalized = True (uses patient-specific data)

Uses patient_data_chunks for context retrieval.
"""

import logging
from typing import List, Dict, Any, Optional

from models.prescription import (
    PatientDataChunk,
    ChatbotContextPayload,
    ChatbotResponsePolicy,
)

logger = logging.getLogger(__name__)


async def get_patient_context(patient_id: str) -> ChatbotContextPayload:
    """
    Build the full chatbot context payload for a patient.
    Assembles all stored chunks into a RAG-ready structure.
    """
    from db.patient_chunks_db import get_chunks_by_patient

    raw_chunks = await get_chunks_by_patient(patient_id)

    # Convert DB rows to PatientDataChunk models
    chunks = []
    context_sources = set()
    for row in raw_chunks:
        chunk = PatientDataChunk(
            chunk_id=row.get("chunk_id", ""),
            prescription_id=row.get("prescription_id", ""),
            patient_id=row.get("patient_id", patient_id),
            chunk_type=row.get("chunk_type", "unknown"),
            data=row.get("data", {}),
            version=row.get("version", 1),
            created_at=row.get("created_at", ""),
        )
        chunks.append(chunk)
        context_sources.add(chunk.chunk_type)

    return ChatbotContextPayload(
        patient_id=patient_id,
        context_sources=sorted(list(context_sources)),
        chunks=chunks,
        retrieval_mode="semantic_search",
        response_policy=ChatbotResponsePolicy(
            personalized=True,
            no_hallucination=True,
            strict_context_usage=True,
        ),
    )


async def retrieve_chunks_for_query(
    patient_id: str,
    query: str,
    chunk_types: Optional[List[str]] = None,
) -> List[PatientDataChunk]:
    """
    Retrieve relevant chunks for a patient query.
    Uses keyword matching against stored chunk data.
    
    This is a simple retrieval — for production, swap with vector search.
    """
    from db.patient_chunks_db import get_chunks_by_patient, get_chunks_by_type

    query_lower = query.lower().strip()

    # Determine which chunk types to search
    if chunk_types:
        all_chunks = []
        for ct in chunk_types:
            rows = await get_chunks_by_type(patient_id, ct)
            all_chunks.extend(rows)
    else:
        all_chunks = await get_chunks_by_patient(patient_id)

    # Simple relevance scoring via keyword matching
    scored = []
    for row in all_chunks:
        chunk = PatientDataChunk(
            chunk_id=row.get("chunk_id", ""),
            prescription_id=row.get("prescription_id", ""),
            patient_id=row.get("patient_id", patient_id),
            chunk_type=row.get("chunk_type", "unknown"),
            data=row.get("data", {}),
            version=row.get("version", 1),
            created_at=row.get("created_at", ""),
        )

        # Score based on content relevance
        score = _score_chunk(chunk, query_lower)
        scored.append((score, chunk))

    # Sort by relevance, return top matches
    scored.sort(key=lambda x: x[0], reverse=True)
    return [chunk for score, chunk in scored if score > 0]


def _score_chunk(chunk: PatientDataChunk, query: str) -> float:
    """
    Simple keyword-based relevance scoring.
    Higher score = more relevant to the query.
    """
    score = 0.0
    data = chunk.data
    data_str = str(data).lower()

    # Direct content match
    query_words = set(query.split())
    for word in query_words:
        if len(word) > 2 and word in data_str:
            score += 1.0

    # Chunk type relevance boosting
    type_keywords = {
        "medication": {"medicine", "medication", "drug", "pill", "tablet", "dosage", "dose", "take", "taking"},
        "routine": {"routine", "daily", "do", "instruction", "care", "food", "water", "exercise", "sleep"},
        "explanation": {"why", "reason", "purpose", "what", "does", "work", "explain"},
        "faq_context": {"when", "how", "long", "recovery", "follow", "avoid", "should", "appointment"},
    }

    boost_words = type_keywords.get(chunk.chunk_type, set())
    if query_words & boost_words:
        score += 2.0

    # FAQ special handling — match against stored questions
    if chunk.chunk_type == "faq_context":
        questions = data.get("questions", [])
        for q in questions:
            q_lower = q.lower()
            overlap = len(query_words & set(q_lower.split()))
            if overlap >= 2:
                score += 3.0
                break

    return score


async def get_faq_suggestions(patient_id: str) -> List[Dict[str, str]]:
    """
    Return pre-built FAQ question/answer pairs for chatbot button display.
    """
    from db.patient_chunks_db import get_chunks_by_type

    faq_rows = await get_chunks_by_type(patient_id, "faq_context")

    suggestions = []
    for row in faq_rows:
        data = row.get("data", {})
        questions = data.get("questions", [])
        answers = data.get("answers", [])
        for i, q in enumerate(questions):
            answer = answers[i] if i < len(answers) else ""
            suggestions.append({"question": q, "answer": answer})

    return suggestions
