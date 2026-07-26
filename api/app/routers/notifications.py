from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, notif_catalog, schemas
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
    # rendered per-read, in this reader's language — the same row shows Cyrillic to a
    # grandmother and Russian to her son-in-law
    return schemas.NotificationsOut(
        items=[
            schemas.NotificationOut(
                id=n.id,
                type=n.type,
                text=notif_catalog.render(n.event, n.params, user.lang, fallback=n.text),
                link=n.link,
                read=n.read,
                created_at=n.created_at,
            )
            for n in items
        ],
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
