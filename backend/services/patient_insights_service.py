"""
Patient Insights Generation Service.

Generates patient-friendly explanations from extracted prescription data.
Called AFTER admin approval — ensures only verified data reaches patients.

Uses a second Gemini call with a patient-education prompt to transform
structured clinical data into:
  - Medication guide (what, why, when, caution)
  - Test guide (why, what to expect)
  - Health summary (plain language)
  - Do's and Don'ts
"""

import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)


_PATIENT_INSIGHTS_PROMPT = """You are a compassionate medical educator explaining a prescription to a patient.

EXTRACTED PRESCRIPTION DATA:
- Doctor: {doctor_name}
- Patient: {patient_name}, {patient_age}, {patient_gender}
- Diagnosis: {diagnosis}
- Date: {prescription_date}

MEDICATIONS:
{medications_text}

TESTS RECOMMENDED:
{tests_text}

ADDITIONAL NOTES:
{notes}

TASK:
Generate patient-friendly explanations for EVERY medication and test listed above.
Return ONLY a valid JSON object — no markdown, no backticks, no explanation.

{{
  "medication_guide": [
    {{
      "name": "Drug Name (Strength)",
      "what": "What this medicine does in 1 simple sentence",
      "why": "Why your doctor prescribed this — relate to their diagnosis",
      "when": "Exact timing: 'Take 1 tablet every morning with breakfast'",
      "caution": "One important warning or thing to avoid (or null if none)"
    }}
  ],
  "test_guide": [
    {{
      "name": "Test Name",
      "why": "Why this test is needed in simple words",
      "what_to_expect": "What happens during the test — reassure the patient"
    }}
  ],
  "health_summary": "A 2-3 sentence plain-language summary of the patient's condition and treatment plan. Use 'you' and 'your'. Be encouraging and reassuring.",
  "dos_and_donts": {{
    "do": [
      "4-6 things the patient SHOULD do (e.g., 'Take your medicine at the same time every day')"
    ],
    "dont": [
      "3-5 things the patient should AVOID (e.g., 'Don't skip any doses without asking your doctor')"
    ]
  }}
}}

Rules:
1. Use ONLY simple everyday language — imagine explaining to your grandmother.
2. Never suggest stopping or changing prescribed medications.
3. Relate each medication to the patient's specific diagnosis if possible.
4. Be warm, encouraging, and reassuring in tone.
5. If no tests are recommended, return an empty array for test_guide.
6. Return ONLY the JSON. No other text."""


def _build_medications_text(medications: list) -> str:
    """Build a readable text block from medication list."""
    if not medications:
        return "None listed"
    lines = []
    for i, med in enumerate(medications, 1):
        name = med.get("name", "Unknown") if isinstance(med, dict) else getattr(med, "name", "Unknown")
        strength = (med.get("strength") if isinstance(med, dict) else getattr(med, "strength", None)) or ""
        form = (med.get("form") if isinstance(med, dict) else getattr(med, "form", None)) or ""
        freq = (med.get("frequency") if isinstance(med, dict) else getattr(med, "frequency", None)) or ""
        dur = (med.get("duration") if isinstance(med, dict) else getattr(med, "duration", None)) or ""
        instr = (med.get("instructions") if isinstance(med, dict) else getattr(med, "instructions", None)) or ""
        purpose = (med.get("purpose") if isinstance(med, dict) else getattr(med, "purpose", None)) or ""
        line = f"{i}. {name} {strength} ({form}) — {freq}"
        if dur:
            line += f" for {dur}"
        if instr:
            line += f" [{instr}]"
        if purpose:
            line += f" (Purpose: {purpose})"
        lines.append(line)
    return "\n".join(lines)


def _build_tests_text(tests: list) -> str:
    """Build a readable text block from tests list."""
    if not tests:
        return "None recommended"
    lines = []
    for i, test in enumerate(tests, 1):
        name = test.get("name", "Unknown") if isinstance(test, dict) else str(test)
        reason = test.get("reason", "") if isinstance(test, dict) else ""
        urgency = test.get("urgency", "Routine") if isinstance(test, dict) else "Routine"
        line = f"{i}. {name}"
        if reason:
            line += f" — {reason}"
        if urgency:
            line += f" (Urgency: {urgency})"
        lines.append(line)
    return "\n".join(lines)


async def generate_patient_insights(extracted_data) -> Optional[dict]:
    """
    Generate patient-friendly insights from extracted prescription data.

    Called after admin approval.  Returns a dict suitable for PatientInsights model.
    """
    from services.gemini_service import _generate_text, is_gemini_configured
    from core.exceptions import GeminiServiceError

    if not is_gemini_configured():
        logger.warning("Gemini API key not configured — skipping insights generation")
        return None

    # Build the prompt
    meds_list = []
    for m in (extracted_data.medications or []):
        if hasattr(m, "model_dump"):
            meds_list.append(m.model_dump())
        elif isinstance(m, dict):
            meds_list.append(m)

    tests_list = extracted_data.tests or []

    prompt = _PATIENT_INSIGHTS_PROMPT.format(
        doctor_name=extracted_data.doctor_name or "Your doctor",
        patient_name=extracted_data.patient_name or "Patient",
        patient_age=extracted_data.patient_age or "Unknown",
        patient_gender=extracted_data.patient_gender or "Unknown",
        diagnosis=extracted_data.diagnosis or "Not specified",
        prescription_date=extracted_data.prescription_date or "Not specified",
        medications_text=_build_medications_text(meds_list),
        tests_text=_build_tests_text(tests_list),
        notes=extracted_data.notes or "None",
    )

    try:
        logger.info("Generating patient insights via Gemini...")
        response_text = _generate_text(
            prompt=prompt,
            generation_config={"temperature": 0.2, "max_output_tokens": 4096},
        )

        if not response_text:
            logger.warning("Gemini returned empty response for patient insights")
            return None

        # Strip markdown fences
        import re
        cleaned = re.sub(r"```json\s*", "", response_text)
        cleaned = re.sub(r"```\s*$", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"```", "", cleaned).strip()

        # Find JSON
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1:
            logger.warning("No JSON object found in insights response")
            return None

        insights = json.loads(cleaned[start:end + 1])
        logger.info(f"Patient insights generated successfully ({len(response_text)} chars)")
        return insights

    except json.JSONDecodeError as exc:
        logger.error(f"Failed to parse insights JSON: {exc}")
        return None
    except GeminiServiceError as exc:
        logger.error(f"Gemini error during insights generation: {exc}")
        return None
    except Exception as exc:
        logger.error(f"Unexpected error generating insights: {exc}")
        return None
