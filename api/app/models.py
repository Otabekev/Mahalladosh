from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.utcnow()


class Region(Base):
    __tablename__ = "regions"

    id: Mapped[int] = mapped_column(primary_key=True)
    soato_id: Mapped[int | None] = mapped_column(Integer)
    name_uz: Mapped[str] = mapped_column(String(120))
    name_oz: Mapped[str | None] = mapped_column(String(120))
    name_ru: Mapped[str | None] = mapped_column(String(120))


class District(Base):
    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(primary_key=True)
    region_id: Mapped[int] = mapped_column(ForeignKey("regions.id"), index=True)
    soato_id: Mapped[int | None] = mapped_column(Integer)
    name_uz: Mapped[str] = mapped_column(String(120))
    name_oz: Mapped[str | None] = mapped_column(String(120))
    name_ru: Mapped[str | None] = mapped_column(String(120))


class Mahalla(Base):
    """An MFY entry. Preloaded/admin-added rows start as 'forming'; petitions
    push them to 'pending' (threshold reached, awaiting admin), then 'active'."""

    __tablename__ = "mahallas"
    __table_args__ = (UniqueConstraint("district_id", "name_normalized"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), index=True)
    name: Mapped[str] = mapped_column(String(150))
    name_normalized: Mapped[str] = mapped_column(String(150), index=True)
    status: Mapped[str] = mapped_column(String(20), default="forming")  # forming|pending|active|rejected
    estimated_households: Mapped[int | None] = mapped_column(Integer)
    petition_threshold: Mapped[int | None] = mapped_column(Integer)  # None -> settings default
    raisi_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    # the one post the raisi has pinned to the top of the mahalla feed (or None)
    pinned_post_id: Mapped[int | None] = mapped_column(ForeignKey("posts.id"))
    activated_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    tg_id: Mapped[int | None] = mapped_column(Integer, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(80))
    full_name: Mapped[str] = mapped_column(String(150))
    photo_url: Mapped[str | None] = mapped_column(String(400))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    mahalla_id: Mapped[int | None] = mapped_column(ForeignKey("mahallas.id"), index=True)
    household_id: Mapped[int | None] = mapped_column(ForeignKey("households.id"))
    rep_month: Mapped[int] = mapped_column(Integer, default=0)
    rep_alltime: Mapped[int] = mapped_column(Integer, default=0)
    rep_month_key: Mapped[str | None] = mapped_column(String(7))  # "2026-07"
    banned_until: Mapped[datetime | None] = mapped_column(DateTime)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime)  # throttled, see track.touch
    # Reading language, mirrored from the client's switcher. The server needs its own
    # copy because notifications and Telegram DMs are composed with no browser present.
    lang: Mapped[str] = mapped_column(String(3), default="uz")
    tg_dm_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class UserActivity(Base):
    """One row per user per UTC day — the raw material for DAU/WAU/retention.
    Upserted by track.touch; the unique constraint is the idempotency guard."""

    __tablename__ = "user_activity"
    __table_args__ = (UniqueConstraint("user_id", "day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    day: Mapped[str] = mapped_column(String(10))  # "YYYY-MM-DD" (UTC)


class EventLog(Base):
    """Append-only product-analytics events (login, petition, join, ...).
    Written via track.log_event inside the caller's commit."""

    __tablename__ = "event_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    event: Mapped[str] = mapped_column(String(40), index=True)
    entity_type: Mapped[str | None] = mapped_column(String(30))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    mahalla_id: Mapped[int | None] = mapped_column(ForeignKey("mahallas.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class Petition(Base):
    """A resident's request to open a mahalla (the petition-to-open model, plan §13)."""

    __tablename__ = "petitions"
    __table_args__ = (UniqueConstraint("mahalla_id", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    mahalla_id: Mapped[int] = mapped_column(ForeignKey("mahallas.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    estimated_households: Mapped[int | None] = mapped_column(Integer)
    # Petitions are never hard-deleted (the activation funnel needs them):
    # only "active" rows count toward thresholds; the rest are history.
    status: Mapped[str] = mapped_column(String(20), default="active")  # active|fulfilled|withdrawn|rejected
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Household(Base):
    __tablename__ = "households"

    id: Mapped[int] = mapped_column(primary_key=True)
    mahalla_id: Mapped[int] = mapped_column(ForeignKey("mahallas.id"), index=True)
    family_name: Mapped[str] = mapped_column(String(150))
    resident_count: Mapped[int] = mapped_column(Integer, default=1)
    street: Mapped[str | None] = mapped_column(String(200))
    family_history: Mapped[str | None] = mapped_column(Text)
    generations_here: Mapped[int | None] = mapped_column(Integer)
    visibility: Mapped[str] = mapped_column(String(20), default="neighbors")  # neighbors|family_only
    verification_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|verified
    # house coordinates for the DingDong doorbell — set by the household while
    # standing at home; NEVER exposed via the API (server-side proximity only)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    members: Mapped[list["HouseholdMember"]] = relationship(
        back_populates="household", cascade="all, delete-orphan"
    )


class HouseholdMember(Base):
    """A named member of a household. May have no account (is_account=False for
    elders without phones); a real user can claim the row later via user_id."""

    __tablename__ = "household_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"), index=True)
    full_name: Mapped[str] = mapped_column(String(150))
    is_elder: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    household: Mapped[Household] = relationship(back_populates="members")


class HouseholdJoinRequest(Base):
    """A person asking a household's stewards to let them in — always confirmed
    by a steward, so nobody attaches themselves to a family unilaterally.
    member_id is None for a plain join (added as a new member on approval); it is
    set for a CLAIM ('I am this named row the family already listed'), and approval
    links that row to the requester's account."""

    __tablename__ = "household_join_requests"
    __table_args__ = (UniqueConstraint("household_id", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    member_id: Mapped[int | None] = mapped_column(ForeignKey("household_members.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|approved|declined
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Vouch(Base):
    __tablename__ = "vouches"
    __table_args__ = (UniqueConstraint("household_id", "voucher_user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"), index=True)
    voucher_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Post(Base):
    """A structured, typed post (plan §8). Never free chat.
    type: help|announcement|charity|event|newcomer|share
    'share' is the open people-post (photo/text) — visible beyond the mahalla
    via the discover feed, filtered by the VIEWER's chosen scope."""

    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    mahalla_id: Mapped[int] = mapped_column(ForeignKey("mahallas.id"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(20), index=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str | None] = mapped_column(Text)
    image_path: Mapped[str | None] = mapped_column(String(300))  # /api/uploads/<file>

    category: Mapped[str | None] = mapped_column(String(30))  # help: tool|ride|labor|childcare|other
    event_date: Mapped[datetime | None] = mapped_column(DateTime)
    goal: Mapped[str | None] = mapped_column(String(200))  # charity
    status: Mapped[str] = mapped_column(String(20), default="open")  # open|resolved|closed
    resolved_helper_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class PostResponse(Base):
    """A structured response to a post ("I can help" / "I'll come" / short note)."""

    __tablename__ = "post_responses"
    __table_args__ = (UniqueConstraint("post_id", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    message: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ReputationEntry(Base):
    """Points ledger. reason: help_fulfilled|history_seeded|newcomer_welcomed|founding_member"""

    __tablename__ = "reputation_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    mahalla_id: Mapped[int] = mapped_column(ForeignKey("mahallas.id"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(40))
    source_type: Mapped[str | None] = mapped_column(String(30))  # post|household|mahalla
    source_id: Mapped[int | None] = mapped_column(Integer)
    month: Mapped[str] = mapped_column(String(7), index=True)  # "2026-07"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Proposal(Base):
    """Governance (plan §10). action: none|set_raisi|ban_user.
    Punitive = ban_user (higher bar). Lifecycle: seconding -> voting -> passed|rejected|expired."""

    __tablename__ = "proposals"

    id: Mapped[int] = mapped_column(primary_key=True)
    mahalla_id: Mapped[int] = mapped_column(ForeignKey("mahallas.id"), index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(20), default="none")
    target_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="seconding")
    seconds_needed: Mapped[int] = mapped_column(Integer, default=3)
    voting_opens_at: Mapped[datetime | None] = mapped_column(DateTime)
    voting_closes_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ProposalSecond(Base):
    __tablename__ = "proposal_seconds"
    __table_args__ = (UniqueConstraint("proposal_id", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    proposal_id: Mapped[int] = mapped_column(ForeignKey("proposals.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("proposal_id", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    proposal_id: Mapped[int] = mapped_column(ForeignKey("proposals.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    choice: Mapped[bool] = mapped_column(Boolean)  # True = yes
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class MonthHonor(Base):
    """Race-proof marker: one Faol qo'shni honor per mahalla per month.
    The unique constraint is the idempotency guard for ensure_month_honor."""

    __tablename__ = "month_honors"
    __table_args__ = (UniqueConstraint("mahalla_id", "month"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    mahalla_id: Mapped[int] = mapped_column(ForeignKey("mahallas.id"), index=True)
    month: Mapped[str] = mapped_column(String(7))  # honored-for month, "2026-06"
    winner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Notification(Base):
    """In-app hyperlocal notification (plan §9-H). Fan-out is synchronous —
    fine at pilot scale; batch/push later.

    Stored structurally: `event` + `params` are rendered into the reader's language
    at read time (see notif_catalog). `text` is kept as the fallback for rows written
    before that change, and as the safety net if an event key is ever retired."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    mahalla_id: Mapped[int | None] = mapped_column(ForeignKey("mahallas.id"))
    type: Mapped[str] = mapped_column(String(30))  # post|response|thanks|vote|result|vouch|verified|honor|warning
    event: Mapped[str | None] = mapped_column(String(40))  # notif_catalog key
    params: Mapped[dict | None] = mapped_column(JSON)
    text: Mapped[str] = mapped_column(String(300))  # legacy / fallback rendering
    link: Mapped[str | None] = mapped_column(String(200))  # in-app path, e.g. /app/posts/5
    read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class ServiceOffering(Base):
    """Discovery-only directory (plan §9-G). No booking, no payment."""

    __tablename__ = "service_offerings"

    id: Mapped[int] = mapped_column(primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"), index=True)
    mahalla_id: Mapped[int] = mapped_column(ForeignKey("mahallas.id"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    category: Mapped[str] = mapped_column(String(20))  # food|goods|rental|service|skill
    description: Mapped[str | None] = mapped_column(String(500))
    price: Mapped[str | None] = mapped_column(String(80))
    contact: Mapped[str | None] = mapped_column(String(120))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Report(Base):
    """A member flagging content or a person (plan §10 moderation, Phase 2b).
    target_type: post|service|household|user; the moderation agent resolves
    open rows into resolved|dismissed."""

    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    target_type: Mapped[str] = mapped_column(String(20), index=True)  # post|service|household|user
    target_id: Mapped[int] = mapped_column(Integer, index=True)
    reason: Mapped[str] = mapped_column(String(40))  # spam|abuse|fake|other
    note: Mapped[str | None] = mapped_column(String(300))
    mahalla_id: Mapped[int | None] = mapped_column(ForeignKey("mahallas.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)  # open|resolved|dismissed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    resolved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)


class BanRecord(Base):
    """Ban history (plan §10 'permanent on repeat' needs a count of prior bans).
    source: vote (passed punitive proposal) | admin. until=None + permanent=True
    is a forever ban."""

    __tablename__ = "ban_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    mahalla_id: Mapped[int | None] = mapped_column(ForeignKey("mahallas.id"))
    reason: Mapped[str | None] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(20))  # vote|admin
    until: Mapped[datetime | None] = mapped_column(DateTime)  # None = permanent
    permanent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
