"""Structured post feed and the help loop with points (plan §8, §9-C).
Posts are typed (help|announcement|charity|event|newcomer) — never free chat."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from .. import images, lifecycle, models, notify, presenters, reputation, schemas, track
from ..deps import get_current_user, get_db, require_member

router = APIRouter(prefix="/posts", tags=["posts"])

TYPE_EMOJI = {"help": "🤝", "announcement": "📢", "charity": "❤️", "event": "🎉", "share": "📷"}

POST_PHOTO_CAP = 6

# One screenful and a bit. Small enough that a village connection returns something
# quickly, large enough that most people never need a second page.
PAGE_SIZE = 15

# An event stays "today's event" until the day is really over, so a to'y at 18:00
# is still the answer to "what's on today" at 22:00.
EVENT_STILL_TODAY = timedelta(hours=12)


def _encode_cursor(p: models.Post) -> str:
    return f"{p.created_at.isoformat()}|{p.id}"


def _page(q, cursor: str | None, limit: int = PAGE_SIZE):
    """Keyset pagination over (created_at, id), newest first.

    Keyset rather than OFFSET because a community feed gains posts while someone is
    reading it: with OFFSET, one new post at the top shifts every row down and page
    two repeats the last item of page one. Anchoring to the last row seen instead
    means new posts simply appear on the next refresh, never duplicated mid-scroll.
    `id` is the tiebreaker because two posts can share a timestamp.
    """
    if cursor:
        raw_at, _, raw_id = cursor.partition("|")
        try:
            at, last_id = datetime.fromisoformat(raw_at), int(raw_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Noto'g'ri kursor") from None
        q = q.filter(
            or_(
                models.Post.created_at < at,
                and_(models.Post.created_at == at, models.Post.id < last_id),
            )
        )
    # ask for one more than we need: its existence is what says "there is more"
    rows = q.order_by(models.Post.created_at.desc(), models.Post.id.desc()).limit(limit + 1).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    return rows, (_encode_cursor(rows[-1]) if has_more and rows else None)

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


def post_out(
    db: Session, p: models.Post, viewer: models.User, pinned_post_id: int | None = None
) -> schemas.PostOut:
    author = db.get(models.User, p.author_id)
    response_count = db.query(models.PostResponse).filter_by(post_id=p.id).count()
    my_response = (
        db.query(models.PostResponse).filter_by(post_id=p.id, user_id=viewer.id).first()
        is not None
    )
    rahmat_count = db.query(models.PostReaction).filter_by(post_id=p.id).count()
    my_rahmat = (
        db.query(models.PostReaction).filter_by(post_id=p.id, user_id=viewer.id).first()
        is not None
    )
    comment_count = db.query(models.PostComment).filter_by(post_id=p.id).count()
    # fall back to the single cover for posts created before multi-photo existed
    image_urls = images.paths(db, models.PostImage, "post_id", p.id) or (
        [p.image_path] if p.image_path else []
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
        pinned=pinned_post_id is not None and p.id == pinned_post_id,
        rahmat_count=rahmat_count,
        my_rahmat=my_rahmat,
        comment_count=comment_count,
        image_urls=image_urls,
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
    is_raisi = presenters._is_raisi(db, viewer)
    comment_rows = (
        db.query(models.PostComment)
        .filter_by(post_id=p.id)
        .order_by(models.PostComment.created_at.asc())
        .all()
    )
    comments = [
        schemas.CommentOut(
            id=cm.id,
            user=presenters.user_out(db, db.get(models.User, cm.user_id)),
            body=cm.body,
            created_at=cm.created_at,
            # you can remove your own comment; the post author and the raisi can
            # remove any comment on the post (light, local moderation)
            can_delete=cm.user_id == viewer.id or p.author_id == viewer.id or is_raisi,
        )
        for cm in comment_rows
    ]
    return schemas.PostDetail(
        **base.model_dump(),
        responses=responses,
        resolved_helper=presenters.user_out(db, helper) if helper else None,
        comments=comments,
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


@router.get("", response_model=schemas.FeedPage)
def list_posts(
    type: str | None = None,
    status: str | None = None,
    cursor: str | None = None,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    q = db.query(models.Post).filter_by(mahalla_id=user.mahalla_id)
    if type:
        q = q.filter_by(type=type)
    if status:
        q = q.filter_by(status=status)
    else:
        # Age old content off the default feed. Only when unfiltered: asking for
        # `?type=help` or `?status=resolved` is asking for the history on purpose,
        # and search is the other way back to anything that has aged out.
        if not type:
            q = q.filter(lifecycle.on_feed())

    # the raisi's pinned post floats to the top, whatever its date — but only on the
    # unfiltered feed, so a type/status filter still shows a clean filtered list
    mahalla = db.get(models.Mahalla, user.mahalla_id)
    pinned_id = mahalla.pinned_post_id if mahalla and not type and not status else None
    if pinned_id is not None:
        # keep it out of the paged query entirely: prepended to page one below, it
        # would otherwise also turn up in whichever page its own date falls on
        q = q.filter(models.Post.id != pinned_id)

    rows, next_cursor = _page(q, cursor)

    if pinned_id is not None and cursor is None:
        pinned = db.get(models.Post, pinned_id)
        if pinned is not None and pinned.mahalla_id == user.mahalla_id:
            rows = [pinned, *rows]

    return schemas.FeedPage(
        items=[post_out(db, p, user, pinned_id) for p in rows], next_cursor=next_cursor
    )


@router.get("/bugun", response_model=schemas.BugunOut)
def bugun(
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """The daily briefing's numbers, counted across the whole mahalla.

    The card used to derive these from the posts the feed had already loaded, which
    stopped being true the moment the feed was paged: "3 neighbours need help" would
    silently mean "3 on the first page". It is the app's daily anchor, so it asks
    the server."""
    open_help = (
        db.query(models.Post)
        .filter_by(mahalla_id=user.mahalla_id, type="help", status="open")
        .count()
    )
    next_event = (
        db.query(models.Post)
        .filter(
            models.Post.mahalla_id == user.mahalla_id,
            models.Post.type == "event",
            models.Post.status == "open",
            models.Post.event_date.isnot(None),
            models.Post.event_date >= models.utcnow() - EVENT_STILL_TODAY,
        )
        .order_by(models.Post.event_date.asc())
        .first()
    )
    return schemas.BugunOut(
        open_help_count=open_help,
        next_event=post_out(db, next_event, user) if next_event else None,
    )


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

    # collect photos: image_urls (multi) wins, image_url (legacy single) as fallback
    raw = list(data.image_urls) if data.image_urls else ([data.image_url] if data.image_url else [])
    photos = images.clean_urls(raw, POST_PHOTO_CAP)

    if data.type == "share":
        # open people-post: needs text or a photo; title derives from the text
        body = (data.body or "").strip()
        if not body and not photos:
            raise HTTPException(status_code=400, detail="Matn yoki rasm qo'shing")
        title = body[:80] if body else "📷 Rasm"
    else:
        if not data.title or len(data.title.strip()) < 3:
            raise HTTPException(status_code=400, detail="Sarlavha kiriting")
        title = data.title.strip()

    post = models.Post(
        mahalla_id=user.mahalla_id,
        author_id=user.id,
        type=data.type,
        title=title,
        body=data.body,
        category=data.category,
        event_date=data.event_date,
        goal=data.goal,
        image_path=photos[0] if photos else None,  # cover = first
    )
    db.add(post)
    db.flush()
    images.replace(db, models.PostImage, "post_id", post.id, photos)
    # share posts don't ping the whole mahalla — they're browse-content, not a
    # call to action; the structured types keep their fan-out
    if post.type != "share":
        notify.notify_mahalla(
            db,
            user.mahalla_id,
            "post",
            link=f"/app/posts/{post.id}",
            exclude=[user.id],
            event="new_post",
            params={
                "emoji": TYPE_EMOJI.get(post.type, "📌"),
                "name": user.full_name,
                "title": post.title,
            },
        )
    db.commit()
    db.refresh(post)
    return post_out(db, post, user)


@router.get("/discover", response_model=schemas.FeedPage)
def discover(
    scope: str = "region",
    cursor: str | None = None,
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
            return schemas.FeedPage(items=[], next_cursor=None)
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
    rows, next_cursor = _page(q, cursor)
    return schemas.FeedPage(
        items=[post_out(db, p, user) for p in rows], next_cursor=next_cursor
    )


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
        link=f"/app/posts/{post.id}",
        mahalla_id=post.mahalla_id,
        event="post_response",
        params={"name": user.full_name, "title": post.title},
    )
    db.commit()
    return post_detail(db, post, user)


@router.post("/{post_id}/rahmat", response_model=schemas.RahmatOut)
def toggle_rahmat(
    post_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """One-tap 🤲 Rahmat — toggles: a second tap takes it back. No points, no
    notification (it must stay light enough to give freely)."""
    post = _get_post(db, post_id, user)
    existing = (
        db.query(models.PostReaction).filter_by(post_id=post.id, user_id=user.id).first()
    )
    if existing is not None:
        db.delete(existing)
        mine = False
    else:
        db.add(models.PostReaction(post_id=post.id, user_id=user.id))
        mine = True
    db.commit()
    count = db.query(models.PostReaction).filter_by(post_id=post.id).count()
    return schemas.RahmatOut(count=count, mine=mine)


@router.post("/{post_id}/comments", response_model=schemas.PostDetail)
def add_comment(
    post_id: int,
    data: schemas.CommentIn,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """Leave a comment. Unlike a help response, anyone who can see the post may
    comment, the author included, as many times as they like."""
    post = _get_post(db, post_id, user)
    body = data.body.strip()
    if not body:
        raise HTTPException(status_code=400, detail="Izoh bo'sh")
    db.add(models.PostComment(post_id=post.id, user_id=user.id, body=body))
    if post.author_id != user.id:
        notify.notify(
            db,
            [post.author_id],
            "comment",
            link=f"/app/posts/{post.id}",
            mahalla_id=post.mahalla_id,
            event="post_comment",
            params={"name": user.full_name, "title": post.title},
        )
    db.commit()
    return post_detail(db, post, user)


@router.delete("/{post_id}/comments/{comment_id}", response_model=schemas.PostDetail)
def delete_comment(
    post_id: int,
    comment_id: int,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """Remove a comment. The comment's author, the post's author, or the raisi may
    delete it — light, local moderation without going through a full report."""
    post = _get_post(db, post_id, user)
    comment = db.get(models.PostComment, comment_id)
    if comment is None or comment.post_id != post.id:
        raise HTTPException(status_code=404, detail="Izoh topilmadi")
    allowed = (
        comment.user_id == user.id
        or post.author_id == user.id
        or presenters._is_raisi(db, user)
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Buni o'chira olmaysiz")
    db.delete(comment)
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
        # the points variant is a separate event so each language can place the
        # amount naturally instead of splicing a parenthetical into a sentence
        params = {"name": user.full_name, "title": post.title}
        if awarded:
            params["points"] = reputation.REWARDS["help_fulfilled"]
        notify.notify(
            db,
            [helper.id],
            "thanks",
            link=f"/app/posts/{post.id}",
            mahalla_id=post.mahalla_id,
            event="thanks_points" if awarded else "thanks",
            params=params,
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
    # stamp when it settled, the same as resolving does — the feed lifecycle ages a
    # settled post from this moment, and without it an announcement closed today
    # would fall back to its creation date and vanish instantly
    post.resolved_at = models.utcnow()
    db.commit()
    return post_detail(db, post, user)


@router.patch("/{post_id}", response_model=schemas.PostDetail)
def edit_post(
    post_id: int,
    data: schemas.PostUpdate,
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """Edit your own post's words. Only the author, and only the free text — a
    share post keeps deriving its title from the body, like it did at creation."""
    post = _get_post(db, post_id, user)
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="Faqat e'lon egasi")

    if data.body is not None:
        post.body = data.body.strip() or None
    if post.type == "share":
        # share posts show no title of their own — keep it in sync with the body
        post.title = (post.body or "")[:80] if post.body else "📷 Rasm"
    elif data.title is not None:
        title = data.title.strip()
        if len(title) < 3:
            raise HTTPException(status_code=400, detail="Sarlavha juda qisqa")
        post.title = title
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
    # a pinned post being deleted must not leave the mahalla pointing at a ghost
    mahalla = db.get(models.Mahalla, post.mahalla_id)
    if mahalla and mahalla.pinned_post_id == post.id:
        mahalla.pinned_post_id = None
    # take the whole thread with it — responses, comments, reactions
    db.query(models.PostResponse).filter_by(post_id=post.id).delete()
    db.query(models.PostComment).filter_by(post_id=post.id).delete()
    db.query(models.PostReaction).filter_by(post_id=post.id).delete()
    db.query(models.PostImage).filter_by(post_id=post.id).delete()
    track.log_event(
        db, user.id, "post_delete", entity_type="post", entity_id=post.id,
        mahalla_id=post.mahalla_id,
    )
    db.delete(post)
    db.commit()
