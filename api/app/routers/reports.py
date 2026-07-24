"""Community reporting (plan §10 moderation, Phase 2b). A member flags a post,
service, household, or person; the flag lands in the admin queue as an 'open'
Report. No content is touched here — takedown/ban happen in admin.py."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, presenters, schemas, track
from ..deps import get_db, require_member

router = APIRouter(prefix="/reports", tags=["reports"])


def target_label(db: Session, target_type: str, target_id: int) -> str:
    """Best-effort human label for a reported target — post title, service
    title, household family name, or user full name. '' if it's gone."""
    if target_type == "post":
        p = db.get(models.Post, target_id)
        return p.title if p else ""
    if target_type == "service":
        s = db.get(models.ServiceOffering, target_id)
        return s.title if s else ""
    if target_type == "household":
        h = db.get(models.Household, target_id)
        return h.family_name if h else ""
    if target_type == "user":
        u = db.get(models.User, target_id)
        return u.full_name if u else ""
    return ""


def report_out(db: Session, r: models.Report) -> schemas.ReportOut:
    reporter = db.get(models.User, r.reporter_id)
    return schemas.ReportOut(
        id=r.id,
        reporter=presenters.user_out(db, reporter),
        target_type=r.target_type,
        target_id=r.target_id,
        reason=r.reason,
        note=r.note,
        status=r.status,
        created_at=r.created_at,
        target_label=target_label(db, r.target_type, r.target_id),
    )


def _validate_target(
    db: Session, user: models.User, target_type: str, target_id: int
) -> None:
    """The target must exist and be something this member can actually see —
    foreign content is a 404 exactly as its own router would return it."""
    if target_type == "post":
        post = db.get(models.Post, target_id)
        # share posts are visible cross-mahalla via discover; the rest are local
        if post is None or (post.mahalla_id != user.mahalla_id and post.type != "share"):
            raise HTTPException(status_code=404, detail="E'lon topilmadi")
    elif target_type == "service":
        s = db.get(models.ServiceOffering, target_id)
        if s is None or s.mahalla_id != user.mahalla_id:
            raise HTTPException(status_code=404, detail="Xizmat topilmadi")
    elif target_type == "household":
        h = db.get(models.Household, target_id)
        if h is None:
            raise HTTPException(status_code=404, detail="Xonadon topilmadi")
        if h.mahalla_id != user.mahalla_id:
            raise HTTPException(status_code=403, detail="Bu xonadon sizning mahallangizda emas")
    elif target_type == "user":
        u = db.get(models.User, target_id)
        # only someone in your OWN mahalla — otherwise any member could probe
        # arbitrary user ids platform-wide and read names off the report label.
        # 404 (not 403) so a foreign id is indistinguishable from a missing one.
        if u is None or u.mahalla_id != user.mahalla_id:
            raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
        if u.id == user.id:
            raise HTTPException(status_code=400, detail="O'zingizni shikoyat qila olmaysiz")


@router.post("", response_model=schemas.ReportOut)
def create_report(
    data: schemas.ReportIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    _validate_target(db, user, data.target_type, data.target_id)

    # one open report per reporter+target — a second flag is a no-op, not a pile-on
    duplicate = (
        db.query(models.Report)
        .filter_by(
            reporter_id=user.id,
            target_type=data.target_type,
            target_id=data.target_id,
            status="open",
        )
        .first()
    )
    if duplicate is not None:
        raise HTTPException(status_code=400, detail="Siz allaqachon shikoyat qildingiz")

    report = models.Report(
        reporter_id=user.id,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        note=data.note,
        mahalla_id=user.mahalla_id,
        status="open",
    )
    db.add(report)
    track.log_event(
        db,
        user.id,
        "report",
        entity_type=data.target_type,
        entity_id=data.target_id,
        mahalla_id=user.mahalla_id,
    )
    db.commit()
    db.refresh(report)
    return report_out(db, report)
