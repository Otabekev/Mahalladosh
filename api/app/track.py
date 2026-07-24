"""Lightweight product analytics: presence touches (DAU/WAU/retention) and an
append-only event log.

touch() runs inside get_current_user on EVERY authenticated request, so it is
throttled (zero extra queries within the 10-minute window) and commits its own
tiny write so a unique-constraint race can never poison the request's
transaction. log_event() only stages a row — the caller's commit carries it."""

from datetime import datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import models

TOUCH_INTERVAL = timedelta(minutes=10)


def touch(db: Session, user: models.User) -> None:
    """Throttled presence mark: refresh user.last_seen_at and make sure
    today's UserActivity row exists. Cheap path (seen within the last
    10 minutes) does nothing at all."""
    now = datetime.utcnow()
    day = now.strftime("%Y-%m-%d")
    # Cheap path only within the window AND same UTC day — otherwise a request
    # early in a new day would skip writing that day's UserActivity row.
    if (
        user.last_seen_at is not None
        and now - user.last_seen_at < TOUCH_INTERVAL
        and user.last_seen_at.strftime("%Y-%m-%d") == day
    ):
        return

    user.last_seen_at = now
    have_row = (
        db.query(models.UserActivity.id).filter_by(user_id=user.id, day=day).first()
        is not None
    )
    if not have_row:
        db.add(models.UserActivity(user_id=user.id, day=day))
    try:
        db.commit()
    except IntegrityError:
        # A parallel request inserted the same (user, day) row between our
        # check and the commit. Roll back (this also discards the last_seen_at
        # change), re-verify the row is really there, then redo the timestamp.
        db.rollback()
        exists = (
            db.query(models.UserActivity.id).filter_by(user_id=user.id, day=day).first()
            is not None
        )
        if not exists:
            return  # some other integrity problem — leave the session clean
        user.last_seen_at = now
        db.commit()


def log_event(
    db: Session,
    user_id: int,
    event: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    mahalla_id: int | None = None,
) -> None:
    """Stage an analytics event. NO commit here — it rides along with the
    caller's own commit so the event exists iff the action it records does."""
    db.add(
        models.EventLog(
            user_id=user_id,
            event=event,
            entity_type=entity_type,
            entity_id=entity_id,
            mahalla_id=mahalla_id,
        )
    )
