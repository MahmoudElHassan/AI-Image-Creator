import threading
import time
from collections import defaultdict, deque
from uuid import uuid4

from fastapi import HTTPException

_RATE_LIMITED_MESSAGE = "Too many requests. Please try again shortly."


class _SlidingWindowStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    def hit(self, key: str, limit: int, window_seconds: float, now: float) -> bool:
        """Record a hit. Return True if the request is allowed, False if rate limited."""
        cutoff = now - window_seconds
        with self._lock:
            timestamps = self._buckets[key]
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()
            if len(timestamps) >= limit:
                return False
            timestamps.append(now)
            return True


_store = _SlidingWindowStore()


def _client_ip(request) -> str:
    forwarded = request.headers.get("x-forwarded-for") if request is not None else None
    if forwarded:
        first = forwarded.split(",", 1)[0].strip()
        if first:
            return first
    if request is not None and request.client is not None and request.client.host:
        return request.client.host
    return "unknown"


def _identity_or_ip(request, user_id: str | None) -> str:
    return f"user:{user_id}" if user_id else f"ip:{_client_ip(request)}"


def check_rate_limit(
    bucket: str,
    identity: str,
    limit: int,
    window_seconds: int,
) -> None:
    """Raise 429 RATE_LIMITED if the (bucket, identity) pair has exceeded the budget."""
    key = f"{bucket}:{identity}"
    allowed = _store.hit(key, limit, float(window_seconds), time.monotonic())
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": {
                    "code": "RATE_LIMITED",
                    "message": _RATE_LIMITED_MESSAGE,
                    "request_id": str(uuid4()),
                }
            },
        )


def enforce_rate_limit(
    *,
    request,
    current_user,
    bucket: str,
    user_limit: int,
    ip_limit: int,
    window_seconds: int,
) -> None:
    """Apply both per-user and per-IP limits in a single call."""
    user_id = getattr(current_user, "id", None) if current_user is not None else None
    user_identity = _identity_or_ip(request, user_id)
    check_rate_limit(bucket, user_identity, user_limit, window_seconds)
    check_rate_limit(bucket, f"ip:{_client_ip(request)}", ip_limit, window_seconds)


def reset_rate_limit_store() -> None:
    """Test helper: clear all in-memory rate-limit state."""
    global _store
    _store = _SlidingWindowStore()