"""Quick polls (#16) — the deliberately light counterpart to a governance Proposal.
A poll IS a post, so it inherits the feed, comments, reactions and deletion; these
tests pin the parts that are its own."""

from app import models


def _poll(client, question="Qaysi kuni hashar qilamiz?", options=("Shanba", "Yakshanba")):
    return client.post(
        "/api/posts", json={"type": "poll", "title": question, "options": list(options)}
    )


def test_a_poll_is_created_with_its_options(db, world, as_user):
    out = _poll(as_user(world.founder)).json()
    assert out["type"] == "poll"
    assert [o["text"] for o in out["poll"]["options"]] == ["Shanba", "Yakshanba"]
    assert out["poll"]["total_votes"] == 0
    assert out["poll"]["my_option_id"] is None


def test_a_poll_needs_at_least_two_options(db, world, as_user):
    r = _poll(as_user(world.founder), options=("Shanba",))
    assert r.status_code == 400


def test_blank_options_do_not_count(db, world, as_user):
    r = _poll(as_user(world.founder), options=("Shanba", "   ", ""))
    assert r.status_code == 400


def test_options_are_capped(db, world, as_user):
    r = _poll(as_user(world.founder), options=[f"V{i}" for i in range(6)])
    assert r.status_code == 422  # schema max_length — more than 5 is not "quick"


def test_one_tap_votes(db, world, as_user):
    pid = _poll(as_user(world.founder)).json()["id"]
    voter = as_user(world.neighbor)
    option = voter.get(f"/api/posts/{pid}").json()["poll"]["options"][0]

    poll = voter.post(f"/api/posts/{pid}/vote", json={"option_id": option["id"]}).json()
    assert poll["total_votes"] == 1
    assert poll["my_option_id"] == option["id"]
    assert poll["options"][0]["votes"] == 1


def test_changing_your_mind_moves_the_vote_instead_of_adding_one(db, world, as_user):
    pid = _poll(as_user(world.founder)).json()["id"]
    voter = as_user(world.neighbor)
    opts = voter.get(f"/api/posts/{pid}").json()["poll"]["options"]

    voter.post(f"/api/posts/{pid}/vote", json={"option_id": opts[0]["id"]})
    poll = voter.post(f"/api/posts/{pid}/vote", json={"option_id": opts[1]["id"]}).json()

    assert poll["total_votes"] == 1  # still one person
    assert poll["my_option_id"] == opts[1]["id"]
    assert [o["votes"] for o in poll["options"]] == [0, 1]
    assert db.query(models.PollVote).filter_by(post_id=pid).count() == 1


def test_several_neighbours_tally_up(db, world, as_user):
    pid = _poll(as_user(world.founder)).json()["id"]
    opts = as_user(world.founder).get(f"/api/posts/{pid}").json()["poll"]["options"]
    for who in (world.founder, world.neighbor, world.voucher):
        as_user(who).post(f"/api/posts/{pid}/vote", json={"option_id": opts[0]["id"]})
    poll = as_user(world.neighbor).get(f"/api/posts/{pid}").json()["poll"]
    assert poll["total_votes"] == 3
    assert poll["options"][0]["votes"] == 3


def test_each_viewer_sees_only_their_own_choice(db, world, as_user):
    pid = _poll(as_user(world.founder)).json()["id"]
    opts = as_user(world.founder).get(f"/api/posts/{pid}").json()["poll"]["options"]
    as_user(world.neighbor).post(f"/api/posts/{pid}/vote", json={"option_id": opts[0]["id"]})

    mine = as_user(world.neighbor).get(f"/api/posts/{pid}").json()["poll"]
    theirs = as_user(world.voucher).get(f"/api/posts/{pid}").json()["poll"]
    assert mine["my_option_id"] == opts[0]["id"]
    assert theirs["my_option_id"] is None
    assert theirs["total_votes"] == 1  # the tally is public, the voter is not named


def test_you_cannot_vote_with_another_polls_option(db, world, as_user):
    first = _poll(as_user(world.founder)).json()
    second = _poll(as_user(world.founder), question="Boshqa savol?").json()
    foreign = second["poll"]["options"][0]["id"]
    r = as_user(world.neighbor).post(f"/api/posts/{first['id']}/vote", json={"option_id": foreign})
    assert r.status_code == 404


def test_voting_on_a_non_poll_is_rejected(db, world, as_user):
    pid = as_user(world.founder).post(
        "/api/posts", json={"type": "announcement", "title": "Oddiy e'lon"}
    ).json()["id"]
    r = as_user(world.neighbor).post(f"/api/posts/{pid}/vote", json={"option_id": 1})
    assert r.status_code == 400


def test_a_closed_poll_takes_no_more_votes(db, world, as_user):
    author = as_user(world.founder)
    pid = _poll(author).json()["id"]
    opt = author.get(f"/api/posts/{pid}").json()["poll"]["options"][0]["id"]
    author.post(f"/api/posts/{pid}/close")
    r = as_user(world.neighbor).post(f"/api/posts/{pid}/vote", json={"option_id": opt})
    assert r.status_code == 400


def test_a_poll_from_another_mahalla_is_not_votable(db, world, as_user):
    pid = _poll(as_user(world.founder)).json()["id"]
    opt = as_user(world.founder).get(f"/api/posts/{pid}").json()["poll"]["options"][0]["id"]
    r = as_user(world.stranger).post(f"/api/posts/{pid}/vote", json={"option_id": opt})
    assert r.status_code == 404


def test_a_poll_appears_in_the_feed_with_its_tallies(db, world, as_user):
    pid = _poll(as_user(world.founder)).json()["id"]
    opt = as_user(world.founder).get(f"/api/posts/{pid}").json()["poll"]["options"][0]["id"]
    as_user(world.neighbor).post(f"/api/posts/{pid}/vote", json={"option_id": opt})

    card = next(p for p in as_user(world.neighbor).get("/api/posts").json()["items"] if p["id"] == pid)
    assert card["poll"]["total_votes"] == 1
    assert card["poll"]["my_option_id"] == opt


def test_ordinary_posts_carry_no_poll(db, world, as_user):
    out = as_user(world.founder).post(
        "/api/posts", json={"type": "announcement", "title": "Oddiy e'lon"}
    ).json()
    assert out["poll"] is None


def test_deleting_a_poll_takes_its_options_and_votes(db, world, as_user):
    author = as_user(world.founder)
    pid = _poll(author).json()["id"]
    opt = author.get(f"/api/posts/{pid}").json()["poll"]["options"][0]["id"]
    as_user(world.neighbor).post(f"/api/posts/{pid}/vote", json={"option_id": opt})

    author.delete(f"/api/posts/{pid}")
    assert db.query(models.PollOption).filter_by(post_id=pid).count() == 0
    assert db.query(models.PollVote).filter_by(post_id=pid).count() == 0


def test_a_poll_notifies_the_mahalla_like_other_structured_posts(db, world, as_user):
    _poll(as_user(world.founder))
    notes = as_user(world.neighbor).get("/api/notifications").json()["items"]
    assert any(n["type"] == "post" for n in notes)
