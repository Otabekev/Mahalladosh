"""Public person pages. The load-bearing rule is scope: you can see a neighbour in
your own mahalla and no one else — a foreign id must be indistinguishable from a
missing one (404, never 403)."""

from app import models


def test_neighbour_can_view_a_same_mahalla_profile(db, world, as_user):
    prof = as_user(world.neighbor).get(f"/api/users/{world.founder_id}").json()
    assert prof["full_name"] == world.founder
    assert prof["household_name"] == "Alfa"  # the founder owns the Alfa household
    assert prof["household_id"] == world.alfa_id


def test_profile_reports_the_raisi_flag(db, world, as_user):
    m = db.get(models.Mahalla, world.mahalla_id)
    m.raisi_user_id = world.founder_id
    db.commit()
    prof = as_user(world.neighbor).get(f"/api/users/{world.founder_id}").json()
    assert prof["is_raisi"] is True


def test_profile_counts_their_posts(db, world, as_user):
    db.add_all([
        models.Post(mahalla_id=world.mahalla_id, author_id=world.founder_id, type="share", title="a"),
        models.Post(mahalla_id=world.mahalla_id, author_id=world.founder_id, type="share", title="b"),
    ])
    db.commit()
    prof = as_user(world.neighbor).get(f"/api/users/{world.founder_id}").json()
    assert prof["post_count"] == 2


def test_a_foreign_mahalla_profile_is_404(db, world, as_user):
    # the stranger belongs to the other mahalla — invisible, not merely forbidden
    assert as_user(world.neighbor).get(f"/api/users/{world.stranger_id}").status_code == 404


def test_a_missing_user_is_also_404(db, world, as_user):
    assert as_user(world.neighbor).get("/api/users/999999").status_code == 404


def test_profile_never_leaks_private_settings(db, world, as_user):
    """lang / tg_dm_enabled are the account's own business, never on a public page."""
    prof = as_user(world.neighbor).get(f"/api/users/{world.founder_id}").json()
    assert "lang" not in prof
    assert "tg_dm_enabled" not in prof
