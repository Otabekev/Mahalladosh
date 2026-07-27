"""Services commercial surface (#42) — views and contact taps.

Built on the existing append-only EventLog rather than counter columns: the log was
already there for analytics, it keeps who/when for later questions, and it cannot
drift out of sync with itself. The tests that matter are the ones about who is
allowed to SEE the numbers.
"""

from app import models


def _offering(client, title="Tikuvchilik"):
    return client.post(
        "/api/services", json={"title": title, "category": "skill", "contact": "901234567"}
    ).json()["id"]


def _stats(client, sid):
    rows = client.get("/api/services/mine/stats").json()
    return next(r for r in rows if r["service_id"] == sid)


def test_a_view_is_counted(db, world, as_user):
    sid = _offering(as_user(world.founder))
    as_user(world.neighbor).post("/api/services/views", json={"ids": [sid]})
    assert _stats(as_user(world.founder), sid)["views"] == 1


def test_the_same_person_looking_again_today_is_still_one_view(db, world, as_user):
    """Otherwise a neighbour who opens Xizmatlar six times is six people, and the
    number stops meaning anything."""
    sid = _offering(as_user(world.founder))
    viewer = as_user(world.neighbor)
    for _ in range(4):
        viewer.post("/api/services/views", json={"ids": [sid]})
    assert _stats(as_user(world.founder), sid)["views"] == 1


def test_different_people_are_different_views(db, world, as_user):
    sid = _offering(as_user(world.founder))
    as_user(world.neighbor).post("/api/services/views", json={"ids": [sid]})
    as_user(world.voucher).post("/api/services/views", json={"ids": [sid]})
    assert _stats(as_user(world.founder), sid)["views"] == 2


def test_every_contact_tap_counts(db, world, as_user):
    """Unlike a view, deciding to ring someone twice is two real intentions."""
    sid = _offering(as_user(world.founder))
    caller = as_user(world.neighbor)
    caller.post(f"/api/services/{sid}/contact")
    caller.post(f"/api/services/{sid}/contact")
    assert _stats(as_user(world.founder), sid)["contacts"] == 2


def test_counts_are_not_in_the_public_listing(db, world, as_user):
    """LOAD-BEARING. ServiceOut is the single serializer for the directory AND for
    search (routers/search.py imports service_out), so a count added there would
    appear on two public surfaces at once — telling the whole mahalla that nobody
    wanted a neighbour's offering."""
    sid = _offering(as_user(world.founder))
    as_user(world.neighbor).post("/api/services/views", json={"ids": [sid]})

    listing = as_user(world.neighbor).get("/api/services").json()[0]
    assert "views" not in listing and "contacts" not in listing

    found = as_user(world.neighbor).get("/api/search?q=tikuv").json()["services"][0]
    assert "views" not in found and "contacts" not in found


def test_only_your_own_offerings_appear_in_your_stats(db, world, as_user):
    mine = _offering(as_user(world.founder), "Tikuvchilik")
    theirs = _offering(as_user(world.voucher), "Santexnika")
    ids = [r["service_id"] for r in as_user(world.founder).get("/api/services/mine/stats").json()]
    assert mine in ids and theirs not in ids


def test_a_neighbour_cannot_read_your_numbers(db, world, as_user):
    """There is no route that returns another household's counts at all — the
    absence is the guarantee, so this pins it."""
    sid = _offering(as_user(world.founder))
    as_user(world.neighbor).post("/api/services/views", json={"ids": [sid]})
    rows = as_user(world.neighbor).get("/api/services/mine/stats").json()
    assert all(r["service_id"] != sid for r in rows)


def test_who_viewed_is_never_named(db, world, as_user):
    sid = _offering(as_user(world.founder))
    as_user(world.neighbor).post("/api/services/views", json={"ids": [sid]})
    row = _stats(as_user(world.founder), sid)
    assert set(row) == {"service_id", "views", "contacts"}


def test_views_of_another_mahallas_offering_are_ignored(db, world, as_user):
    """Fire-and-forget telemetry must never become a probe for what exists
    elsewhere — hence a silent 204 rather than a 404 that would confirm the id."""
    sid = _offering(as_user(world.founder))
    r = as_user(world.stranger).post("/api/services/views", json={"ids": [sid]})
    assert r.status_code == 204
    assert _stats(as_user(world.founder), sid)["views"] == 0


def test_contacting_another_mahallas_offering_is_a_404(db, world, as_user):
    sid = _offering(as_user(world.founder))
    assert as_user(world.stranger).post(f"/api/services/{sid}/contact").status_code == 404


def test_a_view_batch_is_capped(db, world, as_user):
    """A phone never shows 50 cards; the cap keeps one paint from becoming a
    hundred writes."""
    r = as_user(world.neighbor).post(
        "/api/services/views", json={"ids": list(range(1, 40))}
    )
    assert r.status_code == 422


def test_an_empty_batch_is_harmless(db, world, as_user):
    r = as_user(world.neighbor).post("/api/services/views", json={"ids": []})
    assert r.status_code == 204
    assert db.query(models.EventLog).filter_by(event="service_view").count() == 0


def test_stats_are_empty_without_a_household(db, world, as_user):
    assert as_user(world.neighbor).get("/api/services/mine/stats").json() == []
