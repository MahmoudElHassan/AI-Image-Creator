"""Shared test helpers for Phase 02 HTTP-level tests."""

from unittest.mock import MagicMock

from app.core.auth import User, get_current_admin_user, get_current_user
from fastapi import FastAPI


def fake_user(
    *,
    id: str = "user-1",
    email: str = "owner@example.com",
    access_token: str = "test-token",
) -> User:
    """Build a real `User` model (not a SimpleNamespace) for dependency overrides."""
    return User(id=id, email=email, access_token=access_token)


def override_user(app: FastAPI, user: User) -> None:
    """Override only `get_current_user` so routes see `user`.

    The admin dependency is NOT overridden — it still calls `get_current_user`
    (which is overridden) and then runs its own `is_admin_email` check. This is
    intentional so the admin tests can exercise the real 403 path.
    """
    app.dependency_overrides[get_current_user] = lambda: user


def override_admin(app: FastAPI, user: User) -> None:
    """Override both `get_current_user` and `get_current_admin_user` to skip
    the admin email allow-list check. Useful for testing admin happy paths
    without needing to seed ADMIN_EMAILS.
    """
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_current_admin_user] = lambda: user


def clear_overrides(app: FastAPI) -> None:
    app.dependency_overrides.clear()


def mock_service_client() -> MagicMock:
    """Build a MagicMock that mimics the supabase client's chainable query API.

    Configure per-test via `.table(name).select(...).eq(...).execute.return_value = ...`.
    The chainable methods return self so they can be chained in any order.
    """
    client = MagicMock(name="supabase_service_client")

    query = MagicMock(name="query")
    query.select.return_value = query
    query.insert.return_value = query
    query.update.return_value = query
    query.delete.return_value = query
    query.eq.return_value = query
    query.neq.return_value = query
    query.in_.return_value = query
    query.order.return_value = query
    query.range.return_value = query
    query.limit.return_value = query
    query.maybe_single.return_value = query
    query.single.return_value = query
    query.not_.return_value = query
    query.or_.return_value = query
    client.table.return_value = query

    # Storage namespace (logos, generations upload/download).
    storage = MagicMock(name="storage")
    bucket = MagicMock(name="bucket")
    storage.from_.return_value = bucket
    client.storage = storage

    return client