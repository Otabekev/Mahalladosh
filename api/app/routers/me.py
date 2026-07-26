"""Account basics (task #27): edit your own profile, leave your household, leave
your mahalla, and delete (anonymize) your account.

Picking the wrong mahalla used to be permanent — join refuses anyone who already
has a mahalla_id and there was no way out. These self-service endpoints give a
neighbour a way back to onboarding, and a clean, community-safe account deletion.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from .. import models, presenters, schemas, track
from ..deps import get_current_user, get_db, require_member
from ..security import COOKIE_NAME

router = APIRouter(prefix="/me", tags=["me"])

# A deleted account is anonymized (see delete_account) and locked out for good.
# banned_until is the only "disabled" lever the User model has, so we park it far
# in the future rather than add a column.
_FAR_FUTURE = datetime(2999, 1, 1)

# The display name a deleted neighbour's kept content is attributed to.
_ANON_NAME = "Chiqib ketgan qo'shni"


def _maybe_delete_orphan_household(db: Session, household_id: int, leaving_user_id: int) -> None:
    """Delete a household once its last account-holding member walks away.

    "Account-holding member" = a User row pointing at the household. Named-only
    HouseholdMember rows (elders without phones) don't keep a household alive —
    nobody could manage it. The caller must have already cleared its own
    household_id (and flushed) so this count is accurate.
    """
    others = (
        db.query(models.User.id)
        .filter(
            models.User.household_id == household_id,
            models.User.id != leaving_user_id,
        )
        .first()
    )
    if others is not None:
        return  # someone else still lives here — keep the family page

    household = db.get(models.Household, household_id)
    if household is None:
        return

    # Clear dependent rows that FK-reference the household but aren't covered by
    # the HouseholdMember ORM cascade (Postgres would reject the delete otherwise;
    # dev SQLite wouldn't complain but would leave dangling references).
    db.query(models.Vouch).filter_by(household_id=household_id).delete()
    db.query(models.HouseholdJoinRequest).filter_by(household_id=household_id).delete()
    db.query(models.ServiceOffering).filter_by(household_id=household_id).delete()
    db.delete(household)  # cascades HouseholdMember rows (relationship cascade)


def _release_member_row(db: Session, household_id: int, user_id: int) -> None:
    """Unlink this user from any named HouseholdMember row they had claimed, so a
    departed (or anonymized) account is no longer shown as a live member of the
    family it left. The named row itself stays — it's part of the family roster and
    can be re-claimed later; only the account link is cleared."""
    row = (
        db.query(models.HouseholdMember)
        .filter_by(household_id=household_id, user_id=user_id)
        .first()
    )
    if row is not None:
        row.user_id = None


def _clear_raisi(db: Session, mahalla_id: int | None, user_id: int) -> None:
    """If this user is the mahalla's raisi, vacate the seat."""
    if mahalla_id is None:
        return
    m = db.get(models.Mahalla, mahalla_id)
    if m and m.raisi_user_id == user_id:
        m.raisi_user_id = None


def _withdraw_active_petitions(db: Session, user_id: int) -> None:
    """Retire any active open-a-mahalla requests (rows are kept as history)."""
    for p in (
        db.query(models.Petition).filter_by(user_id=user_id, status="active").all()
    ):
        p.status = "withdrawn"


@router.patch("", response_model=schemas.SelfUserOut)
def update_me(
    data: schemas.MeUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit your own profile: display name, reading language, Telegram DM opt-out."""
    if data.full_name is not None:
        name = data.full_name.strip()
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Ism kiriting")
        user.full_name = name
    if data.lang is not None:
        user.lang = data.lang
    if data.tg_dm_enabled is not None:
        user.tg_dm_enabled = data.tg_dm_enabled
    db.commit()
    db.refresh(user)
    return presenters.self_user_out(db, user)


@router.get("/onboarding", response_model=schemas.OnboardingOut)
def onboarding(
    user: models.User = Depends(require_member),
    db: Session = Depends(get_db),
):
    """The activation checklist for a new neighbour — the first high-value actions,
    each derived from real state (no separate progress table to drift out of sync).
    The card disappears from the app once every step is done."""
    hh = db.get(models.Household, user.household_id) if user.household_id else None
    has_post = db.query(models.Post).filter_by(author_id=user.id).first() is not None
    has_help = db.query(models.PostResponse).filter_by(user_id=user.id).first() is not None

    steps = [
        ("household", hh is not None),
        ("history", bool(hh and hh.family_history)),
        ("location", bool(hh and hh.lat is not None and hh.lng is not None)),
        ("post", has_post),
        # helped a neighbour (responded to a post) or already earned honour
        ("help", has_help or user.rep_alltime > 0),
    ]
    done = sum(1 for _, ok in steps if ok)
    return schemas.OnboardingOut(
        steps=[schemas.OnboardingStep(key=k, done=ok) for k, ok in steps],
        done_count=done,
        total=len(steps),
        complete=done == len(steps),
    )


@router.post("/leave-mahalla", status_code=204)
def leave_mahalla(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Leave your mahalla entirely — back to onboarding to pick another one.
    Also leaves your household (you can't stay in a household in a mahalla you
    left) and cleans up an orphaned household, the raisi seat and petitions."""
    if user.mahalla_id is None:
        raise HTTPException(status_code=400, detail="Siz mahalla a'zosi emassiz")

    mahalla_id = user.mahalla_id
    household_id = user.household_id

    _clear_raisi(db, mahalla_id, user.id)
    _withdraw_active_petitions(db, user.id)
    if household_id is not None:
        _release_member_row(db, household_id, user.id)

    user.mahalla_id = None
    user.household_id = None
    db.flush()  # autoflush=False — orphan check must see the cleared household_id

    if household_id is not None:
        _maybe_delete_orphan_household(db, household_id, user.id)

    track.log_event(db, user.id, "leave_mahalla", mahalla_id=mahalla_id)
    db.commit()


@router.post("/leave-household", response_model=schemas.SelfUserOut)
def leave_household(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Leave your household but stay in the mahalla. If you were the last account
    holder, the household (and its named members) is removed."""
    if user.household_id is None:
        raise HTTPException(status_code=400, detail="Sizda xonadon yo'q")

    household_id = user.household_id
    _release_member_row(db, household_id, user.id)
    user.household_id = None
    db.flush()  # autoflush=False — orphan check must see the cleared household_id

    _maybe_delete_orphan_household(db, household_id, user.id)

    track.log_event(
        db, user.id, "leave_household",
        entity_type="household", entity_id=household_id, mahalla_id=user.mahalla_id,
    )
    db.commit()
    db.refresh(user)
    return presenters.self_user_out(db, user)


@router.delete("", status_code=204)
def delete_account(
    response: Response,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete your account.

    We ANONYMIZE rather than hard-delete: posts, responses, votes, vouches,
    reputation entries and honors all FK-reference this user, and the community's
    history (who helped whom, who founded the mahalla) must stay intact and
    countable. So we strip the identity, sever the mahalla/household links, drop
    admin, and lock the row out permanently — the person is gone, the record isn't.
    """
    mahalla_id = user.mahalla_id
    household_id = user.household_id

    _clear_raisi(db, mahalla_id, user.id)
    _withdraw_active_petitions(db, user.id)
    if household_id is not None:
        _release_member_row(db, household_id, user.id)

    user.full_name = _ANON_NAME
    user.username = None
    user.photo_url = None
    user.tg_id = None  # frees the Telegram id — a fresh sign-in makes a new account
    user.is_admin = False
    user.mahalla_id = None
    user.household_id = None
    user.banned_until = _FAR_FUTURE  # permanently locked out
    db.flush()  # autoflush=False — orphan check must see the cleared household_id

    if household_id is not None:
        _maybe_delete_orphan_household(db, household_id, user.id)

    track.log_event(db, user.id, "delete_account", mahalla_id=mahalla_id)
    db.commit()
    # Kill the session so the anonymized row can never be used again.
    response.delete_cookie(COOKIE_NAME)
