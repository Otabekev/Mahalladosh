from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from .. import models, presenters, schemas, track
from ..config import settings
from ..deps import get_current_user, get_db
from ..security import COOKIE_NAME, create_session_token, verify_telegram_auth

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/config", response_model=schemas.AuthConfig)
def auth_config():
    """Tells the login screen which methods are available. The Telegram widget
    is only advertised when the token is also set — verification fails closed
    without it, so a username alone would render a button that can't work."""
    telegram_ready = bool(settings.telegram_bot_username and settings.telegram_bot_token)
    return schemas.AuthConfig(
        dev=settings.is_dev,
        telegram_bot=settings.telegram_bot_username if telegram_ready else None,
    )


def _set_session(response: Response, user_id: int) -> None:
    response.set_cookie(
        COOKIE_NAME,
        create_session_token(user_id),
        max_age=settings.session_days * 86400,
        httponly=True,
        samesite="lax",
        secure=not settings.is_dev,
    )


@router.post("/dev-login", response_model=schemas.SelfUserOut)
def dev_login(data: schemas.DevLoginIn, response: Response, db: Session = Depends(get_db)):
    """Local-development login. Disabled outside dev.

    Two escalation paths used to live here: the endpoint created a user with
    `is_admin` taken straight from the request body, and it PROMOTED an existing
    non-admin who happened to be named in the payload. Both are gone — a dev login
    can no longer confer admin on anyone. It still reuses a seeded account by name,
    which is the whole point in development and precisely why the environment gate
    below must fail closed (see settings.environment).
    """
    if not settings.is_dev:
        raise HTTPException(status_code=404)
    # dev convenience: reuse any existing user with this exact name (so demo
    # accounts like "Otabek Ergashaliyev" log into their seeded rich profile),
    # preferring one that's already a mahalla member
    user = (
        db.query(models.User)
        .filter_by(full_name=data.full_name)
        .order_by(models.User.mahalla_id.is_(None))
        .first()
    )
    if user is None:
        # never is_admin: a fresh dev account is always an ordinary neighbour
        user = models.User(full_name=data.full_name)
        db.add(user)
        db.flush()  # autoflush=False — the login event below needs user.id
    track.log_event(db, user.id, "login")
    db.commit()
    db.refresh(user)
    _set_session(response, user.id)
    return presenters.self_user_out(db, user)


@router.post("/telegram", response_model=schemas.SelfUserOut)
def telegram_login(data: schemas.TelegramLoginIn, response: Response, db: Session = Depends(get_db)):
    payload = data.model_dump(exclude_none=True)
    if not verify_telegram_auth({k: str(v) for k, v in payload.items()}):
        raise HTTPException(status_code=401, detail="Telegram tekshiruvi muvaffaqiyatsiz")
    user = db.query(models.User).filter_by(tg_id=data.id).first()
    full_name = f"{data.first_name} {data.last_name or ''}".strip()
    if user is None:
        user = models.User(
            tg_id=data.id, full_name=full_name,
            username=data.username, photo_url=data.photo_url,
        )
        db.add(user)
        db.flush()  # autoflush=False — the login event below needs user.id
    else:
        # The ban lockout lives in get_current_user, which a LOGIN route never runs.
        # Without this check a banned account could still rename itself and change
        # its photo — community-wide, on every post it ever wrote — and be handed a
        # fresh session cookie while doing it.
        if user.banned_until and user.banned_until > datetime.utcnow():
            raise HTTPException(status_code=403, detail="Hisobingiz chetlatilgan")
        user.full_name = full_name
        user.username = data.username
        user.photo_url = data.photo_url
    track.log_event(db, user.id, "login")
    db.commit()
    db.refresh(user)
    _set_session(response, user.id)
    return presenters.self_user_out(db, user)


@router.get("/me", response_model=schemas.MeOut)
def me(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    mahalla = None
    petition = None
    household = None

    if user.mahalla_id:
        m = db.get(models.Mahalla, user.mahalla_id)
        if m:
            mahalla = presenters.mahalla_detail(db, m)
    else:
        p = db.query(models.Petition).filter_by(user_id=user.id, status="active").first()
        if p:
            m = db.get(models.Mahalla, p.mahalla_id)
            if m:
                petition = presenters.petition_status(db, m, user)

    if user.household_id:
        h = db.get(models.Household, user.household_id)
        if h:
            household = presenters.household_out(db, h, user)

    away_link = (
        db.query(models.AwayMember)
        .filter(models.AwayMember.user_id == user.id, models.AwayMember.status != "revoked")
        .order_by(models.AwayMember.created_at.desc())
        .first()
    )

    return schemas.MeOut(
        user=presenters.self_user_out(db, user),
        mahalla=mahalla,
        petition=petition,
        household=household,
        away_status=away_link.status if away_link else "none",
    )


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
