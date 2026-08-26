import pytest
from app.core import auth as auth_module
from app.main import app
from app.routers import admin as admin_module

from tests.helpers import fake_user, mock_service_client, override_user


@pytest.fixture(autouse=True)
def _clear_dependency_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def test_admin_stats_non_admin_returns_403(client):
    user = fake_user(email="not-admin@example.com")
    override_user(app, user)

    response = client.get("/admin/stats")
    assert response.status_code == 403, response.text
    body = response.json()
    assert body["error"]["code"] == "FORBIDDEN"


def test_admin_stats_admin_returns_200(client, monkeypatch):
    user = fake_user(email="ops@example.com")
    monkeypatch.setattr(auth_module.settings, "ADMIN_EMAILS", "ops@example.com")
    override_user(app, user)
    fake_client = mock_service_client()
    monkeypatch.setattr(admin_module, "get_service_client", lambda: fake_client)

    stats_row = {
        "total_accounts": 10,
        "total_brands": 20,
        "total_generations": 100,
        "generations_pending": 1,
        "generations_processing": 2,
        "generations_succeeded": 80,
        "generations_failed": 17,
        "generations_openai": 60,
        "generations_gemini": 40,
        "generations_last_7d": 12,
        "generations_last_30d": 45,
        "brand_kits_complete": 15,
        "active_provider_keys": 7,
    }
    fake_client.table.return_value.select.return_value.single.return_value.execute.return_value = (
        type("R", (), {"data": stats_row})()
    )

    response = client.get("/admin/stats")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total_accounts"] == 10
    assert body["generations_by_status"]["succeeded"] == 80
    assert body["generations_by_provider"]["openai"] == 60


def test_admin_stats_missing_admin_emails_returns_403(client, monkeypatch):
    user = fake_user(email="ops@example.com")
    monkeypatch.setattr(auth_module.settings, "ADMIN_EMAILS", "")
    override_user(app, user)

    response = client.get("/admin/stats")
    assert response.status_code == 403, response.text
    body = response.json()
    assert body["error"]["code"] == "FORBIDDEN"