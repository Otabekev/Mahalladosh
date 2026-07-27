"""Regressions from the privilege audit.

Each test names a hole that existed in the code and is now closed. They are pinned
together because they share one theme: a privilege check that was *almost* right —
scoped to the wrong thing, missing one exemption, or defaulting to the permissive
value when nothing was configured.
"""

import pytest

from app import models, security
from app.config import Settings

# ---------- the session signing key ----------


def _prod(**over):
    base = {"environment": "production", "secret_key": "x" * 40}
    base.update(over)
    return Settings(_env_file=None, **base)


def test_production_refuses_to_start_with_the_committed_secret(monkeypatch):
    """CRITICAL. secret_key defaults to "change-me", which is published in a public
    repository. Sessions are HS256 JWTs signed with it, so anyone who read the repo
    could mint a cookie for user id 1 — the seeded platform admin."""
    monkeypatch.setattr(security, "settings", _prod(secret_key=security.DEFAULT_SECRET))
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        security.check_secret_key()


def test_production_refuses_a_short_secret(monkeypatch):
    monkeypatch.setattr(security, "settings", _prod(secret_key="short"))
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        security.check_secret_key()


def test_a_real_secret_is_accepted(monkeypatch):
    monkeypatch.setattr(security, "settings", _prod())
    security.check_secret_key()  # must not raise


def test_development_is_left_alone(monkeypatch):
    """Refusing here would break every local checkout for no security gain."""
    monkeypatch.setattr(security, "settings", _prod(environment="dev", secret_key="change-me"))
    security.check_secret_key()


# ---------- raisi authority is scoped to one mahalla ----------


def _make_raisi(db, mahalla_id, user_id):
    db.get(models.Mahalla, mahalla_id).raisi_user_id = user_id
    db.commit()


def test_a_raisi_cannot_moderate_another_mahallas_post(db, world, as_user):
    """The check asked "is this person raisi of THEIR OWN mahalla", not of the
    post's. Share posts are readable across mahallas, so every raisi was a
    moderator of every share post in the country."""
    _make_raisi(db, world.mahalla_id, world.founder_id)

    foreign = models.Post(
        mahalla_id=world.other_mahalla_id, author_id=world.stranger_id,
        type="share", title="Boshqa mahalla rasmi",
    )
    db.add(foreign)
    db.commit()
    comment = models.PostComment(post_id=foreign.id, user_id=world.stranger_id, body="Zo'r")
    db.add(comment)
    db.commit()

    r = as_user(world.founder).delete(f"/api/posts/{foreign.id}/comments/{comment.id}")
    assert r.status_code == 403
    assert db.get(models.PostComment, comment.id) is not None


def test_a_raisi_still_moderates_their_own_mahalla(db, world, as_user):
    """The fix must not disarm the raisi where they actually have authority."""
    _make_raisi(db, world.mahalla_id, world.founder_id)
    pid = as_user(world.neighbor).post(
        "/api/posts", json={"type": "announcement", "title": "E'lon"}
    ).json()["id"]
    cid = as_user(world.voucher).post(
        f"/api/posts/{pid}/comments", json={"body": "Salom"}
    ).json()["comments"][0]["id"]

    r = as_user(world.founder).delete(f"/api/posts/{pid}/comments/{cid}")
    assert r.status_code == 200
    assert db.get(models.PostComment, cid) is None


def test_a_raisi_cannot_ban_the_platform_admin(db, world, as_user):
    """There is no recovery route: the admin is the only account that could undo
    it, and they would be locked out."""
    _make_raisi(db, world.mahalla_id, world.founder_id)
    admin = db.get(models.User, world.neighbor_id)
    admin.is_admin = True
    db.commit()

    r = as_user(world.founder).post(f"/api/raisi/members/{admin.id}/ban")
    assert r.status_code == 400
    db.refresh(admin)
    assert admin.banned_until is None


def test_a_raisi_can_still_ban_an_ordinary_neighbour(db, world, as_user):
    _make_raisi(db, world.mahalla_id, world.founder_id)
    r = as_user(world.founder).post(f"/api/raisi/members/{world.voucher_id}/ban")
    assert r.status_code == 200
    assert db.get(models.User, world.voucher_id).banned_until is not None


# ---------- cross-mahalla reads are 404, never 403 ----------


def test_a_foreign_household_is_404_not_403(db, world, as_user):
    """403 confirms the id exists, turning household ids into a platform-wide
    existence oracle."""
    r = as_user(world.stranger).get(f"/api/households/{world.alfa_id}")
    assert r.status_code == 404


def test_a_missing_household_is_indistinguishable_from_a_foreign_one(db, world, as_user):
    """The whole point: both answers must look identical to an enumerator."""
    foreign = as_user(world.stranger).get(f"/api/households/{world.alfa_id}")
    missing = as_user(world.stranger).get("/api/households/99999")
    assert foreign.status_code == missing.status_code == 404
    assert foreign.json() == missing.json()


def test_a_foreign_service_is_404_not_403(db, world, as_user):
    sid = as_user(world.founder).post(
        "/api/services", json={"title": "Tikuvchilik", "category": "skill"}
    ).json()["id"]
    r = as_user(world.stranger).patch(f"/api/services/{sid}", json={"price": "1"})
    assert r.status_code == 404


def test_within_your_mahalla_a_service_you_do_not_own_is_still_403(db, world, as_user):
    """Not everything should become a 404 — inside your own mahalla the listing is
    visible to you anyway, so 403 leaks nothing and says something truer."""
    sid = as_user(world.founder).post(
        "/api/services", json={"title": "Tikuvchilik", "category": "skill"}
    ).json()["id"]
    r = as_user(world.voucher).patch(f"/api/services/{sid}", json={"price": "1"})
    assert r.status_code == 403
