"""«Chiroq bormi?» — the live light / gas / water board.

WHY THIS EXISTS. Rural Uzbekistan loses power and gas routinely through the winter:
evening rationing, a gas supply that has fallen roughly a quarter in five years, and
villages off the grid entirely. The utilities do announce cuts — on one Telegram
channel per *region*. So the announcement a person can find covers a whole viloyat,
while the question they actually have at seven in the evening is:

    "Is it only my house, or the whole street?"

No broadcast channel can answer that. Only a neighbour can, which is why this is the
one feature that is structurally better here than in Telegram rather than merely
nicer. It is also self-recruiting: the way to get a better answer is to get your
neighbour to install the app.

THE SHAPE. A report is a point-in-time state ("mine is out" / "mine is back"), never
a session. Outages are derived from consecutive reports at read time — see _sessions.
Live status uses only the *latest* report per person inside a freshness window, so
someone tapping twice cannot skew the tally.

The solo half matters as much as the social half: with nobody else on the app you
still get your own monthly log ("14 cuts, 31 hours"), which is worth having and is
exactly the thing people screenshot into a Telegram group.
"""

from collections import OrderedDict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, notify, ratelimit, schemas, track
from ..deps import get_db, require_member, require_raisi

router = APIRouter(prefix="/utility", tags=["utility"])

KINDS = ("light", "gas", "water")

# How long a report speaks for. Long enough that a mahalla where people check in
# every hour or two shows a coherent picture; short enough that "the lights are out"
# does not persist into the next morning because nobody said otherwise.
FRESH = timedelta(minutes=90)

# Distinct households out before the mahalla gets told. One dark house is a fuse;
# three is the line.
ALERT_THRESHOLD = 3

# An outage nobody ever closed is capped here rather than run to now. Someone whose
# power returns while they are asleep never taps "menda bor", and without a cap that
# single silence would report a 3-day blackout and make the whole log a lie.
MAX_OPEN_HOURS = 12

WINDOW_MAX_DAYS = 14  # how far ahead a raisi may announce a cut


def _check_kind(kind: str) -> str:
    if kind not in KINDS:
        raise HTTPException(status_code=400, detail="Noma'lum turdagi xizmat")
    return kind


def _latest_per_user(
    db: Session, mahalla_id: int, kind: str, since: datetime
) -> list[models.UtilityReport]:
    """Each person's most recent word inside the freshness window.

    Ascending order plus a dict keyed by user means later rows overwrite earlier
    ones, so a neighbour who taps "out" and then "back on" counts once, as "on"."""
    rows = (
        db.query(models.UtilityReport)
        .filter(
            models.UtilityReport.mahalla_id == mahalla_id,
            models.UtilityReport.kind == kind,
            models.UtilityReport.created_at >= since,
        )
        .order_by(models.UtilityReport.created_at.asc(), models.UtilityReport.id.asc())
        .all()
    )
    latest: dict[int, models.UtilityReport] = {}
    for r in rows:
        latest[r.user_id] = r
    return list(latest.values())


def _status(
    db: Session, user: models.User, kind: str, now: datetime | None = None
) -> schemas.UtilityStatus:
    now = now or datetime.utcnow()
    fresh = _latest_per_user(db, user.mahalla_id, kind, now - FRESH)

    streets: OrderedDict[str, schemas.StreetStatus] = OrderedDict()
    out = on = 0
    mine: models.UtilityReport | None = None
    since: datetime | None = None

    for r in fresh:
        if r.is_out:
            out += 1
            # the episode started when the *first* of the current reporters went dark
            if since is None or r.created_at < since:
                since = r.created_at
        else:
            on += 1
        if r.user_id == user.id:
            mine = r
        if r.street:
            row = streets.setdefault(r.street, schemas.StreetStatus(street=r.street))
            if r.is_out:
                row.out += 1
            else:
                row.on += 1

    return schemas.UtilityStatus(
        kind=kind,
        out=out,
        on=on,
        answered=out + on,
        my_state=(None if mine is None else ("out" if mine.is_out else "on")),
        my_reported_at=(mine.created_at if mine else None),
        since=since if out else None,
        # darkest streets first — that is the street someone is looking for
        streets=sorted(streets.values(), key=lambda s: (-s.out, s.street)),
    )


def _windows(db: Session, mahalla_id: int, now: datetime) -> list[models.UtilityWindow]:
    """Announced cuts that have not finished yet. A window still running is the most
    useful row on the screen — it is the explanation for the dark house."""
    return (
        db.query(models.UtilityWindow)
        .filter(
            models.UtilityWindow.mahalla_id == mahalla_id,
            models.UtilityWindow.ends_at >= now,
        )
        .order_by(models.UtilityWindow.starts_at.asc())
        .limit(20)
        .all()
    )


def _board(db: Session, user: models.User) -> schemas.UtilityBoard:
    now = datetime.utcnow()
    return schemas.UtilityBoard(
        statuses=[_status(db, user, k, now) for k in KINDS],
        windows=[
            schemas.UtilityWindowOut(
                id=w.id, kind=w.kind, starts_at=w.starts_at, ends_at=w.ends_at, note=w.note
            )
            for w in _windows(db, user.mahalla_id, now)
        ],
    )


@router.get("/board", response_model=schemas.UtilityBoard)
def board(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
) -> schemas.UtilityBoard:
    return _board(db, user)


def _maybe_alert(db: Session, user: models.User, kind: str, now: datetime) -> None:
    """Tell the mahalla once when enough houses are dark.

    Counted by household, not by account, so a family of four tapping on four phones
    is one dark house and not an alert on its own.
    """
    fresh = _latest_per_user(db, user.mahalla_id, kind, now - FRESH)
    # a member with no household still counts, keyed by their own id so they cannot
    # collide with a household id
    dark = {
        (r.household_id if r.household_id else f"u{r.user_id}") for r in fresh if r.is_out
    }
    if len(dark) < ALERT_THRESHOLD:
        return

    bucket = now.strftime("%Y-%m-%dT%H")
    db.add(
        models.UtilityAlert(
            mahalla_id=user.mahalla_id, kind=kind, bucket=bucket, households=len(dark)
        )
    )
    try:
        db.commit()  # claim the hour BEFORE fanning out
    except IntegrityError:
        db.rollback()  # someone already alerted for this hour
        return

    notify.notify_mahalla(
        db,
        user.mahalla_id,
        "utility",
        link="/app/utility",
        # spelled out rather than f-string-built: the catalog drift test reads these
        # literals out of the source, and a key it cannot see is a key that can rot
        # into a blank notification without anyone noticing
        event={
            "light": "utility_out_light",
            "gas": "utility_out_gas",
            "water": "utility_out_water",
        }[kind],
        params={"count": len(dark)},
    )
    db.commit()


@router.post("/report", response_model=schemas.UtilityBoard)
def report(
    data: schemas.UtilityReportIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
) -> schemas.UtilityBoard:
    """Record "mine is out" / "mine is back" and hand back the fresh board.

    Returning the whole board rather than an ack is deliberate: the tap and the
    answer are the same interaction, and a second round trip on a village connection
    is the difference between an app that feels instant and one that does not."""
    ratelimit.check("utility", user.id)
    kind = _check_kind(data.kind)
    now = datetime.utcnow()

    household = db.get(models.Household, user.household_id) if user.household_id else None
    db.add(
        models.UtilityReport(
            mahalla_id=user.mahalla_id,
            user_id=user.id,
            household_id=household.id if household else None,
            street=household.street if household else None,
            kind=kind,
            is_out=data.is_out,
            created_at=now,
        )
    )
    track.log_event(db, user.id, "utility_report", entity_type=kind)
    db.commit()

    if data.is_out:
        _maybe_alert(db, user, kind, now)

    return _board(db, user)


def _sessions(
    reports: list[models.UtilityReport], now: datetime
) -> list[schemas.OutageSession]:
    """Fold a person's ordered reports into outage sessions.

    An outage opens on the first "out" and closes on the next "on"; repeated reports
    of the same state are ignored, because tapping "still out" twice is one outage,
    not two. A session never closed is capped at MAX_OPEN_HOURS and flagged
    `estimated` so the total is honest about which part of it was inferred.
    """
    sessions: list[schemas.OutageSession] = []
    start: datetime | None = None
    for r in reports:
        if r.is_out and start is None:
            start = r.created_at
        elif not r.is_out and start is not None:
            sessions.append(
                schemas.OutageSession(
                    start=start,
                    end=r.created_at,
                    minutes=max(0, int((r.created_at - start).total_seconds() // 60)),
                )
            )
            start = None
    if start is not None:
        end = min(now, start + timedelta(hours=MAX_OPEN_HOURS))
        sessions.append(
            schemas.OutageSession(
                start=start,
                end=end,
                minutes=max(0, int((end - start).total_seconds() // 60)),
                estimated=True,
            )
        )
    return sessions


@router.get("/log", response_model=schemas.UtilityLog)
def log(
    kind: str = Query(default="light"),
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
) -> schemas.UtilityLog:
    """Your own outage history for a month. Works with zero neighbours."""
    kind = _check_kind(kind)
    now = datetime.utcnow()
    month = month or now.strftime("%Y-%m")
    year, mon = (int(p) for p in month.split("-"))
    if not 1 <= mon <= 12:
        raise HTTPException(status_code=400, detail="Noto'g'ri oy")
    start = datetime(year, mon, 1)
    end = datetime(year + (mon == 12), (mon % 12) + 1, 1)

    reports = (
        db.query(models.UtilityReport)
        .filter(
            models.UtilityReport.user_id == user.id,
            models.UtilityReport.kind == kind,
            models.UtilityReport.created_at >= start,
            models.UtilityReport.created_at < end,
        )
        .order_by(models.UtilityReport.created_at.asc(), models.UtilityReport.id.asc())
        .all()
    )
    sessions = _sessions(reports, min(now, end))
    return schemas.UtilityLog(
        kind=kind,
        month=month,
        cuts=len(sessions),
        hours=round(sum(s.minutes for s in sessions) / 60, 1),
        sessions=list(reversed(sessions)),  # newest first, like every other list
    )


# ---------- announced windows (raisi only) ----------


@router.post("/windows", response_model=schemas.UtilityWindowOut)
def add_window(
    data: schemas.UtilityWindowIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_raisi),
) -> schemas.UtilityWindowOut:
    """The raisi re-types a regional announcement at mahalla scope, and everyone
    is told. This is the manual bridge from the utility's Telegram channel to the
    people it is actually about."""
    kind = _check_kind(data.kind)
    if data.ends_at <= data.starts_at:
        raise HTTPException(status_code=400, detail="Tugash vaqti boshlanishdan keyin bo'lsin")
    now = datetime.utcnow()
    if data.starts_at > now + timedelta(days=WINDOW_MAX_DAYS):
        raise HTTPException(status_code=400, detail="Juda uzoq muddatga e'lon qilinmoqda")

    window = models.UtilityWindow(
        mahalla_id=user.mahalla_id,
        kind=kind,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        note=data.note,
        created_by=user.id,
    )
    db.add(window)
    db.commit()
    db.refresh(window)

    notify.notify_mahalla(
        db,
        user.mahalla_id,
        "utility",
        link="/app/utility",
        exclude=[user.id],
        event={
            "light": "utility_planned_light",
            "gas": "utility_planned_gas",
            "water": "utility_planned_water",
        }[kind],
        params={
            "date": window.starts_at.strftime("%d.%m"),
            "from": window.starts_at.strftime("%H:%M"),
            "to": window.ends_at.strftime("%H:%M"),
        },
    )
    db.commit()
    return schemas.UtilityWindowOut(
        id=window.id,
        kind=window.kind,
        starts_at=window.starts_at,
        ends_at=window.ends_at,
        note=window.note,
    )


@router.delete("/windows/{window_id}", status_code=204)
def remove_window(
    window_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_raisi),
) -> None:
    window = db.get(models.UtilityWindow, window_id)
    if window is None or window.mahalla_id != user.mahalla_id:
        raise HTTPException(status_code=404, detail="Topilmadi")
    db.delete(window)
    db.commit()
