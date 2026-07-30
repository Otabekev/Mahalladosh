import hashlib
import hmac
import time
from datetime import datetime, timedelta

import jwt

from .config import settings

ALGORITHM = "HS256"
COOKIE_NAME = "md_session"

# The shipped placeholder. It is in a public repository, so anyone can read it.
DEFAULT_SECRET = "change-me"
MIN_SECRET_LENGTH = 32


def check_secret_key() -> None:
    """Refuse to serve production traffic with a guessable session secret.

    Sessions are HS256 JWTs signed with settings.secret_key. If that key is the
    committed placeholder, anyone who has read this repository can mint a cookie
    for any user id — including id 1, which the seed makes a platform admin. There
    is no partial version of this failure: a forgeable session is every account.

    This raises rather than warns, unlike the uploads check. Ephemeral uploads are
    a reasonable trade for a demo; a public signing key never is, and there is no
    legitimate production use of "change-me" to preserve.
    """
    if settings.is_dev:
        return
    key = settings.secret_key
    if key == DEFAULT_SECRET or len(key) < MIN_SECRET_LENGTH:
        raise RuntimeError(
            "SECRET_KEY is unset, still the committed placeholder, or shorter than "
            f"{MIN_SECRET_LENGTH} characters. Session cookies are signed with it, so a "
            "guessable value lets anyone forge a session for any account, including an "
            "admin. Generate one and set it in the environment:\n"
            '  python -c "import secrets; print(secrets.token_urlsafe(48))"'
        )


def create_session_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(days=settings.session_days),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_session_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except Exception:
        return None


def verify_telegram_auth(data: dict) -> bool:
    """Verify Telegram Login Widget payload: HMAC-SHA256 of the sorted
    data-check-string keyed with SHA256(bot_token)."""
    if not settings.telegram_bot_token:
        return False
    received_hash = data.get("hash", "")
    auth_date = int(data.get("auth_date", 0))
    if time.time() - auth_date > 86400:  # stale login
        return False
    check_pairs = sorted(f"{k}={v}" for k, v in data.items() if k != "hash")
    data_check_string = "\n".join(check_pairs)
    secret = hashlib.sha256(settings.telegram_bot_token.encode()).digest()
    computed = hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, received_hash)


# ---------- away-member invite tokens ----------

# Short-lived on purpose. The link is sent over Telegram to a son in Moscow and used
# within minutes; a token that stayed valid for a month would sit in a chat history
# forever, and a forwarded chat history is exactly the leak this feature has to avoid.
AWAY_INVITE_HOURS = 48


def create_away_invite(household_id: int) -> str:
    """A signed, expiring claim that a household's steward issued this invite.

    Signed rather than stored so there is no invite table to leak, expire, or clean
    up — and possession alone is still not enough: a steward must approve the link
    afterwards (see routers/away.py)."""
    payload = {
        "h": household_id,
        "kind": "away",
        "exp": datetime.utcnow() + timedelta(hours=AWAY_INVITE_HOURS),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_away_invite(token: str) -> int | None:
    """The household id this invite is for, or None if it is invalid or expired."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except Exception:
        return None
    # `kind` matters: without it a session token would decode here too, and any
    # logged-in user could mint themselves an invite out of their own cookie
    if payload.get("kind") != "away":
        return None
    household_id = payload.get("h")
    return int(household_id) if isinstance(household_id, int) else None
