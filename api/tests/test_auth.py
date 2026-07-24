"""Authentication & membership gating."""

from app import models


def test_dev_login_creates_user_and_returns_profile(client):
    r = client.post("/api/auth/dev-login", json={"full_name": "Yangi Qo'shni"})
    assert r.status_code == 200
    body = r.json()
    assert body["full_name"] == "Yangi Qo'shni"
    assert body["mahalla_id"] is None  # a brand-new user hasn't joined yet
    assert body["is_admin"] is False


def test_dev_login_reuses_existing_member(world, db, as_user):
    # the seeded founder logs into their existing (member) account, not a new one
    before = db.query(models.User).count()
    me = as_user(world.founder).post(
        "/api/auth/dev-login", json={"full_name": world.founder}
    ).json()
    after = db.query(models.User).count()
    assert me["mahalla_id"] == world.mahalla_id
    assert after == before  # reused, no duplicate created


def test_protected_route_requires_session(client):
    # no cookie -> 401
    assert client.get("/api/posts").status_code == 401


def test_member_only_route_blocks_non_member(as_user):
    # authenticated but not in any mahalla -> 403 with the onboarding hint
    c = as_user("Mahallasiz Odam")
    r = c.get("/api/posts")
    assert r.status_code == 403
    assert "mahalla" in r.json()["detail"].lower()
