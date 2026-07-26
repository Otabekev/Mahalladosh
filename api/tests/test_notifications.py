"""Notification rendering: the catalog must be complete in four languages, and
`render` must be total — it sits on the read path of the notifications screen, so
any input at all has to produce a string rather than an exception."""

import pytest

from app import models, notif_catalog
from app.notif_catalog import CATALOG, LANGS, placeholders, render

# ---------- catalog completeness ----------


@pytest.mark.parametrize("event", sorted(CATALOG))
def test_every_event_exists_in_all_four_languages(event):
    """A missing translation means a Russian-speaking neighbour silently gets Uzbek."""
    missing = [lang for lang in LANGS if not CATALOG[event].get(lang)]
    assert not missing, f"{event} is missing: {missing}"


@pytest.mark.parametrize("event", sorted(CATALOG))
def test_placeholders_agree_across_languages(event):
    """A translation that drops {name} renders a sentence with a hole in it, and one
    that invents {naem} renders a literal brace to a confused grandmother."""
    expected = placeholders(CATALOG[event]["uz"])
    for lang in LANGS:
        assert placeholders(CATALOG[event][lang]) == expected, (
            f"{event}/{lang} placeholders {placeholders(CATALOG[event][lang])} "
            f"disagree with uz {expected}"
        )


def test_catalog_covers_the_languages_the_app_offers():
    assert set(LANGS) == {"uz", "uzc", "ru", "en"}


def test_cyrillic_uzbek_is_not_a_copy_of_russian():
    """uzc is transliterated Uzbek for elders who read Cyrillic — not Russian. If the
    two are ever identical for an event, someone pasted the wrong column."""
    same = [e for e in CATALOG if CATALOG[e]["uzc"] == CATALOG[e]["ru"]]
    # new_post is pure user content ("{emoji} {name}: {title}") and is legitimately
    # identical in every language; nothing else may be.
    assert same == ["new_post"], f"uzc appears copied from ru for: {same}"


# ---------- render() is total ----------


def test_renders_into_the_requested_language():
    params = {"name": "Aziza"}
    assert "eshigingiz" in render("dingdong", params, "uz")
    assert "эшигингиз" in render("dingdong", params, "uzc")
    assert "двери" in render("dingdong", params, "ru")
    assert "at your door" in render("dingdong", params, "en")


def test_substitutes_params():
    out = render("dingdong", {"name": "Aziza"}, "en")
    assert "Aziza" in out and "{name}" not in out


@pytest.mark.parametrize(
    "event,params,lang",
    [
        ("nonexistent_event", {}, "uz"),
        ("dingdong", None, "uz"),
        ("dingdong", {"wrong_key": 1}, "uz"),
        ("dingdong", {"name": None}, "uz"),
        ("dingdong", {}, "kz"),  # a language we do not have
        (None, None, None),
        ("", {}, ""),
        ("dingdong", "not-a-dict", "uz"),
    ],
)
def test_render_never_raises(event, params, lang):
    assert isinstance(render(event, params, lang, fallback="fallback"), str)


def test_unknown_event_falls_back_to_stored_text():
    """Legacy rows written before events existed still have to display."""
    assert render("retired_key", {}, "ru", fallback="eski matn") == "eski matn"


def test_unknown_language_falls_back_to_uzbek():
    assert render("household_verified", {}, "kz") == CATALOG["household_verified"]["uz"]


def test_missing_param_leaves_the_placeholder_visible():
    """Deliberate: a visibly odd string gets reported from the field, a blank one
    just looks broken and an exception takes the screen down."""
    assert "{name}" in render("dingdong", {}, "uz")


# ---------- storage + read path ----------


def test_notify_stores_event_and_params(db, world):
    from app import notify

    uid = world.founder_id
    notify.notify(db, [uid], "dingdong", event="dingdong", params={"name": "Aziza"})
    db.commit()

    row = db.query(models.Notification).filter_by(user_id=uid).one()
    assert row.event == "dingdong"
    assert row.params == {"name": "Aziza"}
    # the pre-rendered Uzbek fallback is still written, for the Telegram sender and
    # for any future row whose event key gets retired
    assert "Aziza" in row.text


def test_notifications_render_in_each_readers_language(db, world, as_user):
    """One stored row, two readers, two scripts — this is the whole point of the
    refactor: a grandmother reading Cyrillic and her son-in-law reading Russian see
    the same event in their own language."""
    from app import notify

    notify.notify(
        db,
        [world.neighbor_id, world.voucher_id],
        "dingdong",
        event="dingdong",
        params={"name": "Aziza"},
    )
    db.commit()

    ru_reader = as_user(world.neighbor)
    ru_reader.patch("/api/me", json={"lang": "ru"})
    assert "двери" in ru_reader.get("/api/notifications").json()["items"][0]["text"]

    uzc_reader = as_user(world.voucher)
    uzc_reader.patch("/api/me", json={"lang": "uzc"})
    assert "эшигингиз" in uzc_reader.get("/api/notifications").json()["items"][0]["text"]


def test_legacy_row_without_an_event_still_displays(db, world, as_user):
    """Rows written before this refactor have text but no event — they must not
    vanish from the screen just because they predate the catalog."""
    db.add(
        models.Notification(
            user_id=world.neighbor_id, type="post", text="Eski uslubdagi xabar"
        )
    )
    db.commit()

    reader = as_user(world.neighbor)
    reader.patch("/api/me", json={"lang": "ru"})
    items = reader.get("/api/notifications").json()["items"]
    assert items[0]["text"] == "Eski uslubdagi xabar"


def test_lang_defaults_to_uzbek_and_dms_default_on(db, world):
    user = db.get(models.User, world.founder_id)
    assert user.lang == "uz"
    assert user.tg_dm_enabled is True


def test_me_rejects_an_unsupported_language(as_user, world):
    me = as_user(world.neighbor)
    assert me.patch("/api/me", json={"lang": "fr"}).status_code == 422
    assert me.patch("/api/me", json={"lang": "uzc"}).status_code == 200


def test_telegram_dm_can_be_switched_off(as_user, world, db):
    me = as_user(world.neighbor)
    assert me.patch("/api/me", json={"tg_dm_enabled": False}).status_code == 200
    db.expire_all()
    assert db.get(models.User, world.neighbor_id).tg_dm_enabled is False


def test_normalize_lang_accepts_only_known_languages():
    assert notif_catalog.normalize_lang("ru") == "ru"
    assert notif_catalog.normalize_lang("fr") == "uz"
    assert notif_catalog.normalize_lang(None) == "uz"
