from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_current_user, get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=schemas.NotificationsOut)
def list_notifications(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(models.Notification)
        .filter_by(user_id=user.id)
        .order_by(models.Notification.created_at.desc())
        .limit(50)
        .all()
    )
    unread = db.query(models.Notification).filter_by(user_id=user.id, read=False).count()
    return schemas.NotificationsOut(
        items=[schemas.NotificationOut.model_validate(n) for n in items],
        unread=unread,
    )


@router.post("/read", status_code=204)
def mark_all_read(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(models.Notification).filter_by(user_id=user.id, read=False).update(
        {"read": True}
    )
    db.commit()
