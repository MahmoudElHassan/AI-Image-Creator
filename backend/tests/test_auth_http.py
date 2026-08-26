import pytest
from app.core import auth as auth_module
from app.main import app
from app.routers import me as me_module

from tests.helpers import fake_user, mock_service_client, override_user


@pytest.fixture(autouse=True)
def _clear_dependency_overrides():
    """Each test starts with a clean dependency_overrides map."""
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def test_me_no_authorization_returns_401(client):
    response = client.get("/me")
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] in {"AUTHENTICATION_REQUIRED", "INVALID_TOKEN"}


def test_me_invalid_bearer_returns_401(client):
    response = client.get("/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] in {"AUTHENTICATION_REQUIRED", "INVALID_TOKEN"}


def test_me_with_override_user_returns_200(client, monkeypatch):
    user = fake_user()
    override_user(app, user)
    fake_client = mock_service_client()
    monkeypatch.setattr(me_module, "get_service_client", lambda: fake_client)

    fake_client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = (
        type(
            "R",
            (),
            {
                "data": {
                    "user_id": user.id,
                    "full_name": "Owner",
                    "avatar_url": None,
                    "created_at": "2026-06-01T00:00:00Z",
                    "updated_at": "2026-06-01T00:00:00Z",
                }
            },
        )()
    )

    response = client.get("/me")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["user_id"] == user.id
    assert body["email"] == user.email
    assert body["full_name"] == "Owner"
    assert body["is_admin"] is False


def test_get_current_user_returns_401_envelope(client):
    response = client.get("/me")
    assert response.status_code == 401
    body = response.json()
    assert "error" in body
    assert "code" in body["error"]
    assert "message" in body["error"]
    assert "request_id" in body["error"]


def test_is_admin_email_matches(monkeypatch):
    monkeypatch.setattr(auth_module.settings, "ADMIN_EMAILS", "owner@example.com")
    assert auth_module.is_admin_email("owner@example.com") is True
    assert auth_module.is_admin_email("OWNER@example.com") is True
    assert auth_module.is_admin_email("other@example.com") is False