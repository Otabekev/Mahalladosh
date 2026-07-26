"""Editing and deleting your own post (#8). The author owns the words; delete takes
the whole thread with it and never leaves a dangling pin."""

from app import models


def _post(db, world, author_id, type_="announcement", title="Eski sarlavha", body="eski"):
    post = models.Post(mahalla_id=world.mahalla_id, author_id=author_id, type=type_, title=title, body=body)
    db.add(post)
    db.commit()
    return post.id


def test_author_edits_title_and_body(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    out = as_user(world.founder).patch(
        f"/api/posts/{pid}", json={"title": "Yangi sarlavha", "body": "yangi matn"}
    ).json()
    assert out["title"] == "Yangi sarlavha"
    assert out["body"] == "yangi matn"


def test_a_share_posts_title_tracks_its_body(db, world, as_user):
    pid = _post(db, world, world.founder_id, type_="share", title="📷 Rasm", body=None)
    out = as_user(world.founder).patch(f"/api/posts/{pid}", json={"body": "Bugun ajoyib kun bo'ldi"}).json()
    assert out["body"] == "Bugun ajoyib kun bo'ldi"
    assert out["title"] == "Bugun ajoyib kun bo'ldi"[:80]


def test_only_the_author_can_edit(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    assert as_user(world.neighbor).patch(f"/api/posts/{pid}", json={"body": "hack"}).status_code == 403


def test_a_too_short_title_is_rejected(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    assert as_user(world.founder).patch(f"/api/posts/{pid}", json={"title": "x"}).status_code == 400


def test_delete_takes_the_whole_thread(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    as_user(world.neighbor).post(f"/api/posts/{pid}/comments", json={"body": "salom"})
    as_user(world.voucher).post(f"/api/posts/{pid}/rahmat")

    assert as_user(world.founder).delete(f"/api/posts/{pid}").status_code == 204
    assert db.query(models.PostComment).filter_by(post_id=pid).count() == 0
    assert db.query(models.PostReaction).filter_by(post_id=pid).count() == 0
    assert db.get(models.Post, pid) is None


def test_deleting_a_pinned_post_clears_the_pin(db, world, as_user):
    m = db.get(models.Mahalla, world.mahalla_id)
    m.raisi_user_id = world.founder_id
    db.commit()
    pid = _post(db, world, world.founder_id)
    as_user(world.founder).put(f"/api/raisi/pinned/{pid}")

    as_user(world.founder).delete(f"/api/posts/{pid}")
    db.expire_all()
    assert db.get(models.Mahalla, world.mahalla_id).pinned_post_id is None


def test_only_author_or_admin_deletes(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    assert as_user(world.neighbor).delete(f"/api/posts/{pid}").status_code == 403
