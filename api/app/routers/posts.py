"""Structured post feed and the help loop with points (plan §8, §9-C).
Posts are typed (help|announcement|charity|event|newcomer) — never free chat."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, notify, presenters, reputation, schemas, track
from ..deps import get_current_user, get_db, require_member

router = APIRouter(prefix="/posts", tags=["posts"])

TYPE_EMOJI = {"help": "🤝", "announcement": "📢", "charity": "❤️", "event": "🎉", "share": "📷"}

# Anti-gaming soft cap (plan §9-C): max thanked-awards per month from the same
# requester to the same helper. Resolve still works past the cap — only the
# points stop, so farming a friend is pointless but real help is never blocked.
HELP_AWARD_PAIR_CAP = 3


def _pair_awards_this_month(db: Session, author_id: int, helper_id: int) -> int:
    entries = (
        db.query(models.ReputationEntry)
        .filter_by(
            user_id=helper_id,
            reason="help_fulfilled",
            source_type="post",
            month=reputation.current_month_key(),
        )
        .all()
    )
    count = 0
    for e in entries:
        src = db.get(models.Post, e.source_id) if e.source_id else None
        if src is not None and src.author_id == author_id:
            count += 1
    return count


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
        image_url=p.image_path,
        status=p.status,
        author=presenters.user_out(db, author),
        author_place=presenters.author_place(db, p.mahalla_id),
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
    """Post must exist and belong to the viewer's mahalla — foreign posts are
    404, EXCEPT share posts, which are open to every member via discover."""
    post = db.get(models.Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="E'lon topilmadi")
    if post.mahalla_id != user.mahalla_id and post.type != "share":
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

    if data.type == "share":
        # open people-post: needs text or a photo; title derives from the text
        body = (data.body or "").strip()
        if not body and not data.image_url:
            raise HTTPException(status_code=400, detail="Matn yoki rasm qo'shing")
        title = body[:80] if body else "📷 Rasm"
        image_url = data.image_url
        if image_url and not image_url.startswith("/api/uploads/"):
            raise HTTPException(status_code=400, detail="Rasm avval yuklanishi kerak")
    else:
        if not data.title or len(data.title.strip()) < 3:
            raise HTTPException(status_code=400, detail="Sarlavha kiriting")
        title = data.title.strip()
        image_url = None

    post = models.Post(
        mahalla_id=user.mahalla_id,
        author_id=user.id,
        type=data.type,
        title=title,
        body=data.body,
        category=data.category,
        event_date=data.event_date,
        goal=data.goal,
        image_path=image_url,
    )
    db.add(post)
    db.flush()
    # share posts don't ping the whole mahalla — they're browse-content, not a
    # call to action; the structured types keep their fan-out
    if post.type != "share":
        notify.notify_mahalla(
            db,
            user.mahalla_id,
            "post",
            f"{TYPE_EMOJI.get(post.type, '📌')} {user.full_name}: {post.title}",
            link=f"/app/posts/{post.id}",
            exclude=[user.id],
        )
    db.commit()
    db.refresh(post)
    return post_out(db, post, user)


@router.get("/discover", response_model=list[schemas.PostOut])
def discover(
    scope: str = "region",
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """People-posts beyond the mahalla. The VIEWER picks the lens:
    scope=region → share posts by people in my region; scope=country → all of
    Uzbekistan. Only real people's share posts — nothing else."""
    q = db.query(models.Post).filter(models.Post.type == "share")
    if scope != "country":
        my_mahalla = db.get(models.Mahalla, user.mahalla_id)
        my_district = db.get(models.District, my_mahalla.district_id) if my_mahalla else None
        if my_district is None:
            return []
        region_district_ids = [
            did
            for (did,) in db.query(models.District.id).filter(
                models.District.region_id == my_district.region_id
            )
        ]
        region_mahalla_ids = [
            mid
            for (mid,) in db.query(models.Mahalla.id).filter(
                models.Mahalla.district_id.in_(region_district_ids)
            )
        ]
        q = q.filter(models.Post.mahalla_id.in_(region_mahalla_ids))
    posts = q.order_by(models.Post.created_at.desc()).limit(100).all()
    return [post_out(db, p, user) for p in posts]


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
    notify.notify(
        db,
        [post.author_id],
        "response",
        f"💬 {user.full_name} javob berdi: {post.title}",
        link=f"/app/posts/{post.id}",
        mahalla_id=post.mahalla_id,
    )
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
        # the confirmed helper earns points, once per post (plan §9-C),
        # capped per requester-helper pair per month (anti-farming)
        helper = db.get(models.User, data.helper_user_id)
        awarded = False
        if not reputation.already_awarded(db, helper.id, "help_fulfilled", "post", post.id):
            if _pair_awards_this_month(db, user.id, helper.id) < HELP_AWARD_PAIR_CAP:
                reputation.award(
                    db, helper, "help_fulfilled", "post", post.id, mahalla_id=post.mahalla_id
                )
                awarded = True
        notify.notify(
            db,
            [helper.id],
            "thanks",
            f"⭐ {user.full_name} sizga rahmat aytdi"
            + (" (+10 ball)" if awarded else "")
            + f": {post.title}",
            link=f"/app/posts/{post.id}",
            mahalla_id=post.mahalla_id,
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


@router.delete("/{post_id}", status_code=204)
def delete_post(
    post_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Hard-delete a post and its responses. The author may delete their own;
    an admin may delete any (moderation takedown, plan §10). Uses
    get_current_user — an operator/admin need not be a mahalla member."""
    post = db.get(models.Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="E'lon topilmadi")
    if post.author_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Faqat e'lon egasi")
    db.query(models.PostResponse).filter_by(post_id=post.id).delete()
    track.log_event(
        db, user.id, "post_delete", entity_type="post", entity_id=post.id,
        mahalla_id=post.mahalla_id,
    )
    db.delete(post)
    db.commit()
