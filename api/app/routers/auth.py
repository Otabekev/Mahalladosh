from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from .. import models, presenters, schemas
from ..config import settings
from ..deps import get_current_user, get_db
from ..security import COOKIE_NAME, create_session_token, verify_telegram_auth

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session(response: Response, user_id: int) -> None:
    response.set_cookie(
        COOKIE_NAME,
        create_session_token(user_id),
        max_age=settings.session_days * 86400,
        httponly=True,
        samesite="lax",
        secure=not settings.is_dev,
    )


@router.post("/dev-login", response_model=schemas.UserOut)
def dev_login(data: schemas.DevLoginIn, response: Response, db: Session = Depends(get_db)):
    """Local-development login. Disabled outside dev."""
    if not settings.is_dev:
        raise HTTPException(status_code=404)
    user = db.query(models.User).filter_by(full_name=data.full_name, tg_id=None).first()
    if user is None:
        user = models.User(full_name=data.full_name, is_admin=data.is_admin)
        db.add(user)
        db.commit()
        db.refresh(user)
    elif data.is_admin and not user.is_admin:
        user.is_admin = True
        db.commit()
    _set_session(response, user.id)
    return presenters.user_out(db, user)


@router.post("/telegram", response_model=schemas.UserOut)
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
    else:
        user.full_name = full_name
        user.username = data.username
        user.photo_url = data.photo_url
    db.commit()
    db.refresh(user)
    _set_session(response, user.id)
    return presenters.user_out(db, user)


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
        p = db.query(models.Petition).filter_by(user_id=user.id).first()
        if p:
            m = db.get(models.Mahalla, p.mahalla_id)
            if m:
                petition = presenters.petition_status(db, m, user)

    if user.household_id:
        h = db.get(models.Household, user.household_id)
        if h:
            household = presenters.household_out(db, h, user)

    return schemas.MeOut(
        user=presenters.user_out(db, user),
        mahalla=mahalla,
        petition=petition,
        household=household,
    )


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
