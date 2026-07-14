"""Notification fan-out (plan §9-H: hyperlocal relevance is the retention
driver). Synchronous inserts — fine at pilot scale. Callers commit unless
noted otherwise."""

from datetime import datetime, timedelta
from typing import Iterable

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import models

TEXT_LIMIT = 300  # Notification.text column size — Postgres enforces it


def _fit(text: str) -> str:
    return text if len(text) <= TEXT_LIMIT else text[: TEXT_LIMIT - 1] + "…"


def notify(
    db: Session,
    user_ids: Iterable[int],
    type_: str,
    text: str,
    link: str | None = None,
    mahalla_id: int | None = None,
) -> None:
    for uid in set(user_ids):
        db.add(
            models.Notification(
                user_id=uid, mahalla_id=mahalla_id, type=type_, text=_fit(text), link=link
            )
        )


def notify_mahalla(
    db: Session,
    mahalla_id: int,
    type_: str,
    text: str,
    link: str | None = None,
    exclude: Iterable[int] = (),
) -> None:
    """Notify every member of a mahalla except `exclude` and currently
    banned members (ban isolation applies to fan-out too)."""
    now = datetime.utcnow()
    ids = [
        uid
        for (uid,) in db.query(models.User.id).filter(
            models.User.mahalla_id == mahalla_id,
            (models.User.banned_until.is_(None)) | (models.User.banned_until <= now),
        )
    ]
    skip = set(exclude)
    notify(db, [i for i in ids if i not in skip], type_, text, link, mahalla_id)


def ensure_month_honor(db: Session, mahalla_id: int) -> None:
    """Once per month, publicly honor last month's most active neighbor
    (Faol qo'shni). Honor over points (plan §6.2): a notification to the whole
    mahalla, no extra points. Race-proof: the MonthHonor unique constraint is
    claimed first; whoever loses the insert race skips the fan-out."""
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month = (month_start - timedelta(days=1)).strftime("%Y-%m")

    if (
        db.query(models.MonthHonor)
        .filter_by(mahalla_id=mahalla_id, month=last_month)
        .first()
    ):
        return

    # top scorers of last month; skip winners who have since left or been banned
    rows = (
        db.query(
            models.ReputationEntry.user_id,
            func.sum(models.ReputationEntry.amount).label("points"),
        )
        .filter_by(mahalla_id=mahalla_id, month=last_month)
        .group_by(models.ReputationEntry.user_id)
        .order_by(func.sum(models.ReputationEntry.amount).desc())
        .limit(5)
        .all()
    )
    winner = None
    points = 0
    for row in rows:
        candidate = db.get(models.User, row.user_id)
        if (
            candidate is not None
            and candidate.mahalla_id == mahalla_id
            and (candidate.banned_until is None or candidate.banned_until <= now)
        ):
            winner, points = candidate, row.points
            break
    if winner is None:
        return

    # claim the month before fanning out — the unique constraint settles races
    db.add(models.MonthHonor(mahalla_id=mahalla_id, month=last_month, winner_user_id=winner.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # a concurrent request already honored this month
        return

    notify_mahalla(
        db,
        mahalla_id,
        "honor",
        f"🏆 O'tgan oyning faol qo'shnisi: {winner.full_name} (⭐ {points})",
        link="/app/mahalla",
        exclude=[winner.id],
    )
    notify(
        db,
        [winner.id],
        "honor",
        "🏆 Tabriklaymiz! Siz o'tgan oyning faol qo'shnisi deb topildingiz",
        link="/app/mahalla",
        mahalla_id=mahalla_id,
    )
    db.commit()
