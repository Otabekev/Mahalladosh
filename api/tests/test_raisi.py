"""The raisi (mahalla head) panel. Every tool is gated to the raisi of the caller's
own mahalla, so the tests here are as much about who is refused as what works."""

from app import models


def _make_raisi(db, world, name):
    """Promote `name` to raisi of the main mahalla and return their id."""
    user = db.query(models.User).filter_by(full_name=name).one()
    mahalla = db.get(models.Mahalla, world.mahalla_id)
    mahalla.raisi_user_id = user.id
    db.commit()
    return user.id


def _post(db, world, author_id, mahalla_id=None):
    post = models.Post(
        mahalla_id=mahalla_id or world.mahalla_id,
        author_id=author_id,
        type="announcement",
        title="Suv o'chadi",
    )
    db.add(post)
    db.commit()
    return post.id


# ---------- pinning ----------


def test_raisi_can_pin_and_it_floats_to_the_top(db, world, as_user):
    _make_raisi(db, world, world.founder)
    older = _post(db, world, world.founder_id)
    newer = _post(db, world, world.founder_id)

    raisi = as_user(world.founder)
    assert raisi.put(f"/api/raisi/pinned/{older}").status_code == 204

    # a plain member sees the pinned (older) post first, flagged
    member = as_user(world.neighbor)
    feed = member.get("/api/posts").json()["items"]
    assert feed[0]["id"] == older
    assert feed[0]["pinned"] is True
    assert all(p["pinned"] is False for p in feed if p["id"] != older)
    assert newer in [p["id"] for p in feed]


def test_unpin_clears_it(db, world, as_user):
    _make_raisi(db, world, world.founder)
    pid = _post(db, world, world.founder_id)
    raisi = as_user(world.founder)
    raisi.put(f"/api/raisi/pinned/{pid}")

    raisi.delete("/api/raisi/pinned")
    feed = as_user(world.neighbor).get("/api/posts").json()["items"]
    assert all(p["pinned"] is False for p in feed)


def test_a_plain_member_cannot_pin(db, world, as_user):
    _make_raisi(db, world, world.founder)
    pid = _post(db, world, world.founder_id)
    member = as_user(world.neighbor)
    assert member.put(f"/api/raisi/pinned/{pid}").status_code == 403


def test_raisi_cannot_pin_a_foreign_mahallas_post(db, world, as_user):
    _make_raisi(db, world, world.founder)
    foreign = _post(db, world, world.stranger_id, mahalla_id=world.other_mahalla_id)
    raisi = as_user(world.founder)
    assert raisi.put(f"/api/raisi/pinned/{foreign}").status_code == 404


def test_a_type_filter_hides_the_pin(db, world, as_user):
    """The pin floats on the main feed, but a filtered view stays a clean list."""
    _make_raisi(db, world, world.founder)
    pid = _post(db, world, world.founder_id)  # announcement
    as_user(world.founder).put(f"/api/raisi/pinned/{pid}")

    member = as_user(world.neighbor)
    filtered = member.get("/api/posts?type=help").json()["items"]
    assert all(p["pinned"] is False for p in filtered)


def test_is_raisi_flag_is_exposed_on_self(db, world, as_user):
    _make_raisi(db, world, world.founder)
    me = as_user(world.founder).get("/api/auth/me").json()
    assert me["user"]["is_raisi"] is True
    assert as_user(world.neighbor).get("/api/auth/me").json()["user"]["is_raisi"] is False


# ---------- contacts ----------


def test_raisi_curates_contacts_everyone_can_read(db, world, as_user):
    _make_raisi(db, world, world.founder)
    raisi = as_user(world.founder)

    created = raisi.post(
        "/api/raisi/contacts",
        json={"label": "Tez yordam", "phone": "103"},
    )
    assert created.status_code == 201

    # a plain member sees it on their own mahalla's contacts
    member = as_user(world.neighbor)
    rows = member.get(f"/api/mahallas/{world.mahalla_id}/contacts").json()
    assert [c["label"] for c in rows] == ["Tez yordam"]
    assert rows[0]["phone"] == "103"


def test_contacts_keep_insertion_order(db, world, as_user):
    _make_raisi(db, world, world.founder)
    raisi = as_user(world.founder)
    for label, phone in [("Raisi", "901"), ("Poliklinika", "902"), ("Tez yordam", "103")]:
        raisi.post("/api/raisi/contacts", json={"label": label, "phone": phone})

    rows = raisi.get(f"/api/mahallas/{world.mahalla_id}/contacts").json()
    assert [c["label"] for c in rows] == ["Raisi", "Poliklinika", "Tez yordam"]


def test_a_plain_member_cannot_add_a_contact(db, world, as_user):
    _make_raisi(db, world, world.founder)
    member = as_user(world.neighbor)
    r = member.post("/api/raisi/contacts", json={"label": "Fake", "phone": "000"})
    assert r.status_code == 403


def test_raisi_can_edit_and_delete_a_contact(db, world, as_user):
    _make_raisi(db, world, world.founder)
    raisi = as_user(world.founder)
    cid = raisi.post("/api/raisi/contacts", json={"label": "Klinika", "phone": "902"}).json()["id"]

    edited = raisi.put(f"/api/raisi/contacts/{cid}", json={"label": "Poliklinika", "phone": "902-11"})
    assert edited.status_code == 200
    assert edited.json()["label"] == "Poliklinika"

    assert raisi.delete(f"/api/raisi/contacts/{cid}").status_code == 204
    assert raisi.get(f"/api/mahallas/{world.mahalla_id}/contacts").json() == []


def test_raisi_cannot_touch_another_mahallas_contact(db, world, as_user):
    # a contact in the OTHER mahalla
    other = models.MahallaContact(mahalla_id=world.other_mahalla_id, label="X", phone="111")
    db.add(other)
    db.commit()

    _make_raisi(db, world, world.founder)
    raisi = as_user(world.founder)
    assert raisi.put(f"/api/raisi/contacts/{other.id}", json={"label": "Y", "phone": "222"}).status_code == 404
    assert raisi.delete(f"/api/raisi/contacts/{other.id}").status_code == 404


def test_contacts_are_scoped_to_the_readers_mahalla(db, world, as_user):
    _make_raisi(db, world, world.founder)
    as_user(world.founder).post("/api/raisi/contacts", json={"label": "Raisi", "phone": "901"})

    # the stranger belongs to the other mahalla — cannot read this one's contacts
    stranger = as_user(world.stranger)
    assert stranger.get(f"/api/mahallas/{world.mahalla_id}/contacts").status_code == 403


# ---------- moderation queue ----------


def _report(db, world, reporter_id, target_id, mahalla_id=None):
    r = models.Report(
        reporter_id=reporter_id,
        target_type="user",
        target_id=target_id,
        reason="abuse",
        mahalla_id=mahalla_id or world.mahalla_id,
        status="open",
    )
    db.add(r)
    db.commit()
    return r.id


def test_raisi_sees_only_their_own_mahallas_reports(db, world, as_user):
    _make_raisi(db, world, world.founder)
    mine = _report(db, world, world.neighbor_id, world.voucher_id)
    _report(db, world, world.stranger_id, world.stranger_id, mahalla_id=world.other_mahalla_id)

    rows = as_user(world.founder).get("/api/raisi/reports").json()
    assert [r["id"] for r in rows] == [mine]


def test_raisi_can_resolve_and_dismiss(db, world, as_user):
    _make_raisi(db, world, world.founder)
    rid = _report(db, world, world.neighbor_id, world.voucher_id)
    raisi = as_user(world.founder)

    assert raisi.post(f"/api/raisi/reports/{rid}/resolve").json()["status"] == "resolved"
    # once resolved it leaves the open queue
    assert as_user(world.founder).get("/api/raisi/reports").json() == []


def test_raisi_cannot_touch_a_foreign_report(db, world, as_user):
    _make_raisi(db, world, world.founder)
    foreign = _report(db, world, world.stranger_id, world.stranger_id, mahalla_id=world.other_mahalla_id)
    raisi = as_user(world.founder)
    assert raisi.post(f"/api/raisi/reports/{foreign}/resolve").status_code == 404


def test_a_plain_member_cannot_see_the_queue(db, world, as_user):
    _make_raisi(db, world, world.founder)
    assert as_user(world.neighbor).get("/api/raisi/reports").status_code == 403


# ---------- roster + ban ----------


def test_roster_lists_members_with_flags(db, world, as_user):
    _make_raisi(db, world, world.founder)
    rows = as_user(world.founder).get("/api/raisi/members").json()
    by_id = {r["id"]: r for r in rows}
    assert by_id[world.founder_id]["is_raisi"] is True
    assert by_id[world.neighbor_id]["is_raisi"] is False
    assert all(r["banned"] is False for r in rows)
    # scoped: the other mahalla's stranger is not in this roster
    assert world.stranger_id not in by_id


def test_raisi_bans_a_member_and_it_locks_them_out(db, world, as_user):
    _make_raisi(db, world, world.founder)
    raisi = as_user(world.founder)
    victim = as_user(world.neighbor)  # log them in BEFORE the ban

    row = raisi.post(f"/api/raisi/members/{world.neighbor_id}/ban")
    assert row.status_code == 200
    assert row.json()["banned"] is True

    # the ban is enforced in get_current_user, so their session is now rejected
    assert victim.get("/api/auth/me").status_code == 403


def test_raisi_cannot_ban_themselves_or_the_head(db, world, as_user):
    _make_raisi(db, world, world.founder)
    raisi = as_user(world.founder)
    assert raisi.post(f"/api/raisi/members/{world.founder_id}/ban").status_code == 400


def test_raisi_cannot_ban_across_mahallas(db, world, as_user):
    _make_raisi(db, world, world.founder)
    raisi = as_user(world.founder)
    assert raisi.post(f"/api/raisi/members/{world.stranger_id}/ban").status_code == 404


def test_a_plain_member_cannot_ban(db, world, as_user):
    _make_raisi(db, world, world.founder)
    assert as_user(world.neighbor).post(f"/api/raisi/members/{world.voucher_id}/ban").status_code == 403
