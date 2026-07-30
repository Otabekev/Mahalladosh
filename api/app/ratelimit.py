"""A small per-account rate limiter.

WHAT THIS IS NOT. It is in-process, so each instance keeps its own counters and N
instances allow N times the limit. That is a deliberate trade, not an oversight:
the alternative is a Redis this project does not have, or a database round-trip on
every guarded request, and the thing being defended against here is one neighbour
hammering a button — not a distributed attacker. It degrades gracefully (an extra
instance loosens the limit, it never breaks) and the docstring exists so nobody
later mistakes it for a security control.

WHERE IT MATTERS. The expensive actions are the ones that fan out: a post notifies
the entire mahalla in-app and by Telegram DM, so a loop posting ten times a second
would send thousands of messages. That is the case worth stopping, and it is worth
stopping even from an honest account with a stuck finger.

Limits are per (action, account) over a sliding window, generous enough that a real
person never meets them — someone who trips one of these is doing something they
did not mean to do.
"""

import threading
import time
from collections import deque

from fastapi import HTTPException

# action -> (max hits, window in seconds)
LIMITS: dict[str, tuple[int, int]] = {
    # fans out to every member, in-app and over Telegram
    "post": (12, 3600),
    # each one re-encodes an image through Pillow
    "upload": (40, 3600),
    # scans the mahalla's posts in Python
    "search": (60, 300),
    # writes rows nobody asked for if abused
    "comment": (60, 3600),
}

_hits: dict[tuple[str, int], deque[float]] = {}
_lock = threading.Lock()
_last_sweep = 0.0
_SWEEP_EVERY = 600.0


def _sweep(now: float) -> None:
    """Drop keys nobody has touched for a while, so a long-running process does
    not accumulate a deque per account that logged in once."""
    global _last_sweep
    if now - _last_sweep < _SWEEP_EVERY:
        return
    _last_sweep = now
    widest = max(w for _, w in LIMITS.values())
    for key, stamps in list(_hits.items()):
        if not stamps or now - stamps[-1] > widest:
            _hits.pop(key, None)


def check(action: str, user_id: int) -> None:
    """Record one hit, or raise 429 if this account is over the limit.

    Unknown actions are allowed through rather than blocked — a typo in a route
    should not silently deny service to real people.
    """
    limit = LIMITS.get(action)
    if limit is None:
        return
    max_hits, window = limit
    now = time.monotonic()

    with _lock:
        _sweep(now)
        stamps = _hits.setdefault((action, user_id), deque())
        while stamps and now - stamps[0] > window:
            stamps.popleft()
        if len(stamps) >= max_hits:
            retry = int(window - (now - stamps[0])) + 1
            raise HTTPException(
                status_code=429,
                detail="Biroz kuting — juda ko'p urinish",
                headers={"Retry-After": str(retry)},
            )
        stamps.append(now)


def reset() -> None:
    """Clear all counters. For tests, so one test's hits cannot fail another."""
    with _lock:
        _hits.clear()
