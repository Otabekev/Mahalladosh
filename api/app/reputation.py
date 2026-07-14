"""Points ledger helper. Points are the tracker; honor (obro') is the reward —
keep amounts gentle (plan §6.2)."""

from datetime import datetime

from sqlalchemy.orm import Session

from . import models

REWARDS = {
    "help_fulfilled": 10,
    "history_seeded": 15,
    "newcomer_welcomed": 5,
    "founding_member": 20,
}


def current_month_key() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def award(
    db: Session,
    user: models.User,
    reason: str,
    source_type: str | None = None,
    source_id: int | None = None,
    mahalla_id: int | None = None,
) -> models.ReputationEntry:
    """Create a ledger entry and update the user's counters. Does NOT commit."""
    amount = REWARDS[reason]
    month = current_month_key()
    entry = models.ReputationEntry(
        user_id=user.id,
        mahalla_id=mahalla_id or user.mahalla_id,
        amount=amount,
        reason=reason,
        source_type=source_type,
        source_id=source_id,
        month=month,
    )
    db.add(entry)
    if user.rep_month_key != month:
        user.rep_month_key = month
        user.rep_month = 0
    user.rep_month += amount
    user.rep_alltime += amount
    return entry


def already_awarded(
    db: Session, user_id: int, reason: str, source_type: str, source_id: int
) -> bool:
    return (
        db.query(models.ReputationEntry)
        .filter_by(user_id=user_id, reason=reason, source_type=source_type, source_id=source_id)
        .first()
        is not None
    )
