"""The API contract. Frontend types in web/src/core/api/types.ts mirror these —
keep the two in sync when changing anything."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

# ---------- users / auth ----------


class UserOut(BaseModel):
    id: int
    full_name: str
    username: str | None = None
    photo_url: str | None = None
    is_admin: bool = False
    is_raisi: bool = False
    mahalla_id: int | None = None
    household_id: int | None = None
    rep_month: int = 0
    rep_alltime: int = 0
    banned_until: datetime | None = None

    class Config:
        from_attributes = True


class SelfUserOut(UserOut):
    """The account's view of itself (/auth/me, PATCH /me).

    Adds the personal settings that must NOT leak to other neighbours. UserOut is
    embedded as a post author, petitioner, raisi and so on, so anything here would
    otherwise be serialized to the whole feed. Reading language and the Telegram
    opt-out are private to the account, so they live only on this self view.
    lang stays a plain str on output (never 500 on a stray value); MeUpdate's
    Literal is what constrains writes.
    """

    lang: str = "uz"
    tg_dm_enabled: bool = True


class DevLoginIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    is_admin: bool = False


class MeUpdate(BaseModel):
    """A user editing their own profile."""

    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    # mirrored from the client's language switcher so the server can compose
    # notifications and Telegram DMs in the language this person actually reads
    lang: Literal["uz", "uzc", "ru", "en"] | None = None
    tg_dm_enabled: bool | None = None


class TelegramLoginIn(BaseModel):
    """Raw payload from the Telegram Login Widget."""

    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str


class AuthConfig(BaseModel):
    dev: bool = False
    telegram_bot: str | None = None  # bot username for the Login Widget


# ---------- notifications ----------


class NotificationOut(BaseModel):
    id: int
    type: str
    text: str
    link: str | None = None
    read: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationsOut(BaseModel):
    items: list[NotificationOut] = []
    unread: int = 0


# ---------- geo ----------


class RegionOut(BaseModel):
    id: int
    name_uz: str

    class Config:
        from_attributes = True


class DistrictOut(BaseModel):
    id: int
    region_id: int
    name_uz: str

    class Config:
        from_attributes = True


# ---------- mahallas / petitions ----------


class MahallaOut(BaseModel):
    id: int
    district_id: int
    name: str
    status: str  # forming|pending|active|rejected
    estimated_households: int | None = None
    petition_count: int = 0
    petition_threshold: int = 5
    member_count: int = 0


class LeaderboardEntry(BaseModel):
    user: UserOut
    points: int
    rank: int


class MahallaDetail(MahallaOut):
    district_name: str = ""
    region_name: str = ""
    raisi: UserOut | None = None
    faol_qoshni: LeaderboardEntry | None = None  # last month's winner
    household_count: int = 0
    activated_at: datetime | None = None


class ContactIn(BaseModel):
    label: str = Field(min_length=1, max_length=60)
    name: str | None = Field(default=None, max_length=120)
    phone: str = Field(min_length=3, max_length=40)


class ContactOut(BaseModel):
    id: int
    label: str
    name: str | None = None
    phone: str

    class Config:
        from_attributes = True


class MemberRow(BaseModel):
    """A member as seen in the raisi roster — public fields plus the two flags the
    raisi acts on (is this the head; are they currently banned)."""

    id: int
    full_name: str
    photo_url: str | None = None
    rep_month: int = 0
    rep_alltime: int = 0
    is_raisi: bool = False
    banned: bool = False


class BadgeOut(BaseModel):
    """An earned badge. The backend returns facts only — the emoji, colour and
    name live on the client next to core/levels.ts, where the rest of the honour
    presentation already is."""

    code: str  # faol|asoschi|mehmondost|tarixchi
    count: int = 1  # months won, neighbours helped; 1 where a count is meaningless


class PublicProfileOut(BaseModel):
    """A neighbour's public person page — what anyone in the same mahalla may see.
    No language, no contact, no private settings; just who they are in the mahalla."""

    id: int
    full_name: str
    photo_url: str | None = None
    is_raisi: bool = False
    rep_month: int = 0
    rep_alltime: int = 0
    created_at: datetime
    household_id: int | None = None
    household_name: str | None = None
    post_count: int = 0
    badges: list[BadgeOut] = []


class PetitionIn(BaseModel):
    estimated_households: int | None = Field(default=None, ge=1, le=5000)


class PetitionStatus(BaseModel):
    mahalla: MahallaOut
    my_petition: bool = False


class LeaderboardOut(BaseModel):
    month: list[LeaderboardEntry] = []
    alltime: list[LeaderboardEntry] = []
    month_key: str = ""


class MeOut(BaseModel):
    user: SelfUserOut
    mahalla: MahallaDetail | None = None  # set when user is a member
    petition: PetitionStatus | None = None  # set while waiting
    household: Optional["HouseholdOut"] = None


# ---------- households ----------


class MemberIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    is_elder: bool = False


class MemberOut(BaseModel):
    id: int
    full_name: str
    is_elder: bool = False
    user_id: int | None = None

    class Config:
        from_attributes = True


class HouseholdIn(BaseModel):
    family_name: str = Field(min_length=2, max_length=150)
    resident_count: int = Field(ge=1, le=50)
    street: str | None = Field(default=None, max_length=200)


class HouseholdUpdate(BaseModel):
    family_name: str | None = Field(default=None, min_length=2, max_length=150)
    resident_count: int | None = Field(default=None, ge=1, le=50)
    street: str | None = Field(default=None, max_length=200)
    family_history: str | None = Field(default=None, max_length=8000)
    generations_here: int | None = Field(default=None, ge=1, le=20)
    visibility: Literal["neighbors", "family_only"] | None = None


class HouseholdOut(BaseModel):
    id: int
    mahalla_id: int
    family_name: str
    resident_count: int
    street: str | None = None
    family_history: str | None = None
    generations_here: int | None = None
    visibility: str = "neighbors"
    verification_status: str = "pending"
    vouch_count: int = 0
    my_vouch: bool = False
    has_location: bool = False  # coordinates themselves are never exposed
    has_pending_join: bool = False  # viewer has an outstanding join request
    members: list[MemberOut] = []
    photos: list["PhotoOut"] = []  # family album — gated to trusted neighbours
    created_by: int
    created_at: datetime


class PhotoOut(BaseModel):
    id: int  # needed so the owner can delete a specific photo
    url: str


class PhotosIn(BaseModel):
    urls: list[str] = Field(min_length=1, max_length=12)


class JoinRequestIn(BaseModel):
    """A user asking a household's steward to let them in."""

    note: str | None = Field(default=None, max_length=200)


class JoinRequestOut(BaseModel):
    """A pending join request, shown to the steward. claim_member_name is set when
    the requester is claiming a named row the family listed (e.g. 'Alisher'), so
    the steward knows who they say they are before approving."""

    id: int
    user: UserOut
    claim_member_name: str | None = None
    created_at: datetime


class ClaimMemberIn(BaseModel):
    """A user claiming an existing named HouseholdMember row as themselves."""

    member_id: int


class LocationIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class DingDongOut(BaseModel):
    ok: bool = True
    message: str = ""


# ---------- posts ----------

PostType = Literal["help", "announcement", "charity", "event", "newcomer", "share", "poll"]

POLL_MIN_OPTIONS = 2
POLL_MAX_OPTIONS = 5  # more than this stops being a *quick* poll


class PostIn(BaseModel):
    type: PostType
    # share posts don't need a title (derived from body); others require one
    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=4000)
    category: Literal["tool", "ride", "labor", "childcare", "other"] | None = None
    event_date: datetime | None = None
    goal: str | None = Field(default=None, max_length=200)
    # charity: the target, in whole so'm. Set once at creation.
    goal_amount: int | None = Field(default=None, ge=0, le=10_000_000_000)
    image_url: str | None = Field(default=None, max_length=300)  # legacy single image
    image_urls: list[str] | None = Field(default=None, max_length=6)  # multi-photo
    # poll only: the question is the title, these are the answers
    options: list[str] = Field(default_factory=list, max_length=POLL_MAX_OPTIONS)


class PollOptionOut(BaseModel):
    id: int
    text: str
    votes: int = 0


class PollOut(BaseModel):
    """A poll's live state, from the asking viewer's point of view."""

    options: list[PollOptionOut] = []
    total_votes: int = 0
    my_option_id: int | None = None  # what this viewer chose, if anything


class PollVoteIn(BaseModel):
    option_id: int


class CharityUpdate(BaseModel):
    """Report how much has been collected so far. Whole so'm."""

    collected: int = Field(ge=0, le=10_000_000_000)


class ResponseIn(BaseModel):
    message: str | None = Field(default=None, max_length=300)


class ResponseOut(BaseModel):
    id: int
    user: UserOut
    message: str | None = None
    created_at: datetime


class PostUpdate(BaseModel):
    """Author editing their own post. Only the free-text fields are editable — not
    the type or the structured metadata, which would change what the post *is*."""

    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=4000)


class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=500)


class CommentOut(BaseModel):
    id: int
    user: UserOut
    body: str
    created_at: datetime
    can_delete: bool = False  # viewer may remove it (own / post author / raisi)


class PostOut(BaseModel):
    id: int
    type: str
    title: str
    body: str | None = None
    category: str | None = None
    event_date: datetime | None = None
    goal: str | None = None
    image_url: str | None = None
    status: str
    author: UserOut
    image_urls: list[str] = []  # all photos (cover first); image_url stays the cover
    author_place: str = ""  # "Yoshlik, Pop" — shown on discover cards
    response_count: int = 0
    my_response: bool = False
    pinned: bool = False  # the raisi pinned this to the top of the feed
    rahmat_count: int = 0  # 🤲 one-tap acknowledgements
    my_rahmat: bool = False  # did the viewer give Rahmat
    comment_count: int = 0  # discussion-thread size
    poll: PollOut | None = None  # poll posts only
    # charity collections — amounts in whole so'm
    charity_goal_amount: int | None = None
    charity_collected_amount: int = 0
    charity_percent: int = 0  # 0-100, clamped; computed so every surface agrees
    charity_updated_at: datetime | None = None
    created_at: datetime


class PostDetail(PostOut):
    responses: list[ResponseOut] = []
    resolved_helper: UserOut | None = None
    comments: list[CommentOut] = []


class FeedPage(BaseModel):
    """One page of a feed. `next_cursor` is null when there is nothing after this
    page — that is what the client checks, not the item count."""

    items: list[PostOut] = []
    next_cursor: str | None = None


class SearchOut(BaseModel):
    """In-mahalla search results, grouped by what they are."""

    query: str = ""
    posts: list[PostOut] = []
    services: list["ServiceOut"] = []


class BugunOut(BaseModel):
    """The daily briefing, counted across the whole mahalla rather than derived
    from whichever page of the feed happens to be loaded."""

    open_help_count: int = 0
    next_event: PostOut | None = None


class RahmatOut(BaseModel):
    """The reaction state after a toggle, so the tap updates without a refetch."""

    count: int = 0
    mine: bool = False


class ResolveIn(BaseModel):
    helper_user_id: int | None = None  # required for help posts


# ---------- proposals ----------

ProposalAction = Literal["none", "set_raisi", "ban_user"]


class ProposalIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    action: ProposalAction = "none"
    target_user_id: int | None = None  # required for set_raisi / ban_user


class ProposalOut(BaseModel):
    id: int
    kind: str  # coordination|punitive (derived from action)
    action: str
    target: UserOut | None = None
    title: str
    description: str | None = None
    status: str  # seconding|voting|passed|rejected|expired
    author: UserOut
    seconds_count: int = 0
    seconds_needed: int = 3
    votes_yes: int = 0
    votes_no: int = 0
    quorum: int = 3
    my_second: bool = False
    my_vote: bool | None = None
    voting_closes_at: datetime | None = None
    created_at: datetime


class VoteIn(BaseModel):
    choice: bool


# ---------- services ----------

ServiceCategory = Literal["food", "goods", "rental", "service", "skill"]


SERVICE_PHOTO_CAP = 4  # a 2x2 grid — enough to prove the work, small enough to load


class ServiceIn(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    category: ServiceCategory
    description: str | None = Field(default=None, max_length=500)
    price: str | None = Field(default=None, max_length=80)
    contact: str | None = Field(default=None, max_length=120)
    image_urls: list[str] = Field(default_factory=list, max_length=SERVICE_PHOTO_CAP)


class ServiceUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=150)
    category: ServiceCategory | None = None
    description: str | None = Field(default=None, max_length=500)
    price: str | None = Field(default=None, max_length=80)
    contact: str | None = Field(default=None, max_length=120)
    active: bool | None = None
    # the whole set, or omitted to leave the photos alone — re-saving without a
    # photo is how you remove it, so no per-photo delete endpoint is needed
    image_urls: list[str] | None = Field(default=None, max_length=SERVICE_PHOTO_CAP)


class ServiceOut(BaseModel):
    id: int
    household_id: int
    household_name: str = ""
    title: str
    category: str
    description: str | None = None
    price: str | None = None
    contact: str | None = None
    active: bool = True
    image_urls: list[str] = []  # photos of the work, cover first
    created_at: datetime


# ---------- admin ----------


class AdminPetitionOut(BaseModel):
    mahalla: MahallaOut
    district_name: str = ""
    region_name: str = ""
    petitioners: list[UserOut] = []


class MfyIn(BaseModel):
    district_id: int
    name: str = Field(min_length=2, max_length=150)


class AdminStats(BaseModel):
    users: int = 0
    mahallas_active: int = 0
    mahallas_pending: int = 0
    mahallas_forming: int = 0
    households: int = 0
    posts: int = 0


# ---------- moderation (reports / bans, Phase 2b) ----------

ReportTargetType = Literal["post", "service", "household", "user"]
ReportReason = Literal["spam", "abuse", "fake", "other"]


class ReportIn(BaseModel):
    target_type: ReportTargetType
    target_id: int
    reason: ReportReason
    note: str | None = Field(default=None, max_length=300)


class ReportOut(BaseModel):
    id: int
    reporter: UserOut
    target_type: str
    target_id: int
    reason: str
    note: str | None = None
    status: str  # open|resolved|dismissed
    created_at: datetime
    target_label: str = ""  # best-effort; filled by the moderation agent


class AdminUserRow(BaseModel):
    """A light user row for the moderation user list."""

    id: int
    full_name: str
    banned_until: datetime | None = None
    is_admin: bool = False

    class Config:
        from_attributes = True


# ---------- onboarding ----------


class OnboardingStep(BaseModel):
    """One activation step. The key maps to a client-side label + deep link, so
    all copy stays in the four-language i18n dicts, not the API."""

    key: str  # household | history | location | post | help
    done: bool = False


class OnboardingOut(BaseModel):
    steps: list[OnboardingStep] = []
    done_count: int = 0
    total: int = 0
    complete: bool = False


MeOut.model_rebuild()
