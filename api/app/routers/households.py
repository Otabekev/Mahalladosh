"""Household/family pages — the core differentiator (plan §6).
Create your xonadon, list neighbors' households, keep family history,
add members (including elders without phones), and vouch for neighbors."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, presenters, reputation, schemas
from ..config import settings
from ..deps import get_db, require_member

router = APIRouter(prefix="/households", tags=["households"])


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
    db.delete(member)
    db.commit()


@router.post("/{household_id}/vouch", response_model=schemas.HouseholdOut)
def vouch_household(
    household_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    household = _get_household_in_mahalla(db, household_id, user)
    if user.household_id == household.id:
        raise HTTPException(status_code=400, detail="O'z xonadoningizga kafolat bera olmaysiz")
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
    mahalla = db.get(models.Mahalla, household.mahalla_id)
    is_raisi = bool(mahalla and mahalla.raisi_user_id == user.id)
    if vouch_count >= settings.vouch_threshold or is_raisi:
        household.verification_status = "verified"

    db.commit()
    db.refresh(household)
    return presenters.household_out(db, household, user)
