"""Search inside your own mahalla — posts and service offerings.

Two scoping rules that are not negotiable:

Everything is filtered to the caller's mahalla before anything is matched, so search
can never become a way to read, or even count, another mahalla's content. Cross-
mahalla `share` posts are excluded on purpose too: they are browse content in the
discover feed, and if search ever ranked them, "your mahalla is private" would
acquire an "except in search" footnote.

Household members are deliberately NOT searchable. `presenters.household_out` gates
family members and history behind the verified-neighbour rule (plan §6.4); making
names searchable would let an unverified account confirm that a particular person
lives at a particular household — the whole privacy gate, bypassed through a feature
nobody would think to audit. Anyone widening this later must stop here.

Search deliberately ignores the feed lifecycle: finding the thing that scrolled away
is the entire point.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import models, ratelimit, schemas, search_text
from ..deps import get_db, require_member
from .posts import post_out
from .services import service_out

router = APIRouter(prefix="/search", tags=["search"])

SECTION_LIMIT = 10  # per section — a phone screen, not an archive
SCAN_LIMIT = 600  # newest N posts of the mahalla are searched


@router.get("", response_model=schemas.SearchOut)
def search(
    q: str = Query(default="", max_length=100),
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    ratelimit.check("search", user.id)  # folding scans the mahalla's posts in Python
    needle = search_text.fold(q)
    if len(needle) < 2:
        # one character matches most of the mahalla; not worth the scan
        return schemas.SearchOut(query=q, posts=[], services=[])

    posts = [
        p
        for p in (
            db.query(models.Post)
            .filter(models.Post.mahalla_id == user.mahalla_id)
            .order_by(models.Post.created_at.desc())
            .limit(SCAN_LIMIT)
            .all()
        )
        if search_text.matches(needle, p.title, p.body)
    ][:SECTION_LIMIT]

    services = [
        s
        for s in (
            db.query(models.ServiceOffering)
            .filter(
                models.ServiceOffering.mahalla_id == user.mahalla_id,
                models.ServiceOffering.active.is_(True),
            )
            .all()
        )
        if search_text.matches(needle, s.title, s.description)
    ][:SECTION_LIMIT]

    return schemas.SearchOut(
        query=q,
        posts=[post_out(db, p, user) for p in posts],
        services=[service_out(db, s) for s in services],
    )
