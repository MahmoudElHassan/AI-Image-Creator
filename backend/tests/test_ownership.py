import pytest
from app.main import app
from app.routers import brands as brands_module
from app.routers import generations as generations_module

from tests.helpers import fake_user, mock_service_client, override_user


@pytest.fixture(autouse=True)
def _clear_dependency_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def test_get_brand_not_owner_returns_404(client, monkeypatch):
    user = fake_user(id="user-1")
    override_user(app, user)
    fake_client = mock_service_client()
    monkeypatch.setattr(brands_module, "get_service_client", lambda: fake_client)

    # brands table: no row found for this user.
    fake_client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = (
        type("R", (), {"data": None})()
    )

    response = client.get("/brands/10000000-0000-0000-0000-000000000001")
    assert response.status_code == 404, response.text
    body = response.json()
    assert body["error"]["code"] == "BRAND_NOT_FOUND"


def test_generate_not_owner_returns_404(client, monkeypatch):
    user = fake_user(id="user-1")
    override_user(app, user)
    fake_client = mock_service_client()
    monkeypatch.setattr(generations_module, "get_service_client", lambda: fake_client)
    monkeypatch.setattr(generations_module, "enforce_rate_limit", lambda **_kw: None)

    # brands lookup: not owned.
    fake_client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = (
        type("R", (), {"data": None})()
    )

    body = {
        "prompt": "hello world",
        "provider": "openai",
        "platform_preset": "instagram_post",
        "logo_mode": "none",
    }

    response = client.post(
        "/brands/10000000-0000-0000-0000-000000000001/generate", json=body
    )
    assert response.status_code == 404, response.text
    payload = response.json()
    assert payload["error"]["code"] == "BRAND_NOT_FOUND"