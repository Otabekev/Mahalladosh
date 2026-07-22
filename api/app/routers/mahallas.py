"""Mahalla search, the petition-to-open mechanic (plan §13), joining,
members and the leaderboard."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, notify, presenters, reputation, schemas, track
from ..config import settings
from ..deps import get_current_user, get_db, require_member

router = APIRouter(prefix="/mahallas", tags=["mahallas"])


def _get_mahalla(db: Session, mahalla_id: int) -> models.Mahalla:
    m = db.get(models.Mahalla, mahalla_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Mahalla topilmadi")
    return m


def _require_local_member(user: models.User, mahalla_id: int) -> None:
    if user.mahalla_id != mahalla_id:
        raise HTTPException(status_code=403, detail="Siz bu mahalla a'zosi emassiz")


@router.get("/search", response_model=list[schemas.MahallaOut])
def search(
    district_id: int,
    q: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(models.Mahalla).filter(models.Mahalla.district_id == district_id)
    if q:
        query = query.filter(models.Mahalla.name.ilike(f"%{q.strip()}%"))
    mahallas = query.order_by(models.Mahalla.name).all()
    return [presenters.mahalla_out(db, m) for m in mahallas]


@router.post("/{mahalla_id}/petition", response_model=schemas.PetitionStatus)
def create_petition(
    mahalla_id: int,
    data: schemas.PetitionIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if user.mahalla_id is not None:
        raise HTTPException(status_code=403, detail="Siz allaqachon mahalla a'zosisiz")
    m = _get_mahalla(db, mahalla_id)
    if m.status not in ("forming", "pending"):
        raise HTTPException(status_code=400, detail="Bu mahallaga ariza berib bo'lmaydi")

    # One petition per user: switching mahalla moves the request. Rows are
    # never deleted (the activation funnel needs them) — mark them withdrawn.
    old_actives = (
        db.query(models.Petition)
        .filter(
            models.Petition.user_id == user.id,
            models.Petition.status == "active",
            models.Petition.mahalla_id != m.id,
        )
        .all()
    )
    for old in old_actives:
        old.status = "withdrawn"

    # (mahalla_id, user_id) is unique — re-petitioning the same mahalla
    # reactivates the historical row instead of inserting a duplicate.
    petition = (
        db.query(models.Petition).filter_by(mahalla_id=m.id, user_id=user.id).first()
    )
    if petition is not None:
        petition.status = "active"
        petition.estimated_households = data.estimated_households
        petition.created_at = models.utcnow()  # it's a fresh request
    else:
        petition = models.Petition(
            mahalla_id=m.id,
            user_id=user.id,
            estimated_households=data.estimated_households,
        )
        db.add(petition)
    if data.estimated_households:
        m.estimated_households = data.estimated_households  # latest wins

    db.flush()  # session has autoflush=False — make the new petition countable
    track.log_event(
        db, user.id, "petition",
        entity_type="petition", entity_id=petition.id, mahalla_id=m.id,
    )
    threshold = m.petition_threshold or settings.petition_threshold
    petition_count = (
        db.query(models.Petition).filter_by(mahalla_id=m.id, status="active").count()
    )
    if petition_count >= threshold and m.status == "forming":
        m.status = "pending"  # threshold reached — waits for admin approval

    db.commit()
    return presenters.petition_status(db, m, user)


@router.delete("/{mahalla_id}/petition", status_code=204)
def delete_petition(
    mahalla_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.Petition)
        .filter_by(mahalla_id=mahalla_id, user_id=user.id, status="active")
        .all()
    )
    for p in rows:
        p.status = "withdrawn"
    db.commit()


@router.post("/{mahalla_id}/join", response_model=schemas.MahallaDetail)
def join(
    mahalla_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if user.mahalla_id is not None:
        raise HTTPException(status_code=403, detail="Siz allaqachon mahalla a'zosisiz")
    m = _get_mahalla(db, mahalla_id)
    if m.status != "active":
        raise HTTPException(status_code=400, detail="Bu mahalla hali ochilmagan")

    user.mahalla_id = m.id
    # The request is fulfilled — close any leftover petition by this user
    # (rows are kept: the activation funnel reads them later).
    for p in db.query(models.Petition).filter_by(user_id=user.id, status="active").all():
        p.status = "fulfilled"
    track.log_event(db, user.id, "join", entity_type="mahalla", entity_id=m.id, mahalla_id=m.id)
    db.commit()
    return presenters.mahalla_detail(db, m)


@router.get("/{mahalla_id}", response_model=schemas.MahallaDetail)
def detail(
    mahalla_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    m = _get_mahalla(db, mahalla_id)
    return presenters.mahalla_detail(db, m)


@router.get("/{mahalla_id}/members", response_model=list[schemas.UserOut])
def members(
    mahalla_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    _require_local_member(user, mahalla_id)
    rows = (
        db.query(models.User)
        .filter(models.User.mahalla_id == mahalla_id)
        .order_by(models.User.rep_month.desc())
        .all()
    )
    return [presenters.user_out(db, u) for u in rows]


@router.get("/{mahalla_id}/leaderboard", response_model=schemas.LeaderboardOut)
def leaderboard(
    mahalla_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
):
    _require_local_member(user, mahalla_id)
    notify.ensure_month_honor(db, mahalla_id)  # once a month: honor Faol qo'shni
    month_key = reputation.current_month_key()

    month_rows = (
        db.query(
            models.ReputationEntry.user_id,
            func.sum(models.ReputationEntry.amount).label("points"),
        )
        .filter_by(mahalla_id=mahalla_id, month=month_key)
        .group_by(models.ReputationEntry.user_id)
        .order_by(func.sum(models.ReputationEntry.amount).desc())
        .limit(20)
        .all()
    )
    month: list[schemas.LeaderboardEntry] = []
    for row in month_rows:
        u = db.get(models.User, row.user_id)
        if u is None:
            continue
        month.append(
            schemas.LeaderboardEntry(
                user=presenters.user_out(db, u), points=row.points, rank=len(month) + 1
            )
        )

    alltime_rows = (
        db.query(models.User)
        .filter(models.User.mahalla_id == mahalla_id, models.User.rep_alltime > 0)
        .order_by(models.User.rep_alltime.desc())
        .limit(20)
        .all()
    )
    alltime = [
        schemas.LeaderboardEntry(user=presenters.user_out(db, u), points=u.rep_alltime, rank=rank)
        for rank, u in enumerate(alltime_rows, start=1)
    ]

    return schemas.LeaderboardOut(month=month, alltime=alltime, month_key=month_key)
