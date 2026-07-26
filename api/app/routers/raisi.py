"""The raisi (mahalla head) panel — daily tools scoped to the raisi's own mahalla.

Every route is gated by require_raisi, so a plain member can't reach them and a raisi
can only ever act on their own mahalla. Kept in one router so the panel's surface is
easy to audit in a single place.

Tool 1: pin one post to the top of the mahalla feed.
Tool 2: curate the mahalla contacts (raisi / clinic / emergency numbers).
Tool 3: the moderation queue — reports for this mahalla, with take-down / ban.
Tool 4: the member roster, with a per-member ban.

Scope note: the panel plan called tool 3 an "approvals queue". Joining a mahalla is
open and household joins are steward-approved by the family on purpose, so there is
nothing there for the raisi to approve — the genuinely useful queue is moderation,
which was otherwise locked to the platform admin. This decentralizes it to the head
of each mahalla, scoped strictly to their own.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, moderation, notify, schemas, track
from ..deps import get_db, require_raisi
from .reports import report_out

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


# ---------- moderation queue ----------


@router.get("/reports", response_model=list[schemas.ReportOut])
def list_reports(
    user: models.User = Depends(require_raisi),
    db: Session = Depends(get_db),
):
    """Open reports raised inside the raisi's own mahalla, newest first. A raisi
    only ever sees their own mahalla's queue — never the whole platform's."""
    rows = (
        db.query(models.Report)
        .filter_by(status="open", mahalla_id=user.mahalla_id)
        .order_by(models.Report.created_at.desc())
        .all()
    )
    return [report_out(db, r) for r in rows]


def _own_open_report(db: Session, report_id: int, user: models.User) -> models.Report:
    r = db.get(models.Report, report_id)
    if r is None or r.mahalla_id != user.mahalla_id:
        raise HTTPException(status_code=404, detail="Shikoyat topilmadi")
    return r


@router.post("/reports/{report_id}/resolve", response_model=schemas.ReportOut)
def resolve_report(
    report_id: int,
    user: models.User = Depends(require_raisi),
    db: Session = Depends(get_db),
):
    """Mark a report handled."""
    r = _own_open_report(db, report_id, user)
    if r.status == "open":
        r.status = "resolved"
        r.resolved_by = user.id
        r.resolved_at = datetime.utcnow()
        db.commit()
        db.refresh(r)
    return report_out(db, r)


@router.post("/reports/{report_id}/dismiss", response_model=schemas.ReportOut)
def dismiss_report(
    report_id: int,
    user: models.User = Depends(require_raisi),
    db: Session = Depends(get_db),
):
    """Mark a report unfounded."""
    r = _own_open_report(db, report_id, user)
    if r.status == "open":
        r.status = "dismissed"
        r.resolved_by = user.id
        r.resolved_at = datetime.utcnow()
        db.commit()
        db.refresh(r)
    return report_out(db, r)


# ---------- member roster ----------


def _member_row(u: models.User, raisi_id: int | None, now: datetime) -> schemas.MemberRow:
    return schemas.MemberRow(
        id=u.id,
        full_name=u.full_name,
        photo_url=u.photo_url,
        rep_month=u.rep_month,
        rep_alltime=u.rep_alltime,
        is_raisi=u.id == raisi_id,
        banned=bool(u.banned_until and u.banned_until > now),
    )


@router.get("/members", response_model=list[schemas.MemberRow])
def roster(
    user: models.User = Depends(require_raisi),
    db: Session = Depends(get_db),
):
    """Everyone in the raisi's mahalla, most-active first, each flagged with whether
    they are the raisi and whether they are currently banned."""
    now = datetime.utcnow()
    mahalla = db.get(models.Mahalla, user.mahalla_id)
    raisi_id = mahalla.raisi_user_id if mahalla else None
    rows = (
        db.query(models.User)
        .filter(models.User.mahalla_id == user.mahalla_id)
        .order_by(models.User.rep_month.desc(), models.User.full_name)
        .all()
    )
    return [_member_row(u, raisi_id, now) for u in rows]


@router.post("/members/{user_id}/ban", response_model=schemas.MemberRow, status_code=200)
def ban_member(
    user_id: int,
    user: models.User = Depends(require_raisi),
    db: Session = Depends(get_db),
):
    """Ban a member of the raisi's own mahalla — temporary-first, permanent on
    repeat, same mechanics as the admin console (see moderation.apply_ban)."""
    target = db.get(models.User, user_id)
    if target is None or target.mahalla_id != user.mahalla_id:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if target.id == user.id:
        raise HTTPException(status_code=400, detail="O'zingizni chetlata olmaysiz")
    mahalla = db.get(models.Mahalla, user.mahalla_id)
    if mahalla and target.id == mahalla.raisi_user_id:
        raise HTTPException(status_code=400, detail="Raisini chetlatib bo'lmaydi")

    moderation.apply_ban(db, target, reason="Raisi", source="raisi", created_by=user.id)
    track.log_event(
        db, user.id, "ban", entity_type="user", entity_id=target.id,
        mahalla_id=target.mahalla_id,
    )
    notify.notify_mahalla(
        db,
        user.mahalla_id,
        "warning",
        link="/app",
        exclude=[target.id],
        event="member_banned",
        params={"name": target.full_name},
    )
    db.commit()
    db.refresh(target)
    return _member_row(target, mahalla.raisi_user_id if mahalla else None, datetime.utcnow())
