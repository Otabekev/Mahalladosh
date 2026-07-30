"""Rate limiting (#54).

The limiter is in-process and best-effort by design — the thing it defends against
is one neighbour hammering a button, not a distributed attacker. These tests pin
the behaviour that matters: the expensive fan-out is capped, an ordinary neighbour
never notices, and one account's limit is not another's.
"""

from app import ratelimit


def _post(client, n):
    return client.post("/api/posts", json={"type": "announcement", "title": f"E'lon {n}"})


def test_an_ordinary_neighbour_never_meets_the_limit(db, world, as_user):
    """The limits exist to stop a stuck finger, not to ration real use."""
    author = as_user(world.founder)
    for i in range(5):
        assert _post(author, i).status_code == 200


def test_the_fan_out_is_capped(db, world, as_user):
    """A post notifies the whole mahalla in-app and by Telegram DM, so a loop
    would send thousands of messages."""
    author = as_user(world.founder)
    cap, _ = ratelimit.LIMITS["post"]
    codes = [_post(author, i).status_code for i in range(cap + 3)]
    assert codes.count(200) == cap
    assert 429 in codes


def test_a_throttled_reply_says_when_to_come_back(db, world, as_user):
    author = as_user(world.founder)
    cap, _ = ratelimit.LIMITS["post"]
    last = None
    for i in range(cap + 1):
        last = _post(author, i)
    assert last.status_code == 429
    assert int(last.headers["Retry-After"]) > 0


def test_one_neighbour_cannot_throttle_another(db, world, as_user):
    """Limits are per account. A shared bucket would let one person silence
    everyone else in the mahalla."""
    cap, _ = ratelimit.LIMITS["post"]
    noisy = as_user(world.founder)
    for i in range(cap + 2):
        _post(noisy, i)
    assert _post(as_user(world.neighbor), 0).status_code == 200


def test_actions_have_separate_budgets(db, world, as_user):
    """Spending the post budget must not stop someone searching."""
    author = as_user(world.founder)
    cap, _ = ratelimit.LIMITS["post"]
    for i in range(cap + 2):
        _post(author, i)
    assert author.get("/api/search?q=elon").status_code == 200


def test_an_unknown_action_is_allowed_through(db, world):
    """Fail open on a typo: a mistyped action name in a route should not silently
    deny service to real people."""
    ratelimit.check("no-such-action", 1)  # must not raise


def test_the_window_slides(db, world, monkeypatch):
    """Old hits fall out, so a limit is a rate and not a lifetime quota."""
    import time as real_time

    clock = {"t": 1000.0}
    monkeypatch.setattr(ratelimit.time, "monotonic", lambda: clock["t"])
    cap, window = ratelimit.LIMITS["post"]

    for _ in range(cap):
        ratelimit.check("post", 42)
    try:
        ratelimit.check("post", 42)
        raise AssertionError("expected the cap to bite")
    except Exception as exc:  # HTTPException
        assert getattr(exc, "status_code", None) == 429

    clock["t"] += window + 1
    ratelimit.check("post", 42)  # the window has slid; allowed again
    assert real_time is not None
