"""«Narx» — the district price board.

WHY. Food is roughly 69% of Uzbekistan's official minimum consumption basket, and
felt inflation for low-income households runs a couple of points above the headline
number. What a kilo of meat costs at the tuman bazaar this week is therefore a fact
households actually plan around, and today the only way to know it is to go.

SCOPE. District, not mahalla. A price is a fact about a bazaar and the bazaar serves
the whole tuman; a mahalla-sized sample would be too thin to mean anything. This is
also the one surface in the app with a CROSS-mahalla network effect — every new
mahalla in Pop makes the Pop board better for the ones already there — which is a
different growth vector from «Chiroq bormi?», where value is street-local.

HONEST WEAKNESS. With one person in a district this is a personal price diary, not a
board. It earns its place because the diary is still worth something (the week-on-week
trend works with a single reporter) and because the item catalog gives someone a
reason to open the app on a day when nothing else has happened — but it is a slower
burn than the utility board and should not be mistaken for the magnet.

THE MEDIAN IS NOT A DETAIL. One person typing 500000 where they meant 5000 would
wreck a mean and leave the board reporting a nonsense figure with a straight face.
The median simply ignores them. Combined with one-row-per-person-per-day, a single
account cannot move the number by more than one vote no matter what it does.
"""

from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, ratelimit, schemas, track
from ..deps import get_db, require_member

router = APIRouter(prefix="/prices", tags=["prices"])

# The basket. Keys only — every label and unit lives in the four-language dict on the
# client (web/src/core/i18n/prices.ts), which is the same pattern the onboarding
# steps use: copy belongs in i18n, not in the API.
#
# Chosen for an Uzbek village kitchen plus the two non-food items people talk about
# most: petrol, which has been among the fastest-rising prices, and a gas cylinder,
# which is what a household off the gas grid actually heats and cooks with.
ITEMS: tuple[str, ...] = (
    "non",
    "un",
    "guruch",
    "yog",
    "shakar",
    "tuxum",
    "sut",
    "kartoshka",
    "piyoz",
    "sabzi",
    "pomidor",
    "olma",
    "gosht_mol",
    "gosht_qoy",
    "benzin",
    "gaz_ballon",
)
ITEM_SET = set(ITEMS)

WEEK = timedelta(days=7)

# A price nobody has confirmed for a fortnight is history, not news. Past this the
# board shows the item as unanswered rather than quoting a stale figure.
MAX_AGE = timedelta(days=14)

# Sanity bounds. Not a judgement about what things should cost — just the range
# outside which a number is certainly a typo (a missing or extra zero).
MIN_SOM = 100
MAX_SOM = 100_000_000


def _median(values: list[int]) -> int:
    """Middle value, rounded down on an even count.

    Deliberately not a mean: see the module docstring. One mistyped 500000 in a
    sample of five would move a mean by 100 000 so'm and the median by nothing."""
    ordered = sorted(values)
    n = len(ordered)
    mid = n // 2
    return ordered[mid] if n % 2 else (ordered[mid - 1] + ordered[mid]) // 2


def _district_of(db: Session, user: models.User) -> int:
    mahalla = db.get(models.Mahalla, user.mahalla_id)
    if mahalla is None:
        raise HTTPException(status_code=403, detail="Avval mahallaga qo'shiling")
    return mahalla.district_id


def _board(db: Session, user: models.User, now: datetime | None = None) -> schemas.PriceBoard:
    now = now or datetime.utcnow()
    district_id = _district_of(db, user)

    rows = (
        db.query(models.PriceReport)
        .filter(
            models.PriceReport.district_id == district_id,
            models.PriceReport.created_at >= now - MAX_AGE,
        )
        .all()
    )

    this_week: dict[str, list[int]] = defaultdict(list)
    last_week: dict[str, list[int]] = defaultdict(list)
    mine: dict[str, int] = {}
    cutoff = now - WEEK

    for r in rows:
        (this_week if r.created_at >= cutoff else last_week)[r.item].append(r.som)
        if r.user_id == user.id and r.created_at >= cutoff:
            mine[r.item] = r.som

    items = []
    for key in ITEMS:
        current = this_week.get(key, [])
        previous = last_week.get(key, [])
        som = _median(current) if current else None
        was = _median(previous) if previous else None
        # only claim a trend when BOTH weeks have data — "up 100%" computed from a
        # week with no reports at all is worse than showing nothing
        trend = None
        if som is not None and was:
            trend = round((som - was) * 100 / was)
        items.append(
            schemas.PriceRow(
                item=key,
                som=som,
                reports=len(current),
                was=was,
                trend_pct=trend,
                my_som=mine.get(key),
            )
        )

    return schemas.PriceBoard(district_id=district_id, items=items)


@router.get("", response_model=schemas.PriceBoard)
def board(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
) -> schemas.PriceBoard:
    return _board(db, user)


@router.post("", response_model=schemas.PriceBoard)
def report_price(
    data: schemas.PriceIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
) -> schemas.PriceBoard:
    """Report what something cost. Same-day repeats correct the earlier figure."""
    ratelimit.check("price", user.id)
    if data.item not in ITEM_SET:
        raise HTTPException(status_code=400, detail="Noma'lum mahsulot")
    if not MIN_SOM <= data.som <= MAX_SOM:
        raise HTTPException(status_code=400, detail="Narx noto'g'ri ko'rinadi")

    now = datetime.utcnow()
    day = now.strftime("%Y-%m-%d")
    district_id = _district_of(db, user)

    existing = (
        db.query(models.PriceReport)
        .filter_by(user_id=user.id, item=data.item, day=day)
        .first()
    )
    if existing is not None:
        # a correction, not a second vote — the unique constraint guarantees there
        # is at most one row here to find
        existing.som = data.som
        existing.market = data.market
        existing.created_at = now
    else:
        db.add(
            models.PriceReport(
                district_id=district_id,
                mahalla_id=user.mahalla_id,
                user_id=user.id,
                item=data.item,
                som=data.som,
                market=data.market,
                day=day,
                created_at=now,
            )
        )
        track.log_event(db, user.id, "price_report", entity_type=data.item)
    db.commit()
    return _board(db, user, now)


@router.get("/{item}", response_model=schemas.PriceDetail)
def item_detail(
    item: str,
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_member),
) -> schemas.PriceDetail:
    """The individual reports behind a median.

    Shown by name and market on purpose: a bare number nobody can trace is a number
    nobody trusts, and the fastest way to settle "that's not what I paid" is to see
    who said what, where, and when."""
    if item not in ITEM_SET:
        raise HTTPException(status_code=404, detail="Noma'lum mahsulot")
    district_id = _district_of(db, user)
    now = datetime.utcnow()

    rows = (
        db.query(models.PriceReport)
        .filter(
            models.PriceReport.district_id == district_id,
            models.PriceReport.item == item,
            models.PriceReport.created_at >= now - MAX_AGE,
        )
        .order_by(models.PriceReport.created_at.desc())
        .limit(limit)
        .all()
    )
    reports = []
    for r in rows:
        author = db.get(models.User, r.user_id)
        reports.append(
            schemas.PriceReportOut(
                som=r.som,
                market=r.market,
                by_name=author.full_name if author else "",
                created_at=r.created_at,
            )
        )
    return schemas.PriceDetail(item=item, reports=reports)
