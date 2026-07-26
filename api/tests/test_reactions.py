"""The 🤲 Rahmat reaction — a one-tap toggle on a post. It is purely social, so the
tests pin the two things that matter: the toggle counts correctly, and it never
touches reputation (that would make it farmable)."""

from app import models


def _post(db, world, author_id):
    post = models.Post(
        mahalla_id=world.mahalla_id, author_id=author_id, type="share", title="Salom"
    )
    db.add(post)
    db.commit()
    return post.id


def test_rahmat_toggles_on_and_off(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    neighbor = as_user(world.neighbor)

    on = neighbor.post(f"/api/posts/{pid}/rahmat").json()
    assert on == {"count": 1, "mine": True}

    off = neighbor.post(f"/api/posts/{pid}/rahmat").json()
    assert off == {"count": 0, "mine": False}


def test_rahmat_counts_distinct_people(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    as_user(world.neighbor).post(f"/api/posts/{pid}/rahmat")
    second = as_user(world.voucher).post(f"/api/posts/{pid}/rahmat").json()
    assert second["count"] == 2


def test_rahmat_shows_on_the_feed_for_the_giver(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    giver = as_user(world.neighbor)
    giver.post(f"/api/posts/{pid}/rahmat")

    mine = next(p for p in giver.get("/api/posts").json() if p["id"] == pid)
    assert mine["rahmat_count"] == 1
    assert mine["my_rahmat"] is True

    # someone who didn't react sees the count but not my_rahmat
    other = next(p for p in as_user(world.voucher).get("/api/posts").json() if p["id"] == pid)
    assert other["rahmat_count"] == 1
    assert other["my_rahmat"] is False


def test_you_can_rahmat_your_own_post(db, world, as_user):
    # unlike a help response, thanking / applauding is fine on your own share
    pid = _post(db, world, world.founder_id)
    assert as_user(world.founder).post(f"/api/posts/{pid}/rahmat").json()["mine"] is True


def test_rahmat_awards_no_reputation(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    before = db.get(models.User, world.founder_id).rep_alltime
    as_user(world.neighbor).post(f"/api/posts/{pid}/rahmat")
    db.expire_all()
    assert db.get(models.User, world.founder_id).rep_alltime == before
    assert db.query(models.ReputationEntry).count() == 0


def test_rahmat_on_a_foreign_local_post_is_404(db, world, as_user):
    # a non-share post in another mahalla is not visible, so not reactable
    other = models.Post(
        mahalla_id=world.other_mahalla_id, author_id=world.stranger_id, type="announcement", title="X"
    )
    db.add(other)
    db.commit()
    assert as_user(world.neighbor).post(f"/api/posts/{other.id}/rahmat").status_code == 404
