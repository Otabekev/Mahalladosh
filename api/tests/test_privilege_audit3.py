"""Third pass of the privilege audit — the remaining HIGH findings.

The governance one is the important one here: it was a route around the exact gate
it should have respected.
"""

from datetime import datetime, timedelta

from app import models


def _verify(db, household_id):
    db.get(models.Household, household_id).verification_status = "verified"
    db.commit()


def _unverify(db, household_id):
    db.get(models.Household, household_id).verification_status = "pending"
    db.commit()


# ---------- proposing a raisi is privileged too ----------


def test_an_unvouched_member_cannot_propose_a_raisi(db, world, as_user):
    """The verified-resident gate guarded ban_user but not set_raisi — and the raisi
    can ban members unilaterally, so nominating yourself was a way around the very
    gate the rule exists to enforce."""
    _unverify(db, world.alfa_id)
    r = as_user(world.founder).post(
        "/api/proposals",
        json={"title": "Meni raisi qiling", "action": "set_raisi",
              "target_user_id": world.founder_id},
    )
    assert r.status_code == 403


def test_a_verified_member_may_still_propose_a_raisi(db, world, as_user):
    _verify(db, world.alfa_id)
    r = as_user(world.founder).post(
        "/api/proposals",
        json={"title": "Yangi raisi", "action": "set_raisi",
              "target_user_id": world.voucher_id},
    )
    assert r.status_code == 200


def test_ordinary_coordination_stays_open_to_everyone(db, world, as_user):
    """The gate must not spread to proposals that change nothing about who holds
    power — those are the ones a new neighbour should be able to raise."""
    _unverify(db, world.alfa_id)
    r = as_user(world.founder).post(
        "/api/proposals",
        json={"title": "Ko'chaga chiroq o'rnatamiz", "action": "none"},
    )
    assert r.status_code == 200


def test_a_departed_nominee_is_not_installed_as_raisi(db, world):
    """A vote runs for days. In that window the nominee can leave, so eligibility is
    re-checked when the action is APPLIED, not only when it was proposed."""
    from app.routers.proposals import _apply_action

    p = models.Proposal(
        mahalla_id=world.mahalla_id, author_id=world.founder_id,
        title="Raisi", action="set_raisi", target_user_id=world.voucher_id,
        status="voting",
    )
    db.add(p)
    db.commit()

    db.get(models.User, world.voucher_id).mahalla_id = world.other_mahalla_id
    db.commit()

    _apply_action(db, p)
    db.commit()
    assert db.get(models.Mahalla, world.mahalla_id).raisi_user_id is None


def test_a_banned_nominee_is_not_installed_as_raisi(db, world):
    from app.routers.proposals import _apply_action

    p = models.Proposal(
        mahalla_id=world.mahalla_id, author_id=world.founder_id,
        title="Raisi", action="set_raisi", target_user_id=world.voucher_id,
        status="voting",
    )
    db.add(p)
    db.commit()
    db.get(models.User, world.voucher_id).banned_until = datetime.utcnow() + timedelta(days=5)
    db.commit()

    _apply_action(db, p)
    db.commit()
    assert db.get(models.Mahalla, world.mahalla_id).raisi_user_id is None


def test_an_eligible_nominee_is_installed(db, world):
    """The fix must not stop governance working."""
    from app.routers.proposals import _apply_action

    p = models.Proposal(
        mahalla_id=world.mahalla_id, author_id=world.founder_id,
        title="Raisi", action="set_raisi", target_user_id=world.voucher_id,
        status="voting",
    )
    db.add(p)
    db.commit()
    _apply_action(db, p)
    db.commit()
    assert db.get(models.Mahalla, world.mahalla_id).raisi_user_id == world.voucher_id


# ---------- resource limits ----------


def test_an_oversized_body_is_refused_before_any_route_runs(db, world, client):
    """The upload route's require_member gate runs only after the body is buffered,
    so the cost was paid by an unauthenticated caller."""
    r = client.post(
        "/api/uploads",
        headers={"content-length": str(50 * 1024 * 1024)},
        content=b"x" * 1024,
    )
    assert r.status_code == 413


def test_a_normal_request_is_unaffected(db, world, as_user):
    assert as_user(world.neighbor).get("/api/posts").status_code == 200


def test_the_decompression_budget_matches_real_cameras(db, world):
    """24 MP covers every phone anyone in the mahalla is holding; the old 40 MP let
    a small file claim ~230 MB while the output is thumbnailed to 1600px anyway."""
    from app.routers.uploads import MAX_DIM, MAX_PIXELS

    assert MAX_PIXELS <= 24_000_000
    assert MAX_PIXELS > MAX_DIM * MAX_DIM  # still comfortably above the output size
