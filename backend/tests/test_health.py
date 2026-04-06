def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "SwasthaLink API"
    assert data["version"] == "1.0.0"
    assert data["status"] == "running"
    assert data["docs"] == "/docs"
    assert data["health"] == "/api/health"


def test_health_all_ok(client, monkeypatch):
    monkeypatch.setattr("routes.health.check_gemini_health", lambda: {"status": "ok", "available": True})
    monkeypatch.setattr("routes.health.check_twilio_health", lambda: {"status": "ok", "available": True})
    monkeypatch.setattr("routes.health.check_supabase_health", lambda: {"status": "ok", "available": True})
    monkeypatch.setattr("routes.health.check_s3_health", lambda: {"status": "ok", "available": True})

    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"]["gemini"]["status"] == "ok"
    assert body["checks"]["twilio"]["status"] == "ok"
    assert body["checks"]["supabase"]["status"] == "ok"
    assert body["checks"]["s3"]["status"] == "ok"


def test_health_degraded_when_non_critical_down(client, monkeypatch):
    monkeypatch.setattr("routes.health.check_gemini_health", lambda: {"status": "ok", "available": True})
    monkeypatch.setattr("routes.health.check_twilio_health", lambda: {"status": "down", "available": False})
    monkeypatch.setattr("routes.health.check_supabase_health", lambda: {"status": "ok", "available": True})
    monkeypatch.setattr("routes.health.check_s3_health", lambda: {"status": "ok", "available": True})

    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "degraded"


def test_health_down_when_gemini_down(client, monkeypatch):
    monkeypatch.setattr("routes.health.check_gemini_health", lambda: {"status": "down", "available": False})
    monkeypatch.setattr("routes.health.check_twilio_health", lambda: {"status": "ok", "available": True})
    monkeypatch.setattr("routes.health.check_supabase_health", lambda: {"status": "ok", "available": True})
    monkeypatch.setattr("routes.health.check_s3_health", lambda: {"status": "ok", "available": True})

    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "down"
