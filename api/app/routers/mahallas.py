"""Mahalla search, the petition-to-open mechanic (plan §13), joining,
members and the leaderboard."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, presenters, reputation, schemas
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

    # One petition per user: switching mahalla moves the request.
    db.query(models.Petition).filter_by(user_id=user.id).delete()

    db.add(
        models.Petition(
            mahalla_id=m.id,
            user_id=user.id,
            estimated_households=data.estimated_households,
        )
    )
    if data.estimated_households:
        m.estimated_households = data.estimated_households  # latest wins

    db.flush()  # session has autoflush=False — make the new petition countable
    threshold = m.petition_threshold or settings.petition_threshold
    petition_count = db.query(models.Petition).filter_by(mahalla_id=m.id).count()
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
    db.query(models.Petition).filter_by(mahalla_id=mahalla_id, user_id=user.id).delete()
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
    # The request is fulfilled — clear any leftover petition by this user.
    db.query(models.Petition).filter_by(user_id=user.id).delete()
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
