import asyncio

import pytest

from core.exceptions import LlamaCloudServiceError
from services.llamacloud_service import (
    _coerce_extract_result,
    extract_prescription_data_with_llamacloud,
)


def test_coerce_extract_result_accepts_dict():
    payload = {"doctor_name": "Dr. Sen", "medications": []}
    assert _coerce_extract_result(payload) == payload


def test_coerce_extract_result_rejects_none():
    with pytest.raises(LlamaCloudServiceError):
        _coerce_extract_result(None)


def test_extract_prescription_data_with_llamacloud_normalizes_output(monkeypatch):
    async_result = {
        "doctor_name": "dr sen",
        "patient_name": "rahul das",
        "patient_age": "35 yrs",
        "patient_gender": "Male",
        "prescription_date": "2026-04-05",
        "diagnosis": "Hypertension",
        "medications": [
            {
                "name": "telmisartan",
                "strength": "40mg",
                "form": "tablet",
                "frequency": "od",
                "duration": "30 days",
                "instructions": "after food",
                "purpose": "Blood pressure control",
            }
        ],
        "tests": [{"name": "ECG", "reason": "Baseline check", "urgency": "Routine"}],
        "extraction_confidence": 0.88,
    }

    monkeypatch.setattr(
        "services.llamacloud_service._run_llamacloud_extract_job",
        lambda file_content, filename, mime_type: async_result,
    )

    result = asyncio.run(
        extract_prescription_data_with_llamacloud(
            file_content=b"fake",
            filename="prescription.jpg",
            mime_type="image/jpeg",
        )
    )

    assert result.doctor_name == "dr sen"
    assert result.patient_name == "rahul das"
    assert result.medications[0].name == "Telmisartan"
    assert result.medications[0].strength == "40 mg"
    assert result.medications[0].frequency == "Once daily (morning)"
    assert result.medications[0].instructions == "After food"
    assert result.tests[0]["name"] == "ECG"
