"""Feed pagination (#19). Keyset, not offset — the property that matters is that
a post arriving mid-scroll cannot make page two repeat or skip a row."""

from datetime import timedelta

from app import models
from app.routers.posts import PAGE_SIZE


def _fill(db, world, n, *, start=0):
    """n announcements, oldest first, one minute apart so the order is unambiguous."""
    base = models.utcnow() - timedelta(days=1)
    for i in range(start, start + n):
        db.add(
            models.Post(
                mahalla_id=world.mahalla_id,
                author_id=world.founder_id,
                type="announcement",
                title=f"E'lon {i}",
                created_at=base + timedelta(minutes=i),
            )
        )
    db.commit()


def test_a_short_feed_comes_back_in_one_page(db, world, as_user):
    _fill(db, world, 3)
    page = as_user(world.neighbor).get("/api/posts").json()
    assert len(page["items"]) == 3
    assert page["next_cursor"] is None  # nothing after this page


def test_a_long_feed_is_cut_into_pages(db, world, as_user):
    _fill(db, world, PAGE_SIZE + 4)
    member = as_user(world.neighbor)

    first = member.get("/api/posts").json()
    assert len(first["items"]) == PAGE_SIZE
    assert first["next_cursor"] is not None

    second = member.get(f"/api/posts?cursor={first['next_cursor']}").json()
    assert len(second["items"]) == 4
    assert second["next_cursor"] is None


def test_pages_do_not_overlap_or_skip(db, world, as_user):
    _fill(db, world, PAGE_SIZE * 2)
    member = as_user(world.neighbor)
    seen, cursor = [], None
    while True:
        url = "/api/posts" + (f"?cursor={cursor}" if cursor else "")
        page = member.get(url).json()
        seen.extend(p["id"] for p in page["items"])
        cursor = page["next_cursor"]
        if cursor is None:
            break
    assert len(seen) == len(set(seen)), "a post appeared on two pages"
    assert len(seen) == db.query(models.Post).filter_by(mahalla_id=world.mahalla_id).count()


def test_a_post_arriving_mid_scroll_does_not_shift_the_next_page(db, world, as_user):
    """The reason for keyset over OFFSET: with OFFSET, inserting at the top pushes
    every row down one and page two repeats page one's last post."""
    _fill(db, world, PAGE_SIZE + 3)
    member = as_user(world.neighbor)

    first = member.get("/api/posts").json()
    first_ids = [p["id"] for p in first["items"]]

    # a neighbour posts while the reader is still on page one
    as_user(world.founder).post("/api/posts", json={"type": "announcement", "title": "Yangi"})

    second = member.get(f"/api/posts?cursor={first['next_cursor']}").json()
    assert not set(first_ids) & {p["id"] for p in second["items"]}


def test_newest_first(db, world, as_user):
    _fill(db, world, 5)
    items = as_user(world.neighbor).get("/api/posts").json()["items"]
    assert [p["title"] for p in items] == [f"E'lon {i}" for i in (4, 3, 2, 1, 0)]


def test_a_broken_cursor_is_rejected(db, world, as_user):
    r = as_user(world.neighbor).get("/api/posts?cursor=nonsense")
    assert r.status_code == 400


def test_the_pinned_post_leads_page_one_and_repeats_nowhere(db, world, as_user):
    """The pin floats above its own date, so it must be kept out of the paged
    query — otherwise it shows twice: once at the top, once where its date falls."""
    _fill(db, world, PAGE_SIZE + 5)
    oldest = (
        db.query(models.Post)
        .filter_by(mahalla_id=world.mahalla_id)
        .order_by(models.Post.created_at.asc())
        .first()
    )
    mahalla = db.get(models.Mahalla, world.mahalla_id)
    mahalla.pinned_post_id = oldest.id
    db.commit()

    member = as_user(world.neighbor)
    first = member.get("/api/posts").json()
    assert first["items"][0]["id"] == oldest.id
    assert first["items"][0]["pinned"] is True

    seen = [p["id"] for p in first["items"]]
    cursor = first["next_cursor"]
    while cursor:
        page = member.get(f"/api/posts?cursor={cursor}").json()
        seen.extend(p["id"] for p in page["items"])
        cursor = page["next_cursor"]
    assert seen.count(oldest.id) == 1


def test_a_filtered_feed_pages_too(db, world, as_user):
    _fill(db, world, PAGE_SIZE + 2)
    page = as_user(world.neighbor).get("/api/posts?type=announcement").json()
    assert len(page["items"]) == PAGE_SIZE
    assert page["next_cursor"] is not None


def test_discover_pages_the_same_way(db, world, as_user):
    base = models.utcnow() - timedelta(days=1)
    for i in range(PAGE_SIZE + 2):
        db.add(
            models.Post(
                mahalla_id=world.mahalla_id,
                author_id=world.founder_id,
                type="share",
                title=f"Rasm {i}",
                created_at=base + timedelta(minutes=i),
            )
        )
    db.commit()
    page = as_user(world.neighbor).get("/api/posts/discover?scope=country").json()
    assert len(page["items"]) == PAGE_SIZE
    assert page["next_cursor"] is not None


# ---------- the Bugun briefing counts the mahalla, not the loaded page ----------


def test_bugun_counts_open_help_beyond_the_first_page(db, world, as_user):
    """The card used to derive this from the posts the feed had loaded, which would
    now silently mean 'open help on page one'."""
    base = models.utcnow() - timedelta(days=1)
    for i in range(PAGE_SIZE + 3):
        db.add(
            models.Post(
                mahalla_id=world.mahalla_id,
                author_id=world.founder_id,
                type="help",
                title=f"Yordam {i}",
                category="tool",
                created_at=base + timedelta(minutes=i),
            )
        )
    db.commit()
    out = as_user(world.neighbor).get("/api/posts/bugun").json()
    assert out["open_help_count"] == PAGE_SIZE + 3


def test_bugun_ignores_resolved_help(db, world, as_user):
    db.add(
        models.Post(
            mahalla_id=world.mahalla_id, author_id=world.founder_id, type="help",
            title="Bitgan", category="tool", status="resolved",
        )
    )
    db.commit()
    assert as_user(world.neighbor).get("/api/posts/bugun").json()["open_help_count"] == 0


def test_bugun_surfaces_the_next_event(db, world, as_user):
    now = models.utcnow()
    db.add_all([
        models.Post(
            mahalla_id=world.mahalla_id, author_id=world.founder_id, type="event",
            title="Keyingi hafta", event_date=now + timedelta(days=7),
        ),
        models.Post(
            mahalla_id=world.mahalla_id, author_id=world.founder_id, type="event",
            title="Ertaga to'y", event_date=now + timedelta(days=1),
        ),
    ])
    db.commit()
    out = as_user(world.neighbor).get("/api/posts/bugun").json()
    assert out["next_event"]["title"] == "Ertaga to'y"  # soonest, not newest


def test_bugun_forgets_an_event_once_the_day_is_over(db, world, as_user):
    db.add(
        models.Post(
            mahalla_id=world.mahalla_id, author_id=world.founder_id, type="event",
            title="O'tgan to'y", event_date=models.utcnow() - timedelta(days=2),
        )
    )
    db.commit()
    assert as_user(world.neighbor).get("/api/posts/bugun").json()["next_event"] is None


def test_bugun_is_scoped_to_your_own_mahalla(db, world, as_user):
    db.add(
        models.Post(
            mahalla_id=world.other_mahalla_id, author_id=world.stranger_id, type="help",
            title="Boshqa mahalla", category="tool",
        )
    )
    db.commit()
    assert as_user(world.neighbor).get("/api/posts/bugun").json()["open_help_count"] == 0
