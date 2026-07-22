"""Background sweep loop (plain asyncio — no APScheduler, no new deps).

Until now every time-based transition was lazy: votes closed only when a
request happened to touch the proposal, monthly honor fired only when someone
opened the leaderboard, and reminders/digests were impossible. This loop runs
a sweep every 5 minutes so those things happen on time.

Started from main.py's lifespan. One catch-up sweep also runs synchronously at
startup so a restarted server immediately processes overdue work; because of
that, scheduler_loop sleeps BEFORE each pass (no double sweep on boot).

Each sweep step is individually guarded — one failing step logs, rolls back,
and lets the remaining steps run. The loop itself is also guarded and never
dies (asyncio.CancelledError still propagates for clean shutdown).
"""

import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, notify
from .db import SessionLocal
from .routers.proposals import _refresh

logger = logging.getLogger("mahalladosh.scheduler")

SWEEP_INTERVAL_SECONDS = 300  # 5 minutes
VOTE_REMINDER_WINDOW = timedelta(hours=6)
EVENT_REMINDER_WINDOW = timedelta(hours=24)
DIGEST_LOOKBACK = timedelta(days=7)
DIGEST_DEDUPE_WINDOW = timedelta(days=6)


# ---------- sweep steps ----------


def _close_due_votes(db: Session, now: datetime) -> None:
    """1. Vote lifecycle: close overdue votes; also flip 'seconding' proposals
    whose threshold is already met (edge case: the deciding second arrived but
    nobody has loaded the proposal since). _refresh does the actual CAS-guarded
    tally/apply/notify work and its own commits."""
    due = (
        db.query(models.Proposal)
        .filter(
            models.Proposal.status == "voting",
            models.Proposal.voting_closes_at.isnot(None),
            models.Proposal.voting_closes_at < now,
        )
        .all()
    )
    seconding = db.query(models.Proposal).filter(models.Proposal.status == "seconding").all()
    for p in due + seconding:
        _refresh(db, p)  # checks thresholds/deadlines itself; no-op when not due


def _remind_closing_votes(db: Session, now: datetime) -> None:
    """2. One-time '⏳ closing soon' reminder for votes ending within 6 hours.
    Dedupe: any existing vote_reminder notification pointing at the proposal."""
    closing = (
        db.query(models.Proposal)
        .filter(
            models.Proposal.status == "voting",
            models.Proposal.voting_closes_at.isnot(None),
            models.Proposal.voting_closes_at > now,
            models.Proposal.voting_closes_at <= now + VOTE_REMINDER_WINDOW,
        )
        .all()
    )
    for p in closing:
        link = f"/app/proposals/{p.id}"
        already = (
            db.query(models.Notification).filter_by(type="vote_reminder", link=link).first()
        )
        if already:
            continue
        notify.notify_mahalla(
            db,
            p.mahalla_id,
            "vote_reminder",
            f"⏳ Ovoz berish tez orada tugaydi: {p.title}",
            link=link,
        )
        db.commit()


def _remind_tomorrow_events(db: Session, now: datetime) -> None:
    """3. One-time day-before reminder for open events happening within 24h.
    Dedupe: any existing event_reminder notification pointing at the post."""
    events = (
        db.query(models.Post)
        .filter(
            models.Post.type == "event",
            models.Post.status == "open",
            models.Post.event_date.isnot(None),
            models.Post.event_date >= now,
            models.Post.event_date <= now + EVENT_REMINDER_WINDOW,
        )
        .all()
    )
    for post in events:
        link = f"/app/posts/{post.id}"
        already = (
            db.query(models.Notification).filter_by(type="event_reminder", link=link).first()
        )
        if already:
            continue
        notify.notify_mahalla(db, post.mahalla_id, "event_reminder", f"🎉 Ertaga: {post.title}", link=link)
        db.commit()


def _honor_active_mahallas(db: Session, now: datetime) -> None:
    """4. Monthly 'Faol qo'shni' honor for every active mahalla — no longer
    depends on someone opening the leaderboard. ensure_month_honor is
    idempotent (MonthHonor unique constraint) and commits internally."""
    for (mahalla_id,) in db.query(models.Mahalla.id).filter(models.Mahalla.status == "active"):
        notify.ensure_month_honor(db, mahalla_id)


def _send_weekly_digests(db: Session, now: datetime) -> None:
    """5. Monday digest per active mahalla: last-7-days post count. Dedupe: a
    'digest' notification for that mahalla within the last 6 days."""
    if now.weekday() != 0:  # Monday (UTC)
        return
    for mahalla in db.query(models.Mahalla).filter(models.Mahalla.status == "active").all():
        already = (
            db.query(models.Notification)
            .filter(
                models.Notification.type == "digest",
                models.Notification.mahalla_id == mahalla.id,
                models.Notification.created_at >= now - DIGEST_DEDUPE_WINDOW,
            )
            .first()
        )
        if already:
            continue
        rows = (
            db.query(models.Post.type, func.count(models.Post.id))
            .filter(
                models.Post.mahalla_id == mahalla.id,
                models.Post.created_at >= now - DIGEST_LOOKBACK,
            )
            .group_by(models.Post.type)
            .all()
        )
        total = sum(count for _, count in rows)
        if total == 0:
            continue  # nothing happened — no dedupe row either, harmlessly re-checked
        notify.notify_mahalla(db, mahalla.id, "digest", f"📬 Bu hafta mahallangizda: {total} e'lon")
        db.commit()


# ---------- entry points ----------

_STEPS = (
    _close_due_votes,
    _remind_closing_votes,
    _remind_tomorrow_events,
    _honor_active_mahallas,
    _send_weekly_digests,
)


def run_sweep() -> None:
    """One full pass over all time-based work. Opens its own session (runs in a
    worker thread, never a request session). Safe to call any time — every step
    is idempotent via CAS updates, unique constraints, or dedupe queries."""
    now = datetime.utcnow()
    with SessionLocal() as db:
        for step in _STEPS:
            try:
                step(db, now)
            except Exception:
                logger.exception("Sweep step %s failed; continuing", step.__name__)
                db.rollback()


async def scheduler_loop() -> None:
    """Forever loop: sleep 5 min, then run a sweep in a worker thread (the DB
    work is sync SQLAlchemy). Sleeps first because lifespan already ran the
    catch-up sweep. Never dies: sweep errors are logged and the loop continues;
    only cancellation (which except Exception does not catch) stops it."""
    while True:
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
        try:
            await asyncio.to_thread(run_sweep)
        except Exception:
            logger.exception("Scheduler sweep failed; retrying next interval")
