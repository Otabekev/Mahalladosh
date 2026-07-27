"""Shared builders for response schemas — used by every router so the same
object is always serialized the same way."""

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, schemas
from .config import settings


def _is_raisi(db: Session, user: models.User, mahalla_id: int | None = None) -> bool:
    """Is this person the raisi of `mahalla_id` (default: their own mahalla)?

    Pass the mahalla of the thing being acted on whenever that can differ from the
    viewer's — share posts are readable across mahallas, so an unscoped check let a
    raisi moderate content belonging to a mahalla they have no authority over.
    """
    target = mahalla_id if mahalla_id is not None else user.mahalla_id
    if not target:
        return False
    m = db.get(models.Mahalla, target)
    return bool(m and m.raisi_user_id == user.id)


def user_out(db: Session, user: models.User) -> schemas.UserOut:
    """Public view of a user — safe to embed as a post author, petitioner, etc.
    Deliberately NOT carrying lang / tg_dm_enabled; those are on self_user_out."""
    out = schemas.UserOut.model_validate(user)
    out.is_raisi = _is_raisi(db, user)
    return out


def self_user_out(db: Session, user: models.User) -> schemas.SelfUserOut:
    """The account's own view, with its private settings. Only for /auth/me and
    PATCH /me — never embedded in another user's response."""
    out = schemas.SelfUserOut.model_validate(user)
    out.is_raisi = _is_raisi(db, user)
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
        .order_by(func.sum(models.ReputationEntry.amount).desc(), models.ReputationEntry.user_id)
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
    photos = (
        db.query(models.HouseholdImage)
        .filter_by(household_id=h.id)
        .order_by(models.HouseholdImage.position, models.HouseholdImage.id)
        .all()
    )
    # PRIVACY GATE (plan §6.4 — family/lineage data is opt-in and visible only to
    # VERIFIED neighbors). family_history + members[] are exposed only to a viewer
    # who is either (a) a member of THIS household, or (b) a trusted resident whose
    # OWN household is verified. family_only households are stricter still: only
    # their own members ever see the details. Everyone else — household-less,
    # unverified-household, or a family_only outsider — gets just the public shell
    # (family_name, street, verification_status, counts); family_history=None,
    # members=[]. A one-click joiner can no longer read every family's history.
    is_mine = viewer.household_id == h.id
    viewer_hh = (
        db.get(models.Household, viewer.household_id) if viewer.household_id else None
    )
    viewer_verified = viewer_hh is not None and viewer_hh.verification_status == "verified"
    if h.visibility == "family_only":
        hide = not is_mine  # stricter family_only rule kept
    else:  # neighbors: trusted (own household verified) or a member of this one
        hide = not (is_mine or viewer_verified)
    # only a viewer WITHOUT a household of their own can have a pending join
    # request — skip the query entirely for everyone else
    has_pending_join = False
    if viewer.household_id is None:
        has_pending_join = (
            db.query(models.HouseholdJoinRequest)
            .filter_by(household_id=h.id, user_id=viewer.id, status="pending")
            .first()
            is not None
        )
    return schemas.HouseholdOut(
        id=h.id,
        mahalla_id=h.mahalla_id,
        family_name=h.family_name,
        resident_count=h.resident_count,
        street=h.street,
        has_location=h.lat is not None and h.lng is not None,
        has_pending_join=has_pending_join,
        family_history=None if hide else h.family_history,
        generations_here=None if hide else h.generations_here,
        visibility=h.visibility,
        verification_status=h.verification_status,
        vouch_count=vouch_count,
        my_vouch=my_vouch,
        members=[] if hide else [schemas.MemberOut.model_validate(mb) for mb in members],
        photos=[] if hide else [schemas.PhotoOut(id=im.id, url=im.path) for im in photos],
        created_by=h.created_by,
        created_at=h.created_at,
    )
