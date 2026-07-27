"""Household/family pages — the core differentiator (plan §6).
Create your xonadon, list neighbors' households, keep family history,
add members (including elders without phones), vouch for neighbors, and
ring the virtual doorbell (DingDong)."""

import math
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import images, models, notify, presenters, reputation, schemas, track
from ..config import settings
from ..deps import get_db, require_member

router = APIRouter(prefix="/households", tags=["households"])

ALBUM_CAP = 12
DINGDONG_RADIUS_M = 100  # generous — phone GPS in a courtyard is noisy
DINGDONG_COOLDOWN_S = 60


def _distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine distance in meters."""
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _get_household_in_mahalla(
    db: Session, household_id: int, user: models.User
) -> models.Household:
    household = db.get(models.Household, household_id)
    if household is None:
        raise HTTPException(status_code=404, detail="Xonadon topilmadi")
    if household.mahalla_id != user.mahalla_id:
        raise HTTPException(status_code=403, detail="Bu xonadon sizning mahallangizda emas")
    return household


def _get_own_household(db: Session, household_id: int, user: models.User) -> models.Household:
    """Stewardship guard: ANY account-holding member of a household (a User
    whose household_id points at it) may edit it — not only the creator. Once
    join/claim links a second family member, they become a full steward too."""
    if user.household_id != household_id:
        raise HTTPException(status_code=403, detail="Faqat o'z xonadoningizni tahrirlaysiz")
    household = db.get(models.Household, household_id)
    if household is None:
        raise HTTPException(status_code=404, detail="Xonadon topilmadi")
    return household


@router.post("", response_model=schemas.HouseholdOut)
def create_household(
    data: schemas.HouseholdIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    if user.household_id is not None:
        raise HTTPException(status_code=400, detail="Sizda allaqachon xonadon bor")
    household = models.Household(
        mahalla_id=user.mahalla_id,
        family_name=data.family_name,
        resident_count=data.resident_count,
        street=data.street,
        created_by=user.id,
    )
    db.add(household)
    db.flush()
    user.household_id = household.id
    db.add(
        models.Post(
            mahalla_id=user.mahalla_id,
            author_id=user.id,
            type="newcomer",
            title=f"{data.family_name} oilasi mahallamizga qo'shildi",
            body=None,
            status="open",
        )
    )
    db.commit()
    db.refresh(household)
    return presenters.household_out(db, household, user)


def _get_join_request(
    db: Session, household: models.Household, req_id: int
) -> models.HouseholdJoinRequest:
    jr = db.get(models.HouseholdJoinRequest, req_id)
    if jr is None or jr.household_id != household.id:
        raise HTTPException(status_code=404, detail="So'rov topilmadi")
    return jr


def _notify_stewards(
    db: Session, household: models.Household, event: str, params: dict
) -> None:
    """Ping every account-holding member of a household — so a join/claim request
    isn't left sitting unseen with no one to approve it."""
    steward_ids = [
        uid
        for (uid,) in db.query(models.User.id).filter(
            models.User.household_id == household.id
        )
    ]
    if steward_ids:
        notify.notify(
            db,
            steward_ids,
            "household",
            link=f"/app/households/{household.id}",
            mahalla_id=household.mahalla_id,
            event=event,
            params=params,
        )


@router.get("", response_model=list[schemas.HouseholdOut])
def list_households(
    mahalla_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    if mahalla_id != user.mahalla_id:
        raise HTTPException(status_code=403, detail="Faqat o'z mahallangizni ko'ra olasiz")
    households = (
        db.query(models.Household)
        .filter_by(mahalla_id=mahalla_id)
        .order_by(models.Household.family_name)
        .all()
    )
    return [presenters.household_out(db, h, user) for h in households]


@router.get("/{household_id}", response_model=schemas.HouseholdOut)
def get_household(
    household_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    household = _get_household_in_mahalla(db, household_id, user)
    return presenters.household_out(db, household, user)


@router.patch("/{household_id}", response_model=schemas.HouseholdOut)
def update_household(
    household_id: int,
    data: schemas.HouseholdUpdate,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    household = _get_own_household(db, household_id, user)
    history_was_empty = not household.family_history

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(household, field, value)

    if (
        history_was_empty
        and household.family_history
        and len(household.family_history) >= 40
        and not reputation.already_awarded(
            db, user.id, "history_seeded", "household", household.id
        )
    ):
        reputation.award(db, user, "history_seeded", "household", household.id)

    db.commit()
    db.refresh(household)
    return presenters.household_out(db, household, user)


@router.post("/{household_id}/members", response_model=schemas.HouseholdOut)
def add_member(
    household_id: int,
    data: schemas.MemberIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    household = _get_own_household(db, household_id, user)
    db.add(
        models.HouseholdMember(
            household_id=household.id,
            full_name=data.full_name,
            is_elder=data.is_elder,
        )
    )
    db.commit()
    db.refresh(household)
    return presenters.household_out(db, household, user)


@router.delete("/members/{member_id}", status_code=204)
def remove_member(
    member_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    member = db.get(models.HouseholdMember, member_id)
    if member is None:
        raise HTTPException(status_code=404, detail="A'zo topilmadi")
    if user.household_id is None or member.household_id != user.household_id:
        raise HTTPException(status_code=403, detail="Faqat o'z xonadoningizni tahrirlaysiz")
    # if this member is a linked account, removing it also releases that user
    # from the household (they can join/claim again later)
    if member.user_id is not None:
        linked = db.get(models.User, member.user_id)
        if linked is not None:
            linked.household_id = None
    db.delete(member)
    db.commit()


@router.post("/{household_id}/location", response_model=schemas.HouseholdOut)
def set_location(
    household_id: int,
    data: schemas.LocationIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """Set the house coordinates for DingDong — done standing at home.
    Coordinates are stored server-side only, never returned by the API."""
    household = _get_own_household(db, household_id, user)
    household.lat = data.lat
    household.lng = data.lng
    db.commit()
    return presenters.household_out(db, household, user)


@router.post("/{household_id}/photos", response_model=schemas.HouseholdOut)
def add_photos(
    household_id: int,
    data: schemas.PhotosIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """Add photos to your own family's album. Only the household's account-holders,
    and every url must be an uploaded /api/uploads/ path. Capped at 12 total."""
    household = _get_own_household(db, household_id, user)
    urls = images.clean_urls(data.urls, ALBUM_CAP)
    images.append(db, models.HouseholdImage, "household_id", household.id, urls, ALBUM_CAP)
    db.commit()
    db.refresh(household)
    return presenters.household_out(db, household, user)


@router.delete("/{household_id}/photos/{image_id}", response_model=schemas.HouseholdOut)
def delete_photo(
    household_id: int,
    image_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    household = _get_own_household(db, household_id, user)
    image = db.get(models.HouseholdImage, image_id)
    if image is None or image.household_id != household.id:
        raise HTTPException(status_code=404, detail="Rasm topilmadi")
    db.delete(image)
    db.commit()
    db.refresh(household)
    return presenters.household_out(db, household, user)


@router.post("/{household_id}/dingdong", response_model=schemas.DingDongOut)
def dingdong(
    household_id: int,
    data: schemas.LocationIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """The virtual doorbell: works only if the ringer is physically at the
    house (GPS vs stored house location), then alerts the household."""
    household = _get_household_in_mahalla(db, household_id, user)
    if user.household_id == household.id:
        raise HTTPException(status_code=400, detail="Bu o'z eshigingiz 🙂")
    if household.lat is None or household.lng is None:
        raise HTTPException(
            status_code=400, detail="Bu xonadon uy joylashuvini hali belgilamagan"
        )

    dist = _distance_m(data.lat, data.lng, household.lat, household.lng)
    if dist > DINGDONG_RADIUS_M:
        # deliberately NO distance in the message — reporting it would let a
        # prober trilaterate the house coordinates from a few attempts
        raise HTTPException(
            status_code=400,
            detail="Qo'ng'iroq chalinmadi — eshik oldida turganingizda qayta urinib ko'ring",
        )

    member_ids = [
        uid
        for (uid,) in db.query(models.User.id).filter(
            models.User.household_id == household.id
        )
    ]
    if not member_ids:
        raise HTTPException(status_code=400, detail="Bu xonadonda hisob egasi yo'q")

    # cooldown: don't let the bell be hammered
    recent = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id.in_(member_ids),
            models.Notification.type == "dingdong",
            models.Notification.created_at
            > datetime.utcnow() - timedelta(seconds=DINGDONG_COOLDOWN_S),
        )
        .first()
    )
    if recent is not None:
        raise HTTPException(status_code=400, detail="Qo'ng'iroq yaqinda chalingan — biroz kuting")

    notify.notify(
        db,
        member_ids,
        "dingdong",
        link=f"/app/households/{household.id}",
        mahalla_id=household.mahalla_id,
        event="dingdong",
        params={"name": user.full_name},
    )
    db.commit()
    return schemas.DingDongOut(ok=True, message="🔔 Qo'ng'iroq chalindi — xonadon xabardor qilindi")


@router.post("/{household_id}/vouch", response_model=schemas.HouseholdOut)
def vouch_household(
    household_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    household = _get_household_in_mahalla(db, household_id, user)
    if user.household_id == household.id:
        raise HTTPException(status_code=400, detail="O'z xonadoningizga kafolat bera olmaysiz")
    # VERIFICATION TEETH (plan §6.4 / §10): only a trusted resident may vouch — a
    # member of an already-VERIFIED household. The raisi is the bootstrap trust
    # anchor (community-appointed, not self-verified) and may always vouch; without
    # that carve-out a fresh mahalla with no verified household could never verify
    # its first one. This closes the two-fake-accounts loop: two fresh accounts,
    # neither the raisi nor in a verified household, can no longer verify each other.
    mahalla = db.get(models.Mahalla, household.mahalla_id)
    is_raisi = bool(mahalla and mahalla.raisi_user_id == user.id)
    if not is_raisi:
        voucher_hh = (
            db.get(models.Household, user.household_id) if user.household_id else None
        )
        if voucher_hh is None or voucher_hh.verification_status != "verified":
            raise HTTPException(
                status_code=403,
                detail="Faqat tasdiqlangan xonadon a'zolari kafolat bera oladi",
            )
    existing = (
        db.query(models.Vouch)
        .filter_by(household_id=household.id, voucher_user_id=user.id)
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="Siz allaqachon kafolat bergansiz")
    db.add(models.Vouch(household_id=household.id, voucher_user_id=user.id))
    db.flush()

    vouch_count = db.query(models.Vouch).filter_by(household_id=household.id).count()
    newly_verified = False
    if vouch_count >= settings.vouch_threshold or is_raisi:
        if household.verification_status != "verified":
            newly_verified = True
        household.verification_status = "verified"

    # tell the household's account holders about the vouch / verification
    member_ids = [
        uid
        for (uid,) in db.query(models.User.id).filter(
            models.User.household_id == household.id
        )
    ]
    notify.notify(
        db,
        member_ids,
        "vouch",
        link=f"/app/households/{household.id}",
        mahalla_id=household.mahalla_id,
        event="vouch_received",
        params={"name": user.full_name},
    )
    if newly_verified:
        notify.notify(
            db,
            member_ids,
            "verified",
            link=f"/app/households/{household.id}",
            mahalla_id=household.mahalla_id,
            event="household_verified",
        )

    db.commit()
    db.refresh(household)
    return presenters.household_out(db, household, user)


# ---------- join / claim / stewardship (plan §6: a family is not one person) ----------


@router.post("/{household_id}/join-request", response_model=schemas.HouseholdOut)
def request_join(
    household_id: int,
    data: schemas.JoinRequestIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """Ask a household's stewards to let you in. You must not already have a
    household of your own. Idempotent — a second request just stays pending, and
    a previously declined one re-opens."""
    household = _get_household_in_mahalla(db, household_id, user)
    if user.household_id is not None:
        raise HTTPException(status_code=400, detail="Sizda allaqachon xonadon bor")
    existing = (
        db.query(models.HouseholdJoinRequest)
        .filter_by(household_id=household.id, user_id=user.id)
        .first()
    )
    if existing is None:
        db.add(
            models.HouseholdJoinRequest(
                household_id=household.id, user_id=user.id, status="pending"
            )
        )
    elif existing.status != "pending":
        existing.status = "pending"
        existing.member_id = None  # a plain re-request drops any earlier claim
    _notify_stewards(db, household, "join_request", {"name": user.full_name})
    db.commit()
    db.refresh(household)
    return presenters.household_out(db, household, user)


@router.get("/{household_id}/join-requests", response_model=list[schemas.JoinRequestOut])
def list_join_requests(
    household_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """Stewards (any linked member of the household) see who wants to join."""
    household = _get_own_household(db, household_id, user)
    reqs = (
        db.query(models.HouseholdJoinRequest)
        .filter_by(household_id=household.id, status="pending")
        .order_by(models.HouseholdJoinRequest.created_at)
        .all()
    )
    out: list[schemas.JoinRequestOut] = []
    for r in reqs:
        requester = db.get(models.User, r.user_id)
        if requester is None:
            continue
        claim_name = None
        if r.member_id is not None:
            m = db.get(models.HouseholdMember, r.member_id)
            claim_name = m.full_name if m is not None else None
        out.append(
            schemas.JoinRequestOut(
                id=r.id,
                user=presenters.user_out(db, requester),
                claim_member_name=claim_name,
                created_at=r.created_at,
            )
        )
    return out


@router.post(
    "/{household_id}/join-requests/{req_id}/approve",
    response_model=schemas.HouseholdOut,
)
def approve_join(
    household_id: int,
    req_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """A steward accepts a request: the requester becomes a household member."""
    household = _get_own_household(db, household_id, user)
    jr = _get_join_request(db, household, req_id)
    if jr.status == "pending":
        jr.status = "approved"
        requester = db.get(models.User, jr.user_id)
        if requester is not None and requester.household_id is None:
            requester.household_id = household.id
            # a claim request links the requester to the exact named row the family
            # listed (preserving the roster); a plain join just makes them a member
            if jr.member_id is not None:
                member = db.get(models.HouseholdMember, jr.member_id)
                if (
                    member is not None
                    and member.household_id == household.id
                    and member.user_id is None
                ):
                    member.user_id = requester.id
            track.log_event(
                db,
                requester.id,
                "household_join",
                "household",
                household.id,
                mahalla_id=household.mahalla_id,
            )
            notify.notify(
                db,
                [requester.id],
                "household",
                link=f"/app/households/{household.id}",
                mahalla_id=household.mahalla_id,
                event="join_approved",
                params={"family": household.family_name},
            )
        db.commit()
        db.refresh(household)
    return presenters.household_out(db, household, user)


@router.post(
    "/{household_id}/join-requests/{req_id}/decline",
    response_model=schemas.HouseholdOut,
)
def decline_join(
    household_id: int,
    req_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """A steward declines a request."""
    household = _get_own_household(db, household_id, user)
    jr = _get_join_request(db, household, req_id)
    if jr.status == "pending":
        jr.status = "declined"
        notify.notify(
            db,
            [jr.user_id],
            "household",
            link="/app/mahalla",
            mahalla_id=household.mahalla_id,
            event="join_rejected",
            params={"family": household.family_name},
        )
        db.commit()
        db.refresh(household)
    return presenters.household_out(db, household, user)


@router.post("/{household_id}/claim", response_model=schemas.HouseholdOut)
def claim_member(
    household_id: int,
    data: schemas.ClaimMemberIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """Ask to be linked to a named member row the family listed before you had an
    account (e.g. a son the parents added). This is NOT instant: a name alone is no
    proof of identity, so a steward must approve — otherwise anyone could attach
    themselves to any family and inherit full stewardship (edit history, evict the
    founder, satisfy the verified-member trust gate). We raise a pending join
    request carrying the claimed row; approve_join links it. You must not already
    have a household."""
    household = _get_household_in_mahalla(db, household_id, user)
    if user.household_id is not None:
        raise HTTPException(status_code=400, detail="Sizda allaqachon xonadon bor")
    member = db.get(models.HouseholdMember, data.member_id)
    if member is None or member.household_id != household.id or member.user_id is not None:
        raise HTTPException(status_code=400, detail="Bu a'zoni biriktirib bo'lmadi")
    # one request row per (household, user) — a claim reuses/updates a prior plain
    # request rather than colliding with the unique constraint
    existing = (
        db.query(models.HouseholdJoinRequest)
        .filter_by(household_id=household.id, user_id=user.id)
        .first()
    )
    if existing is None:
        db.add(
            models.HouseholdJoinRequest(
                household_id=household.id,
                user_id=user.id,
                member_id=member.id,
                status="pending",
            )
        )
    else:
        existing.member_id = member.id
        existing.status = "pending"
    _notify_stewards(
        db, household, "claim_request", {"name": user.full_name, "member": member.full_name}
    )
    db.commit()
    db.refresh(household)
    return presenters.household_out(db, household, user)
