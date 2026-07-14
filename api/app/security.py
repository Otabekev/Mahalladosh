import hashlib
import hmac
import time
from datetime import datetime, timedelta

import jwt

from .config import settings

ALGORITHM = "HS256"
COOKIE_NAME = "md_session"


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
