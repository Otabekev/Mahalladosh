"""Notification fan-out (plan §9-H: hyperlocal relevance is the retention
driver). Synchronous inserts — fine at pilot scale. Callers commit unless
noted otherwise."""

from collections.abc import Iterable
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import models, notif_catalog, telegram

TEXT_LIMIT = 300  # Notification.text column size — Postgres enforces it


def _fit(text: str) -> str:
    return text if len(text) <= TEXT_LIMIT else text[: TEXT_LIMIT - 1] + "…"


def _dm(
    db: Session,
    user_ids: set[int],
    event: str | None,
    params: dict | None,
    text: str | None,
    link: str | None,
) -> None:
    """Mirror an in-app notification out as a Telegram DM. A no-op unless a bot token
    is configured, so dev and CI never dial out; telegram.send_dm_bulk does the
    per-user filtering (opt-out, no tg_id) and can never raise into us."""
    if not user_ids or not telegram.enabled():
        return
    users = db.query(models.User).filter(models.User.id.in_(user_ids)).all()
    telegram.send_dm_bulk(users, event=event, params=params, text=text, link=link)


def notify(
    db: Session,
    user_ids: Iterable[int],
    type_: str,
    text: str | None = None,
    link: str | None = None,
    mahalla_id: int | None = None,
    event: str | None = None,
    params: dict | None = None,
) -> None:
    """Queue a notification for each user.

    Prefer `event=` + `params=`: the row is then rendered into whatever language each
    reader has chosen, at the moment they read it. `text` is the pre-rendered Uzbek
    fallback — it is still stored so that a row survives an event key being retired,
    and it is what the Telegram sender falls back to if rendering ever comes up empty.
    """
    stored = text if text is not None else notif_catalog.render(event, params, "uz")
    ids = set(user_ids)
    for uid in ids:
        db.add(
            models.Notification(
                user_id=uid,
                mahalla_id=mahalla_id,
                type=type_,
                event=event,
                params=params,
                text=_fit(stored),
                link=link,
            )
        )
    _dm(db, ids, event, params, stored, link)


def notify_mahalla(
    db: Session,
    mahalla_id: int,
    type_: str,
    text: str | None = None,
    link: str | None = None,
    exclude: Iterable[int] = (),
    event: str | None = None,
    params: dict | None = None,
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
    notify(
        db,
        [i for i in ids if i not in skip],
        type_,
        text,
        link,
        mahalla_id,
        event=event,
        params=params,
    )


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
        link="/app/mahalla",
        exclude=[winner.id],
        event="honor_public",
        params={"name": winner.full_name, "points": points},
    )
    notify(
        db,
        [winner.id],
        "honor",
        link="/app/mahalla",
        mahalla_id=mahalla_id,
        event="honor_self",
    )
    db.commit()
