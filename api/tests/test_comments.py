"""Post comments — the free-form discussion thread. Distinct from help responses:
anyone who sees the post may comment, the author included, as often as they like.
The delete rule (own / post author / raisi) is the other thing worth pinning."""

from app import models


def _post(db, world, author_id, type_="share"):
    post = models.Post(mahalla_id=world.mahalla_id, author_id=author_id, type=type_, title="Salom")
    db.add(post)
    db.commit()
    return post.id


def test_anyone_can_comment_including_the_author_repeatedly(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    author = as_user(world.founder)

    author.post(f"/api/posts/{pid}/comments", json={"body": "Birinchi"})
    author.post(f"/api/posts/{pid}/comments", json={"body": "Ikkinchi"})  # same person, again
    detail = as_user(world.neighbor).post(f"/api/posts/{pid}/comments", json={"body": "Salom"}).json()

    bodies = [c["body"] for c in detail["comments"]]
    assert bodies == ["Birinchi", "Ikkinchi", "Salom"]  # oldest first
    assert detail["comment_count"] == 3


def test_comment_count_shows_on_the_feed(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    as_user(world.neighbor).post(f"/api/posts/{pid}/comments", json={"body": "Zo'r"})
    feed = as_user(world.voucher).get("/api/posts").json()["items"]
    assert next(p for p in feed if p["id"] == pid)["comment_count"] == 1


def test_can_delete_flags_are_per_viewer(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    # neighbor comments
    as_user(world.neighbor).post(f"/api/posts/{pid}/comments", json={"body": "mine"})

    # the commenter can delete their own
    mine = as_user(world.neighbor).get(f"/api/posts/{pid}").json()["comments"][0]
    assert mine["can_delete"] is True

    # a random other member cannot
    theirs = as_user(world.voucher).get(f"/api/posts/{pid}").json()["comments"][0]
    assert theirs["can_delete"] is False

    # the post author can (it's their post)
    asauthor = as_user(world.founder).get(f"/api/posts/{pid}").json()["comments"][0]
    assert asauthor["can_delete"] is True


def test_comment_author_can_delete_their_own(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    neighbor = as_user(world.neighbor)
    cid = neighbor.post(f"/api/posts/{pid}/comments", json={"body": "oops"}).json()["comments"][0]["id"]
    after = neighbor.delete(f"/api/posts/{pid}/comments/{cid}").json()
    assert after["comment_count"] == 0


def test_post_author_can_delete_any_comment(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    cid = as_user(world.neighbor).post(f"/api/posts/{pid}/comments", json={"body": "x"}).json()["comments"][0]["id"]
    assert as_user(world.founder).delete(f"/api/posts/{pid}/comments/{cid}").status_code == 200


def test_raisi_can_delete_any_comment(db, world, as_user):
    m = db.get(models.Mahalla, world.mahalla_id)
    m.raisi_user_id = world.voucher_id
    db.commit()
    pid = _post(db, world, world.founder_id)
    cid = as_user(world.neighbor).post(f"/api/posts/{pid}/comments", json={"body": "x"}).json()["comments"][0]["id"]
    assert as_user(world.voucher).delete(f"/api/posts/{pid}/comments/{cid}").status_code == 200


def test_a_stranger_cannot_delete_someone_elses_comment(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    cid = as_user(world.neighbor).post(f"/api/posts/{pid}/comments", json={"body": "x"}).json()["comments"][0]["id"]
    assert as_user(world.voucher).delete(f"/api/posts/{pid}/comments/{cid}").status_code == 403


def test_commenting_notifies_the_author_but_not_on_self(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    # neighbour comments → founder gets a notification
    as_user(world.neighbor).post(f"/api/posts/{pid}/comments", json={"body": "salom"})
    notifs = as_user(world.founder).get("/api/notifications").json()["items"]
    assert any(n["type"] == "comment" for n in notifs)

    # the author commenting on their own post notifies nobody new
    before = len(notifs)
    as_user(world.founder).post(f"/api/posts/{pid}/comments", json={"body": "rahmat"})
    after = as_user(world.founder).get("/api/notifications").json()["items"]
    assert len([n for n in after if n["type"] == "comment"]) == before


def test_empty_comment_is_rejected(db, world, as_user):
    pid = _post(db, world, world.founder_id)
    assert as_user(world.neighbor).post(f"/api/posts/{pid}/comments", json={"body": "   "}).status_code == 400
    assert as_user(world.neighbor).post(f"/api/posts/{pid}/comments", json={"body": ""}).status_code == 422
