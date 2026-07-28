"""Admin metrics (#41) — the operator's "is this alive?" view.

Aggregates only. The tests that matter are the scoping ones: this is the one screen
that reads across every mahalla, so it must expose counts and never people.
"""

from datetime import datetime, timedelta

from app import models


def _admin(db, world, as_user):
    db.get(models.User, world.founder_id).is_admin = True
    db.commit()
    return as_user(world.founder)


def _active(db, user_id, days_ago=0):
    day = (datetime.utcnow().date() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
    db.add(models.UserActivity(user_id=user_id, day=day))
    db.commit()


def test_metrics_require_admin(db, world, as_user):
    assert as_user(world.neighbor).get("/api/admin/metrics").status_code == 403


def test_metrics_require_a_session(db, world, client):
    assert client.get("/api/admin/metrics").status_code == 401


def test_dau_counts_todays_active_members(db, world, as_user):
    """Deltas, not absolutes: track.touch runs inside get_current_user, so the
    admin's own request to read this endpoint makes the admin active today."""
    admin = _admin(db, world, as_user)
    before = admin.get("/api/admin/metrics").json()["dau"]
    _active(db, world.neighbor_id)
    _active(db, world.voucher_id)
    after = admin.get("/api/admin/metrics").json()
    assert after["dau"] == before + 2
    assert after["wau"] >= after["dau"]


def test_a_signed_in_person_with_no_mahalla_is_not_an_active_neighbour(db, world, as_user):
    """Counting them would flatter the headline number on the one screen that exists
    to tell the truth."""
    admin = _admin(db, world, as_user)
    before = admin.get("/api/admin/metrics").json()["dau"]
    drifter = models.User(full_name="Hech Kim")  # signed up, never joined a mahalla
    db.add(drifter)
    db.commit()
    _active(db, drifter.id)
    assert admin.get("/api/admin/metrics").json()["dau"] == before


def test_the_daily_series_includes_empty_days(db, world, as_user):
    """A day with nobody on it must be a zero, not a gap — a chart that silently
    drops quiet days is a chart that lies about them."""
    admin = _admin(db, world, as_user)
    _active(db, world.neighbor_id, days_ago=5)
    out = admin.get("/api/admin/metrics?days=10").json()
    assert len(out["daily"]) == 10  # every day present, including the silent ones
    assert out["daily"][0]["day"] < out["daily"][-1]["day"]  # oldest first
    five_ago = (datetime.utcnow().date() - timedelta(days=5)).strftime("%Y-%m-%d")
    assert next(p for p in out["daily"] if p["day"] == five_ago)["active"] == 1
    assert any(p["active"] == 0 for p in out["daily"])  # quiet days are zeros, not gaps


def test_the_window_is_bounded(db, world, as_user):
    admin = _admin(db, world, as_user)
    assert len(admin.get("/api/admin/metrics?days=9999").json()["daily"]) == 90
    assert len(admin.get("/api/admin/metrics?days=0").json()["daily"]) == 1


def test_the_activation_funnel_only_narrows(db, world, as_user):
    """Each step is a subset of the one before; if it ever widens, the query is
    wrong rather than the community being strange."""
    admin = _admin(db, world, as_user)
    as_user(world.neighbor).post("/api/posts", json={"type": "announcement", "title": "E'lon"})
    f = admin.get("/api/admin/metrics").json()
    assert f["funnel_registered"] >= f["funnel_in_mahalla"] >= f["funnel_in_household"]
    assert f["funnel_contributed"] >= 1


def test_per_mahalla_rows_do_not_mix_two_mahallas(db, world, as_user):
    """The load-bearing scoping assertion: this endpoint reads across every mahalla,
    so a leak here would be a leak everywhere."""
    admin = _admin(db, world, as_user)
    as_user(world.neighbor).post("/api/posts", json={"type": "announcement", "title": "Bizniki"})
    db.add(
        models.Post(
            mahalla_id=world.other_mahalla_id, author_id=world.stranger_id,
            type="announcement", title="Ularniki",
        )
    )
    db.commit()

    rows = {r["mahalla_id"]: r for r in admin.get("/api/admin/metrics").json()["mahallas"]}
    assert rows[world.mahalla_id]["posts_7d"] == 1
    assert rows[world.other_mahalla_id]["posts_7d"] == 1


def test_no_row_ever_names_a_person(db, world, as_user):
    """Aggregates only — an operator sees how many, never who."""
    admin = _admin(db, world, as_user)
    _active(db, world.neighbor_id)
    row = admin.get("/api/admin/metrics").json()["mahallas"][0]
    assert set(row) == {"mahalla_id", "name", "members", "active_7d", "posts_7d", "help_open"}


def test_open_help_is_counted_per_mahalla_and_overall(db, world, as_user):
    admin = _admin(db, world, as_user)
    as_user(world.neighbor).post(
        "/api/posts", json={"type": "help", "title": "Narvon kerak", "category": "tool"}
    )
    out = admin.get("/api/admin/metrics").json()
    assert out["help_open"] == 1
    mine = next(r for r in out["mahallas"] if r["mahalla_id"] == world.mahalla_id)
    assert mine["help_open"] == 1


def test_only_active_mahallas_appear(db, world, as_user):
    admin = _admin(db, world, as_user)
    db.get(models.Mahalla, world.other_mahalla_id).status = "forming"
    db.commit()
    ids = [r["mahalla_id"] for r in admin.get("/api/admin/metrics").json()["mahallas"]]
    assert world.other_mahalla_id not in ids
