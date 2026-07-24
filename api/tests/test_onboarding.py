"""The activation checklist derives its steps from real state."""


def test_onboarding_reflects_state_and_updates(world, as_user):
    founder = as_user(world.founder)  # owns the verified Alfa household (with history)
    data = founder.get("/api/me/onboarding").json()
    steps = {s["key"]: s["done"] for s in data["steps"]}

    assert steps["household"] is True   # founder owns a household
    assert steps["history"] is True     # Alfa has family_history seeded
    assert steps["location"] is False   # no DingDong coordinates yet
    assert steps["post"] is False       # hasn't posted
    assert data["complete"] is False
    before = data["done_count"]

    # posting flips the 'post' step and advances the counter
    r = founder.post("/api/posts", json={"type": "announcement", "title": "Assalomu alaykum"})
    assert r.status_code == 200
    after = founder.get("/api/me/onboarding").json()
    assert {s["key"]: s["done"] for s in after["steps"]}["post"] is True
    assert after["done_count"] == before + 1


def test_onboarding_requires_membership(as_user):
    # a user who hasn't joined a mahalla has no checklist
    assert as_user("Mahallasiz Odam").get("/api/me/onboarding").status_code == 403
