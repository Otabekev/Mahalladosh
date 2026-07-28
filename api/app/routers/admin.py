"""Operator console: approve/reject petitioned mahallas, add MFY entries,
platform stats, and moderation (report queue + takedown/ban). Every route
requires admin."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, moderation, notify, presenters, reputation, schemas, track
from ..deps import get_db, require_admin
from ..seed import normalize_name
from .reports import report_out

router = APIRouter(prefix="/admin", tags=["admin"])


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


@router.get("/metrics", response_model=schemas.AdminMetrics)
def metrics(
    days: int = 30,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    """Per-day and per-mahalla health, for the operator.

    Only aggregates — counts of people, never people. Nothing here names a user or
    exposes one mahalla's content to another; it is a platform-operator view, so it
    is 403 for a non-admin rather than 404 (there is no resource to hide).

    DAU counts UserActivity rows, which `track.touch` writes once per account per UTC
    day. It is deliberately restricted to accounts that are IN a mahalla: a signed-in
    person who never joined one is not an active neighbour, and counting them would
    flatter the headline number on the one screen that exists to tell the truth.
    """
    days = max(1, min(days, 90))
    today = datetime.utcnow().date()
    since_day = (today - timedelta(days=days - 1)).strftime("%Y-%m-%d")
    week_ago = datetime.utcnow() - timedelta(days=7)
    week_ago_day = (today - timedelta(days=6)).strftime("%Y-%m-%d")

    member_ids = db.query(models.User.id).filter(models.User.mahalla_id.isnot(None))

    def actives_since(day: str) -> int:
        return (
            db.query(func.count(func.distinct(models.UserActivity.user_id)))
            .filter(
                models.UserActivity.day >= day,
                models.UserActivity.user_id.in_(member_ids),
            )
            .scalar()
            or 0
        )

    # one grouped query for the whole series, then fill the gaps — a day with nobody
    # on it must appear as a zero, not vanish and make the chart lie
    rows = dict(
        db.query(models.UserActivity.day, func.count(func.distinct(models.UserActivity.user_id)))
        .filter(
            models.UserActivity.day >= since_day,
            models.UserActivity.user_id.in_(member_ids),
        )
        .group_by(models.UserActivity.day)
        .all()
    )
    daily = [
        schemas.DayPoint(
            day=(today - timedelta(days=n)).strftime("%Y-%m-%d"),
            active=rows.get((today - timedelta(days=n)).strftime("%Y-%m-%d"), 0),
        )
        for n in range(days - 1, -1, -1)
    ]

    contributed = (
        db.query(func.count(func.distinct(models.Post.author_id)))
        .filter(models.Post.type != "newcomer")  # the auto-post is not a contribution
        .scalar()
        or 0
    )

    health = []
    for m in db.query(models.Mahalla).filter_by(status="active").order_by(models.Mahalla.name):
        ids = db.query(models.User.id).filter(models.User.mahalla_id == m.id)
        health.append(
            schemas.MahallaHealth(
                mahalla_id=m.id,
                name=m.name,
                members=db.query(models.User).filter_by(mahalla_id=m.id).count(),
                active_7d=(
                    db.query(func.count(func.distinct(models.UserActivity.user_id)))
                    .filter(
                        models.UserActivity.day >= week_ago_day,
                        models.UserActivity.user_id.in_(ids),
                    )
                    .scalar()
                    or 0
                ),
                posts_7d=db.query(models.Post)
                .filter(models.Post.mahalla_id == m.id, models.Post.created_at >= week_ago)
                .count(),
                help_open=db.query(models.Post)
                .filter_by(mahalla_id=m.id, type="help", status="open")
                .count(),
            )
        )

    return schemas.AdminMetrics(
        dau=actives_since(today.strftime("%Y-%m-%d")),
        wau=actives_since(week_ago_day),
        posts_7d=db.query(models.Post).filter(models.Post.created_at >= week_ago).count(),
        help_resolved_7d=db.query(models.Post)
        .filter(
            models.Post.type == "help",
            models.Post.status == "resolved",
            models.Post.resolved_at >= week_ago,
        )
        .count(),
        help_open=db.query(models.Post).filter_by(type="help", status="open").count(),
        daily=daily,
        funnel_registered=db.query(models.User).count(),
        funnel_in_mahalla=db.query(models.User).filter(models.User.mahalla_id.isnot(None)).count(),
        funnel_in_household=db.query(models.User)
        .filter(models.User.household_id.isnot(None))
        .count(),
        funnel_contributed=contributed,
        mahallas=health,
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

    moderation.apply_ban(
        db, target, reason=data.reason, source="admin", created_by=admin.id, days=data.days
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
