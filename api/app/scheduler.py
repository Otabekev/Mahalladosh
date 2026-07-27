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
import os
import socket
import uuid
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import models, notify
from .db import SessionLocal
from .routers.proposals import _refresh

logger = logging.getLogger("mahalladosh.scheduler")

# Identifies this process in the lease row — useful in logs when working out which
# instance is actually doing the work. The uuid suffix separates two processes on
# one host (a local reload, two workers in one container).
HOLDER = f"{socket.gethostname()}:{os.getpid()}:{uuid.uuid4().hex[:8]}"

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
            link=link,
            event="vote_closing",
            params={"title": p.title},
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
        notify.notify_mahalla(
            db,
            post.mahalla_id,
            "event_reminder",
            link=link,
            event="event_tomorrow",
            params={"title": post.title},
        )
        db.commit()


def _honor_active_mahallas(db: Session, now: datetime) -> None:
    """4. Monthly 'Faol qo'shni' honor for every active mahalla — no longer
    depends on someone opening the leaderboard. ensure_month_honor is
    idempotent (MonthHonor unique constraint) and commits internally."""
    for (mahalla_id,) in db.query(models.Mahalla.id).filter(models.Mahalla.status == "active"):
        notify.ensure_month_honor(db, mahalla_id)


def _send_weekly_digests(db: Session, now: datetime) -> None:
    """5. Monday digest per active mahalla. Dedupe: a 'digest' notification for that
    mahalla within the last 6 days.

    Counts three different things rather than just posts, because "12 e'lon" is a
    statistic and the digest has to be a *reason to open the app*. Help resolved and
    new neighbours are the two numbers that actually say the mahalla is alive."""
    if now.weekday() != 0:  # Monday (UTC)
        return
    since = now - DIGEST_LOOKBACK
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

        posts = (
            db.query(func.count(models.Post.id))
            .filter(models.Post.mahalla_id == mahalla.id, models.Post.created_at >= since)
            .scalar()
            or 0
        )
        helped = (
            db.query(func.count(models.Post.id))
            .filter(
                models.Post.mahalla_id == mahalla.id,
                models.Post.type == "help",
                models.Post.status == "resolved",
                models.Post.resolved_at >= since,
            )
            .scalar()
            or 0
        )
        neighbours = (
            db.query(func.count(models.User.id))
            .filter(models.User.mahalla_id == mahalla.id, models.User.created_at >= since)
            .scalar()
            or 0
        )

        if posts == 0 and helped == 0 and neighbours == 0:
            continue  # a genuinely quiet week — no digest, and no dedupe row either
        notify.notify_mahalla(
            db,
            mahalla.id,
            "digest",
            event="digest",
            params={"posts": posts, "helped": helped, "neighbours": neighbours},
        )
        db.commit()


# ---------- entry points ----------

_STEPS = (
    _close_due_votes,
    _remind_closing_votes,
    _remind_tomorrow_events,
    _honor_active_mahallas,
    _send_weekly_digests,
)


def try_acquire_lease(db: Session, now: datetime, name: str = "sweep") -> bool:
    """Take the right to run the sweep, or report that someone else has it.

    A conditional UPDATE whose rowcount decides the winner. That is atomic on both
    SQLite and Postgres, unlike a Postgres advisory lock, which would be a silent
    no-op in development — exactly where a broken lock would go unnoticed.

    Held for a full interval rather than released at the end of the sweep, so two
    instances cannot sweep back-to-back either. See models.SchedulerLease.
    """
    until = now + timedelta(seconds=SWEEP_INTERVAL_SECONDS)
    won = (
        db.query(models.SchedulerLease)
        .filter(models.SchedulerLease.name == name, models.SchedulerLease.expires_at <= now)
        .update(
            {"holder": HOLDER, "acquired_at": now, "expires_at": until},
            synchronize_session=False,
        )
    )
    db.commit()
    if won:
        return True
    # Zero rows updated means either the lease is held, or it has never existed.
    # The primary key is what makes this insert safe against a simultaneous first run.
    try:
        db.add(
            models.SchedulerLease(
                name=name, holder=HOLDER, acquired_at=now, expires_at=until
            )
        )
        db.commit()
        return True
    except IntegrityError:
        db.rollback()  # another instance inserted first — it holds the lease
        return False


def run_sweep() -> None:
    """One full pass over all time-based work. Opens its own session (runs in a
    worker thread, never a request session).

    Takes a lease first, because three of the five steps are check-then-act
    (SELECT for an existing notification, then insert) and two instances would
    interleave them into duplicate reminders and duplicate weekly digests. The
    per-step guards that ARE real — the MonthHonor unique constraint and the
    proposal CAS update — stay exactly where they are: the lease protects sweep
    against sweep, while those same code paths are still reachable from ordinary
    requests, which the lease knows nothing about.
    """
    now = datetime.utcnow()
    with SessionLocal() as db:
        if not try_acquire_lease(db, now):
            logger.info("Sweep skipped: another instance holds the lease")
            return
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
