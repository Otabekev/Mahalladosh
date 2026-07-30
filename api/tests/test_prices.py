"""«Narx» — the district price board (#57).

Food is ~69% of the official minimum consumption basket, so these numbers are things
households plan around. That makes the tests about trust rather than features: can
one account move the median, does a stale price keep being quoted, and does the board
ever assert a trend it does not have the data for.
"""

from datetime import datetime, timedelta

from app import models
from app.routers import prices


def _seed(db, world, item, som, user_id, days_ago=0, market=None):
    when = datetime.utcnow() - timedelta(days=days_ago)
    db.add(
        models.PriceReport(
            district_id=world.district_id,
            mahalla_id=world.mahalla_id,
            user_id=user_id,
            item=item,
            som=som,
            market=market,
            day=when.strftime("%Y-%m-%d"),
            created_at=when,
        )
    )
    db.commit()


def _row(board, item):
    return next(r for r in board["items"] if r["item"] == item)


# ---------- reporting ----------


def test_reporting_a_price_answers_with_the_board(db, world, as_user):
    r = as_user(world.founder).post("/api/prices", json={"item": "non", "som": 4000})
    assert r.status_code == 200
    row = _row(r.json(), "non")
    assert row["som"] == 4000
    assert row["my_som"] == 4000
    assert row["reports"] == 1


def test_every_basket_item_is_listed_even_with_no_data(db, world, as_user):
    """An empty row is an invitation to answer; a missing row is a dead end."""
    board = as_user(world.founder).get("/api/prices").json()
    assert [r["item"] for r in board["items"]] == list(prices.ITEMS)
    assert all(r["som"] is None for r in board["items"])


def test_an_unanswered_item_is_null_and_not_zero(db, world, as_user):
    """A client would render 0 as "free"."""
    board = as_user(world.founder).get("/api/prices").json()
    assert _row(board, "guruch")["som"] is None


def test_an_unknown_item_is_refused(db, world, as_user):
    r = as_user(world.founder).post("/api/prices", json={"item": "telefon", "som": 4000})
    assert r.status_code == 400


def test_an_obvious_typo_is_refused(db, world, as_user):
    """A missing or extra zero, not a judgement about what things should cost."""
    assert as_user(world.founder).post(
        "/api/prices", json={"item": "non", "som": 3}
    ).status_code == 400
    assert as_user(world.founder).post(
        "/api/prices", json={"item": "non", "som": 900_000_000}
    ).status_code == 400


def test_correcting_a_price_the_same_day_replaces_it(db, world, as_user):
    """Someone who mistyped must always be able to fix it — a correction is not a
    second vote."""
    me = as_user(world.founder)
    me.post("/api/prices", json={"item": "non", "som": 40000})
    board = me.post("/api/prices", json={"item": "non", "som": 4000}).json()
    assert _row(board, "non")["som"] == 4000
    assert _row(board, "non")["reports"] == 1
    assert db.query(models.PriceReport).count() == 1


# ---------- the median, and why it is the median ----------


def test_the_board_reports_the_median(db, world, as_user):
    for som, uid in ((3800, world.founder_id), (4000, world.voucher_id), (4200, world.neighbor_id)):
        _seed(db, world, "non", som, uid)
    assert _row(as_user(world.founder).get("/api/prices").json(), "non")["som"] == 4000


def test_one_mistyped_zero_cannot_wreck_the_number(db, world, as_user):
    """The case the median exists for. A mean here would report 128 850 so'm for a
    loaf of bread, with a completely straight face."""
    for som, uid in (
        (4000, world.founder_id),
        (4200, world.voucher_id),
        (500_000, world.neighbor_id),  # meant 5 000
    ):
        _seed(db, world, "non", som, uid)
    assert _row(as_user(world.founder).get("/api/prices").json(), "non")["som"] == 4200


def test_one_account_cannot_move_the_median_by_repeating_itself(db, world, as_user):
    """One row per person per item per day is the anti-skew guard, not just an
    idempotency detail."""
    me = as_user(world.founder)
    for _ in range(10):
        me.post("/api/prices", json={"item": "non", "som": 90000})
    _seed(db, world, "non", 4000, world.voucher_id)
    _seed(db, world, "non", 4100, world.neighbor_id)
    assert _row(me.get("/api/prices").json(), "non")["som"] == 4100  # not 90 000


def test_an_even_sample_takes_the_middle_pair(db, world, as_user):
    for som, uid in ((4000, world.founder_id), (5000, world.voucher_id)):
        _seed(db, world, "non", som, uid)
    assert _row(as_user(world.founder).get("/api/prices").json(), "non")["som"] == 4500


# ---------- freshness and trend ----------


def test_a_fortnight_old_price_stops_being_quoted(db, world, as_user):
    """History, not news. Quoting it would be worse than admitting nobody knows."""
    _seed(db, world, "yog", 25000, world.founder_id, days_ago=20)
    assert _row(as_user(world.founder).get("/api/prices").json(), "yog")["som"] is None


def test_last_weeks_price_becomes_the_comparison(db, world, as_user):
    _seed(db, world, "gosht_mol", 90000, world.founder_id, days_ago=10)
    _seed(db, world, "gosht_mol", 99000, world.voucher_id, days_ago=1)
    row = _row(as_user(world.founder).get("/api/prices").json(), "gosht_mol")
    assert row["som"] == 99000
    assert row["was"] == 90000
    assert row["trend_pct"] == 10


def test_a_fall_shows_as_a_negative_trend(db, world, as_user):
    _seed(db, world, "kartoshka", 5000, world.founder_id, days_ago=9)
    _seed(db, world, "kartoshka", 4000, world.voucher_id, days_ago=1)
    assert _row(as_user(world.founder).get("/api/prices").json(), "kartoshka")["trend_pct"] == -20


def test_no_trend_is_claimed_from_a_single_week(db, world, as_user):
    """"Up 100%" computed against a week with no reports at all is worse than
    showing nothing."""
    _seed(db, world, "piyoz", 6000, world.founder_id)
    row = _row(as_user(world.founder).get("/api/prices").json(), "piyoz")
    assert row["was"] is None
    assert row["trend_pct"] is None


# ---------- scope ----------


def test_the_board_is_the_districts_not_the_mahallas(db, world, as_user):
    """A bazaar serves the whole tuman. This is also the cross-mahalla network
    effect: the other mahalla's reports make THIS board better."""
    db.add(
        models.PriceReport(
            district_id=world.district_id,
            mahalla_id=world.other_mahalla_id,
            user_id=world.stranger_id,
            item="non",
            som=4500,
            day=datetime.utcnow().strftime("%Y-%m-%d"),
        )
    )
    db.commit()
    assert _row(as_user(world.founder).get("/api/prices").json(), "non")["som"] == 4500


def test_another_districts_prices_do_not_leak_in(db, world, as_user, client):
    other_district = models.District(region_id=world.region_id, name_uz="Chust")
    db.add(other_district)
    db.flush()
    db.add(
        models.PriceReport(
            district_id=other_district.id,
            user_id=world.stranger_id,
            item="non",
            som=9999,
            day=datetime.utcnow().strftime("%Y-%m-%d"),
        )
    )
    db.commit()
    assert _row(as_user(world.founder).get("/api/prices").json(), "non")["som"] is None


def test_the_board_needs_a_login(db, world, client):
    assert client.get("/api/prices").status_code == 401


# ---------- the reports behind a number ----------


def test_the_individual_reports_are_visible(db, world, as_user):
    """A bare number nobody can trace is a number nobody trusts."""
    _seed(db, world, "non", 4000, world.founder_id, market="Pop bozori")
    detail = as_user(world.voucher).get("/api/prices/non").json()
    assert detail["reports"][0]["som"] == 4000
    assert detail["reports"][0]["market"] == "Pop bozori"
    assert detail["reports"][0]["by_name"] == "Founder Aka"


def test_the_reports_are_newest_first(db, world, as_user):
    _seed(db, world, "non", 3900, world.founder_id, days_ago=3)
    _seed(db, world, "non", 4100, world.voucher_id, days_ago=1)
    soms = [r["som"] for r in as_user(world.founder).get("/api/prices/non").json()["reports"]]
    assert soms == [4100, 3900]


def test_an_unknown_item_detail_is_a_404(db, world, as_user):
    assert as_user(world.founder).get("/api/prices/telefon").status_code == 404
