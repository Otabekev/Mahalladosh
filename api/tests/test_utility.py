"""«Chiroq bormi?» — the live light/gas/water board (#55).

The claim this feature makes is that it answers a question Telegram structurally
cannot: not "is there an outage in Namangan region" but "is it only my house?". So
the tests that matter are the ones about *whose* reports count, how recent they have
to be, and whether the derived history tells the truth when someone forgets to say
the power came back.
"""

from datetime import datetime, timedelta

from app import models
from app.routers import utility


def _report(db, world, user_id, kind, is_out, minutes_ago=0, household_id=None, street=None):
    """Insert a report at a chosen moment — the freshness window and the session
    derivation are both time-dependent, and only direct inserts can test them."""
    db.add(
        models.UtilityReport(
            mahalla_id=world.mahalla_id,
            user_id=user_id,
            household_id=household_id,
            street=street,
            kind=kind,
            is_out=is_out,
            created_at=datetime.utcnow() - timedelta(minutes=minutes_ago),
        )
    )
    db.commit()


def _status(board, kind):
    return next(s for s in board["statuses"] if s["kind"] == kind)


# ---------- reporting ----------


def test_a_tap_answers_with_the_whole_board(db, world, as_user):
    """The tap and the answer are one interaction: someone standing in the dark on a
    village connection should not need a second round trip to see the tally."""
    r = as_user(world.founder).post("/api/utility/report", json={"kind": "light", "is_out": True})
    assert r.status_code == 200
    board = r.json()
    assert {s["kind"] for s in board["statuses"]} == {"light", "gas", "water"}
    light = _status(board, "light")
    assert light["out"] == 1 and light["my_state"] == "out"


def test_changing_your_mind_replaces_your_answer(db, world, as_user):
    """The power came back. The tally must move, not accumulate."""
    me = as_user(world.founder)
    me.post("/api/utility/report", json={"kind": "light", "is_out": True})
    board = me.post("/api/utility/report", json={"kind": "light", "is_out": False}).json()
    light = _status(board, "light")
    assert light["out"] == 0
    assert light["on"] == 1
    assert light["my_state"] == "on"


def test_tapping_twice_is_still_one_house(db, world, as_user):
    """Only the latest report per person counts, so a jammed thumb cannot make one
    dark house look like a street-wide failure."""
    me = as_user(world.founder)
    for _ in range(4):
        board = me.post("/api/utility/report", json={"kind": "light", "is_out": True}).json()
    assert _status(board, "light")["out"] == 1


def test_the_kinds_are_independent(db, world, as_user):
    """Losing gas says nothing about the light. Uzbek villages routinely have one
    without the other."""
    me = as_user(world.founder)
    board = me.post("/api/utility/report", json={"kind": "gas", "is_out": True}).json()
    assert _status(board, "gas")["out"] == 1
    assert _status(board, "light")["answered"] == 0


def test_an_unknown_utility_is_refused(db, world, as_user):
    r = as_user(world.founder).post("/api/utility/report", json={"kind": "wifi", "is_out": True})
    assert r.status_code == 422  # rejected by the Literal before it reaches us


def test_the_board_needs_a_mahalla(db, world, as_user, client):
    assert client.get("/api/utility/board").status_code == 401


# ---------- freshness ----------


def test_a_stale_report_stops_speaking_for_you(db, world, as_user):
    """Without expiry, one person's "no light" in December would still be on the
    board in March because nobody ever said otherwise."""
    _report(db, world, world.founder_id, "light", True, minutes_ago=200)
    board = as_user(world.neighbor).get("/api/utility/board").json()
    assert _status(board, "light")["answered"] == 0


def test_a_recent_report_still_counts(db, world, as_user):
    _report(db, world, world.founder_id, "light", True, minutes_ago=30)
    board = as_user(world.neighbor).get("/api/utility/board").json()
    assert _status(board, "light")["out"] == 1


def test_the_episode_start_is_the_first_neighbour_who_went_dark(db, world, as_user):
    _report(db, world, world.founder_id, "light", True, minutes_ago=70)
    _report(db, world, world.voucher_id, "light", True, minutes_ago=10)
    board = as_user(world.neighbor).get("/api/utility/board").json()
    since = datetime.fromisoformat(_status(board, "light")["since"])
    assert (datetime.utcnow() - since) > timedelta(minutes=60)


def test_no_outage_means_no_since(db, world, as_user):
    _report(db, world, world.founder_id, "light", False, minutes_ago=5)
    board = as_user(world.neighbor).get("/api/utility/board").json()
    assert _status(board, "light")["since"] is None


# ---------- scope ----------


def test_another_mahalla_is_not_your_street(db, world, as_user):
    """The whole promise is locality. A dark house one mahalla over is noise."""
    db.add(
        models.UtilityReport(
            mahalla_id=world.other_mahalla_id,
            user_id=world.stranger_id,
            kind="light",
            is_out=True,
        )
    )
    db.commit()
    board = as_user(world.founder).get("/api/utility/board").json()
    assert _status(board, "light")["answered"] == 0


def test_streets_are_broken_out_darkest_first(db, world, as_user):
    """This is the answer no regional Telegram channel can give."""
    _report(db, world, world.founder_id, "light", True, 5, world.alfa_id, "Bog' ko'chasi")
    _report(db, world, world.voucher_id, "light", True, 5, world.beta_id, "Bog' ko'chasi")
    _report(db, world, world.neighbor_id, "light", False, 5, None, "Navoiy ko'chasi")
    streets = _status(as_user(world.founder).get("/api/utility/board").json(), "light")["streets"]
    assert [s["street"] for s in streets] == ["Bog' ko'chasi", "Navoiy ko'chasi"]
    assert streets[0]["out"] == 2 and streets[1]["on"] == 1


def test_a_member_without_a_household_still_gets_to_answer(db, world, as_user):
    """Not everyone has registered a family yet, and they still know whether their
    own light is on."""
    board = as_user(world.neighbor).post(
        "/api/utility/report", json={"kind": "water", "is_out": True}
    ).json()
    assert _status(board, "water")["out"] == 1
    assert _status(board, "water")["streets"] == []  # no street to attribute it to


# ---------- the mahalla-wide alert ----------


def test_enough_dark_houses_tells_the_mahalla(db, world, as_user):
    for uid, hid in (
        (world.founder_id, world.alfa_id),
        (world.voucher_id, world.beta_id),
    ):
        _report(db, world, uid, "light", True, 5, hid)
    as_user(world.neighbor).post("/api/utility/report", json={"kind": "light", "is_out": True})

    alerts = db.query(models.UtilityAlert).filter_by(mahalla_id=world.mahalla_id).all()
    assert len(alerts) == 1
    assert alerts[0].households == utility.ALERT_THRESHOLD
    assert db.query(models.Notification).filter_by(event="utility_out_light").count() > 0


def test_one_dark_house_is_a_fuse_not_an_alert(db, world, as_user):
    as_user(world.founder).post("/api/utility/report", json={"kind": "light", "is_out": True})
    assert db.query(models.UtilityAlert).count() == 0


def test_one_family_on_four_phones_is_one_dark_house(db, world):
    """Counting accounts instead of households would let a single family trip the
    alert and turn their own fuse into a street-wide failure."""
    from tests.conftest import login

    extra = models.User(
        full_name="Alfa Ikkinchi", mahalla_id=world.mahalla_id, household_id=world.alfa_id
    )
    third = models.User(
        full_name="Alfa Uchinchi", mahalla_id=world.mahalla_id, household_id=world.alfa_id
    )
    db.add_all([extra, third])
    db.commit()

    for name in ("Alfa Ikkinchi", "Alfa Uchinchi"):
        login(name).post("/api/utility/report", json={"kind": "light", "is_out": True})
    login(world.founder).post("/api/utility/report", json={"kind": "light", "is_out": True})

    assert db.query(models.UtilityAlert).count() == 0  # still one household


def test_the_mahalla_is_not_told_twice_in_an_hour(db, world, as_user):
    """Claim-then-shout: the hour bucket's unique constraint is what makes this
    safe when two neighbours tap in the same second."""
    for uid, hid in (
        (world.founder_id, world.alfa_id),
        (world.voucher_id, world.beta_id),
    ):
        _report(db, world, uid, "light", True, 5, hid)
    me = as_user(world.neighbor)
    me.post("/api/utility/report", json={"kind": "light", "is_out": True})
    before = db.query(models.Notification).filter_by(event="utility_out_light").count()
    me.post("/api/utility/report", json={"kind": "light", "is_out": True})
    assert db.query(models.Notification).filter_by(event="utility_out_light").count() == before


# ---------- the personal log (the solo half) ----------


def test_a_closed_outage_is_measured(db, world, as_user):
    _report(db, world, world.founder_id, "light", True, minutes_ago=180)
    _report(db, world, world.founder_id, "light", False, minutes_ago=60)
    log = as_user(world.founder).get("/api/utility/log?kind=light").json()
    assert log["cuts"] == 1
    assert 1.9 <= log["hours"] <= 2.1
    assert log["sessions"][0]["estimated"] is False


def test_repeated_out_taps_are_one_outage(db, world, as_user):
    """Someone checking whether anyone else has noticed taps several times. That is
    one power cut, and a log that called it four would be worthless."""
    for m in (180, 150, 120):
        _report(db, world, world.founder_id, "gas", True, minutes_ago=m)
    _report(db, world, world.founder_id, "gas", False, minutes_ago=60)
    log = as_user(world.founder).get("/api/utility/log?kind=gas").json()
    assert log["cuts"] == 1


def test_an_outage_nobody_closed_is_capped_and_flagged(db, world, as_user):
    """The power came back while they slept and they never tapped. Without the cap
    this one silence would report a multi-day blackout and poison the total."""
    _report(db, world, world.founder_id, "light", True, minutes_ago=60 * 40)
    log = as_user(world.founder).get("/api/utility/log?kind=light").json()
    assert log["cuts"] == 1
    assert log["hours"] == utility.MAX_OPEN_HOURS
    assert log["sessions"][0]["estimated"] is True


def test_the_log_is_only_yours(db, world, as_user):
    """It is a personal record, not the mahalla's."""
    _report(db, world, world.voucher_id, "light", True, minutes_ago=120)
    _report(db, world, world.voucher_id, "light", False, minutes_ago=60)
    assert as_user(world.founder).get("/api/utility/log?kind=light").json()["cuts"] == 0


def test_the_log_defaults_to_this_month(db, world, as_user):
    log = as_user(world.founder).get("/api/utility/log?kind=light").json()
    assert log["month"] == datetime.utcnow().strftime("%Y-%m")


def test_a_malformed_month_is_refused(db, world, as_user):
    assert as_user(world.founder).get("/api/utility/log?kind=light&month=july").status_code == 422


def test_an_outage_still_running_counts_up_to_now(db, world, as_user):
    _report(db, world, world.founder_id, "water", True, minutes_ago=90)
    log = as_user(world.founder).get("/api/utility/log?kind=water").json()
    assert log["cuts"] == 1
    assert 1.4 <= log["hours"] <= 1.6
    assert log["sessions"][0]["estimated"] is True


# ---------- announced windows ----------


def _raisi(db, world):
    m = db.get(models.Mahalla, world.mahalla_id)
    m.raisi_user_id = world.founder_id
    db.commit()


def test_the_raisi_announces_a_cut_and_everyone_is_told(db, world, as_user):
    """The manual bridge from the utility's region-wide channel to the people it is
    actually about."""
    _raisi(db, world)
    start = datetime.utcnow() + timedelta(days=1)
    r = as_user(world.founder).post(
        "/api/utility/windows",
        json={
            "kind": "gas",
            "starts_at": start.isoformat(),
            "ends_at": (start + timedelta(hours=6)).isoformat(),
            "note": "Ta'mirlash ishlari",
        },
    )
    assert r.status_code == 200
    assert db.query(models.Notification).filter_by(event="utility_planned_gas").count() > 0


def test_an_ordinary_neighbour_cannot_announce_a_cut(db, world, as_user):
    """An announcement carries the raisi's authority. Anyone could otherwise tell
    the whole mahalla the gas is going off tomorrow."""
    start = datetime.utcnow() + timedelta(days=1)
    r = as_user(world.neighbor).post(
        "/api/utility/windows",
        json={"kind": "gas", "starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=2)).isoformat()},
    )
    assert r.status_code == 403


def test_a_window_that_ends_before_it_starts_is_refused(db, world, as_user):
    _raisi(db, world)
    start = datetime.utcnow() + timedelta(days=1)
    r = as_user(world.founder).post(
        "/api/utility/windows",
        json={"kind": "light", "starts_at": start.isoformat(), "ends_at": (start - timedelta(hours=1)).isoformat()},
    )
    assert r.status_code == 400


def test_a_window_cannot_be_announced_a_year_out(db, world, as_user):
    _raisi(db, world)
    start = datetime.utcnow() + timedelta(days=200)
    r = as_user(world.founder).post(
        "/api/utility/windows",
        json={"kind": "light", "starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=1)).isoformat()},
    )
    assert r.status_code == 400


def test_a_finished_window_leaves_the_board(db, world, as_user):
    """Yesterday's cut is not an explanation for tonight's dark house."""
    now = datetime.utcnow()
    db.add_all(
        [
            models.UtilityWindow(
                mahalla_id=world.mahalla_id,
                kind="light",
                starts_at=now - timedelta(days=2),
                ends_at=now - timedelta(days=2, hours=-3),
                created_by=world.founder_id,
            ),
            models.UtilityWindow(
                mahalla_id=world.mahalla_id,
                kind="light",
                starts_at=now + timedelta(hours=2),
                ends_at=now + timedelta(hours=5),
                created_by=world.founder_id,
            ),
        ]
    )
    db.commit()
    windows = as_user(world.founder).get("/api/utility/board").json()["windows"]
    assert len(windows) == 1


def test_a_running_window_is_still_shown(db, world, as_user):
    """A cut happening right now is the single most useful row on the screen."""
    now = datetime.utcnow()
    db.add(
        models.UtilityWindow(
            mahalla_id=world.mahalla_id,
            kind="gas",
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(hours=2),
            created_by=world.founder_id,
        )
    )
    db.commit()
    assert len(as_user(world.founder).get("/api/utility/board").json()["windows"]) == 1


def test_the_raisi_can_take_a_window_back(db, world, as_user):
    _raisi(db, world)
    start = datetime.utcnow() + timedelta(days=1)
    me = as_user(world.founder)
    wid = me.post(
        "/api/utility/windows",
        json={"kind": "water", "starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=3)).isoformat()},
    ).json()["id"]
    assert me.delete(f"/api/utility/windows/{wid}").status_code == 204
    assert me.get("/api/utility/board").json()["windows"] == []


def test_a_raisi_cannot_delete_another_mahallas_window(db, world, as_user):
    _raisi(db, world)
    now = datetime.utcnow()
    other = models.UtilityWindow(
        mahalla_id=world.other_mahalla_id,
        kind="light",
        starts_at=now + timedelta(hours=1),
        ends_at=now + timedelta(hours=2),
        created_by=world.stranger_id,
    )
    db.add(other)
    db.commit()
    assert as_user(world.founder).delete(f"/api/utility/windows/{other.id}").status_code == 404
