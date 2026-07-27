"""When a post stops belonging on the feed.

This is a query-time policy, deliberately: no scheduler step, no `archived` column,
nothing written to the database. Ageing out is a filter, which means it is instantly
reversible (change a number here and everything comes back), it cannot half-run, and
it can never mark the wrong row. A background job that flipped a flag could do all
three.

Nothing is deleted or hidden from its own URL — an aged-out post is still reachable
by link and still found by search. It has simply stopped competing for attention on
the front page, which is the actual problem: a mahalla where the top of the feed is
a ladder someone borrowed in May is a mahalla people stop opening.

The windows are per type because the types decay at genuinely different rates. A
help request is stale in a month; a charity collection can run all season; a to'y is
irrelevant the morning after it happens, whatever its post date.
"""

from datetime import datetime, timedelta

from sqlalchemy import and_, case, or_

from . import models

# How long an OPEN post stays on the feed, by type.
FEED_WINDOW = {
    "help": timedelta(days=30),
    "announcement": timedelta(days=21),
    "charity": timedelta(days=60),
    "newcomer": timedelta(days=30),
    "share": timedelta(days=60),
}
DEFAULT_WINDOW = timedelta(days=30)

# Once a post is resolved or closed it has served its purpose, but it should linger
# briefly so the resolution itself is visible — the thanks, the named helper.
SETTLED_GRACE = timedelta(days=3)

# An event is about its date, not its post date. One day of grace so a to'y at 18:00
# is still on the feed that night; the day after, it goes.
EVENT_GRACE = timedelta(days=1)


def on_feed(now: datetime | None = None):
    """A SQLAlchemy criterion: this post still belongs on the feed."""
    now = now or models.utcnow()
    post = models.Post

    is_open = post.status == "open"
    dated_event = and_(post.type == "event", post.event_date.isnot(None))

    # `resolved_at` is stamped when a help request is resolved and when any post is
    # closed; coalesce covers rows written before it was stamped on close.
    settled_at = case((post.resolved_at.isnot(None), post.resolved_at), else_=post.created_at)

    by_type = case(
        *[(post.type == t, post.created_at >= now - w) for t, w in FEED_WINDOW.items()],
        else_=post.created_at >= now - DEFAULT_WINDOW,
    )

    return or_(
        # settled: a short grace period after it was resolved or closed
        and_(~is_open, settled_at >= now - SETTLED_GRACE),
        # an open event lives by its date
        and_(is_open, dated_event, post.event_date >= now - EVENT_GRACE),
        # everything else open ages by type
        and_(is_open, ~dated_event, by_type),
    )
