"""«Xabar bering» — ta'ziya and shoshilinch (#56).

These two post types are different in kind from the rest of the feed: a help request
is an invitation, a ta'ziya is a duty. In an Uzbek mahalla the gates of a bereaved
house stand open for three days and any neighbour may enter, so "nobody told me" is
a real social injury — and the mechanism it replaces is a phone tree that is slow and
drops people.

Because they are duties they are also the loudest thing the app can do, so most of
what is tested here is the guards: who may announce a death, what an emergency must
carry, and whether the notification a grieving family's neighbours receive reads
with any dignity at all.
"""

from datetime import datetime, timedelta

from app import lifecycle, models

JANOZA = (datetime.utcnow() + timedelta(hours=6)).isoformat()


def _taziya(client, **over):
    body = {
        "type": "taziya",
        "title": "Rustam ota Ergashaliyev",
        "event_date": JANOZA,
        "place": "Yoshlik masjidi",
        "body": "Uch kun eshik ochiq.",
    }
    body.update(over)
    return client.post("/api/posts", json=body)


def _emergency(client, **over):
    body = {"type": "shoshilinch", "title": "Yong'in — 2-ko'cha", "category": "fire"}
    body.update(over)
    return client.post("/api/posts", json=body)


def _make_raisi(db, world, user_id):
    m = db.get(models.Mahalla, world.mahalla_id)
    m.raisi_user_id = user_id
    db.commit()


# ---------- ta'ziya ----------


def test_a_verified_household_can_announce_a_death(db, world, as_user):
    r = _taziya(as_user(world.founder))  # founder owns the VERIFIED Alfa household
    assert r.status_code == 200, r.text
    assert r.json()["type"] == "taziya"
    assert r.json()["place"] == "Yoshlik masjidi"


def test_the_whole_mahalla_is_told_at_once(db, world, as_user):
    """The phone tree this replaces takes an hour and misses people."""
    _taziya(as_user(world.founder))
    told = db.query(models.Notification).filter_by(event="taziya_posted").count()
    members = db.query(models.User).filter_by(mahalla_id=world.mahalla_id).count()
    assert told == members - 1  # everyone but the announcer


def test_the_notice_carries_the_janoza_time(db, world, as_user):
    """It is what people act on without opening anything."""
    _taziya(as_user(world.founder))
    n = db.query(models.Notification).filter_by(event="taziya_posted").first()
    assert n.params["when"]
    assert n.params["name"] == "Rustam ota Ergashaliyev"


def test_the_notice_does_not_read_like_someone_posted_something(db, world, as_user):
    """A death notice arriving as "📌 Founder Aka: Rustam ota" is a small cruelty.
    It gets its own copy, with no author byline."""
    _taziya(as_user(world.founder))
    n = db.query(models.Notification).filter_by(event="taziya_posted").first()
    assert "Founder Aka" not in n.text
    assert n.type == "taziya"  # not the generic "post" bucket


def test_an_unverified_household_cannot_announce_a_death(db, world, as_user):
    """A false death notice is not spam, it is a desecration, and it would reach
    every phone in the mahalla before anyone could stop it."""
    assert _taziya(as_user(world.neighbor)).status_code == 403


def test_the_raisi_can_announce_even_without_a_household(db, world, as_user):
    """So a mahalla whose families have not registered yet is never left unable to
    announce a death."""
    _make_raisi(db, world, world.neighbor_id)  # neighbour has no household
    assert _taziya(as_user(world.neighbor)).status_code == 200


def test_a_death_notice_needs_a_janoza_time(db, world, as_user):
    r = _taziya(as_user(world.founder), event_date=None)
    assert r.status_code == 400


def test_a_death_notice_needs_a_name(db, world, as_user):
    assert _taziya(as_user(world.founder), title="").status_code == 400


def test_the_mourning_calendar_keeps_it_on_the_feed(db, world):
    """Three days of open gates, then the yigirmasi (20th) and the qirqi (40th).
    Ageing a death away after a week would drop people from a commemoration."""
    assert lifecycle.FEED_WINDOW["taziya"] > timedelta(days=40)


def test_a_ta_ziya_reaches_the_feed(db, world, as_user):
    _taziya(as_user(world.founder))
    feed = as_user(world.neighbor).get("/api/posts").json()["items"]
    assert [p["type"] for p in feed] == ["taziya"]


# ---------- shoshilinch ----------


def test_anyone_can_raise_an_emergency(db, world, as_user):
    """Deliberately ungated. A newcomer whose house is burning must not be told to
    get their household vouched for first."""
    r = _emergency(as_user(world.neighbor))  # no household at all
    assert r.status_code == 200, r.text


def test_an_emergency_needs_a_kind(db, world, as_user):
    """"Shoshilinch" alone tells a neighbour nothing about whether to bring a bucket
    or a car."""
    assert _emergency(as_user(world.neighbor), category=None).status_code == 400


def test_a_help_category_is_not_an_emergency_category(db, world, as_user):
    """The two sets share a column; only one of them is legal here."""
    assert _emergency(as_user(world.neighbor), category="childcare").status_code == 400


def test_an_emergency_category_is_not_a_help_category(db, world, as_user):
    """And the reverse, so the column cannot be filled with a nonsense pair."""
    r = as_user(world.neighbor).post(
        "/api/posts", json={"type": "help", "title": "Narvon kerak", "category": "fire"}
    )
    # 400, not 422: the legal set depends on a sibling field, which Pydantic cannot
    # express, so the router rejects it with a message a person can act on
    assert r.status_code == 400


def test_an_emergency_notification_has_no_dangling_separator(db, world, as_user):
    """It has no scheduled time — it is happening now — so its copy takes the title
    alone rather than ending in a stray punctuation mark."""
    _emergency(as_user(world.neighbor))
    n = db.query(models.Notification).filter_by(event="emergency_posted").first()
    assert "when" not in (n.params or {})
    assert not n.text.rstrip().endswith("·")


def test_an_emergency_can_be_closed_when_it_is_over(db, world, as_user):
    me = as_user(world.neighbor)
    pid = _emergency(me).json()["id"]
    assert me.post(f"/api/posts/{pid}/close").status_code in (200, 204)
    assert db.get(models.Post, pid).status == "closed"


def test_an_emergency_goes_stale_fast(db, world):
    """A week-old 🚨 at the top of the feed teaches people to ignore the siren."""
    assert lifecycle.FEED_WINDOW["shoshilinch"] <= timedelta(days=7)


def test_an_old_emergency_leaves_the_feed(db, world, as_user):
    post = models.Post(
        mahalla_id=world.mahalla_id,
        author_id=world.founder_id,
        type="shoshilinch",
        title="Eski yong'in",
        category="fire",
        created_at=datetime.utcnow() - timedelta(days=30),
    )
    db.add(post)
    db.commit()
    feed = as_user(world.neighbor).get("/api/posts").json()["items"]
    assert feed == []


def test_an_old_emergency_is_still_reachable_by_link(db, world, as_user):
    """Ageing out is about the front page, never about deletion."""
    post = models.Post(
        mahalla_id=world.mahalla_id,
        author_id=world.founder_id,
        type="shoshilinch",
        title="Eski yong'in",
        category="fire",
        created_at=datetime.utcnow() - timedelta(days=30),
    )
    db.add(post)
    db.commit()
    assert as_user(world.neighbor).get(f"/api/posts/{post.id}").status_code == 200


# ---------- scope + shared plumbing ----------


def test_a_broadcast_does_not_cross_mahallas(db, world, as_user):
    _taziya(as_user(world.founder))
    assert db.query(models.Notification).filter_by(user_id=world.stranger_id).count() == 0


def test_place_is_stored_for_events_too(db, world, as_user):
    """The field was added for ta'ziya and closes the same gap on events, which
    until now carried a time and no location at all."""
    r = as_user(world.founder).post(
        "/api/posts",
        json={
            "type": "event",
            "title": "Hashar",
            "event_date": JANOZA,
            "place": "Guzar oldida",
        },
    )
    assert r.json()["place"] == "Guzar oldida"


def test_a_blank_place_is_stored_as_nothing(db, world, as_user):
    """So the client can test for absence instead of for whitespace."""
    r = _taziya(as_user(world.founder), place="   ")
    assert r.json()["place"] is None
