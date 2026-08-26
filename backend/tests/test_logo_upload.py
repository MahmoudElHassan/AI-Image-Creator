import io

import pytest
from app.main import app
from app.routers import brands as brands_module

from tests.helpers import fake_user, mock_service_client, override_user


@pytest.fixture(autouse=True)
def _clear_dependency_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def _setup_brand_found(fake_client):
    brand = {
        "id": "10000000-0000-0000-0000-000000000001",
        "name": "Test Brand",
        "owner_user_id": "user-1",
        "logo_path": None,
    }
    fake_client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = (
        type("R", (), {"data": brand})()
    )
    return brand


def test_logo_upload_oversize_returns_400(client, monkeypatch):
    user = fake_user(id="user-1")
    override_user(app, user)
    fake_client = mock_service_client()
    _setup_brand_found(fake_client)
    monkeypatch.setattr(brands_module, "get_service_client", lambda: fake_client)

    oversized = io.BytesIO(b"x" * (5 * 1024 * 1024 + 1))

    response = client.post(
        "/brands/10000000-0000-0000-0000-000000000001/logo",
        files={"file": ("logo.png", oversized, "image/png")},
    )
    assert response.status_code == 400, response.text
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "5 MB" in body["error"]["message"]


def test_logo_upload_exactly_at_limit_rejected(client, monkeypatch):
    user = fake_user(id="user-1")
    override_user(app, user)
    fake_client = mock_service_client()
    _setup_brand_found(fake_client)
    monkeypatch.setattr(brands_module, "get_service_client", lambda: fake_client)

    # 6 MiB — well over the limit.
    huge = io.BytesIO(b"x" * (6 * 1024 * 1024))

    response = client.post(
        "/brands/10000000-0000-0000-0000-000000000001/logo",
        files={"file": ("logo.png", huge, "image/png")},
    )
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"