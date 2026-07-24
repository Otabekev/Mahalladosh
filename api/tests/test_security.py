"""Regression tests for the Phase-2 adversarial security review.

Each test pins a confirmed finding closed so it can never silently regress.
"""

from datetime import datetime, timedelta

from app import models
from app.routers import proposals

# ---- FINDING 1 (HIGH): member-claim must be steward-approved, not instant ----


def test_claim_is_steward_gated_and_links_on_approval(world, db, as_user):
    attacker = as_user(world.neighbor)  # a member with no household
    steward = as_user(world.founder)

    # a direct claim of an unclaimed named row must NOT auto-join
    r = attacker.post(
        f"/api/households/{world.alfa_id}/claim", json={"member_id": world.son_member_id}
    )
    assert r.status_code == 200
    assert r.json()["has_pending_join"] is True
    db.expire_all()
    assert db.query(models.User).filter_by(full_name=world.neighbor).first().household_id is None

    # the steward sees WHO the requester claims to be
    reqs = steward.get(f"/api/households/{world.alfa_id}/join-requests").json()
    assert any(x["claim_member_name"] == "Alisher" for x in reqs)

    # approval links the requester to that exact named row
    steward.post(f"/api/households/{world.alfa_id}/join-requests/{reqs[0]['id']}/approve")
    db.expire_all()
    user = db.query(models.User).filter_by(full_name=world.neighbor).first()
    member = db.get(models.HouseholdMember, world.son_member_id)
    assert user.household_id == world.alfa_id
    assert member.user_id == user.id


# ---- FINDING 2 (MED): a banned/deleted account is locked out everywhere ----


def test_banned_user_blocked_on_get_current_user_routes(world, db, as_user):
    neighbor = as_user(world.neighbor)
    row = db.query(models.User).filter_by(full_name=world.neighbor).first()
    row.banned_until = datetime.utcnow() + timedelta(days=1)
    db.commit()

    # PATCH /me is a get_current_user-only route (not require_member) — still blocked
    assert neighbor.patch("/api/me", json={"full_name": "Zzz"}).status_code == 403


def test_deleted_account_cannot_reuse_a_retained_token(world, db, as_user):
    neighbor = as_user(world.neighbor)
    token = neighbor.cookies.get("md_session")  # capture BEFORE delete clears it
    assert neighbor.delete("/api/me").status_code == 204

    # simulate a client that KEPT the JWT despite delete_cookie (the real threat:
    # stateless tokens can't be revoked by clearing the cookie). The server-side
    # lockout in get_current_user must still reject it.
    neighbor.cookies.set("md_session", token)
    assert neighbor.patch("/api/me", json={"full_name": "Zzz"}).status_code == 403


# ---- FINDING 3 (LOW): user reports are mahalla-scoped (no cross-mahalla probe) ----


def test_cannot_report_a_user_from_another_mahalla(world, db, as_user):
    reporter = as_user(world.founder)
    stranger_id = db.query(models.User).filter_by(full_name=world.stranger).first().id
    r = reporter.post(
        "/api/reports", json={"target_type": "user", "target_id": stranger_id, "reason": "spam"}
    )
    assert r.status_code == 404  # indistinguishable from a missing id — no enumeration


def test_can_report_a_user_in_own_mahalla(world, db, as_user):
    reporter = as_user(world.founder)
    victim_id = db.query(models.User).filter_by(full_name=world.neighbor).first().id
    r = reporter.post(
        "/api/reports", json={"target_type": "user", "target_id": victim_id, "reason": "spam"}
    )
    assert r.status_code == 200


# ---- FINDING 4 (MED): a vote-ban also takes down the target's services ----


def test_vote_ban_deactivates_services_and_closes_posts(world, db):
    founder = db.query(models.User).filter_by(full_name=world.founder).first()
    svc = models.ServiceOffering(
        household_id=world.alfa_id,
        mahalla_id=world.mahalla_id,
        title="Tuxum sotaman",
        category="food",
        active=True,
        created_by=founder.id,
    )
    post = models.Post(
        mahalla_id=world.mahalla_id, author_id=founder.id, type="help", title="Yordam", status="open"
    )
    db.add_all([svc, post])
    db.flush()
    sid, pid = svc.id, post.id

    p = models.Proposal(
        mahalla_id=world.mahalla_id,
        author_id=founder.id,
        action="ban_user",
        target_user_id=founder.id,
        title="Qoidabuzarlik",
    )
    proposals._apply_action(db, p)
    db.commit()
    db.expire_all()

    assert db.get(models.ServiceOffering, sid).active is False
    assert db.get(models.Post, pid).status == "closed"


# ---- FINDING 5 (MED): leaving unlinks a claimed member row (no ghost) ----


def test_leaving_household_unlinks_claimed_member_row(world, db, as_user):
    # link the neighbour to the 'Alisher' row via the approved claim flow
    attacker = as_user(world.neighbor)
    steward = as_user(world.founder)
    attacker.post(f"/api/households/{world.alfa_id}/claim", json={"member_id": world.son_member_id})
    reqs = steward.get(f"/api/households/{world.alfa_id}/join-requests").json()
    steward.post(f"/api/households/{world.alfa_id}/join-requests/{reqs[0]['id']}/approve")

    # now they leave — the household is kept (founder remains), so the row must
    # survive but with its user link cleared (not a ghost still shown as a member)
    assert attacker.post("/api/me/leave-household").status_code == 200
    db.expire_all()
    member = db.get(models.HouseholdMember, world.son_member_id)
    assert member is not None
    assert member.user_id is None
