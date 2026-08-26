import pytest
from app.main import app
from app.routers import generations as generations_module
from app.services.providers.base import ProviderError

from tests.helpers import fake_user, mock_service_client, override_user


@pytest.fixture(autouse=True)
def _clear_dependency_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def _fake_generation_payload():
    return {
        "prompt": "hello world",
        "provider": "openai",
        "platform_preset": "instagram_post",
        "logo_mode": "none",
    }


def _configure_brand_and_key(fake_client, *, with_active_key: bool):
    """Wire the brands lookup + provider_keys lookup on the same fake_client.

    All `.eq().maybe_single().execute()` calls on `brands` return the brand; on
    `provider_keys` return either the active key or None.
    """
    brand = {
        "id": "10000000-0000-0000-0000-000000000001",
        "name": "Test Brand",
        "owner_user_id": "user-1",
        "logo_path": None,
    }
    active_key = {
        "id": "00000000-0000-0000-0000-000000000002",
        "brand_id": brand["id"],
        "provider": "openai",
        "vault_secret_id": "vault-secret-1",
        "is_active": True,
    }

    def execute(_self=None):
        table_name = getattr(fake_client.table.return_value, "_table_name", None)
        # Decide based on the most recent `.table(name)` call.
        return type("R", (), {"data": _resolve(table_name)})()

    # We can't easily intercept the chained execute on a MagicMock — use a side_effect
    # on execute() that consults a closure.
    def table_router(name):
        fake_client.table.return_value._table_name = name
        return fake_client.table.return_value

    def maybe_single_exec(*_args, **_kwargs):
        table_name = getattr(fake_client.table.return_value, "_table_name", None)
        return type("R", (), {"data": _resolve(table_name)})()

    fake_client.table.side_effect = table_router
    fake_client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.side_effect = (
        maybe_single_exec
    )

    def _resolve(table_name):
        if table_name == "brands":
            return brand
        if table_name == "provider_keys":
            return active_key if with_active_key else None
        if table_name == "brand_kits":
            return None
        return None

    return brand, active_key


def _setup_generate_test(
    monkeypatch,
    *,
    with_active_key: bool = True,
    read_secret_value=None,
    raise_read_secret: bool = False,
    provider_exc: ProviderError | None = None,
):
    user = fake_user(id="user-1")
    override_user(app, user)
    fake_client = mock_service_client()
    _configure_brand_and_key(fake_client, with_active_key=with_active_key)

    monkeypatch.setattr(generations_module, "get_service_client", lambda: fake_client)
    monkeypatch.setattr(generations_module, "enforce_rate_limit", lambda **_kw: None)

    def _read_secret(_vault_id):
        if raise_read_secret:
            raise RuntimeError("vault blip")
        return read_secret_value

    monkeypatch.setattr(generations_module, "read_secret", _read_secret)

    if provider_exc is not None:
        async def _fake_openai(**_kwargs):
            raise provider_exc

        monkeypatch.setattr(generations_module, "openai_generate", _fake_openai)

    return fake_client, user


def test_generate_no_active_provider_key_returns_400(client, monkeypatch):
    _fake_client, _user = _setup_generate_test(
        monkeypatch, with_active_key=False, read_secret_value="sk-test"
    )

    response = client.post(
        "/brands/10000000-0000-0000-0000-000000000001/generate",
        json=_fake_generation_payload(),
    )
    assert response.status_code == 400, response.text
    body = response.json()
    assert body["error"]["code"] == "NO_ACTIVE_KEY"


def test_generate_vault_none_returns_502(monkeypatch):
    fake_client, _user = _setup_generate_test(
        monkeypatch, with_active_key=True, read_secret_value=None
    )

    from fastapi.testclient import TestClient

    with TestClient(app) as test_client:
        response = test_client.post(
            "/brands/10000000-0000-0000-0000-000000000001/generate",
            json=_fake_generation_payload(),
        )

    assert response.status_code == 502, response.text
    body = response.json()
    assert body["error"]["code"] == "VAULT_ERROR"

    failed_updates = [u for u in fake_client.table.return_value.update.call_args_list if False]
    # The mock setup does not capture updates per call; instead verify _mark_failed path
    # was triggered by checking the final update call arg dictionary included `status: failed`.
    update_calls = fake_client.table.return_value.update.call_args_list
    failed_updates = [
        c.kwargs.get("row", c.args[0] if c.args else {})
        for c in update_calls
        if isinstance(c.kwargs.get("row") or (c.args[0] if c.args else {}), dict)
        and (c.kwargs.get("row") or (c.args[0] if c.args else {})).get("status") == "failed"
    ]
    assert failed_updates, f"expected at least one update with status=failed, got {update_calls}"
    assert failed_updates[-1]["error_code"] == "VAULT_ERROR"


def test_generate_provider_invalid_key_marks_failed_and_returns_502(client, monkeypatch):
    fake_client, _user = _setup_generate_test(
        monkeypatch,
        with_active_key=True,
        read_secret_value="sk-test",
        provider_exc=ProviderError("INVALID_KEY", "Your provider key was rejected."),
    )

    response = client.post(
        "/brands/10000000-0000-0000-0000-000000000001/generate",
        json=_fake_generation_payload(),
    )
    assert response.status_code == 502, response.text
    body = response.json()
    assert body["error"]["code"] == "INVALID_KEY"

    update_calls = fake_client.table.return_value.update.call_args_list
    failed_updates = []
    for call in update_calls:
        row = call.kwargs.get("row")
        if row is None and call.args:
            row = call.args[0]
        if isinstance(row, dict) and row.get("status") == "failed":
            failed_updates.append(row)
    assert failed_updates, "expected generations update with status=failed"
    assert failed_updates[-1]["error_code"] == "INVALID_KEY"