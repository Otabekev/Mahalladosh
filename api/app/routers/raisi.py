"""The raisi (mahalla head) panel — daily tools scoped to the raisi's own mahalla.

Every route is gated by require_raisi, so a plain member can't reach them and a raisi
can only ever act on their own mahalla. Kept in one router so the panel's surface is
easy to audit in a single place.

Tool 1: pin one post to the top of the mahalla feed.
Tool 2: curate the mahalla contacts (raisi / clinic / emergency numbers).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_db, require_raisi

router = APIRouter(prefix="/raisi", tags=["raisi"])


def _own_contact(db: Session, contact_id: int, user: models.User) -> models.MahallaContact:
    contact = db.get(models.MahallaContact, contact_id)
    if contact is None or contact.mahalla_id != user.mahalla_id:
        raise HTTPException(status_code=404, detail="Kontakt topilmadi")
    return contact


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


# ---------- contacts ----------


@router.post("/contacts", response_model=schemas.ContactOut, status_code=201)
def add_contact(
    data: schemas.ContactIn,
    user: models.User = Depends(require_raisi),
    db: Session = Depends(get_db),
):
    """Add a contact to the raisi's own mahalla, appended to the end of the list."""
    next_pos = (
        db.query(func.coalesce(func.max(models.MahallaContact.position), -1))
        .filter_by(mahalla_id=user.mahalla_id)
        .scalar()
    ) + 1
    contact = models.MahallaContact(
        mahalla_id=user.mahalla_id,
        label=data.label.strip(),
        name=data.name.strip() if data.name else None,
        phone=data.phone.strip(),
        position=next_pos,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return schemas.ContactOut.model_validate(contact)


@router.put("/contacts/{contact_id}", response_model=schemas.ContactOut)
def edit_contact(
    contact_id: int,
    data: schemas.ContactIn,
    user: models.User = Depends(require_raisi),
    db: Session = Depends(get_db),
):
    contact = _own_contact(db, contact_id, user)
    contact.label = data.label.strip()
    contact.name = data.name.strip() if data.name else None
    contact.phone = data.phone.strip()
    db.commit()
    db.refresh(contact)
    return schemas.ContactOut.model_validate(contact)


@router.delete("/contacts/{contact_id}", status_code=204)
def delete_contact(
    contact_id: int,
    user: models.User = Depends(require_raisi),
    db: Session = Depends(get_db),
):
    contact = _own_contact(db, contact_id, user)
    db.delete(contact)
    db.commit()
