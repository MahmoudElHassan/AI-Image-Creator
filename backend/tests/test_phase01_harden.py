import os
import threading
import time
from types import SimpleNamespace
from uuid import UUID

import pytest

os.environ.setdefault("SUPABASE_URL", "http://127.0.0.1:54321")
os.environ.setdefault("SUPABASE_SECRET_KEY", "test-secret-key")

from app.core.rate_limit import check_rate_limit, reset_rate_limit_store
from app.routers import generations
from app.services.providers.openai_image import build_openai_body
from fastapi import HTTPException


@pytest.fixture(autouse=True)
def _reset_rate_limit_store():
    reset_rate_limit_store()
    yield
    reset_rate_limit_store()


def test_check_rate_limit_allows_up_to_limit_then_429():
    identity = "user:test-user-1"

    for _ in range(5):
        check_rate_limit("generate", identity, limit=5, window_seconds=60)

    with pytest.raises(HTTPException) as exc:
        check_rate_limit("generate", identity, limit=5, window_seconds=60)

    assert exc.value.status_code == 429
    assert exc.value.detail["error"]["code"] == "RATE_LIMITED"
    assert "try again" in exc.value.detail["error"]["message"].lower()


def test_check_rate_limit_separate_buckets_independent():
    for _ in range(3):
        check_rate_limit("generate", "user:u1", limit=3, window_seconds=60)

    check_rate_limit("keys_add", "user:u1", limit=3, window_seconds=60)


def test_build_openai_body_includes_response_format_b64_json():
    body = build_openai_body(
        model="gpt-image-1",
        prompt="a serene beach",
        width=1024,
        height=1024,
    )

    assert body["response_format"] == "b64_json"
    assert body["model"] == "gpt-image-1"
    assert body["prompt"] == "a serene beach"
    assert body["size"] == "1024x1024"
    assert body["n"] == 1


def test_build_openai_body_picks_landscape_or_portrait_size():
    landscape = build_openai_body(model="m", prompt="p", width=1536, height=1024)
    portrait = build_openai_body(model="m", prompt="p", width=1024, height=1536)
    assert landscape["size"] == "1536x1024"
    assert portrait["size"] == "1024x1536"
    assert landscape["response_format"] == "b64_json"
    assert portrait["response_format"] == "b64_json"


def _fake_service_client(*, brand, active_key):
    inserted_rows: list[dict] = []
    generation_updates: list[dict] = []

    class _Table:
        def __init__(self, name):
            self.name = name
            self._filters: dict = {}
            self._pending_update: dict | None = None

        def select(self, _cols):
            return self

        def insert(self, row):
            if self.name == "generations":
                inserted_rows.append(row)
            return self

        def update(self, row):
            if self.name == "generations":
                self._pending_update = row
                generation_updates.append(row)
            return self

        def eq(self, key, value):
            self._filters[key] = value
            return self

        def maybe_single(self):
            return self

        def execute(self):
            if self.name == "brands":
                return SimpleNamespace(data=brand)
            if self.name == "provider_keys":
                return SimpleNamespace(data=active_key)
            if self.name == "generations":
                if self._pending_update is not None:
                    data = {
                        "id": "00000000-0000-0000-0000-000000000099",
                        "prompt": "p",
                        "provider": "openai",
                        "model": "gpt-image-1",
                        "platform_preset": "instagram_post",
                        "width": 1080,
                        "height": 1080,
                        "logo_mode": "none",
                        "status": self._pending_update.get("status", "processing"),
                        "image_path": None,
                        "error_code": self._pending_update.get("error_code"),
                        "error_message": self._pending_update.get("error_message"),
                        "created_at": "2026-06-07T12:30:00Z",
                        "completed_at": self._pending_update.get("completed_at"),
                    }
                    self._pending_update = None
                    return SimpleNamespace(data=[data])
                return SimpleNamespace(data=[{
                    "id": "00000000-0000-0000-0000-000000000099",
                    "prompt": "p",
                    "provider": "openai",
                    "model": "gpt-image-1",
                    "platform_preset": "instagram_post",
                    "width": 1080,
                    "height": 1080,
                    "logo_mode": "none",
                    "status": "pending",
                    "image_path": None,
                    "error_code": None,
                    "error_message": None,
                    "created_at": "2026-06-07T12:30:00Z",
                    "completed_at": None,
                }])
            return SimpleNamespace(data=None)

    class _ServiceClient:
        def __init__(self):
            self.inserted = inserted_rows
            self.generation_updates = generation_updates

        def table(self, name):
            return _Table(name)

    return _ServiceClient()


def _invoke_generate_image(monkeypatch, fake_client, read_secret_fn, fake_request, current_user, brand_id):
    from app.models.generation import (
        GenerateRequest,
        LogoModeEnum,
        PlatformPresetEnum,
        ProviderEnum,
    )

    body = GenerateRequest(
        prompt="a serene beach",
        provider=ProviderEnum.openai,
        platform_preset=PlatformPresetEnum.instagram_post,
        logo_mode=LogoModeEnum.none,
    )

    monkeypatch.setattr(generations, "get_service_client", lambda: fake_client)
    monkeypatch.setattr(generations, "read_secret", read_secret_fn)

    import asyncio

    return asyncio.run(
        generations.generate_image(
            request=fake_request,
            brand_id=brand_id,
            body=body,
            current_user=current_user,
        )
    )


def test_generate_image_vault_missing_returns_502_and_marks_failed(monkeypatch):
    brand_id = UUID("10000000-0000-0000-0000-000000000001")
    brand = {
        "id": str(brand_id),
        "name": "Test Brand",
        "owner_user_id": "user-1",
        "logo_path": None,
    }
    active_key = {
        "id": "00000000-0000-0000-0000-000000000002",
        "brand_id": str(brand_id),
        "provider": "openai",
        "vault_secret_id": "vault-secret-1",
        "is_active": True,
    }

    fake_client = _fake_service_client(brand=brand, active_key=active_key)
    fake_request = SimpleNamespace(
        headers={}, client=SimpleNamespace(host="127.0.0.1")
    )
    current_user = SimpleNamespace(id="user-1", email="u@example.com")

    with pytest.raises(HTTPException) as exc:
        _invoke_generate_image(
            monkeypatch, fake_client, lambda _vault_id: None,
            fake_request, current_user, brand_id,
        )

    assert exc.value.status_code == 502
    assert exc.value.detail["error"]["code"] == "VAULT_ERROR"

    failed_updates = [u for u in fake_client.generation_updates if u.get("status") == "failed"]
    assert failed_updates, f"expected failed update, got {fake_client.generation_updates}"
    assert failed_updates[-1]["error_code"] == "VAULT_ERROR"
    assert fake_client.generation_updates[-1]["status"] == "failed"


def test_generate_image_vault_read_raises_returns_502_and_marks_failed(monkeypatch):
    brand_id = UUID("10000000-0000-0000-0000-000000000001")
    brand = {
        "id": str(brand_id),
        "name": "Test Brand",
        "owner_user_id": "user-1",
        "logo_path": None,
    }
    active_key = {
        "id": "00000000-0000-0000-0000-000000000002",
        "brand_id": str(brand_id),
        "provider": "openai",
        "vault_secret_id": "vault-secret-1",
        "is_active": True,
    }

    fake_client = _fake_service_client(brand=brand, active_key=active_key)
    fake_request = SimpleNamespace(
        headers={}, client=SimpleNamespace(host="127.0.0.1")
    )
    current_user = SimpleNamespace(id="user-1", email="u@example.com")

    def _raise_vault(_vault_id):
        raise RuntimeError("vault network blip")

    with pytest.raises(HTTPException) as exc:
        _invoke_generate_image(
            monkeypatch, fake_client, _raise_vault,
            fake_request, current_user, brand_id,
        )

    assert exc.value.status_code == 502
    assert exc.value.detail["error"]["code"] == "VAULT_ERROR"

    failed_updates = [u for u in fake_client.generation_updates if u.get("status") == "failed"]
    assert failed_updates, (
        "row left in pending/processing — read_secret raised and was not caught. "
        f"updates seen: {fake_client.generation_updates}"
    )
    assert failed_updates[-1]["error_code"] == "VAULT_ERROR"
    assert fake_client.generation_updates[-1]["status"] == "failed"


def test_rate_limit_thread_safe_under_concurrent_load():
    limit = 7
    successes = 0
    failures = 0
    lock = threading.Lock()

    def attempt():
        nonlocal successes, failures
        try:
            check_rate_limit("concurrent", "user:shared", limit=limit, window_seconds=60)
            with lock:
                successes += 1
        except HTTPException:
            with lock:
                failures += 1

    threads = [threading.Thread(target=attempt) for _ in range(50)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert successes == limit
    assert failures == 50 - limit


def test_rate_limit_window_slides():
    identity = "user:window-test"
    for _ in range(3):
        check_rate_limit("window", identity, limit=3, window_seconds=1)
    time.sleep(1.1)
    check_rate_limit("window", identity, limit=3, window_seconds=1)


@pytest.mark.parametrize("status_code", [500, 502, 503, 504])
def test_validate_openai_key_5xx_returns_none_not_rejected(monkeypatch, status_code):
    from app.services import provider_validation

    code = status_code

    class _Resp:
        pass

    _Resp.status_code = code

    class _Client:
        def __init__(self, *_args, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

        async def get(self, *_args, **_kwargs):
            return _Resp()

    monkeypatch.setattr(provider_validation.httpx, "AsyncClient", _Client)

    import asyncio

    valid, message = asyncio.run(provider_validation.validate_openai_key("sk-test"))

    assert valid is None, f"expected None for {status_code}, got {valid!r}"
    assert message is not None
    assert "rejected" not in message.lower(), (
        f"5xx must not surface the rejected-key message; got {message!r}"
    )


@pytest.mark.parametrize("status_code", [400, 401, 403])
def test_validate_openai_key_4xx_returns_false_rejected(monkeypatch, status_code):
    from app.services import provider_validation

    code = status_code

    class _Resp:
        pass

    _Resp.status_code = code

    class _Client:
        def __init__(self, *_args, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

        async def get(self, *_args, **_kwargs):
            return _Resp()

    monkeypatch.setattr(provider_validation.httpx, "AsyncClient", _Client)

    import asyncio

    valid, message = asyncio.run(provider_validation.validate_openai_key("sk-test"))

    assert valid is False
    assert message == "This key was rejected by the provider."