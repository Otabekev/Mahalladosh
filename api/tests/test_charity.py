"""Charity progress (#15). There is no payment rail, so `collected` is a number a
human types — these tests pin the guardrails that makes it trustworthy enough to
show, and the arithmetic that has to be right because it is about money."""


def _charity(client, goal_amount=1_000_000):
    return client.post(
        "/api/posts",
        json={
            "type": "charity",
            "title": "Maktabga kitob yig'amiz",
            "goal": "Kitoblar",
            "goal_amount": goal_amount,
        },
    )


def test_a_collection_starts_empty(db, world, as_user):
    out = _charity(as_user(world.founder)).json()
    assert out["charity_goal_amount"] == 1_000_000
    assert out["charity_collected_amount"] == 0
    assert out["charity_percent"] == 0
    assert out["charity_updated_at"] is None


def test_the_author_reports_progress(db, world, as_user):
    author = as_user(world.founder)
    pid = _charity(author).json()["id"]
    out = author.patch(f"/api/posts/{pid}/charity", json={"collected": 250_000}).json()
    assert out["charity_collected_amount"] == 250_000
    assert out["charity_percent"] == 25
    assert out["charity_updated_at"] is not None  # when it was reported is always shown


def test_only_the_author_may_report(db, world, as_user):
    """Not even the raisi: a figure about money needs exactly one accountable author."""
    pid = _charity(as_user(world.founder)).json()["id"]
    r = as_user(world.neighbor).patch(f"/api/posts/{pid}/charity", json={"collected": 999_999})
    assert r.status_code == 403


def test_the_amount_may_be_corrected_downwards(db, world, as_user):
    """Refusing a decrease would make an honest typo permanent."""
    author = as_user(world.founder)
    pid = _charity(author).json()["id"]
    author.patch(f"/api/posts/{pid}/charity", json={"collected": 5_000_000})  # typo
    out = author.patch(f"/api/posts/{pid}/charity", json={"collected": 500_000}).json()
    assert out["charity_collected_amount"] == 500_000


def test_percent_is_clamped_at_a_hundred(db, world, as_user):
    """An over-subscribed collection reads 100%, not 143%."""
    author = as_user(world.founder)
    pid = _charity(author).json()["id"]
    out = author.patch(f"/api/posts/{pid}/charity", json={"collected": 1_430_000}).json()
    assert out["charity_percent"] == 100
    assert out["charity_collected_amount"] == 1_430_000  # the real figure is not clamped


def test_a_negative_amount_is_rejected(db, world, as_user):
    author = as_user(world.founder)
    pid = _charity(author).json()["id"]
    assert author.patch(f"/api/posts/{pid}/charity", json={"collected": -1}).status_code == 422


def test_a_collection_without_a_goal_has_no_percentage(db, world, as_user):
    """Some collections are open-ended; dividing by zero must not 500."""
    author = as_user(world.founder)
    pid = _charity(author, goal_amount=None).json()["id"]
    out = author.patch(f"/api/posts/{pid}/charity", json={"collected": 300_000}).json()
    assert out["charity_goal_amount"] is None
    assert out["charity_percent"] == 0
    assert out["charity_collected_amount"] == 300_000


def test_reporting_on_a_non_charity_post_is_rejected(db, world, as_user):
    author = as_user(world.founder)
    pid = author.post("/api/posts", json={"type": "announcement", "title": "E'lon"}).json()["id"]
    assert author.patch(f"/api/posts/{pid}/charity", json={"collected": 1}).status_code == 400


def test_a_goal_amount_is_ignored_on_other_types(db, world, as_user):
    out = as_user(world.founder).post(
        "/api/posts",
        json={"type": "announcement", "title": "E'lon", "goal_amount": 500_000},
    ).json()
    assert out["charity_goal_amount"] is None


def test_progress_shows_on_the_feed_card(db, world, as_user):
    author = as_user(world.founder)
    pid = _charity(author).json()["id"]
    author.patch(f"/api/posts/{pid}/charity", json={"collected": 400_000})
    card = next(
        p for p in as_user(world.neighbor).get("/api/posts").json()["items"] if p["id"] == pid
    )
    assert card["charity_percent"] == 40


def test_another_mahalla_cannot_report_on_your_collection(db, world, as_user):
    pid = _charity(as_user(world.founder)).json()["id"]
    r = as_user(world.stranger).patch(f"/api/posts/{pid}/charity", json={"collected": 1})
    assert r.status_code == 404
