"""Away members — the family working abroad.

WHY IT MATTERS. Around 1.35 million Uzbekistanis work abroad and remittances are the
difference between a 9.6% and a 16.8% national poverty rate. Nearly every village
family has someone gone, and that person is simultaneously the one with the strongest
reason to want news from home and the one hardest to reach with it.

WHY IT WAS DEFERRED, AND WHAT CHANGED. The failure mode of this feature is not a bug,
it is a privacy incident: an account that is "sort of a member" is the obvious way to
obtain a directory of an entire village — every household, every name, every face —
from outside the mahalla entirely. It stayed unbuilt until the design could fail
CLOSED rather than fail open.

It does that structurally, not by vigilance. An away member is NOT a mahalla member:
`User.mahalla_id` stays null, so `require_member` rejects them and every other
endpoint in this application refuses them without knowing this feature exists. This
module is their entire reachable surface, and it is deliberately small enough to read
in one sitting. A route added to the app next month is closed to them by default.

WHAT THEY CAN SEE, and the reasoning for each line:

  · their own household — family, history, photos. This is the whole emotional
    payload, and it is theirs already.
  · mahalla NAME, and nothing else structural about it.
  · posts of four types only: announcement, ta'ziya, event, charity. These are the
    news from home, and a death in the mahalla is precisely the thing someone abroad
    must not be the last to hear.

WHAT THEY CANNOT SEE, and why:

  · the member directory — this is the leak the whole design exists to prevent.
  · any other household — same reason.
  · `share` posts. These are the emotionally richest content in the app and it is
    genuinely a loss to exclude them, but they are photographs of neighbours, their
    faces and their courtyards. A photo directory is still a directory.
  · help requests — operational, other people's business, and unactionable from
    Moscow.
  · services, the leaderboard, locations, the map, proposals, voting.

They also cannot WRITE anything except a comment on a post they can already see, so
the surface for abuse from outside the mahalla is one text field.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import images, models, notify, presenters, schemas, security, track
from ..deps import get_current_user, get_db, require_member

router = APIRouter(prefix="/away", tags=["away"])

# The only post types that leave the mahalla. See the module docstring for why
# `share` and `help` are not on this list.
AWAY_POST_TYPES = ("announcement", "taziya", "event", "charity")

AWAY_FEED_LIMIT = 30


def require_away(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.AwayMember:
    """The gate for every route below: an ACTIVE away link, and nothing else.

    Note it is not `require_member` — an away member deliberately fails that one."""
    link = (
        db.query(models.AwayMember)
        .filter_by(user_id=user.id, status="active")
        .first()
    )
    if link is None:
        raise HTTPException(status_code=403, detail="Chetdagi a'zo emassiz")
    return link


# ---------- inviting (steward side, inside the mahalla) ----------


@router.post("/invite", response_model=schemas.AwayInviteOut)
def create_invite(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
) -> schemas.AwayInviteOut:
    """A steward mints a link to send to their own family member abroad."""
    if user.household_id is None:
        raise HTTPException(status_code=400, detail="Avval xonadoningizni yarating")
    return schemas.AwayInviteOut(
        token=security.create_away_invite(user.household_id),
        expires_hours=security.AWAY_INVITE_HOURS,
    )


@router.post("/join", response_model=schemas.AwayStatusOut)
def join(
    data: schemas.AwayJoinIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> schemas.AwayStatusOut:
    """Claim an invite. Creates a PENDING link — never an active one.

    Possession of the token is not consent: a Telegram message can be forwarded, and
    the person who forwards it is not the person a family agreed to add. A steward
    approves afterwards, exactly as they do for an ordinary household join."""
    household_id = security.decode_away_invite(data.token)
    if household_id is None:
        raise HTTPException(status_code=400, detail="Taklif eskirgan yoki noto'g'ri")
    household = db.get(models.Household, household_id)
    if household is None:
        raise HTTPException(status_code=404, detail="Xonadon topilmadi")
    if user.mahalla_id is not None:
        # someone living in the mahalla is a full member and does not need this
        raise HTTPException(status_code=400, detail="Siz mahalla a'zosisiz")

    existing = (
        db.query(models.AwayMember).filter_by(user_id=user.id, household_id=household_id).first()
    )
    if existing is not None:
        if existing.status == "revoked":
            existing.status = "pending"  # a family that changed its mind may re-add
            db.commit()
        return schemas.AwayStatusOut(status=existing.status)

    link = models.AwayMember(
        user_id=user.id,
        household_id=household_id,
        mahalla_id=household.mahalla_id,
        country=(data.country or "").strip() or None,
        status="pending",
    )
    db.add(link)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return schemas.AwayStatusOut(status="pending")

    steward_ids = [
        uid for (uid,) in db.query(models.User.id).filter_by(household_id=household_id)
    ]
    if steward_ids:
        notify.notify(
            db,
            steward_ids,
            "away",
            link="/app/household",
            mahalla_id=household.mahalla_id,
            event="away_request",
            params={"name": user.full_name},
        )
        db.commit()
    return schemas.AwayStatusOut(status="pending")


@router.get("/requests", response_model=list[schemas.AwayRequestOut])
def pending_requests(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
) -> list[schemas.AwayRequestOut]:
    """What this household's stewards have to approve."""
    if user.household_id is None:
        return []
    rows = (
        db.query(models.AwayMember)
        .filter_by(household_id=user.household_id)
        .order_by(models.AwayMember.created_at.desc())
        .all()
    )
    out = []
    for r in rows:
        person = db.get(models.User, r.user_id)
        if person is None:
            continue
        out.append(
            schemas.AwayRequestOut(
                id=r.id,
                user=presenters.user_out(db, person),
                country=r.country,
                status=r.status,
                created_at=r.created_at,
            )
        )
    return out


def _own_link(db: Session, link_id: int, user: models.User) -> models.AwayMember:
    link = db.get(models.AwayMember, link_id)
    if link is None or user.household_id is None or link.household_id != user.household_id:
        raise HTTPException(status_code=404, detail="Topilmadi")
    return link


@router.post("/requests/{link_id}/approve", response_model=schemas.AwayRequestOut)
def approve(
    link_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
) -> schemas.AwayRequestOut:
    link = _own_link(db, link_id, user)
    link.status = "active"
    link.approved_by = user.id
    track.log_event(db, user.id, "away_approved", entity_type="household", entity_id=link.household_id)
    db.commit()
    notify.notify(
        db,
        [link.user_id],
        "away",
        link="/away",
        event="away_approved",
        params={"family": db.get(models.Household, link.household_id).family_name},
    )
    db.commit()
    person = db.get(models.User, link.user_id)
    return schemas.AwayRequestOut(
        id=link.id,
        user=presenters.user_out(db, person),
        country=link.country,
        status=link.status,
        created_at=link.created_at,
    )


@router.post("/requests/{link_id}/revoke", status_code=204)
def revoke(
    link_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
) -> None:
    """A family can always cut the link again — including one it approved. Revoked
    rather than deleted so the history of who was added is not silently erased."""
    link = _own_link(db, link_id, user)
    link.status = "revoked"
    db.commit()


# ---------- the away member's own, narrow view ----------


@router.get("/home", response_model=schemas.AwayHome)
def home(
    db: Session = Depends(get_db),
    link: models.AwayMember = Depends(require_away),
) -> schemas.AwayHome:
    """Everything an away member may see, in one response.

    One endpoint rather than several is a security property as much as a performance
    one: the whole readable surface is visible in a single function, so an audit is
    reading forty lines rather than trusting a filter scattered across a router."""
    household = db.get(models.Household, link.household_id)
    mahalla = db.get(models.Mahalla, link.mahalla_id)
    if household is None or mahalla is None:
        raise HTTPException(status_code=404, detail="Topilmadi")

    members = [
        schemas.AwayMemberRow(full_name=m.full_name, is_elder=m.is_elder)
        for m in db.query(models.HouseholdMember).filter_by(household_id=household.id).all()
    ]

    posts = (
        db.query(models.Post)
        .filter(
            models.Post.mahalla_id == link.mahalla_id,
            models.Post.type.in_(AWAY_POST_TYPES),
        )
        .order_by(models.Post.created_at.desc())
        .limit(AWAY_FEED_LIMIT)
        .all()
    )
    news = [
        schemas.AwayPost(
            id=p.id,
            type=p.type,
            title=p.title,
            body=p.body,
            place=p.place,
            event_date=p.event_date,
            created_at=p.created_at,
        )
        for p in posts
    ]

    return schemas.AwayHome(
        mahalla_name=mahalla.name,
        family_name=household.family_name,
        family_history=household.family_history,
        generations_here=household.generations_here,
        # the family's own album — theirs to see, wherever they are
        photo_urls=images.paths(db, models.HouseholdImage, "household_id", household.id),
        members=members,
        country=link.country,
        news=news,
    )


@router.delete("/link", status_code=204)
def leave(
    db: Session = Depends(get_db),
    link: models.AwayMember = Depends(require_away),
) -> None:
    """The away member's own way out, without needing to ask the family."""
    link.status = "revoked"
    db.commit()


@router.get("/status", response_model=schemas.AwayStatusOut)
def my_status(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> schemas.AwayStatusOut:
    """Lets the client route a logged-in person with no mahalla to the away screen
    rather than to onboarding. Returns "none" when there is no link at all."""
    link = (
        db.query(models.AwayMember)
        .filter(models.AwayMember.user_id == user.id, models.AwayMember.status != "revoked")
        .order_by(models.AwayMember.created_at.desc())
        .first()
    )
    return schemas.AwayStatusOut(status=link.status if link else "none")
