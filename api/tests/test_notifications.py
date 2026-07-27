"""Notification rendering: the catalog must be complete in four languages, and
`render` must be total — it sits on the read path of the notifications screen, so
any input at all has to produce a string rather than an exception."""

import ast
import re
from pathlib import Path

import pytest

from app import models, notif_catalog
from app.notif_catalog import CATALOG, LANGS, placeholders, render

APP_DIR = Path(__file__).resolve().parent.parent / "app"

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


def _strings_in(node: ast.AST) -> set[str]:
    """Every string literal that could *be* the event key under `node` — copes with a
    plain `event="x"`, an `"a" if cond else "b"`, and a `{...}[status]` dispatch.

    Descends into dict values but not dict keys: in the vote-result dispatch the keys
    are proposal statuses ("passed"), not catalog keys."""
    if isinstance(node, ast.Constant):
        return {node.value} if isinstance(node.value, str) else set()
    if isinstance(node, ast.Dict):
        return set().union(*(_strings_in(v) for v in node.values)) if node.values else set()
    out: set[str] = set()
    for child in ast.iter_child_nodes(node):
        out |= _strings_in(child)
    return out


def _event_keys_used_in_source() -> set[str]:
    """Every catalog key referenced from app/ — via an `event=` keyword, or passed
    positionally to the _notify_stewards helper."""
    found: set[str] = set()
    for path in APP_DIR.rglob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            name = func.attr if isinstance(func, ast.Attribute) else getattr(func, "id", "")
            for kw in node.keywords:
                if kw.arg == "event":
                    found |= _strings_in(kw.value)
            # _notify_stewards(db, household, "<event>", {...})
            if name == "_notify_stewards" and len(node.args) >= 3:
                found |= _strings_in(node.args[2])
    return found


def test_every_event_used_in_code_exists_in_the_catalog():
    """A typo'd event key renders to an EMPTY notification rather than an error —
    the reader just gets a blank row and nobody finds out. This is the guard."""
    used = _event_keys_used_in_source()
    assert used, "found no event= call sites — the AST scan is broken, not the code"
    unknown = sorted(used - set(CATALOG))
    assert not unknown, f"event keys used in code but missing from CATALOG: {unknown}"


def test_catalog_has_no_dead_entries():
    """The other direction: an entry nobody sends is either a leftover from a
    rename or a call site that quietly stopped passing its event."""
    unused = sorted(set(CATALOG) - _event_keys_used_in_source())
    assert not unused, f"catalog entries never sent from code: {unused}"


def test_no_notification_still_passes_hardcoded_uzbek_text():
    """Regression for the migration itself: a call site left with a literal Uzbek
    string would keep showing Uzbek to Russian readers, silently."""
    offenders = []
    # Uzbek-specific letters/digraphs that would not appear in an English event key
    uzbek = re.compile(r"(qo'sh|xonadon|mahalla\w*si|e'lon|rahmat|ovoz berish)", re.I)
    for path in APP_DIR.rglob("*.py"):
        if path.name == "notif_catalog.py":
            continue  # the catalog is *supposed* to contain Uzbek
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            name = func.attr if isinstance(func, ast.Attribute) else getattr(func, "id", "")
            if name not in ("notify", "notify_mahalla"):
                continue
            for arg in list(node.args) + [k.value for k in node.keywords]:
                for sub in ast.walk(arg):
                    if isinstance(sub, ast.Constant) and isinstance(sub.value, str):
                        if uzbek.search(sub.value):
                            offenders.append(f"{path.name}:{sub.lineno} {sub.value!r}")
    assert not offenders, "hardcoded Uzbek left in notify calls:\n" + "\n".join(offenders)


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


def test_notify_also_fans_out_as_a_telegram_dm(db, world, monkeypatch):
    """Wiring: creating an in-app notification for someone with Telegram enabled also
    sends them a DM, rendered in their language — without the caller doing anything."""
    from app import notify, telegram

    monkeypatch.setattr(telegram.settings, "telegram_bot_token", "T:token")
    monkeypatch.setattr(telegram.settings, "telegram_dm_enabled", True)
    monkeypatch.setattr(telegram, "_submit", lambda job: job())  # run inline
    sent: list[tuple[int, str]] = []
    monkeypatch.setattr(telegram, "_transport", lambda chat_id, text: sent.append((chat_id, text)))

    neighbour = db.get(models.User, world.neighbor_id)
    neighbour.tg_id = 909
    neighbour.lang = "ru"
    db.commit()

    notify.notify(db, [neighbour.id], "dingdong", event="dingdong", params={"name": "Aziza"})
    db.commit()

    assert len(sent) == 1
    assert sent[0][0] == 909
    assert "двери" in sent[0][1]  # rendered in the recipient's Russian


def test_notify_sends_no_dm_without_a_token(db, world, monkeypatch):
    """The default everywhere but production: an in-app notification is stored, but
    nothing reaches Telegram."""
    from app import notify, telegram

    monkeypatch.setattr(telegram.settings, "telegram_bot_token", "")
    calls: list = []
    monkeypatch.setattr(telegram, "send_dm_bulk", lambda *a, **k: calls.append(1))

    notify.notify(db, [world.neighbor_id], "dingdong", event="dingdong", params={"name": "A"})
    db.commit()

    assert calls == []
    assert db.query(models.Notification).filter_by(user_id=world.neighbor_id).count() == 1


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


# ---------- privacy: personal settings must not leak to the feed ----------


def test_private_settings_live_only_on_the_self_view():
    """A schema-level guard: lang / tg_dm_enabled belong on SelfUserOut, never on the
    public UserOut that is embedded as a post author, petitioner, raisi, etc."""
    from app import schemas

    for field in ("lang", "tg_dm_enabled"):
        assert field not in schemas.UserOut.model_fields, f"{field} leaks via UserOut"
        assert field in schemas.SelfUserOut.model_fields


def test_auth_me_exposes_the_readers_own_settings(as_user, world):
    me = as_user(world.founder)
    body = me.get("/api/auth/me").json()
    assert "lang" in body["user"]
    assert "tg_dm_enabled" in body["user"]


def test_a_post_author_does_not_leak_language_or_dm_optout(as_user, world):
    """The neighbour reading the feed must not learn what language the author reads
    in or whether they take Telegram DMs."""
    author = as_user(world.founder)
    created = author.post(
        "/api/posts",
        json={"type": "announcement", "title": "Ertaga yig'in bor"},
    )
    assert created.status_code == 200, created.text

    reader = as_user(world.voucher)
    feed = reader.get("/api/posts").json()["items"]
    assert feed, "expected at least one post in the feed"
    author_obj = feed[0]["author"]
    assert "lang" not in author_obj
    assert "tg_dm_enabled" not in author_obj
