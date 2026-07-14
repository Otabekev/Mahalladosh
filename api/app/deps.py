from datetime import datetime
from typing import Generator

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session

from . import models
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
    return user


def require_member(user: models.User = Depends(get_current_user)) -> models.User:
    """User must belong to an active mahalla and not be banned."""
    if user.mahalla_id is None:
        raise HTTPException(status_code=403, detail="Avval mahallaga qo'shiling")
    if user.banned_until and user.banned_until > datetime.utcnow():
        raise HTTPException(status_code=403, detail="Siz vaqtincha chetlatilgansiz")
    return user


def require_admin(user: models.User = Depends(get_current_user)) -> models.User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin huquqi kerak")
    return user
