"""Shared builders for response schemas — used by every router so the same
object is always serialized the same way."""

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, schemas
from .config import settings


def user_out(db: Session, user: models.User) -> schemas.UserOut:
    is_raisi = False
    if user.mahalla_id:
        m = db.get(models.Mahalla, user.mahalla_id)
        is_raisi = bool(m and m.raisi_user_id == user.id)
    out = schemas.UserOut.model_validate(user)
    out.is_raisi = is_raisi
    return out


def mahalla_out(db: Session, m: models.Mahalla) -> schemas.MahallaOut:
    petition_count = db.query(models.Petition).filter_by(mahalla_id=m.id, status="active").count()
    member_count = db.query(models.User).filter_by(mahalla_id=m.id).count()
    return schemas.MahallaOut(
        id=m.id,
        district_id=m.district_id,
        name=m.name,
        status=m.status,
        estimated_households=m.estimated_households,
        petition_count=petition_count,
        petition_threshold=m.petition_threshold or settings.petition_threshold,
        member_count=member_count,
    )


def last_month_winner(db: Session, mahalla_id: int) -> schemas.LeaderboardEntry | None:
    last_month = (datetime.utcnow().replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
    row = (
        db.query(
            models.ReputationEntry.user_id,
            func.sum(models.ReputationEntry.amount).label("points"),
        )
        .filter_by(mahalla_id=mahalla_id, month=last_month)
        .group_by(models.ReputationEntry.user_id)
        .order_by(func.sum(models.ReputationEntry.amount).desc())
        .first()
    )
    if row is None:
        return None
    user = db.get(models.User, row.user_id)
    if user is None:
        return None
    return schemas.LeaderboardEntry(user=user_out(db, user), points=row.points, rank=1)


def mahalla_detail(db: Session, m: models.Mahalla) -> schemas.MahallaDetail:
    base = mahalla_out(db, m)
    district = db.get(models.District, m.district_id)
    region = db.get(models.Region, district.region_id) if district else None
    raisi = db.get(models.User, m.raisi_user_id) if m.raisi_user_id else None
    household_count = db.query(models.Household).filter_by(mahalla_id=m.id).count()
    return schemas.MahallaDetail(
        **base.model_dump(),
        district_name=district.name_uz if district else "",
        region_name=region.name_uz if region else "",
        raisi=user_out(db, raisi) if raisi else None,
        faol_qoshni=last_month_winner(db, m.id),
        household_count=household_count,
        activated_at=m.activated_at,
    )


def author_place(db: Session, mahalla_id: int) -> str:
    """'Yoshlik, Pop tumani' — where a discover-feed author is from."""
    m = db.get(models.Mahalla, mahalla_id)
    if m is None:
        return ""
    district = db.get(models.District, m.district_id)
    return f"{m.name}, {district.name_uz}" if district else m.name


def petition_status(db: Session, m: models.Mahalla, user: models.User) -> schemas.PetitionStatus:
    mine = (
        db.query(models.Petition)
        .filter_by(mahalla_id=m.id, user_id=user.id, status="active")
        .first()
    )
    return schemas.PetitionStatus(mahalla=mahalla_out(db, m), my_petition=mine is not None)


def household_out(db: Session, h: models.Household, viewer: models.User) -> schemas.HouseholdOut:
    vouch_count = db.query(models.Vouch).filter_by(household_id=h.id).count()
    my_vouch = (
        db.query(models.Vouch).filter_by(household_id=h.id, voucher_user_id=viewer.id).first()
        is not None
    )
    members = db.query(models.HouseholdMember).filter_by(household_id=h.id).all()
    # family_only households hide details from non-members (plan §6.4)
    is_mine = viewer.household_id == h.id
    hide = h.visibility == "family_only" and not is_mine
    return schemas.HouseholdOut(
        id=h.id,
        mahalla_id=h.mahalla_id,
        family_name=h.family_name,
        resident_count=h.resident_count,
        street=h.street,
        has_location=h.lat is not None and h.lng is not None,
        family_history=None if hide else h.family_history,
        generations_here=None if hide else h.generations_here,
        visibility=h.visibility,
        verification_status=h.verification_status,
        vouch_count=vouch_count,
        my_vouch=my_vouch,
        members=[] if hide else [schemas.MemberOut.model_validate(mb) for mb in members],
        created_by=h.created_by,
        created_at=h.created_at,
    )
