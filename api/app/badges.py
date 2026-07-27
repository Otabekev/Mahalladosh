"""Earned badges, DERIVED rather than awarded.

Every badge already has an immutable fact row in the database — a founding-member
entry in the reputation ledger, a MonthHonor with your name on it, a help request
that names you as the helper. So a `badges` table would buy an award timestamp and
a notification, and cost a schema change (which in this repo means dropping and
reseeding the database, there being no Alembic), a backfill for everyone who earned
one before the table existed, a scheduler hook to keep it current, and revocation
logic for when the underlying fact goes away. Deriving on read cannot drift, cannot
be stale, and cannot award the wrong person.

Three of the four already notify at the moment they are earned (mahalla_opened,
honor_self, thanks_points), so the notification a table would add is one nobody is
missing.

Derivation is BATCHED on purpose: `earned_for` answers for any number of people in
three aggregate queries, not four per person. That matters because the obvious next
step is putting a badge beside every author in the feed, and a per-user version
would make that fifteen round trips a page.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models

# Display and tie-break order — the rarest first, so the single chip a compact
# surface can show is the one worth showing.
PRIORITY = ["faol", "asoschi", "mehmondost", "tarixchi"]

# Helping this many neighbours is what earns Mehmondo'st. Low enough to be
# reachable in a pilot's first months, high enough that one favour is not a title.
MEHMONDOST_THRESHOLD = 3


def earned_for(db: Session, users: list[models.User]) -> dict[int, list[tuple[str, int]]]:
    """{user_id: [(badge_code, count), ...]} in PRIORITY order, earned badges only.

    `count` is how many times it was earned where that is meaningful (months as
    Faol qo'shni, neighbours helped) and 1 otherwise.
    """
    ids = [u.id for u in users if u is not None]
    if not ids:
        return {}

    # 1. the reputation ledger carries the one-off facts
    ledger: dict[str, set[int]] = {"founding_member": set(), "history_seeded": set()}
    rows = (
        db.query(models.ReputationEntry.user_id, models.ReputationEntry.reason)
        .filter(
            models.ReputationEntry.user_id.in_(ids),
            models.ReputationEntry.reason.in_(list(ledger)),
        )
        .distinct()
        .all()
    )
    for user_id, reason in rows:
        ledger[reason].add(user_id)

    # 2. months won as Faol qo'shni
    honors = dict(
        db.query(models.MonthHonor.winner_user_id, func.count(models.MonthHonor.id))
        .filter(models.MonthHonor.winner_user_id.in_(ids))
        .group_by(models.MonthHonor.winner_user_id)
        .all()
    )

    # 3. help requests that named this person as the helper
    helped = dict(
        db.query(models.Post.resolved_helper_id, func.count(models.Post.id))
        .filter(models.Post.resolved_helper_id.in_(ids))
        .group_by(models.Post.resolved_helper_id)
        .all()
    )

    out: dict[int, list[tuple[str, int]]] = {}
    for user_id in ids:
        earned: dict[str, int] = {}
        if honors.get(user_id):
            earned["faol"] = honors[user_id]
        if user_id in ledger["founding_member"]:
            earned["asoschi"] = 1
        if helped.get(user_id, 0) >= MEHMONDOST_THRESHOLD:
            earned["mehmondost"] = helped[user_id]
        if user_id in ledger["history_seeded"]:
            earned["tarixchi"] = 1
        out[user_id] = [(code, earned[code]) for code in PRIORITY if code in earned]
    return out


def for_user(db: Session, user: models.User) -> list[tuple[str, int]]:
    return earned_for(db, [user]).get(user.id, [])
