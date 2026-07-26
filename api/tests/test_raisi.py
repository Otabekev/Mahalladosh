"""The raisi (mahalla head) panel. Every tool is gated to the raisi of the caller's
own mahalla, so the tests here are as much about who is refused as what works."""

from app import models


def _make_raisi(db, world, name):
    """Promote `name` to raisi of the main mahalla and return their id."""
    user = db.query(models.User).filter_by(full_name=name).one()
    mahalla = db.get(models.Mahalla, world.mahalla_id)
    mahalla.raisi_user_id = user.id
    db.commit()
    return user.id


def _post(db, world, author_id, mahalla_id=None):
    post = models.Post(
        mahalla_id=mahalla_id or world.mahalla_id,
        author_id=author_id,
        type="announcement",
        title="Suv o'chadi",
    )
    db.add(post)
    db.commit()
    return post.id


# ---------- pinning ----------


def test_raisi_can_pin_and_it_floats_to_the_top(db, world, as_user):
    _make_raisi(db, world, world.founder)
    older = _post(db, world, world.founder_id)
    newer = _post(db, world, world.founder_id)

    raisi = as_user(world.founder)
    assert raisi.put(f"/api/raisi/pinned/{older}").status_code == 204

    # a plain member sees the pinned (older) post first, flagged
    member = as_user(world.neighbor)
    feed = member.get("/api/posts").json()
    assert feed[0]["id"] == older
    assert feed[0]["pinned"] is True
    assert all(p["pinned"] is False for p in feed if p["id"] != older)
    assert newer in [p["id"] for p in feed]


def test_unpin_clears_it(db, world, as_user):
    _make_raisi(db, world, world.founder)
    pid = _post(db, world, world.founder_id)
    raisi = as_user(world.founder)
    raisi.put(f"/api/raisi/pinned/{pid}")

    raisi.delete("/api/raisi/pinned")
    feed = as_user(world.neighbor).get("/api/posts").json()
    assert all(p["pinned"] is False for p in feed)


def test_a_plain_member_cannot_pin(db, world, as_user):
    _make_raisi(db, world, world.founder)
    pid = _post(db, world, world.founder_id)
    member = as_user(world.neighbor)
    assert member.put(f"/api/raisi/pinned/{pid}").status_code == 403


def test_raisi_cannot_pin_a_foreign_mahallas_post(db, world, as_user):
    _make_raisi(db, world, world.founder)
    foreign = _post(db, world, world.stranger_id, mahalla_id=world.other_mahalla_id)
    raisi = as_user(world.founder)
    assert raisi.put(f"/api/raisi/pinned/{foreign}").status_code == 404


def test_a_type_filter_hides_the_pin(db, world, as_user):
    """The pin floats on the main feed, but a filtered view stays a clean list."""
    _make_raisi(db, world, world.founder)
    pid = _post(db, world, world.founder_id)  # announcement
    as_user(world.founder).put(f"/api/raisi/pinned/{pid}")

    member = as_user(world.neighbor)
    filtered = member.get("/api/posts?type=help").json()
    assert all(p["pinned"] is False for p in filtered)


def test_is_raisi_flag_is_exposed_on_self(db, world, as_user):
    _make_raisi(db, world, world.founder)
    me = as_user(world.founder).get("/api/auth/me").json()
    assert me["user"]["is_raisi"] is True
    assert as_user(world.neighbor).get("/api/auth/me").json()["user"]["is_raisi"] is False
