from models import ProcessResponse, Medication, ComprehensionQuestion
from core.exceptions import GeminiServiceError


def _sample_process_response():
    return ProcessResponse(
        simplified_english="Take your medicines on time.",
        simplified_bengali="সময়মতো ওষুধ খান।",
        medications=[
            Medication(
                name="Aspirin",
                dose="1 tablet",
                timing=["morning"],
                reason="Blood thinning",
            )
        ],
        follow_up=None,
        warning_signs=["Severe chest pain"],
        comprehension_questions=[
            ComprehensionQuestion(
                question="When should you take your tablet?",
                options=["A) Morning", "B) Noon", "C) Night", "D) Never"],
                correct="A",
                explanation="As prescribed in the morning.",
            ),
            ComprehensionQuestion(
                question="What should you do if pain worsens?",
                options=["A) Ignore", "B) Stop all meds", "C) Call doctor", "D) Sleep"],
                correct="C",
                explanation="Seek medical advice quickly.",
            ),
            ComprehensionQuestion(
                question="How many tablets daily?",
                options=["A) 0", "B) 1", "C) 2", "D) 3"],
                correct="B",
                explanation="One tablet per day.",
            ),
        ],
        whatsapp_message="Demo message",
    )


def test_process_summary_success(client, monkeypatch):
    async def _mock_process_discharge_summary(text, role, language, re_explain, previous_simplified):
        return _sample_process_response()

    async def _ok_async(*args, **kwargs):
        return {"success": True}

    monkeypatch.setattr("routes.discharge.generate_session_id", lambda: "session-abc")
    monkeypatch.setattr("routes.discharge.process_discharge_summary", _mock_process_discharge_summary)
    monkeypatch.setattr("routes.discharge.log_session", _ok_async)
    monkeypatch.setattr("routes.discharge.persist_session_history", _ok_async)
    monkeypatch.setattr("routes.discharge.rate_alert_service.track_usage", lambda *a, **k: None)

    response = client.post(
        "/api/process",
        json={
            "discharge_text": "This is a sufficiently long discharge summary text for testing purposes only.",
            "role": "patient",
            "language": "en",
            "re_explain": False,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == "session-abc"
    assert body["simplified_english"]
    assert len(body["comprehension_questions"]) == 3


def test_process_summary_with_patient_context_saves_history(client, monkeypatch):
    saved = {}

    async def _mock_process_discharge_summary(text, role, language, re_explain, previous_simplified):
        return _sample_process_response()

    async def _ok_async(*args, **kwargs):
        return {"success": True}

    async def _save_discharge_result(*, patient_id, doctor_id, gemini_result):
        saved["patient_id"] = patient_id
        saved["doctor_id"] = doctor_id
        saved["gemini_result"] = gemini_result
        return {"success": True}

    monkeypatch.setattr("routes.discharge.generate_session_id", lambda: "session-xyz")
    monkeypatch.setattr("routes.discharge.process_discharge_summary", _mock_process_discharge_summary)
    monkeypatch.setattr("routes.discharge.save_discharge_result", _save_discharge_result)
    monkeypatch.setattr("routes.discharge.log_session", _ok_async)
    monkeypatch.setattr("routes.discharge.persist_session_history", _ok_async)
    monkeypatch.setattr("routes.discharge.rate_alert_service.track_usage", lambda *a, **k: None)

    response = client.post(
        "/api/process",
        json={
            "discharge_text": "This is a sufficiently long discharge summary text for testing purposes only.",
            "role": "patient",
            "language": "en",
            "patient_id": "patient-123",
            "doctor_id": "doctor-123",
        },
    )
    assert response.status_code == 200
    assert saved["patient_id"] == "patient-123"
    assert saved["doctor_id"] == "doctor-123"
    assert saved["gemini_result"]["session_id"] == "session-xyz"


def test_process_summary_too_short(client):
    response = client.post(
        "/api/process",
        json={"discharge_text": "too short", "role": "patient", "language": "en"},
    )
    assert response.status_code == 422


def test_quiz_submit_perfect_score(client, monkeypatch):
    async def _ok_async(*args, **kwargs):
        return {"success": True}

    monkeypatch.setattr("routes.discharge.update_session_quiz_score", _ok_async)
    monkeypatch.setattr("routes.discharge.append_session_event", _ok_async)
    monkeypatch.setattr("routes.discharge.rate_alert_service.track_usage", lambda *a, **k: None)

    response = client.post(
        "/api/quiz/submit",
        json={
            "session_id": "session-1",
            "answers": ["A", "B", "C"],
            "correct_answers": ["A", "B", "C"],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 3
    assert body["passed"] is True
    assert body["needs_re_explain"] is False


def test_quiz_submit_needs_re_explain(client, monkeypatch):
    async def _ok_async(*args, **kwargs):
        return {"success": True}

    monkeypatch.setattr("routes.discharge.update_session_quiz_score", _ok_async)
    monkeypatch.setattr("routes.discharge.append_session_event", _ok_async)
    monkeypatch.setattr("routes.discharge.rate_alert_service.track_usage", lambda *a, **k: None)

    response = client.post(
        "/api/quiz/submit",
        json={
            "session_id": "session-1",
            "answers": ["A", "D", "D"],
            "correct_answers": ["A", "B", "C"],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 1
    assert body["passed"] is False
    assert body["needs_re_explain"] is True


def test_process_summary_rate_limited_returns_429(client, monkeypatch):
    async def _rate_limited(*args, **kwargs):
        raise GeminiServiceError("Request blocked before hitting limit", status_code=429)

    monkeypatch.setattr("routes.discharge.process_discharge_summary", _rate_limited)

    response = client.post(
        "/api/process",
        json={
            "discharge_text": "This is a sufficiently long discharge summary text to trigger the processing route safely.",
            "role": "patient",
            "language": "en",
            "re_explain": False,
        },
    )

    assert response.status_code == 429
    assert "blocked" in response.json()["detail"].lower()


def test_upload_rate_limited_returns_429(client, monkeypatch):
    async def _mock_upload_file(*args, **kwargs):
        return {"s3_key": "demo/key"}

    async def _rate_limited_extract(*args, **kwargs):
        raise GeminiServiceError("Request blocked before hitting limit", status_code=429)

    monkeypatch.setattr("routes.discharge.upload_file", _mock_upload_file)
    monkeypatch.setattr("routes.discharge.extract_text_from_image", _rate_limited_extract)
    monkeypatch.setattr("routes.discharge.rate_alert_service.track_usage", lambda *a, **k: None)

    response = client.post(
        "/api/upload",
        files={"file": ("report.png", b"fake-image-content", "image/png")},
    )

    assert response.status_code == 429
    assert "failed to extract text" in response.json()["detail"].lower()
