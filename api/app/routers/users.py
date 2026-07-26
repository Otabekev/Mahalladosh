"""Public person pages — a neighbour's profile, visible to others in the same
mahalla. Scoped tightly: you can only look up someone who shares your mahalla, and
a foreign id is a 404 (not 403) so it can't be used to probe who exists platform-
wide, matching the reports router's rule."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, presenters, schemas
from ..deps import get_db, require_member

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}", response_model=schemas.PublicProfileOut)
def profile(
    user_id: int,
    viewer: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    target = db.get(models.User, user_id)
    if target is None or target.mahalla_id != viewer.mahalla_id:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    household = (
        db.get(models.Household, target.household_id) if target.household_id else None
    )
    post_count = db.query(models.Post).filter_by(author_id=target.id).count()
    return schemas.PublicProfileOut(
        id=target.id,
        full_name=target.full_name,
        photo_url=target.photo_url,
        is_raisi=presenters._is_raisi(db, target),
        rep_month=target.rep_month,
        rep_alltime=target.rep_alltime,
        created_at=target.created_at,
        household_id=household.id if household else None,
        household_name=household.family_name if household else None,
        post_count=post_count,
    )
