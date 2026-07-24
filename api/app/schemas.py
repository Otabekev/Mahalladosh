"""The API contract. Frontend types in web/src/core/api/types.ts mirror these —
keep the two in sync when changing anything."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

# ---------- users / auth ----------


class UserOut(BaseModel):
    id: int
    full_name: str
    username: Optional[str] = None
    photo_url: Optional[str] = None
    is_admin: bool = False
    is_raisi: bool = False
    mahalla_id: Optional[int] = None
    household_id: Optional[int] = None
    rep_month: int = 0
    rep_alltime: int = 0
    banned_until: Optional[datetime] = None

    class Config:
        from_attributes = True


class DevLoginIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    is_admin: bool = False


class MeUpdate(BaseModel):
    """A user editing their own profile."""

    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)


class TelegramLoginIn(BaseModel):
    """Raw payload from the Telegram Login Widget."""

    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str


class AuthConfig(BaseModel):
    dev: bool = False
    telegram_bot: Optional[str] = None  # bot username for the Login Widget


# ---------- notifications ----------


class NotificationOut(BaseModel):
    id: int
    type: str
    text: str
    link: Optional[str] = None
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
    estimated_households: Optional[int] = None
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
    raisi: Optional[UserOut] = None
    faol_qoshni: Optional[LeaderboardEntry] = None  # last month's winner
    household_count: int = 0
    activated_at: Optional[datetime] = None


class PetitionIn(BaseModel):
    estimated_households: Optional[int] = Field(default=None, ge=1, le=5000)


class PetitionStatus(BaseModel):
    mahalla: MahallaOut
    my_petition: bool = False


class LeaderboardOut(BaseModel):
    month: list[LeaderboardEntry] = []
    alltime: list[LeaderboardEntry] = []
    month_key: str = ""


class MeOut(BaseModel):
    user: UserOut
    mahalla: Optional[MahallaDetail] = None  # set when user is a member
    petition: Optional[PetitionStatus] = None  # set while waiting
    household: Optional["HouseholdOut"] = None


# ---------- households ----------


class MemberIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    is_elder: bool = False


class MemberOut(BaseModel):
    id: int
    full_name: str
    is_elder: bool = False
    user_id: Optional[int] = None

    class Config:
        from_attributes = True


class HouseholdIn(BaseModel):
    family_name: str = Field(min_length=2, max_length=150)
    resident_count: int = Field(ge=1, le=50)
    street: Optional[str] = Field(default=None, max_length=200)


class HouseholdUpdate(BaseModel):
    family_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    resident_count: Optional[int] = Field(default=None, ge=1, le=50)
    street: Optional[str] = Field(default=None, max_length=200)
    family_history: Optional[str] = Field(default=None, max_length=8000)
    generations_here: Optional[int] = Field(default=None, ge=1, le=20)
    visibility: Optional[Literal["neighbors", "family_only"]] = None


class HouseholdOut(BaseModel):
    id: int
    mahalla_id: int
    family_name: str
    resident_count: int
    street: Optional[str] = None
    family_history: Optional[str] = None
    generations_here: Optional[int] = None
    visibility: str = "neighbors"
    verification_status: str = "pending"
    vouch_count: int = 0
    my_vouch: bool = False
    has_location: bool = False  # coordinates themselves are never exposed
    has_pending_join: bool = False  # viewer has an outstanding join request
    members: list[MemberOut] = []
    created_by: int
    created_at: datetime


class JoinRequestIn(BaseModel):
    """A user asking a household's steward to let them in."""

    note: Optional[str] = Field(default=None, max_length=200)


class JoinRequestOut(BaseModel):
    """A pending join request, shown to the steward. claim_member_name is set when
    the requester is claiming a named row the family listed (e.g. 'Alisher'), so
    the steward knows who they say they are before approving."""

    id: int
    user: UserOut
    claim_member_name: Optional[str] = None
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

PostType = Literal["help", "announcement", "charity", "event", "newcomer", "share"]


class PostIn(BaseModel):
    type: PostType
    # share posts don't need a title (derived from body); others require one
    title: Optional[str] = Field(default=None, max_length=200)
    body: Optional[str] = Field(default=None, max_length=4000)
    category: Optional[Literal["tool", "ride", "labor", "childcare", "other"]] = None
    event_date: Optional[datetime] = None
    goal: Optional[str] = Field(default=None, max_length=200)
    image_url: Optional[str] = Field(default=None, max_length=300)


class ResponseIn(BaseModel):
    message: Optional[str] = Field(default=None, max_length=300)


class ResponseOut(BaseModel):
    id: int
    user: UserOut
    message: Optional[str] = None
    created_at: datetime


class PostOut(BaseModel):
    id: int
    type: str
    title: str
    body: Optional[str] = None
    category: Optional[str] = None
    event_date: Optional[datetime] = None
    goal: Optional[str] = None
    image_url: Optional[str] = None
    status: str
    author: UserOut
    author_place: str = ""  # "Yoshlik, Pop" — shown on discover cards
    response_count: int = 0
    my_response: bool = False
    created_at: datetime


class PostDetail(PostOut):
    responses: list[ResponseOut] = []
    resolved_helper: Optional[UserOut] = None


class ResolveIn(BaseModel):
    helper_user_id: Optional[int] = None  # required for help posts


# ---------- proposals ----------

ProposalAction = Literal["none", "set_raisi", "ban_user"]


class ProposalIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, max_length=4000)
    action: ProposalAction = "none"
    target_user_id: Optional[int] = None  # required for set_raisi / ban_user


class ProposalOut(BaseModel):
    id: int
    kind: str  # coordination|punitive (derived from action)
    action: str
    target: Optional[UserOut] = None
    title: str
    description: Optional[str] = None
    status: str  # seconding|voting|passed|rejected|expired
    author: UserOut
    seconds_count: int = 0
    seconds_needed: int = 3
    votes_yes: int = 0
    votes_no: int = 0
    quorum: int = 3
    my_second: bool = False
    my_vote: Optional[bool] = None
    voting_closes_at: Optional[datetime] = None
    created_at: datetime


class VoteIn(BaseModel):
    choice: bool


# ---------- services ----------

ServiceCategory = Literal["food", "goods", "rental", "service", "skill"]


class ServiceIn(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    category: ServiceCategory
    description: Optional[str] = Field(default=None, max_length=500)
    price: Optional[str] = Field(default=None, max_length=80)
    contact: Optional[str] = Field(default=None, max_length=120)


class ServiceUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=150)
    category: Optional[ServiceCategory] = None
    description: Optional[str] = Field(default=None, max_length=500)
    price: Optional[str] = Field(default=None, max_length=80)
    contact: Optional[str] = Field(default=None, max_length=120)
    active: Optional[bool] = None


class ServiceOut(BaseModel):
    id: int
    household_id: int
    household_name: str = ""
    title: str
    category: str
    description: Optional[str] = None
    price: Optional[str] = None
    contact: Optional[str] = None
    active: bool = True
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
    note: Optional[str] = Field(default=None, max_length=300)


class ReportOut(BaseModel):
    id: int
    reporter: UserOut
    target_type: str
    target_id: int
    reason: str
    note: Optional[str] = None
    status: str  # open|resolved|dismissed
    created_at: datetime
    target_label: str = ""  # best-effort; filled by the moderation agent


class AdminUserRow(BaseModel):
    """A light user row for the moderation user list."""

    id: int
    full_name: str
    banned_until: Optional[datetime] = None
    is_admin: bool = False

    class Config:
        from_attributes = True


MeOut.model_rebuild()
