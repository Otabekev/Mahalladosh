"""The Monday digest. It is the app's only scheduled outbound nudge, so the two
things that matter are that it counts the right week and that it never sends twice."""

from datetime import datetime, timedelta

import pytest

from app import models
from app.notif_catalog import render
from app.scheduler import _send_weekly_digests

# a Monday, since the digest is Monday-only (UTC)
MONDAY = datetime(2026, 7, 20, 9, 0, 0)


@pytest.fixture(autouse=True)
def _settled_world(db, world):
    """The world fixture's people are stamped with the real clock, which lands inside
    the digest's 7-day window and would count them all as new arrivals. Backdate them
    so each test controls exactly what the week contains."""
    db.query(models.User).update({"created_at": MONDAY - timedelta(days=90)})
    db.commit()
    return world


def _digests(db, mahalla_id):
    return (
        db.query(models.Notification)
        .filter_by(type="digest", mahalla_id=mahalla_id)
        .all()
    )


def _post(db, world, **kw):
    fields = {
        "mahalla_id": world.mahalla_id,
        "author_id": world.founder_id,
        "type": "announcement",
        "title": "Xabar",
        "created_at": MONDAY - timedelta(days=2),
    }
    fields.update(kw)
    post = models.Post(**fields)
    db.add(post)
    return post


def test_runs_only_on_monday(db, world):
    _post(db, world)
    db.commit()

    _send_weekly_digests(db, MONDAY + timedelta(days=1))  # Tuesday
    assert _digests(db, world.mahalla_id) == []

    _send_weekly_digests(db, MONDAY)
    assert len(_digests(db, world.mahalla_id)) > 0


def test_counts_posts_help_resolved_and_new_neighbours(db, world):
    _post(db, world)
    _post(db, world)
    _post(
        db,
        world,
        type="help",
        status="resolved",
        resolved_at=MONDAY - timedelta(days=1),
    )
    newcomer = models.User(
        full_name="Yangi Qo'shni",
        mahalla_id=world.mahalla_id,
        created_at=MONDAY - timedelta(days=3),
    )
    db.add(newcomer)
    db.commit()

    _send_weekly_digests(db, MONDAY)

    row = _digests(db, world.mahalla_id)[0]
    assert row.event == "digest"
    # 3 posts total (the resolved help is a post too), 1 helped, 1 newcomer
    assert row.params == {"posts": 3, "helped": 1, "neighbours": 1}


def test_ignores_activity_older_than_the_week(db, world):
    _post(db, world, created_at=MONDAY - timedelta(days=30))
    _post(
        db,
        world,
        type="help",
        status="resolved",
        created_at=MONDAY - timedelta(days=30),
        resolved_at=MONDAY - timedelta(days=29),
    )
    db.commit()

    _send_weekly_digests(db, MONDAY)
    assert _digests(db, world.mahalla_id) == []


def test_a_week_with_only_new_neighbours_still_sends(db, world):
    """Regression: the old version keyed the skip on post count alone, so a week
    where two families joined but nobody posted looked like a dead week."""
    db.add(
        models.User(
            full_name="Yangi Oila",
            mahalla_id=world.mahalla_id,
            created_at=MONDAY - timedelta(days=1),
        )
    )
    db.commit()

    _send_weekly_digests(db, MONDAY)

    rows = _digests(db, world.mahalla_id)
    assert len(rows) > 0
    assert rows[0].params["neighbours"] == 1
    assert rows[0].params["posts"] == 0


def test_silent_when_truly_nothing_happened(db, world):
    _send_weekly_digests(db, MONDAY)
    assert _digests(db, world.mahalla_id) == []


def test_does_not_send_twice_in_the_same_week(db, world):
    _post(db, world)
    db.commit()

    _send_weekly_digests(db, MONDAY)
    first = len(_digests(db, world.mahalla_id))
    assert first > 0

    # the sweep runs every 5 minutes — a re-run must not re-send
    _send_weekly_digests(db, MONDAY + timedelta(minutes=5))
    assert len(_digests(db, world.mahalla_id)) == first


def test_sends_again_the_following_week(db, world):
    _post(db, world)
    db.commit()
    _send_weekly_digests(db, MONDAY)
    before = len(_digests(db, world.mahalla_id))
    assert before > 0

    # Notification rows stamp themselves from the real clock while the sweep takes
    # `now` as an argument, so age the existing digest to match the simulated week.
    db.query(models.Notification).filter_by(type="digest").update({"created_at": MONDAY})
    db.commit()

    next_monday = MONDAY + timedelta(days=7)
    _post(db, world, created_at=next_monday - timedelta(days=1))
    db.commit()
    _send_weekly_digests(db, next_monday)

    assert len(_digests(db, world.mahalla_id)) > before


def test_does_not_leak_across_mahallas(db, world):
    _post(db, world)
    db.commit()
    _send_weekly_digests(db, MONDAY)

    assert _digests(db, world.other_mahalla_id) == []
    for row in _digests(db, world.mahalla_id):
        assert db.get(models.User, row.user_id).mahalla_id == world.mahalla_id


def test_renders_in_each_language(db, world):
    _post(db, world)
    db.commit()
    _send_weekly_digests(db, MONDAY)

    row = _digests(db, world.mahalla_id)[0]
    assert "e'lon" in render(row.event, row.params, "uz")
    assert "эълон" in render(row.event, row.params, "uzc")
    assert "объявл" in render(row.event, row.params, "ru")
    assert "posts" in render(row.event, row.params, "en")
