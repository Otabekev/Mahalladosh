"""Events (#14). RSVP reuses PostResponse — which already meant "I'll come" on an
event — so this ships with no schema change. The tests that matter are the ones
guarding the seam between an RSVP and an offer of help."""

from datetime import timedelta

from app import models


def _event(client, title="Karimovlarda to'y", days=3):
    return client.post(
        "/api/posts",
        json={
            "type": "event",
            "title": title,
            "event_date": (models.utcnow() + timedelta(days=days)).isoformat(),
        },
    )


# ---------- upcoming ----------


def test_upcoming_lists_events_soonest_first(db, world, as_user):
    author = as_user(world.founder)
    _event(author, "Uzoq to'y", days=10)
    _event(author, "Yaqin to'y", days=1)
    _event(author, "O'rta to'y", days=5)
    out = as_user(world.neighbor).get("/api/posts/upcoming").json()
    assert [p["title"] for p in out] == ["Yaqin to'y", "O'rta to'y", "Uzoq to'y"]


def test_upcoming_forgets_an_event_once_it_is_over(db, world, as_user):
    db.add(
        models.Post(
            mahalla_id=world.mahalla_id, author_id=world.founder_id, type="event",
            title="O'tgan to'y", event_date=models.utcnow() - timedelta(days=2),
        )
    )
    db.commit()
    assert as_user(world.neighbor).get("/api/posts/upcoming").json() == []


def test_an_event_tonight_is_still_upcoming(db, world, as_user):
    """A to'y at 18:00 is still the answer to "what's on" at 22:00."""
    db.add(
        models.Post(
            mahalla_id=world.mahalla_id, author_id=world.founder_id, type="event",
            title="Bugungi to'y", event_date=models.utcnow() - timedelta(hours=4),
        )
    )
    db.commit()
    out = as_user(world.neighbor).get("/api/posts/upcoming").json()
    assert [p["title"] for p in out] == ["Bugungi to'y"]


def test_upcoming_is_scoped_to_your_mahalla(db, world, as_user):
    db.add(
        models.Post(
            mahalla_id=world.other_mahalla_id, author_id=world.stranger_id, type="event",
            title="Boshqa to'y", event_date=models.utcnow() + timedelta(days=1),
        )
    )
    db.commit()
    assert as_user(world.neighbor).get("/api/posts/upcoming").json() == []


def test_a_closed_event_drops_out_of_upcoming(db, world, as_user):
    author = as_user(world.founder)
    pid = _event(author).json()["id"]
    author.post(f"/api/posts/{pid}/close")
    assert as_user(world.neighbor).get("/api/posts/upcoming").json() == []


# ---------- RSVP ----------


def test_rsvp_is_a_response_and_counts(db, world, as_user):
    pid = _event(as_user(world.founder)).json()["id"]
    out = as_user(world.neighbor).post(f"/api/posts/{pid}/respond", json={}).json()
    assert out["response_count"] == 1
    assert out["my_response"] is True
    assert [r["user"]["full_name"] for r in out["responses"]] == [world.neighbor]


def test_who_is_coming_is_visible_to_everyone(db, world, as_user):
    pid = _event(as_user(world.founder)).json()["id"]
    as_user(world.neighbor).post(f"/api/posts/{pid}/respond", json={})
    as_user(world.voucher).post(f"/api/posts/{pid}/respond", json={})
    detail = as_user(world.founder).get(f"/api/posts/{pid}").json()
    assert detail["response_count"] == 2
    assert {r["user"]["full_name"] for r in detail["responses"]} == {world.neighbor, world.voucher}


def test_plans_change_so_an_rsvp_can_be_withdrawn(db, world, as_user):
    pid = _event(as_user(world.founder)).json()["id"]
    guest = as_user(world.neighbor)
    guest.post(f"/api/posts/{pid}/respond", json={})
    out = guest.delete(f"/api/posts/{pid}/respond").json()
    assert out["response_count"] == 0
    assert out["my_response"] is False


def test_withdrawing_lets_you_rsvp_again(db, world, as_user):
    pid = _event(as_user(world.founder)).json()["id"]
    guest = as_user(world.neighbor)
    guest.post(f"/api/posts/{pid}/respond", json={})
    guest.delete(f"/api/posts/{pid}/respond")
    assert guest.post(f"/api/posts/{pid}/respond", json={}).status_code == 200


def test_an_offer_of_help_can_NOT_be_withdrawn(db, world, as_user):
    """The load-bearing guard. A PostResponse on a help request is the structured
    offer that resolve() reads to name the helper; if it could vanish, an author
    could open the resolve dialog, see a name, confirm, and be told that person
    never responded."""
    pid = as_user(world.founder).post(
        "/api/posts", json={"type": "help", "title": "Narvon kerak", "category": "tool"}
    ).json()["id"]
    helper = as_user(world.neighbor)
    helper.post(f"/api/posts/{pid}/respond", json={})
    assert helper.delete(f"/api/posts/{pid}/respond").status_code == 400
    # and the offer is still there for the author to resolve against
    assert db.query(models.PostResponse).filter_by(post_id=pid).count() == 1


def test_withdrawing_without_an_rsvp_is_a_404(db, world, as_user):
    pid = _event(as_user(world.founder)).json()["id"]
    assert as_user(world.neighbor).delete(f"/api/posts/{pid}/respond").status_code == 404


def test_you_cannot_withdraw_someone_elses_rsvp(db, world, as_user):
    pid = _event(as_user(world.founder)).json()["id"]
    as_user(world.neighbor).post(f"/api/posts/{pid}/respond", json={})
    # the voucher never responded, so there is nothing of theirs to remove
    assert as_user(world.voucher).delete(f"/api/posts/{pid}/respond").status_code == 404
    assert db.query(models.PostResponse).filter_by(post_id=pid).count() == 1


def test_an_event_needs_a_date(db, world, as_user):
    r = as_user(world.founder).post("/api/posts", json={"type": "event", "title": "Sanasiz to'y"})
    assert r.status_code == 400


# ---------- the day-before reminder ----------


def test_the_mahalla_is_reminded_the_day_before(db, world, as_user):
    from app.scheduler import _remind_tomorrow_events

    pid = _event(as_user(world.founder), days=1).json()["id"]
    _remind_tomorrow_events(db, models.utcnow())

    notes = as_user(world.neighbor).get("/api/notifications").json()["items"]
    reminders = [n for n in notes if n["type"] == "event_reminder"]
    assert len(reminders) == 1
    assert reminders[0]["link"] == f"/app/posts/{pid}"


def test_the_reminder_is_sent_only_once(db, world, as_user):
    from app.scheduler import _remind_tomorrow_events

    _event(as_user(world.founder), days=1)
    now = models.utcnow()
    _remind_tomorrow_events(db, now)
    _remind_tomorrow_events(db, now)  # the sweep runs repeatedly

    notes = as_user(world.neighbor).get("/api/notifications").json()["items"]
    assert len([n for n in notes if n["type"] == "event_reminder"]) == 1


def test_a_distant_event_is_not_reminded_yet(db, world, as_user):
    from app.scheduler import _remind_tomorrow_events

    _event(as_user(world.founder), days=9)
    _remind_tomorrow_events(db, models.utcnow())
    notes = as_user(world.neighbor).get("/api/notifications").json()["items"]
    assert [n for n in notes if n["type"] == "event_reminder"] == []
