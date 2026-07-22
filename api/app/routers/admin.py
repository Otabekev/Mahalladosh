"""Operator console: approve/reject petitioned mahallas, add MFY entries,
platform stats. Every route requires admin."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, notify, presenters, reputation, schemas, track
from ..deps import get_db, require_admin
from ..seed import normalize_name

router = APIRouter(prefix="/admin", tags=["admin"])

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
        f"🎉 {m.name} mahallasi ochildi! Siz asoschilardansiz (+20 ball)",
        link="/app",
        mahalla_id=m.id,
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
