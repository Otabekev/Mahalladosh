from collections.abc import Generator
from datetime import datetime

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session

from . import models, track
from .db import SessionLocal
from .security import decode_session_token


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    md_session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    if not md_session:
        raise HTTPException(status_code=401, detail="Kirish talab qilinadi")
    user_id = decode_session_token(md_session)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Sessiya eskirgan")
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Foydalanuvchi topilmadi")
    # A banned or deleted (anonymized → banned_until far-future) account is locked
    # out of EVERY authenticated route, not just member-scoped ones. Sessions are
    # stateless JWTs, so clearing the cookie can't revoke a token the client kept —
    # this server-side check is what actually enforces the ban / account deletion
    # on /me, delete-post, delete-service, etc.
    if user.banned_until and user.banned_until > datetime.utcnow():
        raise HTTPException(status_code=403, detail="Hisobingiz chetlatilgan")
    try:
        track.touch(db, user)  # analytics presence mark — must never break auth
    except Exception:
        db.rollback()
    return user


def require_member(user: models.User = Depends(get_current_user)) -> models.User:
    """User must belong to an active mahalla. (The ban/lockout check lives in
    get_current_user, so it already ran and covers every authenticated route.)"""
    if user.mahalla_id is None:
        raise HTTPException(status_code=403, detail="Avval mahallaga qo'shiling")
    return user


def require_admin(user: models.User = Depends(get_current_user)) -> models.User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin huquqi kerak")
    return user


def require_raisi(
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
) -> models.User:
    """User must be the raisi (head) of their own active mahalla — the gate on the
    raisi panel's tools. A platform admin also passes, so support can step in."""
    if user.is_admin:
        return user
    m = db.get(models.Mahalla, user.mahalla_id)
    if m is None or m.raisi_user_id != user.id:
        raise HTTPException(status_code=403, detail="Faqat raisi uchun")
    return user
