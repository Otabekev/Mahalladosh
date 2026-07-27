"""The scheduler lease — the guard that makes more than one instance safe.

Three of the five sweep steps are check-then-act (SELECT for an existing
notification, then insert). These tests exercise the lease directly with two
sessions, which is how the race is reproduced without spawning two processes.
"""

from datetime import timedelta

from app import models, scheduler
from app.db import SessionLocal


def test_the_first_sweep_takes_the_lease(db, world):
    now = models.utcnow()
    assert scheduler.try_acquire_lease(db, now) is True
    row = db.query(models.SchedulerLease).filter_by(name="sweep").one()
    assert row.holder == scheduler.HOLDER


def test_a_second_instance_is_refused_while_the_lease_is_held(db, world):
    """The race, reproduced: two sessions, same instant, only one winner."""
    now = models.utcnow()
    other = SessionLocal()
    try:
        first = scheduler.try_acquire_lease(db, now)
        second = scheduler.try_acquire_lease(other, now)
        assert [first, second].count(True) == 1
    finally:
        other.close()


def test_the_lease_is_free_again_after_it_expires(db, world):
    """A holder that dies mid-sweep must not block the job forever."""
    now = models.utcnow()
    assert scheduler.try_acquire_lease(db, now) is True
    later = now + timedelta(seconds=scheduler.SWEEP_INTERVAL_SECONDS + 1)
    assert scheduler.try_acquire_lease(db, later) is True


def test_the_lease_is_not_released_when_a_sweep_finishes(db, world):
    """Held for the whole interval on purpose, so two instances cannot sweep
    back-to-back — only the concurrent case would be caught otherwise."""
    now = models.utcnow()
    scheduler.try_acquire_lease(db, now)
    assert scheduler.try_acquire_lease(db, now + timedelta(seconds=1)) is False


def test_a_sweep_that_cannot_take_the_lease_does_no_work(db, world, as_user):
    """The whole point: the second instance must not send the reminders again."""
    author = as_user(world.founder)
    author.post(
        "/api/posts",
        json={
            "type": "event",
            "title": "Ertangi to'y",
            "event_date": (models.utcnow() + timedelta(days=1)).isoformat(),
        },
    )

    scheduler.run_sweep()  # instance A: takes the lease, sends the reminder
    scheduler.run_sweep()  # instance B: refused, so it must send nothing

    reminders = db.query(models.Notification).filter_by(type="event_reminder").count()
    assert reminders > 0
    per_member = (
        db.query(models.Notification)
        .filter_by(type="event_reminder", user_id=world.neighbor_id)
        .count()
    )
    assert per_member == 1


def test_the_digest_dedupe_race_is_what_the_lease_prevents(db, world):
    """Documents WHY the lease exists: _send_weekly_digests reads for an existing
    digest and then inserts, so two sweeps interleaved would produce two digests
    for one mahalla. With the lease, the second sweep never reaches the step."""
    monday = models.utcnow()
    while monday.weekday() != 0:
        monday += timedelta(days=1)

    db.add(
        models.Post(
            mahalla_id=world.mahalla_id, author_id=world.founder_id,
            type="announcement", title="Hafta ichida", created_at=monday - timedelta(days=1),
        )
    )
    db.commit()

    assert scheduler.try_acquire_lease(db, monday) is True
    scheduler._send_weekly_digests(db, monday)

    other = SessionLocal()
    try:
        assert scheduler.try_acquire_lease(other, monday) is False
    finally:
        other.close()

    digests = (
        db.query(models.Notification)
        .filter_by(type="digest", user_id=world.neighbor_id)
        .count()
    )
    assert digests == 1
