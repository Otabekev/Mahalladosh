"""Multi-photo posts (#6). A share post can carry several images; the first is the
cover, image_urls holds them all, and older single-image posts still read cleanly."""

from app import models


def test_create_a_post_with_several_photos(db, world, as_user):
    author = as_user(world.founder)
    out = author.post(
        "/api/posts",
        json={
            "type": "share",
            "body": "Hashar kuni",
            "image_urls": ["/api/uploads/a.jpg", "/api/uploads/b.jpg", "/api/uploads/c.jpg"],
        },
    ).json()
    assert out["image_urls"] == ["/api/uploads/a.jpg", "/api/uploads/b.jpg", "/api/uploads/c.jpg"]
    # the cover (legacy single field) is the first photo
    assert out["image_url"] == "/api/uploads/a.jpg"


def test_photos_are_capped_at_six(db, world, as_user):
    author = as_user(world.founder)
    r = author.post(
        "/api/posts",
        json={"type": "share", "body": "x", "image_urls": [f"/api/uploads/{i}.jpg" for i in range(9)]},
    )
    assert r.status_code == 422  # schema max_length=6 rejects it


def test_a_non_upload_url_is_rejected(db, world, as_user):
    author = as_user(world.founder)
    r = author.post(
        "/api/posts",
        json={"type": "share", "body": "x", "image_urls": ["https://evil.example/x.jpg"]},
    )
    assert r.status_code == 400


def test_legacy_single_image_still_reads_as_a_one_photo_gallery(db, world, as_user):
    # a post created the old way (only image_path, no PostImage rows)
    post = models.Post(
        mahalla_id=world.mahalla_id,
        author_id=world.founder_id,
        type="share",
        title="eski",
        image_path="/api/uploads/old.jpg",
    )
    db.add(post)
    db.commit()
    detail = as_user(world.neighbor).get(f"/api/posts/{post.id}").json()
    assert detail["image_urls"] == ["/api/uploads/old.jpg"]


def test_image_url_fallback_still_works(db, world, as_user):
    # a client that only sends the legacy single image_url
    out = as_user(world.founder).post(
        "/api/posts", json={"type": "share", "body": "x", "image_url": "/api/uploads/solo.jpg"}
    ).json()
    assert out["image_urls"] == ["/api/uploads/solo.jpg"]


def test_deleting_the_post_drops_its_images(db, world, as_user):
    author = as_user(world.founder)
    pid = author.post(
        "/api/posts", json={"type": "share", "body": "x", "image_urls": ["/api/uploads/a.jpg"]}
    ).json()["id"]
    assert db.query(models.PostImage).filter_by(post_id=pid).count() == 1
    author.delete(f"/api/posts/{pid}")
    assert db.query(models.PostImage).filter_by(post_id=pid).count() == 0
