import asyncio

from services.chatbot_context_service import answer_from_context
from services.groq_chat_service import DEFAULT_NO_CONTEXT_ANSWER


def test_answer_from_context_uses_groq_when_configured(monkeypatch):
    async def fake_get_chunks_by_patient(patient_id):
        return [
            {
                "chunk_type": "medication",
                "prescription_id": "rx-123",
                "data": {
                    "medications": [
                        {
                            "name": "Metformin",
                            "frequency": "Twice daily",
                            "instructions": "After food",
                        }
                    ]
                },
            }
        ]

    async def fake_get_faq_suggestions(patient_id):
        return [{"question": "What is Metformin for?", "answer": "It helps control blood sugar."}]

    async def fake_answer_with_groq(patient_id, question, faq_matches, relevant_chunks):
        assert patient_id == "patient-1"
        assert faq_matches
        assert relevant_chunks
        return "Metformin helps control blood sugar. Take it after food."

    monkeypatch.setattr("db.patient_chunks_db.get_chunks_by_patient", fake_get_chunks_by_patient)
    monkeypatch.setattr(
        "services.chatbot_context_service.get_faq_suggestions",
        fake_get_faq_suggestions,
    )
    monkeypatch.setattr("services.chatbot_context_service.is_groq_configured", lambda: True)
    monkeypatch.setattr("services.chatbot_context_service.answer_with_groq", fake_answer_with_groq)

    result = asyncio.run(answer_from_context("patient-1", "What is Metformin for?"))

    assert result["answer"] == "Metformin helps control blood sugar. Take it after food."
    assert result["source"].startswith("groq")
    assert result["confidence"] == 0.92


def test_answer_from_context_falls_back_to_faq_without_groq(monkeypatch):
    async def fake_get_chunks_by_patient(patient_id):
        return [
            {
                "chunk_type": "faq_context",
                "prescription_id": "rx-456",
                "data": {"faqs": []},
            }
        ]

    async def fake_get_faq_suggestions(patient_id):
        return [{"question": "What is my diagnosis?", "answer": "Your doctor diagnosed hypertension."}]

    monkeypatch.setattr("db.patient_chunks_db.get_chunks_by_patient", fake_get_chunks_by_patient)
    monkeypatch.setattr(
        "services.chatbot_context_service.get_faq_suggestions",
        fake_get_faq_suggestions,
    )
    monkeypatch.setattr("services.chatbot_context_service.is_groq_configured", lambda: False)

    result = asyncio.run(answer_from_context("patient-1", "What is my diagnosis?"))

    assert result == {
        "answer": "Your doctor diagnosed hypertension.",
        "source": "faq_context",
        "confidence": 0.9,
    }


def test_answer_from_context_returns_general_knowledge_when_no_chunks(monkeypatch):
    async def fake_get_chunks_by_patient(patient_id):
        return []

    async def fake_answer_general(question):
        return "Here is a general health answer."

    monkeypatch.setattr("db.patient_chunks_db.get_chunks_by_patient", fake_get_chunks_by_patient)
    monkeypatch.setattr("services.chatbot_context_service.is_groq_configured", lambda: True)
    monkeypatch.setattr("services.chatbot_context_service.answer_general_question", fake_answer_general)

    result = asyncio.run(answer_from_context("patient-1", "Any updates?"))

    assert result == {
        "answer": "Here is a general health answer.",
        "source": "general_knowledge",
        "confidence": 0.6,
    }


def test_answer_from_context_returns_default_when_no_chunks_and_no_groq(monkeypatch):
    async def fake_get_chunks_by_patient(patient_id):
        return []

    monkeypatch.setattr("db.patient_chunks_db.get_chunks_by_patient", fake_get_chunks_by_patient)
    monkeypatch.setattr("services.chatbot_context_service.is_groq_configured", lambda: False)

    result = asyncio.run(answer_from_context("patient-1", "Any updates?"))

    assert result == {
        "answer": DEFAULT_NO_CONTEXT_ANSWER,
        "source": "none",
        "confidence": 0.0,
    }
