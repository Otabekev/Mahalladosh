"""Household / family-page core flows: creation, the steward-gated join flow,
the privacy gate, and the vouch (verification) gate."""

from app import models


def test_create_household_makes_creator_a_steward(world, db, as_user):
    neighbor = as_user(world.neighbor)
    r = neighbor.post(
        "/api/households",
        json={"family_name": "Yangi Oila", "resident_count": 4, "street": "Bog' ko'chasi 5"},
    )
    assert r.status_code == 200
    hh_id = r.json()["id"]
    db.expire_all()
    u = db.query(models.User).filter_by(full_name=world.neighbor).first()
    assert u.household_id == hh_id  # creator is linked as an account-holding member


def test_privacy_gate_hides_family_from_outsiders(world, as_user):
    # a household-less neighbour is NOT a trusted resident -> sees only the shell
    outsider = as_user(world.neighbor)
    h = outsider.get(f"/api/households/{world.alfa_id}").json()
    assert h["family_history"] is None
    assert h["members"] == []
    assert h["family_name"] == "Alfa"  # public shell still visible


def test_privacy_gate_shows_family_to_verified_neighbour(world, as_user):
    # the voucher owns a VERIFIED household -> a trusted resident who may see details
    trusted = as_user(world.voucher)
    h = trusted.get(f"/api/households/{world.alfa_id}").json()
    assert h["family_history"] is not None
    assert any(m["full_name"] == "Alisher" for m in h["members"])


def test_join_request_is_steward_approved(world, db, as_user):
    neighbor = as_user(world.neighbor)
    steward = as_user(world.founder)

    # request to join -> pending, not an instant membership
    r = neighbor.post(f"/api/households/{world.alfa_id}/join-request", json={})
    assert r.status_code == 200
    assert r.json()["has_pending_join"] is True
    db.expire_all()
    assert db.query(models.User).filter_by(full_name=world.neighbor).first().household_id is None

    # steward sees it and approves
    reqs = steward.get(f"/api/households/{world.alfa_id}/join-requests").json()
    assert len(reqs) == 1
    steward.post(f"/api/households/{world.alfa_id}/join-requests/{reqs[0]['id']}/approve")
    db.expire_all()
    assert (
        db.query(models.User).filter_by(full_name=world.neighbor).first().household_id
        == world.alfa_id
    )


def test_vouch_requires_a_verified_household(world, as_user):
    # a household-less member cannot vouch (verification teeth)
    outsider = as_user(world.neighbor)
    r = outsider.post(f"/api/households/{world.beta_id}/vouch")
    assert r.status_code == 403

    # a member of a verified household can
    trusted = as_user(world.voucher)
    r = trusted.post(f"/api/households/{world.alfa_id}/vouch")
    assert r.status_code == 200
