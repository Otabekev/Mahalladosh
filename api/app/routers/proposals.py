"""Governance (plan §10): draft -> seconding -> time-boxed vote -> act.

No scheduler — state transitions are evaluated lazily via _refresh() on every
read/write that touches a proposal.
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, notify, presenters, schemas
from ..config import settings
from ..deps import get_db, require_member

router = APIRouter(prefix="/proposals", tags=["proposals"])

ACTIVE_STATUSES = ("seconding", "voting")
DONE_STATUSES = ("passed", "rejected", "expired")


# ---------- local helpers ----------


def _apply_action(db: Session, p: models.Proposal) -> None:
    """Apply the proposal's action once it has passed."""
    if p.action == "set_raisi" and p.target_user_id:
        mahalla = db.get(models.Mahalla, p.mahalla_id)
        if mahalla:
            mahalla.raisi_user_id = p.target_user_id
    elif p.action == "ban_user" and p.target_user_id:
        target = db.get(models.User, p.target_user_id)
        if target:
            # temporary-first: 30-day ban (plan §10)
            target.banned_until = datetime.utcnow() + timedelta(days=30)


def _refresh(db: Session, p: models.Proposal) -> None:
    """Lazily advance the proposal lifecycle.

    Concurrent requests can observe the same due transition, so each one is a
    compare-and-swap UPDATE guarded on the current status — only the request
    that wins the claim applies the action and fans out notifications."""
    now = datetime.utcnow()

    if p.status == "seconding":
        seconds = db.query(models.ProposalSecond).filter_by(proposal_id=p.id).count()
        if seconds >= p.seconds_needed:
            claimed = (
                db.query(models.Proposal)
                .filter_by(id=p.id, status="seconding")
                .update(
                    {
                        "status": "voting",
                        "voting_opens_at": now,
                        "voting_closes_at": now
                        + timedelta(hours=settings.proposal_window_hours),
                    }
                )
            )
            db.commit()
            db.refresh(p)
            if claimed:
                notify.notify_mahalla(
                    db,
                    p.mahalla_id,
                    "vote",
                    f"🗳 Ovoz berish boshlandi: {p.title}",
                    link=f"/app/proposals/{p.id}",
                )
                db.commit()

    if p.status == "voting" and p.voting_closes_at and now > p.voting_closes_at:
        yes = db.query(models.Vote).filter_by(proposal_id=p.id, choice=True).count()
        no = db.query(models.Vote).filter_by(proposal_id=p.id, choice=False).count()
        total = yes + no
        if total < settings.proposal_quorum:
            new_status = "expired"  # kvorum yetmadi
        elif p.action == "ban_user":
            # punitive needs a supermajority (2/3)
            new_status = "passed" if yes * 3 >= total * 2 else "rejected"
        else:
            new_status = "passed" if yes > no else "rejected"

        claimed = (
            db.query(models.Proposal)
            .filter_by(id=p.id, status="voting")
            .update({"status": new_status})
        )
        db.commit()
        db.refresh(p)
        if claimed:
            if new_status == "passed":
                _apply_action(db, p)
            result_text = {
                "passed": "✅ Qabul qilindi",
                "rejected": "❌ Rad etildi",
                "expired": "⏳ Kvorum yetmadi",
            }[new_status]
            notify.notify_mahalla(
                db,
                p.mahalla_id,
                "result",
                f"{result_text}: {p.title} (Ha {yes} · Yo'q {no})",
                link=f"/app/proposals/{p.id}",
            )
            db.commit()


def proposal_out(db: Session, p: models.Proposal, viewer: models.User) -> schemas.ProposalOut:
    seconds_count = db.query(models.ProposalSecond).filter_by(proposal_id=p.id).count()
    votes_yes = db.query(models.Vote).filter_by(proposal_id=p.id, choice=True).count()
    votes_no = db.query(models.Vote).filter_by(proposal_id=p.id, choice=False).count()
    my_second = (
        db.query(models.ProposalSecond)
        .filter_by(proposal_id=p.id, user_id=viewer.id)
        .first()
        is not None
    )
    my_vote_row = db.query(models.Vote).filter_by(proposal_id=p.id, user_id=viewer.id).first()
    author = db.get(models.User, p.author_id)
    target = db.get(models.User, p.target_user_id) if p.target_user_id else None
    return schemas.ProposalOut(
        id=p.id,
        kind="punitive" if p.action == "ban_user" else "coordination",
        action=p.action,
        target=presenters.user_out(db, target) if target else None,
        title=p.title,
        description=p.description,
        status=p.status,
        author=presenters.user_out(db, author),
        seconds_count=seconds_count,
        seconds_needed=p.seconds_needed,
        votes_yes=votes_yes,
        votes_no=votes_no,
        quorum=settings.proposal_quorum,
        my_second=my_second,
        my_vote=my_vote_row.choice if my_vote_row else None,
        voting_closes_at=p.voting_closes_at,
        created_at=p.created_at,
    )


def _get_proposal(db: Session, proposal_id: int, user: models.User) -> models.Proposal:
    p = db.get(models.Proposal, proposal_id)
    if p is None or p.mahalla_id != user.mahalla_id:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")
    return p


# ---------- endpoints ----------


@router.get("", response_model=list[schemas.ProposalOut])
def list_proposals(
    status: str | None = None,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    proposals = (
        db.query(models.Proposal)
        .filter_by(mahalla_id=user.mahalla_id)
        .order_by(models.Proposal.created_at.desc())
        .all()
    )
    for p in proposals:
        _refresh(db, p)
    if status == "active":
        proposals = [p for p in proposals if p.status in ACTIVE_STATUSES]
    elif status == "done":
        proposals = [p for p in proposals if p.status in DONE_STATUSES]
    elif status:
        proposals = [p for p in proposals if p.status == status]
    return [proposal_out(db, p, user) for p in proposals]


@router.post("", response_model=schemas.ProposalOut)
def create_proposal(
    data: schemas.ProposalIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    target_user_id = None
    if data.action in ("set_raisi", "ban_user"):
        if data.target_user_id is None:
            raise HTTPException(status_code=400, detail="Nishon foydalanuvchi ko'rsatilishi kerak")
        target = db.get(models.User, data.target_user_id)
        if target is None or target.mahalla_id != user.mahalla_id:
            raise HTTPException(status_code=400, detail="Bu foydalanuvchi mahallangiz a'zosi emas")
        if data.action == "ban_user" and target.id == user.id:
            raise HTTPException(status_code=400, detail="O'zingizni chetlata olmaysiz")
        target_user_id = target.id

    # one active proposal per author — refresh stale ones before deciding
    maybe_active = (
        db.query(models.Proposal)
        .filter(
            models.Proposal.author_id == user.id,
            models.Proposal.status.in_(ACTIVE_STATUSES),
        )
        .all()
    )
    for p in maybe_active:
        _refresh(db, p)
    if any(p.status in ACTIVE_STATUSES for p in maybe_active):
        raise HTTPException(status_code=400, detail="Sizda allaqachon faol taklif bor")

    seconds_needed = (
        settings.proposal_seconds_punitive
        if data.action == "ban_user"
        else settings.proposal_seconds_coordination
    )
    proposal = models.Proposal(
        mahalla_id=user.mahalla_id,
        author_id=user.id,
        action=data.action,
        target_user_id=target_user_id,
        title=data.title,
        description=data.description,
        status="seconding",
        seconds_needed=seconds_needed,
    )
    db.add(proposal)
    db.flush()
    if data.action == "ban_user" and target_user_id:
        # plan §10: the accused is always notified and can respond
        notify.notify(
            db,
            [target_user_id],
            "warning",
            "⚠️ Sizga nisbatan chetlatish taklifi kiritildi — javob berish huquqiga egasiz",
            link=f"/app/proposals/{proposal.id}",
            mahalla_id=user.mahalla_id,
        )
    elif data.action == "set_raisi" and target_user_id:
        notify.notify(
            db,
            [target_user_id],
            "vote",
            f"👑 Sizni raisi lavozimiga taklif qilishdi: {proposal.title}",
            link=f"/app/proposals/{proposal.id}",
            mahalla_id=user.mahalla_id,
        )
    db.commit()
    db.refresh(proposal)
    return proposal_out(db, proposal, user)


@router.get("/{proposal_id}", response_model=schemas.ProposalOut)
def get_proposal(
    proposal_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    p = _get_proposal(db, proposal_id, user)
    _refresh(db, p)
    return proposal_out(db, p, user)


@router.post("/{proposal_id}/second", response_model=schemas.ProposalOut)
def second_proposal(
    proposal_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    p = _get_proposal(db, proposal_id, user)
    _refresh(db, p)
    if p.status != "seconding":
        raise HTTPException(status_code=400, detail="Qo'llab-quvvatlash bosqichi tugagan")
    if p.author_id == user.id:
        raise HTTPException(status_code=400, detail="O'z taklifingizni qo'llab-quvvatlay olmaysiz")
    existing = (
        db.query(models.ProposalSecond).filter_by(proposal_id=p.id, user_id=user.id).first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Siz allaqachon qo'llab-quvvatlagansiz")
    db.add(models.ProposalSecond(proposal_id=p.id, user_id=user.id))
    db.commit()
    _refresh(db, p)  # may flip seconding -> voting
    return proposal_out(db, p, user)


@router.post("/{proposal_id}/vote", response_model=schemas.ProposalOut)
def vote_proposal(
    proposal_id: int,
    data: schemas.VoteIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    p = _get_proposal(db, proposal_id, user)
    _refresh(db, p)
    if p.status != "voting":
        raise HTTPException(status_code=400, detail="Hozir ovoz berish bosqichi emas")
    existing = db.query(models.Vote).filter_by(proposal_id=p.id, user_id=user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Siz ovoz bergansiz")
    db.add(models.Vote(proposal_id=p.id, user_id=user.id, choice=data.choice))
    db.commit()
    _refresh(db, p)  # window may have just closed
    return proposal_out(db, p, user)
