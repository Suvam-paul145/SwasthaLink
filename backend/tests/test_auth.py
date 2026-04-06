from core.exceptions import AuthServiceError, OTPServiceError


def test_login_success(client, monkeypatch):
    def _mock_login_user(email, password, role):
        return {
            "user": {"id": "u1", "name": "Alice", "email": email, "role": role},
            "access_token": "token-123",
            "is_demo": False,
        }

    monkeypatch.setattr("routes.auth.login_user", _mock_login_user)
    response = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "password123", "role": "patient"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["message"] == "Login successful"
    assert body["access_token"] == "token-123"
    assert body["user"]["email"] == "alice@example.com"
    assert body["user"]["role"] == "patient"


def test_login_role_mismatch(client, monkeypatch):
    def _mock_login_user(email, password, role):
        raise AuthServiceError("Role mismatch. This account is assigned to 'doctor'.", status_code=403)

    monkeypatch.setattr("routes.auth.login_user", _mock_login_user)
    response = client.post(
        "/api/auth/login",
        json={"email": "doc@example.com", "password": "password123", "role": "patient"},
    )
    assert response.status_code == 403
    assert "Role mismatch" in response.json()["detail"]


def test_signup_success(client, monkeypatch):
    def _mock_signup_user(name, email, password, phone, role):
        return {"user_id": "user-123", "is_demo": False}

    monkeypatch.setattr("routes.auth.signup_user", _mock_signup_user)
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "password123",
            "phone": "+919876543210",
            "role": "patient",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["user_id"] == "user-123"


def test_signup_duplicate_email(client, monkeypatch):
    def _mock_signup_user(name, email, password, phone, role):
        raise AuthServiceError("An account with this email already exists", status_code=409)

    monkeypatch.setattr("routes.auth.signup_user", _mock_signup_user)
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Test User",
            "email": "dup@example.com",
            "password": "password123",
            "phone": "+919876543210",
            "role": "patient",
        },
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_send_otp_success(client, monkeypatch):
    async def _mock_send_otp(phone, channel="whatsapp"):
        return {"success": True, "message": "OTP sent", "demo_mode": True}

    monkeypatch.setattr("routes.auth.send_otp", _mock_send_otp)
    response = client.post(
        "/api/auth/send-otp",
        json={"phone": "+919876543210", "channel": "whatsapp"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_send_otp_invalid_phone(client):
    response = client.post(
        "/api/auth/send-otp",
        json={"phone": "9876543210", "channel": "whatsapp"},
    )
    assert response.status_code == 422


def test_verify_otp_marks_phone_verified(client, monkeypatch):
    async def _mock_verify_otp(phone, code):
        return {"success": True, "verified": True, "status": "approved", "demo_mode": True}

    calls = {"count": 0}

    async def _mock_update_phone_verified(user_id, email, phone):
        calls["count"] += 1
        assert user_id == "user-123"
        assert email == "test@example.com"
        return {"success": True}

    monkeypatch.setattr("routes.auth.verify_otp", _mock_verify_otp)
    monkeypatch.setattr("routes.auth.update_phone_verified_for_account", _mock_update_phone_verified)

    response = client.post(
        "/api/auth/verify-otp",
        json={"phone": "+919876543210", "code": "123456", "user_id": "user-123", "email": "test@example.com"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verified"] is True
    assert calls["count"] == 1


def test_verify_otp_service_error(client, monkeypatch):
    async def _mock_verify_otp(phone, code):
        raise OTPServiceError("OTP verification failed", status_code=400)

    monkeypatch.setattr("routes.auth.verify_otp", _mock_verify_otp)

    response = client.post("/api/auth/verify-otp", json={"phone": "+919876543210", "code": "1111"})
    assert response.status_code == 400
    assert "OTP verification failed" in response.json()["detail"]
