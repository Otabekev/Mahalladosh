from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings


def normalize_db_url(url: str) -> str:
    """Accept the connection string a hosting provider actually hands you.

    Neon, Render, Railway and Heroku all print `postgres://` or `postgresql://`,
    and SQLAlchemy resolves both to psycopg2 — which is not installed here, so the
    app would die at import with a confusing driver error while the URL looks
    perfectly correct. Rewriting to the psycopg (v3) driver means the pasted string
    just works, rather than the operator having to know to edit it.
    """
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


DATABASE_URL = normalize_db_url(settings.database_url)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
