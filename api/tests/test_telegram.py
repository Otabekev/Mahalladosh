"""The Telegram DM sender.

Two things are being protected here. The small one is correctness: each neighbour
must get the message in their own language, and people who switched DMs off or never
came through Telegram login must be skipped.

The big one is blast radius. This sender runs inside ordinary request handlers, so
these tests assert the properties that keep a Telegram outage from becoming a
Mahalladosh outage — nothing raises into the caller, nothing touches the caller's DB
session, nothing blocks the response, and the bot token never reaches a log.

Nothing here goes near the network: `_transport` is always replaced, and the autouse
fixture below blanks the token (a developer's real .env has one) and points the API
base at a dead port so a mistake fails instantly instead of DMing actual people.
"""

import logging
import threading

import pytest

from app import models, telegram

TOKEN = "8123456:AA-fake-test-token"  # noqa: S105 — not a credential, just a shape


def user(tg_id: int | None = 501, lang: str = "uz", dm: bool | None = True):
    """A duck-typed stand-in for models.User — the sender only reads three fields,
    and taking a plain object here is itself the proof that it needs no Session."""
    return type("U", (), {"tg_id": tg_id, "lang": lang, "tg_dm_enabled": dm})()


@pytest.fixture(autouse=True)
def _offline(monkeypatch):
    """No token and an unroutable API base: the default state of every test is
    'cannot possibly reach Telegram'."""
    monkeypatch.setattr(telegram.settings, "telegram_bot_token", "")
    monkeypatch.setattr(telegram.settings, "telegram_dm_enabled", True)
    monkeypatch.setattr(telegram.settings, "telegram_api_base", "http://127.0.0.1:9")
    monkeypatch.setattr(telegram.settings, "public_web_url", "")


@pytest.fixture
def configured(monkeypatch):
    """Turn the sender on with a fake token."""
    monkeypatch.setattr(telegram.settings, "telegram_bot_token", TOKEN)


@pytest.fixture
def inline(monkeypatch):
    """Run the background job in the calling thread. Two reasons: assertions become
    deterministic, and any failure now happens in the worst possible place — right
    inside the caller — which is precisely what must still not propagate."""
    monkeypatch.setattr(telegram, "_submit", lambda job: job())


@pytest.fixture
def sent(monkeypatch):
    """Records (chat_id, text) instead of calling Telegram."""
    box: list[tuple[int, str]] = []
    monkeypatch.setattr(telegram, "_transport", lambda chat_id, text: box.append((chat_id, text)))
    return box


# ---------- the off switches ----------


def test_without_a_token_nothing_is_sent(sent, inline):
    """Dev laptops and CI have no token; the sender must be a silent no-op there."""
    telegram.send_dm(user(), event="dingdong", params={"name": "Aziza"})
    telegram.send_dm_bulk([user(), user(502)], event="household_verified")
    assert sent == []
    assert telegram.enabled() is False


def test_kill_switch_stops_sends(configured, sent, inline, monkeypatch):
    """A token is configured but DMs are switched off at runtime."""
    monkeypatch.setattr(telegram.settings, "telegram_dm_enabled", False)
    telegram.send_dm(user(), event="dingdong", params={"name": "Aziza"})
    assert sent == []


def test_skips_users_who_turned_dms_off(configured, sent, inline):
    telegram.send_dm(user(dm=False), event="dingdong", params={"name": "Aziza"})
    assert sent == []


def test_an_unset_preference_still_receives(configured, sent, inline):
    """The column's declared default is on, so None means 'never chose', not 'off'.
    Reading it as 'off' would silently strand every row that predates the flag."""
    telegram.send_dm(user(dm=None), event="dingdong", params={"name": "Aziza"})
    assert len(sent) == 1


def test_skips_users_with_no_telegram_id(configured, sent, inline):
    """Seeded and dev-login accounts never came through the Login Widget."""
    telegram.send_dm(user(tg_id=None), event="dingdong", params={"name": "Aziza"})
    assert sent == []


def test_empty_message_is_not_sent(configured, sent, inline):
    """An unknown event with no fallback renders to nothing — silence beats a blank DM."""
    telegram.send_dm(user(), event="retired_key")
    assert sent == []


# ---------- the message itself ----------


@pytest.mark.parametrize(
    "lang,needle",
    [("uz", "eshigingiz"), ("uzc", "эшигингиз"), ("ru", "двери"), ("en", "at your door")],
)
def test_renders_in_the_users_own_language(configured, sent, inline, lang, needle):
    telegram.send_dm(user(lang=lang), event="dingdong", params={"name": "Aziza"})
    assert len(sent) == 1
    chat_id, text = sent[0]
    assert chat_id == 501
    assert needle in text
    assert "Aziza" in text


def test_bulk_gives_each_neighbour_their_own_language(configured, sent, inline, monkeypatch):
    monkeypatch.setattr(telegram, "PACE_SECONDS", 0)  # don't pace a unit test
    telegram.send_dm_bulk(
        [user(501, "ru"), user(502, "uzc"), user(503, "en")],
        event="dingdong",
        params={"name": "Aziza"},
    )
    delivered = dict(sent)
    assert "двери" in delivered[501]
    assert "эшигингиз" in delivered[502]
    assert "at your door" in delivered[503]


def test_falls_back_to_the_stored_text_for_a_legacy_event(configured, sent, inline):
    """Rows written before the catalog existed still have to be deliverable."""
    telegram.send_dm(user(), event=None, text="Eski uslubdagi xabar")
    assert sent[0][1] == "Eski uslubdagi xabar"


def test_link_becomes_tappable_only_when_a_public_url_is_configured(
    configured, sent, inline, monkeypatch
):
    telegram.send_dm(user(), event="household_verified", link="/app/family")
    assert "http" not in sent[0][1]

    monkeypatch.setattr(telegram.settings, "public_web_url", "https://mahalladosh.uz/")
    telegram.send_dm(user(), event="household_verified", link="/app/family")
    assert "https://mahalladosh.uz/app/family" in sent[1][1]


def test_message_is_truncated_to_telegrams_limit(configured, sent, inline, monkeypatch):
    telegram.send_dm(user(), text="x" * 9000)
    assert len(sent[0][1]) == telegram.MESSAGE_LIMIT

    # and an overlong body is what gets trimmed — never the link off the end of it
    monkeypatch.setattr(telegram.settings, "public_web_url", "https://mahalladosh.uz")
    telegram.send_dm(user(), text="x" * 9000, link="/app/posts/1")
    assert len(sent[1][1]) == telegram.MESSAGE_LIMIT
    assert sent[1][1].endswith("https://mahalladosh.uz/app/posts/1")


# ---------- blast radius: nothing escapes into the caller ----------


def test_a_transport_failure_never_reaches_the_caller(configured, inline, monkeypatch):
    """The point of the whole module. Telegram is down, the send raises in the
    caller's own thread, and the request that triggered it must not notice."""

    def explode(chat_id, text):
        raise ConnectionResetError("telegram is having a day")

    monkeypatch.setattr(telegram, "_transport", explode)

    telegram.send_dm(user(), event="dingdong", params={"name": "Aziza"})  # must not raise
    telegram.send_dm_bulk([user(501), user(502)], event="dingdong", params={"name": "Aziza"})


def test_a_broken_user_object_never_reaches_the_caller(configured, sent, inline):
    """Programming errors count too: a caller passing None, or an ORM instance whose
    attribute access blows up, must not 500 the request that was being served."""

    class Detached:
        @property
        def tg_dm_enabled(self):
            raise RuntimeError("Instance is not bound to a Session")

    telegram.send_dm(None, event="dingdong")
    telegram.send_dm(Detached(), event="dingdong")
    telegram.send_dm_bulk([user(501), Detached(), user(tg_id=None)], event="household_verified")

    # the healthy neighbour in that batch still got their message
    assert [chat_id for chat_id, _ in sent] == [501]


def test_a_failing_iterable_never_reaches_the_caller(configured, sent, inline):
    """send_dm_bulk is handed query results; a lazy query can raise mid-iteration."""

    def users():
        yield user(501)
        raise RuntimeError("connection closed mid-fetch")

    telegram.send_dm_bulk(users(), event="household_verified")
    assert sent == []  # the batch is lost, the caller is fine


def test_the_bot_token_never_appears_in_a_log_line(configured, inline, monkeypatch, caplog):
    """urllib puts the failing URL in its error message, and that URL carries the
    token. Anything this module logs has to be scrubbed."""

    def explode(chat_id, text):
        raise OSError(f"failed opening https://api.telegram.org/bot{TOKEN}/sendMessage")

    monkeypatch.setattr(telegram, "_transport", explode)
    with caplog.at_level(logging.DEBUG):
        telegram.send_dm(user(), event="dingdong", params={"name": "Aziza"})

    assert caplog.text  # the failure was recorded at all
    assert TOKEN not in caplog.text
    assert TOKEN.split(":")[1] not in caplog.text  # not even the secret half
    assert "***" in caplog.text


# ---------- blast radius: the caller's session and thread ----------


def test_the_callers_db_session_is_untouched(configured, sent, inline, db, world):
    """The sender takes users, never a Session — so a DM cannot commit a caller's
    half-finished transaction, roll it back, or expire objects it is still using."""
    neighbour = db.get(models.User, world.neighbor_id)
    neighbour.tg_id = 777
    db.commit()

    # a request mid-flight: an uncommitted change pending in the caller's session
    neighbour.full_name = "Renamed Opa"
    telegram.send_dm(neighbour, event="dingdong", params={"name": "Aziza"})

    assert sent[0][0] == 777
    assert neighbour in db.dirty  # our pending edit is still pending
    assert db.query(models.User).filter_by(full_name="Renamed Opa").count() == 0  # not committed
    db.rollback()  # and the session is still perfectly usable afterwards
    assert db.get(models.User, world.neighbor_id).full_name == world.neighbor


def test_delivery_happens_off_the_request_thread(configured, monkeypatch):
    """Real pool, no inline fixture: the network must never be on the request path."""
    seen: list[int] = []
    done = threading.Event()

    def record(chat_id, text):
        seen.append(threading.get_ident())
        done.set()

    monkeypatch.setattr(telegram, "_transport", record)
    telegram.send_dm(user(), event="dingdong", params={"name": "Aziza"})

    assert done.wait(timeout=5), "DM was never delivered by the background pool"
    assert seen[0] != threading.get_ident()


def test_a_worker_crash_does_not_poison_the_pool(configured, monkeypatch):
    """A raising job must not kill the worker thread — the next DM still goes out."""
    done = threading.Event()
    calls: list[int] = []

    def flaky(chat_id, text):
        calls.append(chat_id)
        if chat_id == 501:
            raise RuntimeError("boom")
        done.set()

    monkeypatch.setattr(telegram, "_transport", flaky)
    telegram.send_dm(user(501), text="first")
    telegram.send_dm(user(502), text="second")

    assert done.wait(timeout=5)
    assert 502 in calls


def test_a_full_backlog_sheds_load_instead_of_growing(configured, sent, monkeypatch):
    """If Telegram is unreachable for an evening, queued DMs must be dropped rather
    than accumulate until the API server dies with them."""
    monkeypatch.setattr(telegram, "_queued", telegram.MAX_QUEUED)
    telegram.send_dm(user(), text="dropped")
    assert sent == []
