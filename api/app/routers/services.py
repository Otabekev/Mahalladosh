"""Household services directory (plan §9-G). Discovery-only: neighbors find
each other and settle everything offline — no booking, no payments."""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import images, models, schemas, track
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
    if s.mahalla_id != user.mahalla_id:
        # another mahalla's offering does not exist as far as this caller is concerned
        raise HTTPException(status_code=404, detail="Xizmat topilmadi")
    if user.household_id is None or s.household_id != user.household_id:
        # within your own mahalla the listing IS visible, so 403 leaks nothing here
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


@router.post("/views", status_code=204)
def record_views(
    data: schemas.ServiceViewsIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """Record that these offerings were actually on someone's screen.

    A "view" is an impression the client reports, not a row the API served — a
    listing that returned 20 offerings nobody scrolled to is not 20 views. It is
    therefore client-reported and so NOT trustworthy enough to bill on later; it is
    a directional signal for the pilot and the docstring says so on purpose.

    Deduped to one per person per offering per day, because otherwise a neighbour
    who opens Xizmatlar six times a day counts as six people and the number stops
    meaning anything. One grouped query does the whole batch rather than one SELECT
    per id.
    """
    ids = [i for i in dict.fromkeys(data.ids) if i > 0]
    if not ids:
        return Response(status_code=204)

    # only offerings in the caller's own mahalla — silently ignore the rest, since
    # this is fire-and-forget telemetry and must never become a probe for what exists
    mine = {
        sid
        for (sid,) in db.query(models.ServiceOffering.id).filter(
            models.ServiceOffering.id.in_(ids),
            models.ServiceOffering.mahalla_id == user.mahalla_id,
        )
    }
    if not mine:
        return Response(status_code=204)

    already = {
        eid
        for (eid,) in db.query(models.EventLog.entity_id).filter(
            models.EventLog.user_id == user.id,
            models.EventLog.event == "service_view",
            models.EventLog.entity_type == "service",
            models.EventLog.entity_id.in_(mine),
            models.EventLog.created_at >= models.utcnow() - timedelta(days=1),
        )
    }
    for sid in mine - already:
        track.log_event(
            db, user.id, "service_view",
            entity_type="service", entity_id=sid, mahalla_id=user.mahalla_id,
        )
    db.commit()
    return Response(status_code=204)


@router.post("/{service_id}/contact", status_code=204)
def record_contact(
    service_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """The neighbour pressed the call button. Every tap counts — unlike a view,
    deciding to ring someone twice is two real intentions."""
    s = db.get(models.ServiceOffering, service_id)
    if s is None or s.mahalla_id != user.mahalla_id:
        raise HTTPException(status_code=404, detail="Xizmat topilmadi")
    track.log_event(
        db, user.id, "service_contact",
        entity_type="service", entity_id=s.id, mahalla_id=s.mahalla_id,
    )
    db.commit()
    return Response(status_code=204)


@router.get("/mine/stats", response_model=list[schemas.ServiceStatsOut])
def my_stats(
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """How your own offerings are doing — and ONLY your own.

    Counts are never attached to ServiceOut. Publishing "3 views" under a
    neighbour's listing would advertise to the whole mahalla that nobody wanted it,
    which is a cruelty a village directory cannot afford. Who viewed is never named
    to anyone.
    """
    if user.household_id is None:
        return []
    ids = [
        sid
        for (sid,) in db.query(models.ServiceOffering.id).filter_by(
            household_id=user.household_id
        )
    ]
    if not ids:
        return []
    counts: dict[int, dict[str, int]] = {sid: {"views": 0, "contacts": 0} for sid in ids}
    rows = (
        db.query(models.EventLog.entity_id, models.EventLog.event, func.count(models.EventLog.id))
        .filter(
            models.EventLog.entity_type == "service",
            models.EventLog.entity_id.in_(ids),
            models.EventLog.event.in_(("service_view", "service_contact")),
        )
        .group_by(models.EventLog.entity_id, models.EventLog.event)
        .all()
    )
    for entity_id, event, n in rows:
        key = "views" if event == "service_view" else "contacts"
        counts[entity_id][key] = n
    return [
        schemas.ServiceStatsOut(service_id=sid, views=c["views"], contacts=c["contacts"])
        for sid, c in counts.items()
    ]


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
