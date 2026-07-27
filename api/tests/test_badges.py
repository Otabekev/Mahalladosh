"""Badges (#11). Derived on read from facts that already exist, so the tests write
the underlying fact and assert the badge follows — and, just as importantly, that
it disappears again when the fact does."""

from app import badges, models


def _profile(as_user, viewer, target_id):
    return as_user(viewer).get(f"/api/users/{target_id}").json()


def _codes(profile):
    return [b["code"] for b in profile["badges"]]


def test_a_new_neighbour_has_no_badges(db, world, as_user):
    assert _profile(as_user, world.neighbor, world.founder_id)["badges"] == []


def test_asoschi_comes_from_the_founding_ledger_entry(db, world, as_user):
    db.add(
        models.ReputationEntry(
            user_id=world.founder_id, mahalla_id=world.mahalla_id, amount=20,
            reason="founding_member", month="2026-07",
        )
    )
    db.commit()
    assert _codes(_profile(as_user, world.neighbor, world.founder_id)) == ["asoschi"]


def test_tarixchi_comes_from_seeding_the_family_history(db, world, as_user):
    db.add(
        models.ReputationEntry(
            user_id=world.founder_id, mahalla_id=world.mahalla_id, amount=15,
            reason="history_seeded", month="2026-07",
        )
    )
    db.commit()
    assert _codes(_profile(as_user, world.neighbor, world.founder_id)) == ["tarixchi"]


def test_faol_counts_the_months_won(db, world, as_user):
    for month in ("2026-05", "2026-06"):
        db.add(
            models.MonthHonor(
                mahalla_id=world.mahalla_id, month=month, winner_user_id=world.founder_id
            )
        )
    db.commit()
    out = _profile(as_user, world.neighbor, world.founder_id)["badges"]
    assert out == [{"code": "faol", "count": 2}]


def test_mehmondost_needs_more_than_one_favour(db, world, as_user):
    """One favour is not a title."""
    for i in range(badges.MEHMONDOST_THRESHOLD - 1):
        db.add(
            models.Post(
                mahalla_id=world.mahalla_id, author_id=world.neighbor_id, type="help",
                title=f"Yordam {i}", category="tool", status="resolved",
                resolved_helper_id=world.founder_id,
            )
        )
    db.commit()
    assert _codes(_profile(as_user, world.neighbor, world.founder_id)) == []


def test_mehmondost_arrives_at_the_threshold(db, world, as_user):
    for i in range(badges.MEHMONDOST_THRESHOLD):
        db.add(
            models.Post(
                mahalla_id=world.mahalla_id, author_id=world.neighbor_id, type="help",
                title=f"Yordam {i}", category="tool", status="resolved",
                resolved_helper_id=world.founder_id,
            )
        )
    db.commit()
    out = _profile(as_user, world.neighbor, world.founder_id)["badges"]
    assert out == [{"code": "mehmondost", "count": badges.MEHMONDOST_THRESHOLD}]


def test_badges_come_back_rarest_first(db, world, as_user):
    db.add_all([
        models.MonthHonor(mahalla_id=world.mahalla_id, month="2026-06",
                          winner_user_id=world.founder_id),
        models.ReputationEntry(user_id=world.founder_id, mahalla_id=world.mahalla_id,
                               amount=20, reason="founding_member", month="2026-07"),
        models.ReputationEntry(user_id=world.founder_id, mahalla_id=world.mahalla_id,
                               amount=15, reason="history_seeded", month="2026-07"),
    ])
    db.commit()
    assert _codes(_profile(as_user, world.neighbor, world.founder_id)) == [
        "faol", "asoschi", "tarixchi"
    ]


def test_a_badge_disappears_when_its_fact_does(db, world, as_user):
    """The whole argument for deriving instead of awarding: nothing to revoke."""
    honor = models.MonthHonor(
        mahalla_id=world.mahalla_id, month="2026-06", winner_user_id=world.founder_id
    )
    db.add(honor)
    db.commit()
    assert _codes(_profile(as_user, world.neighbor, world.founder_id)) == ["faol"]

    db.delete(honor)
    db.commit()
    assert _codes(_profile(as_user, world.neighbor, world.founder_id)) == []


def test_the_ledger_is_read_once_per_person_not_once_per_entry(db, world, as_user):
    """Two founding entries must not yield two Asoschi badges."""
    for month in ("2026-06", "2026-07"):
        db.add(
            models.ReputationEntry(
                user_id=world.founder_id, mahalla_id=world.mahalla_id, amount=20,
                reason="founding_member", month=month,
            )
        )
    db.commit()
    assert _codes(_profile(as_user, world.neighbor, world.founder_id)) == ["asoschi"]


def test_earned_for_answers_many_people_at_once(db, world):
    """Batched derivation is the point — a per-user version would be N+1 anywhere
    badges appear beside a list of names."""
    db.add_all([
        models.MonthHonor(mahalla_id=world.mahalla_id, month="2026-06",
                          winner_user_id=world.founder_id),
        models.ReputationEntry(user_id=world.voucher_id, mahalla_id=world.mahalla_id,
                               amount=15, reason="history_seeded", month="2026-07"),
    ])
    db.commit()
    people = [
        db.get(models.User, world.founder_id),
        db.get(models.User, world.voucher_id),
        db.get(models.User, world.neighbor_id),
    ]
    out = badges.earned_for(db, people)
    assert out[world.founder_id] == [("faol", 1)]
    assert out[world.voucher_id] == [("tarixchi", 1)]
    assert out[world.neighbor_id] == []


def test_earned_for_handles_an_empty_list(db, world):
    assert badges.earned_for(db, []) == {}


def test_badges_are_not_visible_across_mahallas(db, world, as_user):
    """The profile endpoint's 404 rule already covers this; badges must not become
    a side channel around it."""
    db.add(
        models.MonthHonor(mahalla_id=world.mahalla_id, month="2026-06",
                          winner_user_id=world.founder_id)
    )
    db.commit()
    assert as_user(world.stranger).get(f"/api/users/{world.founder_id}").status_code == 404
