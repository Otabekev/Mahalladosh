"""One mechanism for every photo collection.

Posts, family albums and service offerings all store photos the same way: a child
table of ``{parent_id, path, position}`` whose paths must have come from the upload
endpoint. That shape was copy-pasted twice before this module existed; a third copy
(service photos) is what prompted collecting it here.

The rule worth stating once: a path is only ever accepted if it starts with
``/api/uploads/``. Without that check a caller could point a row at any URL on the
internet and the app would happily render it inside a neighbour's family album.
"""

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

UPLOAD_PREFIX = "/api/uploads/"


def clean_urls(urls: list[str] | None, cap: int) -> list[str]:
    """Drop blanks, cap the count, and refuse anything not from the upload endpoint."""
    cleaned = [u for u in (urls or []) if u][:cap]
    if any(not u.startswith(UPLOAD_PREFIX) for u in cleaned):
        raise HTTPException(status_code=400, detail="Rasm avval yuklanishi kerak")
    return cleaned


def rows(db: Session, model: type, fk: str, parent_id: int) -> list:
    """Every image row for one parent, in the order they were added."""
    return (
        db.query(model)
        .filter_by(**{fk: parent_id})
        .order_by(model.position, model.id)
        .all()
    )


def paths(db: Session, model: type, fk: str, parent_id: int) -> list[str]:
    return [im.path for im in rows(db, model, fk, parent_id)]


def append(db: Session, model: type, fk: str, parent_id: int, urls: list[str], cap: int) -> None:
    """Add photos to a collection, keeping `position` monotonic and the total under
    `cap`. Used where photos accumulate one batch at a time (the family album)."""
    existing = db.query(model).filter_by(**{fk: parent_id}).count()
    start = (
        db.query(func.coalesce(func.max(model.position), -1)).filter_by(**{fk: parent_id}).scalar()
    ) + 1
    for offset, url in enumerate(urls[: max(0, cap - existing)]):
        db.add(model(**{fk: parent_id, "path": url, "position": start + offset}))


def replace(db: Session, model: type, fk: str, parent_id: int, urls: list[str]) -> None:
    """Set a collection to exactly `urls`. Used where the client edits the whole set
    at once (a post at creation, a service offering on save), so there is no need
    for per-photo delete endpoints — re-saving without a photo removes it."""
    db.query(model).filter_by(**{fk: parent_id}).delete(synchronize_session=False)
    for position, url in enumerate(urls):
        db.add(model(**{fk: parent_id, "path": url, "position": position}))
