"""Away members — the family working abroad (#58, formerly the deferred #40).

This feature was deferred because its failure mode is not a bug but a privacy
incident: an account that is "sort of a member" is the obvious way to obtain a
directory of an entire village from outside it. It was only built once the design
could fail CLOSED — an away member is not a mahalla member at all, so every existing
endpoint rejects them without knowing this feature exists.

Most of this file is therefore not testing features. It is testing that the fence
holds, including against routes that have nothing to do with away members, because
that is the actual promise being made to a village.
"""

from datetime import datetime, timedelta

from app import models, security
from app.routers import away as away_router


def _link(db, world, user_id, status="active", household_id=None):
    row = models.AwayMember(
        user_id=user_id,
        household_id=household_id or world.alfa_id,
        mahalla_id=world.mahalla_id,
        country="Rossiya",
        status=status,
    )
    db.add(row)
    db.commit()
    return row


def _outsider(db, name="Aziz Moskvada"):
    """A logged-in account with NO mahalla — the shape an away member has."""
    user = models.User(full_name=name)
    db.add(user)
    db.commit()
    return user


# ---------- the fence ----------


def test_an_away_member_is_not_a_mahalla_member(db, world, as_user):
    """The load-bearing fact. Everything else follows from it: require_member
    rejects them, so every endpoint in the app rejects them by default."""
    person = _outsider(db)
    _link(db, world, person.id)
    assert db.get(models.User, person.id).mahalla_id is None


def test_the_member_directory_is_closed(db, world, as_user):
    """THE leak this whole design exists to prevent — every name in the village,
    fetched from outside it."""
    person = _outsider(db)
    _link(db, world, person.id)
    me = as_user(person.full_name)
    assert me.get(f"/api/mahallas/{world.mahalla_id}/members").status_code in (403, 404)
    assert me.get(f"/api/mahallas/{world.mahalla_id}/leaderboard").status_code in (403, 404)
    assert me.get(f"/api/users/{world.founder_id}").status_code in (403, 404)


def test_the_ordinary_feed_is_closed(db, world, as_user):
    person = _outsider(db)
    _link(db, world, person.id)
    assert as_user(person.full_name).get("/api/posts").status_code == 403


def test_other_households_are_closed(db, world, as_user):
    person = _outsider(db)
    _link(db, world, person.id)
    r = as_user(person.full_name).get(f"/api/households/{world.beta_id}")
    assert r.status_code in (403, 404)


def test_the_services_directory_is_closed(db, world, as_user):
    person = _outsider(db)
    _link(db, world, person.id)
    assert as_user(person.full_name).get("/api/services").status_code == 403


def test_search_is_closed(db, world, as_user):
    person = _outsider(db)
    _link(db, world, person.id)
    assert as_user(person.full_name).get("/api/search?q=a").status_code == 403


def test_they_cannot_post_to_the_mahalla(db, world, as_user):
    person = _outsider(db)
    _link(db, world, person.id)
    r = as_user(person.full_name).post(
        "/api/posts", json={"type": "announcement", "title": "Salom hammaga"}
    )
    assert r.status_code == 403


def test_a_pending_link_gets_nothing(db, world, as_user):
    """Approval is the gate, not the invite."""
    person = _outsider(db)
    _link(db, world, person.id, status="pending")
    assert as_user(person.full_name).get("/api/away/home").status_code == 403


def test_a_revoked_link_gets_nothing(db, world, as_user):
    person = _outsider(db)
    _link(db, world, person.id, status="revoked")
    assert as_user(person.full_name).get("/api/away/home").status_code == 403


def test_a_stranger_with_no_link_gets_nothing(db, world, as_user):
    assert as_user(_outsider(db).full_name).get("/api/away/home").status_code == 403


# ---------- the invite ----------


def test_a_steward_can_mint_an_invite(db, world, as_user):
    r = as_user(world.founder).post("/api/away/invite")
    assert r.status_code == 200
    assert security.decode_away_invite(r.json()["token"]) == world.alfa_id


def test_a_session_cookie_is_not_an_invite(db, world, as_user):
    """Without the `kind` claim a session token would decode here, and any logged-in
    user could mint themselves an invite out of their own cookie."""
    assert security.decode_away_invite(security.create_session_token(world.founder_id)) is None


def test_a_garbage_token_is_not_an_invite(db, world):
    assert security.decode_away_invite("not-a-token") is None


def test_someone_with_no_household_cannot_invite(db, world, as_user):
    assert as_user(world.neighbor).post("/api/away/invite").status_code == 400


def test_an_invite_creates_a_PENDING_link_and_never_an_active_one(db, world, as_user):
    """A Telegram message can be forwarded, and whoever forwards it is not the person
    the family agreed to add. Possession is not consent."""
    token = as_user(world.founder).post("/api/away/invite").json()["token"]
    person = _outsider(db)
    r = as_user(person.full_name).post(
        "/api/away/join", json={"token": token, "country": "Rossiya"}
    )
    assert r.json()["status"] == "pending"
    assert db.query(models.AwayMember).filter_by(user_id=person.id).first().status == "pending"


def test_an_expired_invite_is_refused(db, world, as_user, monkeypatch):
    monkeypatch.setattr(security, "AWAY_INVITE_HOURS", -1)
    token = security.create_away_invite(world.alfa_id)
    person = _outsider(db)
    assert as_user(person.full_name).post("/api/away/join", json={"token": token}).status_code == 400


def test_a_mahalla_member_cannot_use_an_away_invite(db, world, as_user):
    """Someone who lives there is a full member and must not downgrade into a
    second, thinner identity for the same mahalla."""
    token = as_user(world.founder).post("/api/away/invite").json()["token"]
    assert as_user(world.neighbor).post("/api/away/join", json={"token": token}).status_code == 400


def test_joining_twice_does_not_create_two_links(db, world, as_user):
    token = as_user(world.founder).post("/api/away/invite").json()["token"]
    person = _outsider(db)
    me = as_user(person.full_name)
    me.post("/api/away/join", json={"token": token})
    me.post("/api/away/join", json={"token": token})
    assert db.query(models.AwayMember).filter_by(user_id=person.id).count() == 1


def test_the_family_is_told_someone_is_asking(db, world, as_user):
    token = as_user(world.founder).post("/api/away/invite").json()["token"]
    person = _outsider(db)
    as_user(person.full_name).post("/api/away/join", json={"token": token})
    assert db.query(models.Notification).filter_by(event="away_request").count() >= 1


# ---------- approval, by the family ----------


def test_a_steward_approves_and_the_link_goes_live(db, world, as_user):
    person = _outsider(db)
    row = _link(db, world, person.id, status="pending")
    r = as_user(world.founder).post(f"/api/away/requests/{row.id}/approve")
    assert r.status_code == 200
    db.refresh(row)
    assert row.status == "active"
    assert as_user(person.full_name).get("/api/away/home").status_code == 200


def test_another_family_cannot_approve_your_relative(db, world, as_user):
    person = _outsider(db)
    row = _link(db, world, person.id, status="pending")
    # voucher belongs to Beta, not Alfa
    assert as_user(world.voucher).post(f"/api/away/requests/{row.id}/approve").status_code == 404


def test_the_family_can_cut_the_link_again(db, world, as_user):
    person = _outsider(db)
    row = _link(db, world, person.id)
    assert as_user(world.founder).post(f"/api/away/requests/{row.id}/revoke").status_code == 204
    assert as_user(person.full_name).get("/api/away/home").status_code == 403


def test_a_revoked_person_keeps_their_history_row(db, world, as_user):
    """Revoked rather than deleted, so who was added is not silently erased."""
    person = _outsider(db)
    row = _link(db, world, person.id)
    as_user(world.founder).post(f"/api/away/requests/{row.id}/revoke")
    assert db.query(models.AwayMember).filter_by(user_id=person.id).count() == 1


def test_the_away_member_can_leave_by_themselves(db, world, as_user):
    """Without having to ask the family."""
    person = _outsider(db)
    _link(db, world, person.id)
    me = as_user(person.full_name)
    assert me.delete("/api/away/link").status_code == 204
    assert me.get("/api/away/home").status_code == 403


# ---------- what they actually get ----------


def test_home_carries_the_family_and_the_mahalla_name(db, world, as_user):
    person = _outsider(db)
    _link(db, world, person.id)
    home = as_user(person.full_name).get("/api/away/home").json()
    assert home["family_name"] == "Alfa"
    assert home["mahalla_name"] == "Yoshlik"
    assert home["family_history"]  # the emotional payload, and it is theirs already
    assert [m["full_name"] for m in home["members"]] == ["Alisher"]


def test_news_from_home_reaches_them(db, world, as_user):
    db.add(
        models.Post(
            mahalla_id=world.mahalla_id,
            author_id=world.founder_id,
            type="announcement",
            title="Shanba kuni hashar",
        )
    )
    db.commit()
    person = _outsider(db)
    _link(db, world, person.id)
    news = as_user(person.full_name).get("/api/away/home").json()["news"]
    assert [n["title"] for n in news] == ["Shanba kuni hashar"]


def test_a_death_at_home_reaches_them(db, world, as_user):
    """The single most important thing on this list — someone abroad must not be the
    last to hear that a neighbour has died."""
    db.add(
        models.Post(
            mahalla_id=world.mahalla_id,
            author_id=world.founder_id,
            type="taziya",
            title="Rustam ota",
            event_date=datetime.utcnow() + timedelta(hours=4),
            place="Yoshlik masjidi",
        )
    )
    db.commit()
    person = _outsider(db)
    _link(db, world, person.id)
    news = as_user(person.full_name).get("/api/away/home").json()["news"]
    assert news[0]["type"] == "taziya"
    assert news[0]["place"] == "Yoshlik masjidi"


def test_neighbours_photo_posts_do_not_leave_the_mahalla(db, world, as_user):
    """The emotionally richest content in the app, and excluded on purpose: these
    are photographs of neighbours' faces and courtyards. A photo directory is still
    a directory."""
    db.add(
        models.Post(
            mahalla_id=world.mahalla_id,
            author_id=world.founder_id,
            type="share",
            title="Guzarda bugun",
        )
    )
    db.commit()
    person = _outsider(db)
    _link(db, world, person.id)
    assert as_user(person.full_name).get("/api/away/home").json()["news"] == []


def test_help_requests_do_not_leave_the_mahalla(db, world, as_user):
    """Operational, other people's business, and unactionable from Moscow."""
    db.add(
        models.Post(
            mahalla_id=world.mahalla_id,
            author_id=world.founder_id,
            type="help",
            title="Narvon kerak",
            category="tool",
        )
    )
    db.commit()
    person = _outsider(db)
    _link(db, world, person.id)
    assert as_user(person.full_name).get("/api/away/home").json()["news"] == []


def test_the_news_carries_no_author(db, world, as_user):
    """Stripping the author is not an oversight — a feed of names IS the directory
    this feature exists to withhold."""
    db.add(
        models.Post(
            mahalla_id=world.mahalla_id,
            author_id=world.founder_id,
            type="announcement",
            title="Yig'in",
        )
    )
    db.commit()
    person = _outsider(db)
    _link(db, world, person.id)
    item = as_user(person.full_name).get("/api/away/home").json()["news"][0]
    assert "author" not in item
    assert "Founder Aka" not in str(item)


def test_the_family_list_carries_no_account_details(db, world, as_user):
    """A name, not a UserOut. An away member has no business receiving account ids,
    photos or reputation for anyone."""
    person = _outsider(db)
    _link(db, world, person.id)
    row = as_user(person.full_name).get("/api/away/home").json()["members"][0]
    assert set(row) == {"full_name", "is_elder"}


def test_another_mahallas_news_never_appears(db, world, as_user):
    db.add(
        models.Post(
            mahalla_id=world.other_mahalla_id,
            author_id=world.stranger_id,
            type="announcement",
            title="Boshqa mahalla",
        )
    )
    db.commit()
    person = _outsider(db)
    _link(db, world, person.id)
    assert as_user(person.full_name).get("/api/away/home").json()["news"] == []


def test_only_four_post_types_ever_leave(db, world):
    """A guard on the list itself: adding a type here is a privacy decision, and it
    should be impossible to make it by accident."""
    assert set(away_router.AWAY_POST_TYPES) == {"announcement", "taziya", "event", "charity"}


def test_status_tells_the_client_where_to_send_someone(db, world, as_user):
    person = _outsider(db)
    me = as_user(person.full_name)
    assert me.get("/api/away/status").json()["status"] == "none"
    _link(db, world, person.id, status="pending")
    assert me.get("/api/away/status").json()["status"] == "pending"
