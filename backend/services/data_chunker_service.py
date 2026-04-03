"""
Data Chunker Service — splits approved prescriptions into patient-optimised chunks.

After admin approval, this service generates 4 chunk types:
  1. medication  — each drug with usage, dosage, duration
  2. routine     — daily care instructions
  3. explanation — WHY each medicine is prescribed
  4. faq_context — pre-built Q&A for chatbot

All chunks are persisted in patient_data_chunks table.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from models.prescription import (
    PrescriptionRecord,
    PatientDataChunk,
    PatientInsights,
)

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Chunk generators
# ---------------------------------------------------------------------------

def generate_medication_chunk(record: PrescriptionRecord) -> PatientDataChunk:
    """
    Chunk type: medication
    Contains structured medication data optimised for patient display.
    """
    ed = record.extracted_data
    patient_id = ed.patient_id or record.doctor_id  # fallback

    med_items = []
    for m in ed.medications:
        usage_parts = []
        if m.purpose:
            usage_parts.append(m.purpose)
        if m.instructions:
            usage_parts.append(m.instructions)

        med_items.append({
            "name": m.name,
            "usage": " — ".join(usage_parts) if usage_parts else "As prescribed",
            "dosage": f"{m.strength or ''} {m.frequency or ''}".strip() or "As directed",
            "duration": m.duration or "As prescribed",
            "form": m.form,
            "warnings": m.warnings,
        })

    return PatientDataChunk(
        chunk_id=str(uuid.uuid4()),
        prescription_id=record.prescription_id,
        patient_id=patient_id,
        chunk_type="medication",
        data={"medications": med_items},
        version=1,
        created_at=_now_iso(),
    )


def generate_routine_chunk(
    record: PrescriptionRecord,
    insights: Optional[Dict[str, Any]] = None,
) -> PatientDataChunk:
    """
    Chunk type: routine
    Daily care instructions derived from prescriptions + AI insights.
    """
    ed = record.extracted_data
    patient_id = ed.patient_id or record.doctor_id

    instructions = []

    # Build from medication instructions
    for m in ed.medications:
        if m.instructions:
            instructions.append(f"{m.name}: {m.instructions}")
        if m.frequency:
            instructions.append(f"Take {m.name} — {m.frequency}")

    # Add from insights if available
    if insights:
        critical = insights.get("critical_instructions", [])
        instructions.extend(critical)
        lifestyle = insights.get("lifestyle_changes", [])
        instructions.extend(lifestyle)

    # Add from notes
    if ed.notes:
        instructions.append(ed.notes)

    # Deduplicate while preserving order
    seen = set()
    unique_instructions = []
    for inst in instructions:
        key = inst.lower().strip()
        if key not in seen:
            seen.add(key)
            unique_instructions.append(inst)

    return PatientDataChunk(
        chunk_id=str(uuid.uuid4()),
        prescription_id=record.prescription_id,
        patient_id=patient_id,
        chunk_type="routine",
        data={"instructions": unique_instructions},
        version=1,
        created_at=_now_iso(),
    )


def generate_explanation_chunk(
    record: PrescriptionRecord,
    insights: Optional[Dict[str, Any]] = None,
) -> PatientDataChunk:
    """
    Chunk type: explanation
    WHY each medicine is prescribed — for patient understanding.
    """
    ed = record.extracted_data
    patient_id = ed.patient_id or record.doctor_id

    details = []

    # Build from medication guide in insights
    med_guide = {}
    if insights:
        for guide in insights.get("medication_guide", []):
            med_guide[guide.get("name", "").lower()] = guide

    for m in ed.medications:
        # Try to find matching insight
        guide = med_guide.get(m.name.lower(), {})
        reason = guide.get("why") or m.purpose or "Prescribed by your doctor for your condition"

        details.append({
            "medicine": m.name,
            "strength": m.strength,
            "reason": reason,
            "what_it_does": guide.get("what", ""),
            "caution": guide.get("caution", m.warnings or ""),
        })

    return PatientDataChunk(
        chunk_id=str(uuid.uuid4()),
        prescription_id=record.prescription_id,
        patient_id=patient_id,
        chunk_type="explanation",
        data={"details": details},
        version=1,
        created_at=_now_iso(),
    )


def generate_faq_chunk(
    record: PrescriptionRecord,
    insights: Optional[Dict[str, Any]] = None,
) -> PatientDataChunk:
    """
    Chunk type: faq_context
    Pre-built Q&A pairs for the chatbot. Strictly from stored data.
    """
    ed = record.extracted_data
    patient_id = ed.patient_id or record.doctor_id

    questions = []
    answers = []

    # Auto-generate FAQ from medications
    for m in ed.medications:
        questions.append(f"Why am I taking {m.name}?")
        answers.append(m.purpose or f"{m.name} was prescribed by your doctor for your condition.")

        if m.frequency:
            questions.append(f"When should I take {m.name}?")
            answers.append(f"Take {m.name} {m.frequency}{' — ' + m.instructions if m.instructions else ''}.")

        if m.duration:
            questions.append(f"How long should I take {m.name}?")
            answers.append(f"Continue {m.name} for {m.duration} unless your doctor advises otherwise.")

    # Add diagnosis FAQ
    if ed.diagnosis:
        questions.append("What is my diagnosis?")
        answers.append(f"Your doctor has diagnosed: {ed.diagnosis}")

    # Add recovery FAQ from insights
    if insights:
        health_summary = insights.get("health_summary")
        if health_summary:
            questions.append("How long will recovery take?")
            answers.append(health_summary)

        follow_up = insights.get("follow_up_date")
        if follow_up:
            questions.append("When is my follow-up appointment?")
            answers.append(f"Your follow-up is scheduled for: {follow_up}")

        # Do's and Don'ts
        dos_donts = insights.get("dos_and_donts")
        if dos_donts:
            dos = dos_donts.get("do", [])
            donts = dos_donts.get("dont", [])
            if dos:
                questions.append("What should I do during recovery?")
                answers.append("Your doctor recommends: " + "; ".join(dos))
            if donts:
                questions.append("What should I avoid during recovery?")
                answers.append("Avoid the following: " + "; ".join(donts))

    return PatientDataChunk(
        chunk_id=str(uuid.uuid4()),
        prescription_id=record.prescription_id,
        patient_id=patient_id,
        chunk_type="faq_context",
        data={"questions": questions, "answers": answers},
        version=1,
        created_at=_now_iso(),
    )


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

async def chunk_and_store(
    record: PrescriptionRecord,
    insights: Optional[Dict[str, Any]] = None,
) -> List[PatientDataChunk]:
    """
    Main entry point: generate all 4 chunk types and persist them.
    Called after admin approval.
    """
    from db.patient_chunks_db import create_chunk, delete_chunks_for_prescription

    logger.info(f"Starting chunking pipeline for prescription {record.prescription_id}")

    # Remove any existing chunks (re-processing safe)
    await delete_chunks_for_prescription(record.prescription_id)

    # Generate all chunks
    chunks = [
        generate_medication_chunk(record),
        generate_routine_chunk(record, insights),
        generate_explanation_chunk(record, insights),
        generate_faq_chunk(record, insights),
    ]

    # Persist each chunk
    stored = []
    for chunk in chunks:
        chunk_dict = chunk.model_dump()
        result = await create_chunk(chunk_dict)
        if result.get("success"):
            stored.append(chunk)
            logger.info(f"Chunk stored: {chunk.chunk_type} ({chunk.chunk_id})")
        else:
            logger.error(f"Failed to store chunk: {chunk.chunk_type} — {result.get('error')}")

    logger.info(f"Chunking complete: {len(stored)}/{len(chunks)} chunks stored for {record.prescription_id}")
    return stored
