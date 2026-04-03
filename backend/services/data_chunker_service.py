"""
Data Chunker Service
Splits approved prescription data into 4 functional patient-optimized chunks:
  - medication: drug info, dosage, warnings
  - routine: daily care instructions
  - explanation: why each medicine was prescribed
  - faq_context: pre-built Q&A for chatbot
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from models.prescription import PatientDataChunk, PrescriptionRecord

logger = logging.getLogger(__name__)


def generate_medication_chunk(record: PrescriptionRecord) -> PatientDataChunk:
    """Generate a medication info chunk from prescription data."""
    ed = record.extracted_data
    medications = []
    for m in ed.medications:
        medications.append({
            "name": m.name,
            "strength": m.strength,
            "form": m.form,
            "frequency": m.frequency,
            "duration": m.duration,
            "instructions": m.instructions,
            "purpose": m.purpose,
            "warnings": m.warnings,
        })
    return PatientDataChunk(
        chunk_id=str(uuid.uuid4()),
        prescription_id=record.prescription_id,
        patient_id=ed.patient_id or record.doctor_id,
        chunk_type="medication",
        data={"medications": medications, "count": len(medications)},
        created_at=datetime.now(timezone.utc).isoformat(),
    )


def generate_routine_chunk(
    record: PrescriptionRecord,
    insights: Optional[Dict[str, Any]] = None,
) -> PatientDataChunk:
    """Generate daily routine instructions from prescription and insights."""
    ed = record.extracted_data
    steps = []
    for i, m in enumerate(ed.medications, 1):
        step = {
            "order": i,
            "action": f"Take {m.name}" + (f" ({m.strength})" if m.strength else ""),
            "timing": m.frequency or "As directed",
            "instructions": m.instructions or "",
        }
        steps.append(step)

    # Add insight-derived routine steps
    if insights:
        dos = insights.get("dos_and_donts", {})
        if isinstance(dos, dict):
            for do_item in (dos.get("do") or []):
                steps.append({"order": len(steps) + 1, "action": do_item, "timing": "Daily", "instructions": ""})

    return PatientDataChunk(
        chunk_id=str(uuid.uuid4()),
        prescription_id=record.prescription_id,
        patient_id=ed.patient_id or record.doctor_id,
        chunk_type="routine",
        data={"steps": steps, "notes": ed.notes},
        created_at=datetime.now(timezone.utc).isoformat(),
    )


def generate_explanation_chunk(
    record: PrescriptionRecord,
    insights: Optional[Dict[str, Any]] = None,
) -> PatientDataChunk:
    """Generate 'Why this medicine' explanations."""
    ed = record.extracted_data
    explanations = []
    insight_meds = {}
    if insights and insights.get("medication_guide"):
        for mg in insights["medication_guide"]:
            insight_meds[mg.get("name", "").lower()] = mg

    for m in ed.medications:
        entry = {
            "medicine": m.name,
            "reason": m.purpose or "Prescribed by your doctor",
        }
        guide = insight_meds.get(m.name.lower(), {})
        entry["how_it_works"] = guide.get("why", "")
        entry["caution"] = guide.get("caution", m.warnings or "")
        explanations.append(entry)

    return PatientDataChunk(
        chunk_id=str(uuid.uuid4()),
        prescription_id=record.prescription_id,
        patient_id=ed.patient_id or record.doctor_id,
        chunk_type="explanation",
        data={"explanations": explanations},
        created_at=datetime.now(timezone.utc).isoformat(),
    )


def generate_faq_chunk(
    record: PrescriptionRecord,
    insights: Optional[Dict[str, Any]] = None,
) -> PatientDataChunk:
    """Generate FAQ question/answer pairs for chatbot context."""
    ed = record.extracted_data
    faqs = []

    # Auto-generate FAQs from medication data
    for m in ed.medications:
        faqs.append({
            "question": f"What is {m.name} for?",
            "answer": m.purpose or f"{m.name} was prescribed by your doctor for your treatment.",
        })
        if m.frequency:
            faqs.append({
                "question": f"How often should I take {m.name}?",
                "answer": f"Take {m.name} {m.frequency}." + (f" {m.instructions}" if m.instructions else ""),
            })
        if m.duration:
            faqs.append({
                "question": f"How long should I take {m.name}?",
                "answer": f"Continue {m.name} for {m.duration} as prescribed.",
            })

    # Add diagnosis FAQ
    if ed.diagnosis:
        faqs.append({
            "question": "What is my diagnosis?",
            "answer": f"Your doctor diagnosed: {ed.diagnosis}",
        })

    # Add insight-derived FAQs
    if insights:
        summary = insights.get("health_summary")
        if summary:
            faqs.append({
                "question": "Can you summarize my health condition?",
                "answer": summary,
            })

    return PatientDataChunk(
        chunk_id=str(uuid.uuid4()),
        prescription_id=record.prescription_id,
        patient_id=ed.patient_id or record.doctor_id,
        chunk_type="faq_context",
        data={"faqs": faqs, "total": len(faqs)},
        created_at=datetime.now(timezone.utc).isoformat(),
    )


async def chunk_and_store(
    record: PrescriptionRecord,
    insights: Optional[Dict[str, Any]] = None,
) -> List[PatientDataChunk]:
    """Orchestrator: generate all 4 chunk types and persist them."""
    from db.patient_chunks_db import create_chunk

    chunks = [
        generate_medication_chunk(record),
        generate_routine_chunk(record, insights),
        generate_explanation_chunk(record, insights),
        generate_faq_chunk(record, insights),
    ]

    for chunk in chunks:
        await create_chunk(chunk.model_dump())

    logger.info(
        f"Chunked prescription {record.prescription_id} into {len(chunks)} chunks "
        f"for patient {record.extracted_data.patient_id}"
    )
    return chunks
