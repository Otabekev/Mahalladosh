"""Service photos (#18). A neighbour's offering carries up to four photos of the
work. The whole set is sent on save — there is no per-photo endpoint — so these
tests pin that re-saving is what adds, reorders and removes."""

from app import models


def _offering(client, **over):
    body = {"title": "Tikuvchilik", "category": "skill", "contact": "901234567"}
    body.update(over)
    return client.post("/api/services", json=body)


def test_an_offering_is_created_with_photos(db, world, as_user):
    out = _offering(
        as_user(world.founder),
        image_urls=["/api/uploads/dress.jpg", "/api/uploads/coat.jpg"],
    ).json()
    assert out["image_urls"] == ["/api/uploads/dress.jpg", "/api/uploads/coat.jpg"]


def test_photos_are_optional(db, world, as_user):
    out = _offering(as_user(world.founder)).json()
    assert out["image_urls"] == []


def test_photos_are_capped_at_four(db, world, as_user):
    r = _offering(
        as_user(world.founder),
        image_urls=[f"/api/uploads/{i}.jpg" for i in range(5)],
    )
    assert r.status_code == 422  # schema max_length rejects it before the handler


def test_a_non_upload_url_is_rejected(db, world, as_user):
    r = _offering(as_user(world.founder), image_urls=["https://evil.example/x.jpg"])
    assert r.status_code == 400


def test_saving_again_replaces_the_whole_set(db, world, as_user):
    owner = as_user(world.founder)
    sid = _offering(owner, image_urls=["/api/uploads/a.jpg", "/api/uploads/b.jpg"]).json()["id"]

    out = owner.patch(f"/api/services/{sid}", json={"image_urls": ["/api/uploads/c.jpg"]}).json()
    assert out["image_urls"] == ["/api/uploads/c.jpg"]
    # replaced, not appended — the old rows are gone
    assert db.query(models.ServiceImage).filter_by(service_id=sid).count() == 1


def test_dropping_a_photo_is_just_saving_without_it(db, world, as_user):
    owner = as_user(world.founder)
    sid = _offering(owner, image_urls=["/api/uploads/a.jpg", "/api/uploads/b.jpg"]).json()["id"]
    out = owner.patch(f"/api/services/{sid}", json={"image_urls": []}).json()
    assert out["image_urls"] == []


def test_omitting_image_urls_leaves_the_photos_alone(db, world, as_user):
    """The edit form may only change the price; that must not wipe the album."""
    owner = as_user(world.founder)
    sid = _offering(owner, image_urls=["/api/uploads/a.jpg"]).json()["id"]
    out = owner.patch(f"/api/services/{sid}", json={"price": "50 000"}).json()
    assert out["image_urls"] == ["/api/uploads/a.jpg"]


def test_only_the_owning_household_can_change_photos(db, world, as_user):
    sid = _offering(as_user(world.founder), image_urls=["/api/uploads/a.jpg"]).json()["id"]
    r = as_user(world.voucher).patch(f"/api/services/{sid}", json={"image_urls": []})
    assert r.status_code == 403


def test_neighbours_see_the_photos_in_the_directory(db, world, as_user):
    _offering(as_user(world.founder), image_urls=["/api/uploads/dress.jpg"])
    listing = as_user(world.neighbor).get("/api/services").json()
    mine = [s for s in listing if s["title"] == "Tikuvchilik"][0]
    assert mine["image_urls"] == ["/api/uploads/dress.jpg"]


def test_deleting_the_offering_drops_its_photos(db, world, as_user):
    owner = as_user(world.founder)
    sid = _offering(owner, image_urls=["/api/uploads/a.jpg"]).json()["id"]
    assert db.query(models.ServiceImage).filter_by(service_id=sid).count() == 1
    owner.delete(f"/api/services/{sid}")
    assert db.query(models.ServiceImage).filter_by(service_id=sid).count() == 0
