"""Household services directory (plan §9-G). Discovery-only: neighbors find
each other and settle everything offline — no booking, no payments."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import images, models, schemas
from ..deps import get_current_user, get_db, require_member

router = APIRouter(prefix="/services", tags=["services"])

PHOTO_CAP = schemas.SERVICE_PHOTO_CAP


def service_out(db: Session, s: models.ServiceOffering) -> schemas.ServiceOut:
    household = db.get(models.Household, s.household_id)
    return schemas.ServiceOut(
        id=s.id,
        household_id=s.household_id,
        household_name=household.family_name if household else "",
        title=s.title,
        category=s.category,
        description=s.description,
        price=s.price,
        contact=s.contact,
        active=s.active,
        image_urls=images.paths(db, models.ServiceImage, "service_id", s.id),
        created_at=s.created_at,
    )


def _own_offering(db: Session, user: models.User, service_id: int) -> models.ServiceOffering:
    s = db.get(models.ServiceOffering, service_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Xizmat topilmadi")
    if user.household_id is None or s.household_id != user.household_id:
        raise HTTPException(
            status_code=403, detail="Bu xizmat sizning xonadoningizga tegishli emas"
        )
    return s


@router.get("", response_model=list[schemas.ServiceOut])
def list_services(
    category: str | None = None,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """Active offerings in the viewer's mahalla, newest first."""
    q = db.query(models.ServiceOffering).filter(
        models.ServiceOffering.mahalla_id == user.mahalla_id,
        models.ServiceOffering.active.is_(True),
    )
    if category:
        q = q.filter(models.ServiceOffering.category == category)
    offerings = q.order_by(models.ServiceOffering.created_at.desc()).all()
    return [service_out(db, s) for s in offerings]


@router.get("/mine", response_model=list[schemas.ServiceOut])
def my_services(
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """All offerings of the viewer's household, including inactive ones."""
    if user.household_id is None:
        return []
    offerings = (
        db.query(models.ServiceOffering)
        .filter_by(household_id=user.household_id)
        .order_by(models.ServiceOffering.created_at.desc())
        .all()
    )
    return [service_out(db, s) for s in offerings]


@router.post("", response_model=schemas.ServiceOut)
def create_service(
    data: schemas.ServiceIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    if user.household_id is None:
        raise HTTPException(status_code=400, detail="Avval xonadoningizni yarating")
    urls = images.clean_urls(data.image_urls, PHOTO_CAP)
    s = models.ServiceOffering(
        household_id=user.household_id,
        mahalla_id=user.mahalla_id,
        created_by=user.id,
        **data.model_dump(exclude={"image_urls"}),
    )
    db.add(s)
    db.flush()
    images.replace(db, models.ServiceImage, "service_id", s.id, urls)
    db.commit()
    db.refresh(s)
    return service_out(db, s)


@router.patch("/{service_id}", response_model=schemas.ServiceOut)
def update_service(
    service_id: int,
    data: schemas.ServiceUpdate,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    s = _own_offering(db, user, service_id)
    fields = data.model_dump(exclude_unset=True)
    # image_urls omitted = leave the photos alone; sent = it is the whole new set
    if "image_urls" in fields:
        urls = images.clean_urls(fields.pop("image_urls"), PHOTO_CAP)
        images.replace(db, models.ServiceImage, "service_id", s.id, urls)
    for field, value in fields.items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return service_out(db, s)


@router.delete("/{service_id}", status_code=204)
def delete_service(
    service_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an offering. The owning household may delete its own; an admin may
    delete any (moderation takedown). get_current_user so an admin who isn't a
    mahalla member can still act."""
    s = db.get(models.ServiceOffering, service_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Xizmat topilmadi")
    is_own = user.household_id is not None and s.household_id == user.household_id
    if not is_own and not user.is_admin:
        raise HTTPException(
            status_code=403, detail="Bu xizmat sizning xonadoningizga tegishli emas"
        )
    db.query(models.ServiceImage).filter_by(service_id=s.id).delete(synchronize_session=False)
    db.delete(s)
    db.commit()
