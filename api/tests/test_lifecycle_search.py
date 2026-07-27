"""Content lifecycle + in-mahalla search (#38).

Lifecycle is a query-time filter, so these tests place posts in the past and assert
what the feed shows. Search is folded in Python, so these tests pin the Uzbek cases
that made SQL matching unusable: apostrophe variants and Cyrillic-to-Latin.
"""

from datetime import timedelta

from app import lifecycle, models, search_text


def _post(db, world, **kw):
    kw.setdefault("type", "announcement")
    kw.setdefault("title", "E'lon")
    p = models.Post(mahalla_id=world.mahalla_id, author_id=world.founder_id, **kw)
    db.add(p)
    db.commit()
    return p


def _feed_ids(client):
    return [p["id"] for p in client.get("/api/posts").json()["items"]]


# ---------- lifecycle ----------


def test_a_recent_post_is_on_the_feed(db, world, as_user):
    p = _post(db, world, created_at=models.utcnow() - timedelta(days=2))
    assert p.id in _feed_ids(as_user(world.neighbor))


def test_an_old_announcement_ages_off(db, world, as_user):
    old = _post(db, world, created_at=models.utcnow() - timedelta(days=40))
    assert old.id not in _feed_ids(as_user(world.neighbor))


def test_windows_differ_by_type(db, world, as_user):
    """A charity collection runs all season; an announcement is stale in three weeks."""
    at = models.utcnow() - timedelta(days=45)
    charity = _post(db, world, type="charity", title="Yordam yig'amiz", created_at=at)
    announcement = _post(db, world, type="announcement", title="Hashar", created_at=at)
    feed = _feed_ids(as_user(world.neighbor))
    assert charity.id in feed
    assert announcement.id not in feed


def test_an_event_lives_by_its_date_not_its_post_date(db, world, as_user):
    """A to'y announced two months ago but happening tomorrow is very much current."""
    p = _post(
        db, world, type="event", title="To'y",
        created_at=models.utcnow() - timedelta(days=60),
        event_date=models.utcnow() + timedelta(days=1),
    )
    assert p.id in _feed_ids(as_user(world.neighbor))


def test_an_event_goes_the_day_after_it_happens(db, world, as_user):
    p = _post(
        db, world, type="event", title="O'tgan to'y",
        created_at=models.utcnow() - timedelta(days=3),
        event_date=models.utcnow() - timedelta(days=2),
    )
    assert p.id not in _feed_ids(as_user(world.neighbor))


def test_an_event_tonight_is_still_on_the_feed(db, world, as_user):
    p = _post(
        db, world, type="event", title="Bugungi to'y",
        event_date=models.utcnow() - timedelta(hours=4),
    )
    assert p.id in _feed_ids(as_user(world.neighbor))


def test_a_settled_post_lingers_briefly_then_goes(db, world, as_user):
    now = models.utcnow()
    fresh = _post(db, world, type="help", title="Yangi bitgan", category="tool",
                  status="resolved", resolved_at=now - timedelta(hours=6))
    stale = _post(db, world, type="help", title="Eski bitgan", category="tool",
                  status="resolved", resolved_at=now - timedelta(days=10))
    feed = _feed_ids(as_user(world.neighbor))
    assert fresh.id in feed
    assert stale.id not in feed


def test_closing_a_post_stamps_when_it_settled(db, world, as_user):
    """Without the stamp, lifecycle falls back to created_at and an old announcement
    the author closes today would disappear the instant they closed it."""
    p = _post(db, world, created_at=models.utcnow() - timedelta(days=15))
    as_user(world.founder).post(f"/api/posts/{p.id}/close")
    db.refresh(p)
    assert p.resolved_at is not None
    assert p.id in _feed_ids(as_user(world.neighbor))


def test_a_filter_shows_the_full_history(db, world, as_user):
    """Asking for a type on purpose means asking for its history, lifecycle aside."""
    old = _post(db, world, type="help", title="Eski yordam", category="tool",
                created_at=models.utcnow() - timedelta(days=90))
    member = as_user(world.neighbor)
    assert old.id not in _feed_ids(member)
    filtered = member.get("/api/posts?type=help").json()["items"]
    assert old.id in [p["id"] for p in filtered]


def test_an_aged_out_post_still_opens_by_link(db, world, as_user):
    """Ageing off the feed is not deletion — the URL still works."""
    old = _post(db, world, created_at=models.utcnow() - timedelta(days=90))
    assert as_user(world.neighbor).get(f"/api/posts/{old.id}").status_code == 200


def test_a_pinned_post_survives_the_lifecycle(db, world, as_user):
    """The raisi pinned it deliberately; age must not override that."""
    old = _post(db, world, created_at=models.utcnow() - timedelta(days=200))
    mahalla = db.get(models.Mahalla, world.mahalla_id)
    mahalla.pinned_post_id = old.id
    db.commit()
    assert _feed_ids(as_user(world.neighbor))[0] == old.id


def test_on_feed_is_a_pure_filter_and_writes_nothing(db, world):
    """The whole point of query-time: no column, no job, nothing to half-run."""
    old = _post(db, world, created_at=models.utcnow() - timedelta(days=90))
    db.query(models.Post).filter(lifecycle.on_feed()).all()
    db.refresh(old)
    assert old.status == "open"  # untouched


# ---------- folding ----------


def test_fold_ignores_apostrophe_style():
    assert search_text.fold("qo'shni") == search_text.fold("qoʻshni")
    assert search_text.fold("qo‘shni") == search_text.fold("qo'shni")
    assert search_text.fold("qoshni") == search_text.fold("qo'shni")


def test_fold_maps_cyrillic_onto_latin():
    assert search_text.fold("қўшни") == search_text.fold("qoshni")
    assert search_text.fold("ЁРДАМ") == search_text.fold("yordam")


def test_fold_is_case_insensitive():
    assert search_text.fold("Narvon") == search_text.fold("NARVON")


# ---------- search ----------


def test_search_finds_a_post_by_title(db, world, as_user):
    p = _post(db, world, type="help", title="Narvon kerak", category="tool")
    out = as_user(world.neighbor).get("/api/search?q=narvon").json()
    assert [x["id"] for x in out["posts"]] == [p.id]


def test_search_finds_a_post_by_body(db, world, as_user):
    p = _post(db, world, title="E'lon", body="Tomdagi uzumni tushirishga yordam")
    out = as_user(world.neighbor).get("/api/search?q=uzum").json()
    assert [x["id"] for x in out["posts"]] == [p.id]


def test_a_cyrillic_query_finds_latin_content(db, world, as_user):
    """A grandmother typing Cyrillic must find the Latin post — same word."""
    p = _post(db, world, title="Qo'shnilarga yordam kerak")
    out = as_user(world.neighbor).get("/api/search?q=ёрдам").json()
    assert [x["id"] for x in out["posts"]] == [p.id]


def test_a_query_without_apostrophes_still_matches(db, world, as_user):
    p = _post(db, world, title="Qo'shni yordami")
    out = as_user(world.neighbor).get("/api/search?q=qoshni").json()
    assert [x["id"] for x in out["posts"]] == [p.id]


def test_search_finds_a_service(db, world, as_user):
    as_user(world.founder).post(
        "/api/services", json={"title": "Tikuvchilik", "category": "skill", "contact": "901"}
    )
    out = as_user(world.neighbor).get("/api/search?q=tikuv").json()
    assert [s["title"] for s in out["services"]] == ["Tikuvchilik"]


def test_search_finds_what_the_feed_has_aged_out(db, world, as_user):
    """Finding the thing that scrolled away is the entire point of search."""
    old = _post(db, world, title="Eski hashar e'loni",
                created_at=models.utcnow() - timedelta(days=90))
    member = as_user(world.neighbor)
    assert old.id not in _feed_ids(member)
    out = member.get("/api/search?q=hashar").json()
    assert [p["id"] for p in out["posts"]] == [old.id]


def test_search_never_crosses_the_mahalla_boundary(db, world, as_user):
    db.add(
        models.Post(
            mahalla_id=world.other_mahalla_id, author_id=world.stranger_id,
            type="announcement", title="Boshqa mahalla hashari",
        )
    )
    db.commit()
    out = as_user(world.neighbor).get("/api/search?q=hashar").json()
    assert out["posts"] == []


def test_a_share_post_from_another_mahalla_is_not_searchable(db, world, as_user):
    """Discover shows these; search must not, or mahalla scoping gains a footnote."""
    db.add(
        models.Post(
            mahalla_id=world.other_mahalla_id, author_id=world.stranger_id,
            type="share", title="Boshqa mahalla rasmi",
        )
    )
    db.commit()
    out = as_user(world.neighbor).get("/api/search?q=rasmi").json()
    assert out["posts"] == []


def test_a_one_character_query_returns_nothing(db, world, as_user):
    _post(db, world, title="Narvon")
    out = as_user(world.neighbor).get("/api/search?q=n").json()
    assert out["posts"] == [] and out["services"] == []


def test_search_requires_a_login(db, world, client):
    assert client.get("/api/search?q=narvon").status_code == 401


def test_each_mahalla_searches_only_its_own(db, world, as_user):
    """The stranger is a member — of the other mahalla. Same query, disjoint results."""
    _post(db, world, title="Yoshlik hashari")
    db.add(
        models.Post(
            mahalla_id=world.other_mahalla_id, author_id=world.stranger_id,
            type="announcement", title="Boshqa hashar",
        )
    )
    db.commit()
    ours = as_user(world.neighbor).get("/api/search?q=hashar").json()["posts"]
    theirs = as_user(world.stranger).get("/api/search?q=hashar").json()["posts"]
    assert [p["title"] for p in ours] == ["Yoshlik hashari"]
    assert [p["title"] for p in theirs] == ["Boshqa hashar"]
