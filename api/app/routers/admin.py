"""Operator console: approve/reject petitioned mahallas, add MFY entries,
platform stats, and moderation (report queue + takedown/ban). Every route
requires admin."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, notify, presenters, reputation, schemas, track
from ..deps import get_db, require_admin
from ..seed import normalize_name
from .reports import report_out

router = APIRouter(prefix="/admin", tags=["admin"])

# A repeat offender (already has a ban on record) is banned forever — plan §10.
PERMANENT_UNTIL = datetime(9999, 12, 31)
DEFAULT_BAN_DAYS = 30


class BanIn(BaseModel):
    days: int | None = None
    reason: str | None = None


OPENING_TITLE = "Mahallamiz ochildi! \U0001f389"
OPENING_BODY = (
    "Tabriklaymiz! Mahallamiz Mahalladosh'da rasman ochildi. "
    "Endi qo'shnilar bilan bog'lanishingiz, yordam so'rashingiz va "
    "oila sahifangizni yaratishingiz mumkin. Asoschilarga +20 ball!"
)


def _pending_mahalla(db: Session, mahalla_id: int) -> models.Mahalla:
    m = db.get(models.Mahalla, mahalla_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Mahalla topilmadi")
    if m.status != "pending":
        raise HTTPException(status_code=400, detail="Mahalla tasdiqlashni kutmayapti")
    return m


@router.get("/petitions", response_model=list[schemas.AdminPetitionOut])
def list_petitions(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Mahallas that reached their petition threshold and await a decision."""
    mahallas = (
        db.query(models.Mahalla)
        .filter_by(status="pending")
        .order_by(models.Mahalla.created_at)
        .all()
    )
    out: list[schemas.AdminPetitionOut] = []
    for m in mahallas:
        district = db.get(models.District, m.district_id)
        region = db.get(models.Region, district.region_id) if district else None
        petitions = (
            db.query(models.Petition)
            .filter_by(mahalla_id=m.id, status="active")
            .order_by(models.Petition.created_at)
            .all()
        )
        petitioners = []
        for p in petitions:
            u = db.get(models.User, p.user_id)
            if u is not None:
                petitioners.append(presenters.user_out(db, u))
        out.append(
            schemas.AdminPetitionOut(
                mahalla=presenters.mahalla_out(db, m),
                district_name=district.name_uz if district else "",
                region_name=region.name_uz if region else "",
                petitioners=petitioners,
            )
        )
    return out


@router.post("/mahallas/{mahalla_id}/approve", response_model=schemas.MahallaDetail)
def approve_mahalla(
    mahalla_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Activate a pending mahalla: enroll petitioners as founding members
    (+20 ball each), post the opening announcement, close the petitions."""
    m = _pending_mahalla(db, mahalla_id)
    m.status = "active"
    m.activated_at = datetime.utcnow()

    petitions = (
        db.query(models.Petition)
        .filter_by(mahalla_id=m.id, status="active")
        .order_by(models.Petition.created_at)
        .all()
    )
    first_petitioner_id: int | None = None
    enrolled_ids: list[int] = []
    for p in petitions:
        user = db.get(models.User, p.user_id)
        if user is None:
            continue
        if first_petitioner_id is None:
            first_petitioner_id = user.id
        if user.mahalla_id is None:
            user.mahalla_id = m.id
            enrolled_ids.append(user.id)
            track.log_event(
                db, user.id, "join",
                entity_type="mahalla", entity_id=m.id, mahalla_id=m.id,
            )
            if not reputation.already_awarded(
                db, user.id, "founding_member", "mahalla", m.id
            ):
                reputation.award(
                    db, user, "founding_member", "mahalla", m.id, mahalla_id=m.id
                )

    # only those actually enrolled as founders get the founders' notification
    notify.notify(
        db,
        enrolled_ids,
        "post",
        link="/app",
        mahalla_id=m.id,
        event="mahalla_opened",
        params={"mahalla": m.name},
    )

    if first_petitioner_id is not None:
        db.add(
            models.Post(
                mahalla_id=m.id,
                author_id=first_petitioner_id,
                type="announcement",
                title=OPENING_TITLE,
                body=OPENING_BODY,
            )
        )

    for p in petitions:
        p.status = "fulfilled"  # kept for the activation funnel
    db.commit()
    db.refresh(m)
    return presenters.mahalla_detail(db, m)


@router.post("/mahallas/{mahalla_id}/reject", status_code=204)
def reject_mahalla(
    mahalla_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Reject a pending mahalla and free its petitioners to petition elsewhere."""
    m = _pending_mahalla(db, mahalla_id)
    m.status = "rejected"
    for p in db.query(models.Petition).filter_by(mahalla_id=m.id, status="active").all():
        p.status = "rejected"
    db.commit()


@router.post("/mfy", response_model=schemas.MahallaOut)
def add_mfy(
    data: schemas.MfyIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Add a missing MFY entry (starts as 'forming', open to petitions)."""
    district = db.get(models.District, data.district_id)
    if district is None:
        raise HTTPException(status_code=404, detail="Tuman topilmadi")
    normalized = normalize_name(data.name)
    duplicate = (
        db.query(models.Mahalla)
        .filter_by(district_id=data.district_id, name_normalized=normalized)
        .first()
    )
    if duplicate is not None:
        raise HTTPException(status_code=400, detail="Bu MFY allaqachon mavjud")
    m = models.Mahalla(
        district_id=data.district_id,
        name=data.name.strip(),
        name_normalized=normalized,
        status="forming",
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return presenters.mahalla_out(db, m)


@router.get("/stats", response_model=schemas.AdminStats)
def stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    def mahallas_with(status: str) -> int:
        return db.query(models.Mahalla).filter_by(status=status).count()

    return schemas.AdminStats(
        users=db.query(models.User).count(),
        mahallas_active=mahallas_with("active"),
        mahallas_pending=mahallas_with("pending"),
        mahallas_forming=mahallas_with("forming"),
        households=db.query(models.Household).count(),
        posts=db.query(models.Post).count(),
    )


# ---------- moderation: report queue + takedown/ban (plan §10) ----------


def _get_report(db: Session, report_id: int) -> models.Report:
    r = db.get(models.Report, report_id)
    if r is None:
        raise HTTPException(status_code=404, detail="Shikoyat topilmadi")
    return r


@router.get("/reports", response_model=list[schemas.ReportOut])
def list_reports(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Open reports, newest first, with a best-effort label for each target."""
    reports = (
        db.query(models.Report)
        .filter_by(status="open")
        .order_by(models.Report.created_at.desc())
        .all()
    )
    return [report_out(db, r) for r in reports]


@router.post("/reports/{report_id}/resolve", response_model=schemas.ReportOut)
def resolve_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """Mark a report handled (the admin acted on it)."""
    r = _get_report(db, report_id)
    if r.status == "open":
        r.status = "resolved"
        r.resolved_by = admin.id
        r.resolved_at = datetime.utcnow()
        db.commit()
        db.refresh(r)
    return report_out(db, r)


@router.post("/reports/{report_id}/dismiss", response_model=schemas.ReportOut)
def dismiss_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """Mark a report unfounded (no action needed)."""
    r = _get_report(db, report_id)
    if r.status == "open":
        r.status = "dismissed"
        r.resolved_by = admin.id
        r.resolved_at = datetime.utcnow()
        db.commit()
        db.refresh(r)
    return report_out(db, r)


@router.post("/users/{user_id}/ban", response_model=schemas.AdminUserRow)
def ban_user(
    user_id: int,
    data: BanIn,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    """Ban a user. First offense is temporary (days or +30); a repeat offender
    (any prior BanRecord) is banned permanently (plan §10). Their open posts are
    closed and their services deactivated so nothing they left stays live."""
    target = db.get(models.User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="O'zingizni chetlata olmaysiz")

    had_prior_ban = (
        db.query(models.BanRecord).filter_by(user_id=target.id).first() is not None
    )
    if had_prior_ban:
        target.banned_until = PERMANENT_UNTIL
        record_until = None
        permanent = True
    else:
        days = data.days if data.days and data.days > 0 else DEFAULT_BAN_DAYS
        target.banned_until = datetime.utcnow() + timedelta(days=days)
        record_until = target.banned_until
        permanent = False

    db.add(
        models.BanRecord(
            user_id=target.id,
            mahalla_id=target.mahalla_id,
            reason=data.reason,
            source="admin",
            until=record_until,
            permanent=permanent,
            created_by=admin.id,
        )
    )

    # take down anything they left standing
    db.query(models.Post).filter_by(author_id=target.id, status="open").update(
        {"status": "closed"}
    )
    db.query(models.ServiceOffering).filter_by(created_by=target.id, active=True).update(
        {"active": False}
    )

    track.log_event(
        db, admin.id, "ban", entity_type="user", entity_id=target.id,
        mahalla_id=target.mahalla_id,
    )
    if target.mahalla_id is not None:
        # exclude the target explicitly: their banned_until change isn't flushed
        # yet (autoflush=False), so notify_mahalla's ban filter can't see it
        notify.notify_mahalla(
            db,
            target.mahalla_id,
            "warning",
            link="/app",
            exclude=[target.id],
            event="member_banned",
            params={"name": target.full_name},
        )
    db.commit()
    db.refresh(target)
    return schemas.AdminUserRow.model_validate(target)


@router.post("/users/{user_id}/unban", response_model=schemas.AdminUserRow)
def unban_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Lift a ban. Prior BanRecords stay on file, so a next offense still
    escalates to permanent."""
    target = db.get(models.User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    target.banned_until = None
    db.commit()
    db.refresh(target)
    return schemas.AdminUserRow.model_validate(target)
