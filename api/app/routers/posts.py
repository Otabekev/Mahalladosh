"""Structured post feed and the help loop with points (plan §8, §9-C).
Posts are typed (help|announcement|charity|event|newcomer) — never free chat."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, presenters, reputation, schemas
from ..deps import get_db, require_member

router = APIRouter(prefix="/posts", tags=["posts"])


# ---------- local builders ----------


def post_out(db: Session, p: models.Post, viewer: models.User) -> schemas.PostOut:
    author = db.get(models.User, p.author_id)
    response_count = db.query(models.PostResponse).filter_by(post_id=p.id).count()
    my_response = (
        db.query(models.PostResponse).filter_by(post_id=p.id, user_id=viewer.id).first()
        is not None
    )
    return schemas.PostOut(
        id=p.id,
        type=p.type,
        title=p.title,
        body=p.body,
        category=p.category,
        event_date=p.event_date,
        goal=p.goal,
        status=p.status,
        author=presenters.user_out(db, author),
        response_count=response_count,
        my_response=my_response,
        created_at=p.created_at,
    )


def post_detail(db: Session, p: models.Post, viewer: models.User) -> schemas.PostDetail:
    base = post_out(db, p, viewer)
    rows = (
        db.query(models.PostResponse)
        .filter_by(post_id=p.id)
        .order_by(models.PostResponse.created_at.asc())
        .all()
    )
    responses = []
    for r in rows:
        responder = db.get(models.User, r.user_id)
        responses.append(
            schemas.ResponseOut(
                id=r.id,
                user=presenters.user_out(db, responder),
                message=r.message,
                created_at=r.created_at,
            )
        )
    helper = db.get(models.User, p.resolved_helper_id) if p.resolved_helper_id else None
    return schemas.PostDetail(
        **base.model_dump(),
        responses=responses,
        resolved_helper=presenters.user_out(db, helper) if helper else None,
    )


def _get_post(db: Session, post_id: int, user: models.User) -> models.Post:
    """Post must exist and belong to the viewer's mahalla — foreign posts are 404."""
    post = db.get(models.Post, post_id)
    if post is None or post.mahalla_id != user.mahalla_id:
        raise HTTPException(status_code=404, detail="E'lon topilmadi")
    return post


# ---------- routes ----------


@router.get("", response_model=list[schemas.PostOut])
def list_posts(
    type: str | None = None,
    status: str | None = None,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    q = db.query(models.Post).filter_by(mahalla_id=user.mahalla_id)
    if type:
        q = q.filter_by(type=type)
    if status:
        q = q.filter_by(status=status)
    posts = q.order_by(models.Post.created_at.desc()).limit(100).all()
    return [post_out(db, p, user) for p in posts]


@router.post("", response_model=schemas.PostOut)
def create_post(
    data: schemas.PostIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    if data.type == "newcomer":
        raise HTTPException(status_code=400, detail="Yangi qo'shni e'loni avtomatik yaratiladi")
    if data.type == "help" and not data.category:
        raise HTTPException(status_code=400, detail="Yordam turini tanlang")
    if data.type == "event" and data.event_date is None:
        raise HTTPException(status_code=400, detail="Sanani kiriting")
    post = models.Post(
        mahalla_id=user.mahalla_id,
        author_id=user.id,
        type=data.type,
        title=data.title,
        body=data.body,
        category=data.category,
        event_date=data.event_date,
        goal=data.goal,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post_out(db, post, user)


@router.get("/{post_id}", response_model=schemas.PostDetail)
def get_post(
    post_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    post = _get_post(db, post_id, user)
    return post_detail(db, post, user)


@router.post("/{post_id}/respond", response_model=schemas.PostDetail)
def respond_to_post(
    post_id: int,
    data: schemas.ResponseIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    post = _get_post(db, post_id, user)
    if post.author_id == user.id:
        raise HTTPException(status_code=400, detail="Bu sizning e'loningiz")
    already = (
        db.query(models.PostResponse).filter_by(post_id=post.id, user_id=user.id).first()
    )
    if already is not None:
        raise HTTPException(status_code=400, detail="Siz allaqachon javob bergansiz")
    if post.status != "open":
        raise HTTPException(status_code=400, detail="Bu e'lon yopilgan")
    db.add(models.PostResponse(post_id=post.id, user_id=user.id, message=data.message))
    # welcoming a newcomer earns gentle points, once per post (plan §9-C)
    if post.type == "newcomer" and not reputation.already_awarded(
        db, user.id, "newcomer_welcomed", "post", post.id
    ):
        reputation.award(db, user, "newcomer_welcomed", "post", post.id)
    db.commit()
    return post_detail(db, post, user)


@router.post("/{post_id}/resolve", response_model=schemas.PostDetail)
def resolve_post(
    post_id: int,
    data: schemas.ResolveIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    post = _get_post(db, post_id, user)
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="Faqat e'lon egasi")
    if post.status != "open":
        raise HTTPException(status_code=400, detail="Bu e'lon yopilgan")
    if post.type == "help":
        if data.helper_user_id is None:
            raise HTTPException(status_code=400, detail="Kim yordam berganini tanlang")
        responded = (
            db.query(models.PostResponse)
            .filter_by(post_id=post.id, user_id=data.helper_user_id)
            .first()
        )
        if responded is None:
            raise HTTPException(status_code=400, detail="Bu odam javob bermagan")
        post.resolved_helper_id = data.helper_user_id
        # the confirmed helper earns points, once per post (plan §9-C)
        helper = db.get(models.User, data.helper_user_id)
        if not reputation.already_awarded(db, helper.id, "help_fulfilled", "post", post.id):
            reputation.award(
                db, helper, "help_fulfilled", "post", post.id, mahalla_id=post.mahalla_id
            )
    post.status = "resolved"
    post.resolved_at = datetime.utcnow()
    db.commit()
    return post_detail(db, post, user)


@router.post("/{post_id}/close", response_model=schemas.PostDetail)
def close_post(
    post_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    post = _get_post(db, post_id, user)
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="Faqat e'lon egasi")
    if post.status != "open":
        raise HTTPException(status_code=400, detail="Bu e'lon yopilgan")
    post.status = "closed"
    db.commit()
    return post_detail(db, post, user)
