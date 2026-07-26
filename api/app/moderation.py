"""Shared ban mechanics (plan §10): temporary-first, permanent on repeat.

Used by the admin console and the raisi panel, which differ only in who may invoke
them and on whom — the consequence of a ban must be identical from either door, or
the two drift and one of them quietly becomes the lenient path. The community
vote-ban in proposals.py keeps its own inline variant: it runs inside the
vote-close flow with proposal-specific scoping and reasons, and rewiring a tested
governance path to save a few lines is a bad trade.
"""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from . import models

# A repeat offender (already has a ban on record) is banned forever.
PERMANENT_UNTIL = datetime(9999, 12, 31)
DEFAULT_BAN_DAYS = 30


def apply_ban(
    db: Session,
    target: models.User,
    *,
    reason: str | None,
    source: str,  # admin|raisi (votes go through proposals.py)
    created_by: int,
    days: int | None = None,
) -> models.BanRecord:
    """Ban `target` and take down what they left standing. Does NOT commit and does
    NOT notify — the caller owns its transaction and its own fan-out wording.

    Escalation: a first offense is temporary (`days`, default 30); anyone with a
    prior BanRecord is banned permanently. The prior-ban check runs before this
    ban's record is added, so a ban never counts itself as its own repeat.
    """
    had_prior_ban = (
        db.query(models.BanRecord).filter_by(user_id=target.id).first() is not None
    )
    if had_prior_ban:
        target.banned_until = PERMANENT_UNTIL
        record_until = None
        permanent = True
    else:
        effective_days = days if days and days > 0 else DEFAULT_BAN_DAYS
        target.banned_until = datetime.utcnow() + timedelta(days=effective_days)
        record_until = target.banned_until
        permanent = False

    record = models.BanRecord(
        user_id=target.id,
        mahalla_id=target.mahalla_id,
        reason=reason,
        source=source,
        until=record_until,
        permanent=permanent,
        created_by=created_by,
    )
    db.add(record)

    # take down anything they left standing — a ban that leaves the person's posts
    # and listings live has no teeth
    db.query(models.Post).filter_by(author_id=target.id, status="open").update(
        {"status": "closed"}, synchronize_session=False
    )
    db.query(models.ServiceOffering).filter_by(created_by=target.id, active=True).update(
        {"active": False}, synchronize_session=False
    )
    return record
