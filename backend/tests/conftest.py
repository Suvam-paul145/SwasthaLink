from fastapi.testclient import TestClient
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from main import app


@pytest.fixture(autouse=True)
def patch_startup_health(monkeypatch):
    monkeypatch.setattr("main.check_gemini_health", lambda: {"status": "ok"}, raising=False)
    monkeypatch.setattr("main.check_twilio_health", lambda: {"status": "ok"}, raising=False)
    monkeypatch.setattr("main.check_supabase_health", lambda: {"status": "ok"}, raising=False)
    monkeypatch.setattr("main.check_s3_health", lambda: {"status": "ok"}, raising=False)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
