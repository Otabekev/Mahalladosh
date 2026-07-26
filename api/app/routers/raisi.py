"""The raisi (mahalla head) panel — daily tools scoped to the raisi's own mahalla.

Every route is gated by require_raisi, so a plain member can't reach them and a raisi
can only ever act on their own mahalla. Kept in one router so the panel's surface is
easy to audit in a single place.

Tool 1: pin one post to the top of the mahalla feed.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models
from ..deps import get_db, require_raisi

router = APIRouter(prefix="/raisi", tags=["raisi"])


@router.put("/pinned/{post_id}", status_code=204)
def pin_post(
    post_id: int,
    user: models.User = Depends(require_raisi),
    db: Session = Depends(get_db),
):
    """Pin a post to the top of the feed. Only a post in the raisi's own mahalla can
    be pinned — no reaching into another mahalla's content."""
    post = db.get(models.Post, post_id)
    if post is None or post.mahalla_id != user.mahalla_id:
        raise HTTPException(status_code=404, detail="E'lon topilmadi")
    mahalla = db.get(models.Mahalla, user.mahalla_id)
    mahalla.pinned_post_id = post.id
    db.commit()


@router.delete("/pinned", status_code=204)
def unpin_post(
    user: models.User = Depends(require_raisi),
    db: Session = Depends(get_db),
):
    """Clear the pinned post, if any."""
    mahalla = db.get(models.Mahalla, user.mahalla_id)
    if mahalla and mahalla.pinned_post_id is not None:
        mahalla.pinned_post_id = None
        db.commit()
