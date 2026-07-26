"""Telegram DM delivery — the pilot's push channel.

Almost nobody will grant browser push (and an installed PWA barely gets it on iOS),
but everyone signed in through the Telegram Login Widget, so we already hold their
tg_id. This module turns a notification into a Telegram DM written in that particular
neighbour's language.

The governing rule, and really the only one that matters here: **a Telegram problem
must never become a Mahalladosh problem**. This is called from inside ordinary request
handlers — one neighbour posting "need a lift to the clinic" fans out to a whole
mahalla — so the sender is built to fail quietly:

  * no exception escapes, including our own bugs; a DM must not 500 the post that
    caused it, and by then the caller has usually already committed anyway
  * no Session is involved at all. The functions here take users, never a `db`, and
    never flush/commit/rollback/expire anything — the caller's transaction is theirs
  * nothing blocks the response: users are snapshotted into plain data synchronously
    and the network happens on a small background pool
  * with no bot token configured it is a silent no-op, so dev and CI never dial out
  * the backlog is capped — if Telegram is down we drop DMs rather than eat the heap

The bot token is a secret. It only ever appears concatenated into the request URL, and
every log line goes through `_scrub`, because urllib errors love to quote the URL they
failed on and that URL contains the token.
"""

import json
import logging
import threading
import time
import urllib.request
from collections.abc import Callable, Iterable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Protocol

from . import notif_catalog
from .config import settings

logger = logging.getLogger("mahalladosh.telegram")

MESSAGE_LIMIT = 4096  # Telegram's hard cap on sendMessage text
MAX_QUEUED = 500  # backlog cap; beyond this we shed load instead of growing memory
PACE_SECONDS = 0.05  # ~20 msg/s — Telegram throttles bulk senders above roughly 30

_pool: ThreadPoolExecutor | None = None
_lock = threading.Lock()  # guards _pool and _queued
_queued = 0


class DmUser(Protocol):
    """What the sender needs off a user. Structural on purpose: it keeps this module
    independent of models.py, and it is exactly what `_snapshot` reads."""

    tg_id: int | None
    lang: str
    tg_dm_enabled: bool


@dataclass(frozen=True)
class _Recipient:
    """A rendered message ready to post. Deliberately plain data — see `_snapshot`."""

    chat_id: int
    text: str


# ---------- rendering (caller's thread) ----------


def _scrub(exc: BaseException) -> str:
    """Exception text tends to carry the URL it failed on, and that URL carries the
    bot token. Nothing from this module reaches a log without passing through here."""
    message = f"{type(exc).__name__}: {exc}"
    token = settings.telegram_bot_token
    return message.replace(token, "***") if token else message


def _snapshot(
    user: DmUser,
    event: str | None,
    params: dict | None,
    text: str | None,
    link: str | None,
) -> _Recipient | None:
    """Read everything we need off `user` **synchronously, in the caller's thread**,
    and hand back plain data.

    The ORM instance must not cross into a worker: reading an expired attribute there
    would emit SQL on the caller's Session from another thread, which is exactly the
    class of damage this module exists to avoid. So we read once, here, and let go.

    Total by construction (like `notif_catalog.render`): returns None for anyone who
    should not be DM'd, and for anything that goes wrong reading them, so that one odd
    user cannot take down a mahalla-wide fan-out.
    """
    try:
        # Only an *explicit* opt-out silences us. An unset flag means the neighbour
        # never expressed a preference, and the column's declared default is on —
        # reading None as "off" would silently strand every pre-existing row.
        dm_enabled = getattr(user, "tg_dm_enabled", None)
        if dm_enabled is not None and not dm_enabled:
            return None
        chat_id = getattr(user, "tg_id", None)
        if not chat_id:
            return None  # seeded/dev account that never came through Telegram login

        body = notif_catalog.render(
            event, params, getattr(user, "lang", None), fallback=text or ""
        ).strip()
        if not body:
            return None  # never send an empty DM; silence beats a blank message
        # A DM you cannot tap is a dead end, so the link is appended *after* trimming
        # — an overlong post title must not be what pushes the link off the message.
        base = settings.public_web_url.rstrip("/")
        suffix = f"\n{base}{link}" if link and base else ""
        return _Recipient(chat_id=int(chat_id), text=body[: MESSAGE_LIMIT - len(suffix)] + suffix)
    except Exception as exc:
        logger.warning("Telegram DM skipped for one user: %s", _scrub(exc))
        return None


# ---------- transport (worker thread) ----------


def _transport(chat_id: int, text: str) -> None:
    """The single place that talks to the network — isolated so tests replace it and
    so there is exactly one line holding the token."""
    payload = json.dumps(
        {"chat_id": chat_id, "text": text, "disable_web_page_preview": True}
    ).encode()
    request = urllib.request.Request(
        f"{settings.telegram_api_base.rstrip('/')}/bot{settings.telegram_bot_token}/sendMessage",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=settings.telegram_timeout_seconds) as response:
        response.read()  # drain so the connection can be reused/closed cleanly


def _send_one(recipient: _Recipient) -> None:
    """A blocked bot, a deleted account or a Telegram outage is ordinary noise at this
    point: there is no caller left to tell, so record it and move on."""
    try:
        _transport(recipient.chat_id, recipient.text)
    except Exception as exc:
        logger.warning("Telegram DM to %s failed: %s", recipient.chat_id, _scrub(exc))


def _send_many(recipients: list[_Recipient]) -> None:
    for index, recipient in enumerate(recipients):
        if index:
            time.sleep(PACE_SECONDS)  # unpaced fan-out to 300 neighbours gets 429'd
        _send_one(recipient)


# ---------- dispatch ----------


def _ensure_pool() -> ThreadPoolExecutor:
    """Created on first use, not at import: a process that never sends a DM (CI, the
    migration container) should never spawn the threads."""
    global _pool
    if _pool is None:
        _pool = ThreadPoolExecutor(
            max_workers=max(1, settings.telegram_dm_workers), thread_name_prefix="tg-dm"
        )
    return _pool


def _submit(job: Callable[[], None]) -> None:
    """Hand `job` to the background pool so the HTTP request in front of us can return.

    Load-shedding rather than infinite queueing: if Telegram is unreachable, an evening
    of fan-outs would otherwise pile up in an unbounded queue until the process dies.
    A dropped DM is a missed notification; a dead API server is a dead mahalla.
    """
    global _queued
    with _lock:
        if _queued >= MAX_QUEUED:
            logger.warning("Telegram DM backlog at %s; dropping message", MAX_QUEUED)
            return
        pool = _ensure_pool()
        _queued += 1

    def run() -> None:
        global _queued
        try:
            job()
        except Exception as exc:
            # Only our own bugs land here (`_send_one` swallows transport errors).
            # No logger.exception: a traceback would render values we have not scrubbed.
            logger.error("Telegram DM worker crashed: %s", _scrub(exc))
        finally:
            with _lock:
                _queued -= 1

    try:
        pool.submit(run)
    except RuntimeError:  # interpreter shutting down — there is nothing to deliver into
        with _lock:
            _queued -= 1


# ---------- public API ----------


def enabled() -> bool:
    """Whether DMs are configured. No token means a deliberate no-op, which is what
    keeps dev machines and CI from ever reaching api.telegram.org."""
    return bool(settings.telegram_bot_token) and settings.telegram_dm_enabled


def send_dm(
    user: DmUser,
    event: str | None = None,
    params: dict | None = None,
    text: str | None = None,
    link: str | None = None,
) -> None:
    """DM one neighbour, in their own language. Mirrors `notify.notify`'s arguments so
    a call site can pass the same event/params it stored, and returns immediately.

    Never raises. Callers are ordinary request handlers; there is nothing useful they
    could do with a Telegram failure and plenty they could break by trying.
    """
    try:
        if not enabled():
            return
        recipient = _snapshot(user, event, params, text, link)
        if recipient is None:
            return
        _submit(lambda: _send_one(recipient))
    except Exception as exc:  # last line of defence — this function cannot throw
        logger.error("Telegram DM not queued: %s", _scrub(exc))


def send_dm_bulk(
    users: Iterable[DmUser],
    event: str | None = None,
    params: dict | None = None,
    text: str | None = None,
    link: str | None = None,
) -> None:
    """DM a whole mahalla. Everyone is rendered and filtered up front, in the caller's
    thread, then the batch goes out as one paced background job — 300 separate jobs
    would both flood the pool and trip Telegram's rate limit.

    Never raises, for the same reasons as `send_dm`.
    """
    try:
        if not enabled():
            return
        recipients = [
            recipient
            for recipient in (_snapshot(u, event, params, text, link) for u in users)
            if recipient is not None
        ]
        if not recipients:
            return
        _submit(lambda: _send_many(recipients))
    except Exception as exc:  # last line of defence — this function cannot throw
        logger.error("Telegram DM batch not queued: %s", _scrub(exc))
