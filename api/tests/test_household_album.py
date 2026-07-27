"""Family album (#7). Only the household's own account-holders manage it, and the
photos ride the SAME privacy gate as the family history — a trusted neighbour sees
them, an outsider or unverified household does not."""

from app import models


def test_a_member_adds_and_sees_their_album(db, world, as_user):
    founder = as_user(world.founder)  # owns the verified Alfa household
    out = founder.post(
        f"/api/households/{world.alfa_id}/photos",
        json={"urls": ["/api/uploads/1.jpg", "/api/uploads/2.jpg"]},
    ).json()
    assert out["photos"] == ["/api/uploads/1.jpg", "/api/uploads/2.jpg"]


def test_only_own_household_can_add(db, world, as_user):
    # voucher owns Beta, not Alfa — cannot add to Alfa's album
    r = as_user(world.voucher).post(
        f"/api/households/{world.alfa_id}/photos", json={"urls": ["/api/uploads/x.jpg"]}
    )
    assert r.status_code == 403  # _get_own_household → not yours


def test_a_non_upload_url_is_rejected(db, world, as_user):
    r = as_user(world.founder).post(
        f"/api/households/{world.alfa_id}/photos", json={"urls": ["https://evil/x.jpg"]}
    )
    assert r.status_code == 400


def test_album_is_capped_at_twelve(db, world, as_user):
    founder = as_user(world.founder)
    founder.post(
        f"/api/households/{world.alfa_id}/photos",
        json={"urls": [f"/api/uploads/{i}.jpg" for i in range(10)]},
    )
    founder.post(
        f"/api/households/{world.alfa_id}/photos",
        json={"urls": [f"/api/uploads/extra{i}.jpg" for i in range(5)]},
    )
    assert db.query(models.HouseholdImage).filter_by(household_id=world.alfa_id).count() == 12


def test_a_member_can_delete_a_photo(db, world, as_user):
    founder = as_user(world.founder)
    out = founder.post(
        f"/api/households/{world.alfa_id}/photos", json={"urls": ["/api/uploads/1.jpg"]}
    ).json()
    img_id = db.query(models.HouseholdImage).filter_by(household_id=world.alfa_id).one().id
    after = founder.delete(f"/api/households/{world.alfa_id}/photos/{img_id}").json()
    assert after["photos"] == []
    assert out["photos"] == ["/api/uploads/1.jpg"]  # sanity: it was there before


def test_album_follows_the_privacy_gate(db, world, as_user):
    """A trusted (own-household-verified) neighbour sees the album; a household-less
    one-tap joiner does not — same rule as family history."""
    as_user(world.founder).post(
        f"/api/households/{world.alfa_id}/photos", json={"urls": ["/api/uploads/1.jpg"]}
    )

    # voucher owns a VERIFIED household → trusted → sees the album
    trusted = as_user(world.voucher).get(f"/api/households/{world.alfa_id}").json()
    assert trusted["photos"] == ["/api/uploads/1.jpg"]

    # neighbor has no household of their own → not trusted → gated out
    outsider = as_user(world.neighbor).get(f"/api/households/{world.alfa_id}").json()
    assert outsider["photos"] == []


def test_album_dies_with_the_household(db, world, as_user):
    founder = as_user(world.founder)
    founder.post(f"/api/households/{world.alfa_id}/photos", json={"urls": ["/api/uploads/1.jpg"]})
    # the founder is Alfa's only account-holder; leaving deletes the orphan household
    founder.post("/api/me/leave-household")
    assert db.query(models.HouseholdImage).filter_by(household_id=world.alfa_id).count() == 0
