"""Second pass of the privilege audit — the three findings I flagged as most worth
verifying, now checked against the code and fixed where they held.

One was refuted in part and is recorded here as such: DingDong already withheld the
distance on a failed ring, so the "oracle" was narrower than reported. It still had
an unlimited probe loop, which is the half that is fixed.
"""

from datetime import datetime, timedelta

from app import models

# ---------- a banned account is locked out of the login route too ----------


def _ban(db, user_id):
    db.get(models.User, user_id).banned_until = datetime.utcnow() + timedelta(days=7)
    db.commit()


def test_a_banned_account_cannot_rename_itself_through_telegram_login(db, world, client, monkeypatch):
    """The ban lockout lives in get_current_user, which a LOGIN route never runs —
    so a banned account could rewrite the name and photo shown on every post it ever
    wrote, and collect a fresh session while doing it."""
    from app.routers import auth

    target = db.get(models.User, world.neighbor_id)
    target.tg_id = 555001
    db.commit()
    _ban(db, world.neighbor_id)

    monkeypatch.setattr(auth, "verify_telegram_auth", lambda _d: True)
    r = client.post(
        "/api/auth/telegram",
        json={"id": 555001, "first_name": "Yangi", "last_name": "Ism",
              "auth_date": int(datetime.utcnow().timestamp()), "hash": "x"},
    )
    assert r.status_code == 403
    db.refresh(target)
    assert target.full_name == world.neighbor  # unchanged


def test_an_ordinary_account_still_logs_in_and_syncs_its_profile(db, world, client, monkeypatch):
    """The fix must not break the normal Telegram login path."""
    from app.routers import auth

    target = db.get(models.User, world.neighbor_id)
    target.tg_id = 555002
    db.commit()

    monkeypatch.setattr(auth, "verify_telegram_auth", lambda _d: True)
    r = client.post(
        "/api/auth/telegram",
        json={"id": 555002, "first_name": "Yangi", "last_name": "Ism",
              "auth_date": int(datetime.utcnow().timestamp()), "hash": "x"},
    )
    assert r.status_code == 200
    db.refresh(target)
    assert target.full_name == "Yangi Ism"


# ---------- verification does not travel between mahallas ----------


def test_being_verified_elsewhere_does_not_unlock_family_history(db, world):
    """The gate checked that the viewer's household is verified, but not that it is
    in the same mahalla. The routes 404 across mahallas so this was not reachable —
    it belongs in the gate itself so a future route cannot quietly reopen it."""
    from app import presenters

    outsider = db.get(models.User, world.stranger_id)
    far = models.Household(
        mahalla_id=world.other_mahalla_id, family_name="Uzoq",
        created_by=outsider.id, verification_status="verified",
    )
    db.add(far)
    db.flush()
    outsider.household_id = far.id
    db.commit()

    alfa = db.get(models.Household, world.alfa_id)  # verified, in the OTHER mahalla
    out = presenters.household_out(db, alfa, outsider)
    assert out.family_history is None
    assert out.members == []
    assert out.photos == []


def test_a_verified_neighbour_in_the_same_mahalla_still_sees_it(db, world):
    """The moat must still open for the people it is meant to open for."""
    from app import presenters

    voucher = db.get(models.User, world.voucher_id)  # verified household, same mahalla
    out = presenters.household_out(db, db.get(models.Household, world.alfa_id), voucher)
    assert out.family_history is not None
    assert out.members != []


# ---------- DingDong probing is bounded ----------


def _locate(db, household_id, lat=41.0, lng=71.0):
    h = db.get(models.Household, household_id)
    h.lat, h.lng = lat, lng
    db.commit()


def test_failed_dingdong_probes_are_rate_limited(db, world, as_user):
    """Each probe answers "is this house within 100m of this point?". The cooldown
    only ever gated a SUCCESSFUL ring, so searching out a family's coordinates a
    query at a time was free."""
    from app.routers.households import DINGDONG_PROBE_LIMIT

    _locate(db, world.alfa_id)
    ringer = as_user(world.neighbor)

    codes = [
        ringer.post(
            f"/api/households/{world.alfa_id}/dingdong",
            json={"lat": 50.0 + i / 1000, "lng": 60.0},
        ).status_code
        for i in range(DINGDONG_PROBE_LIMIT + 3)
    ]
    assert 429 in codes, "probing was never throttled"
    assert codes.count(400) <= DINGDONG_PROBE_LIMIT


def test_a_failed_ring_still_never_reveals_the_distance(db, world, as_user):
    """The half of the original finding that was already handled — pinned so it
    stays handled."""
    _locate(db, world.alfa_id)
    r = as_user(world.neighbor).post(
        f"/api/households/{world.alfa_id}/dingdong", json={"lat": 50.0, "lng": 60.0}
    )
    assert r.status_code == 400
    body = r.json()["detail"]
    assert not any(ch.isdigit() for ch in body), f"distance leaked in: {body}"


def test_someone_actually_at_the_door_still_rings(db, world, as_user):
    _locate(db, world.alfa_id)
    r = as_user(world.neighbor).post(
        f"/api/households/{world.alfa_id}/dingdong", json={"lat": 41.0, "lng": 71.0}
    )
    assert r.status_code == 200
