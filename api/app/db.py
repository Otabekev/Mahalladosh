from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

# Deterministic constraint names, set before the first migration was generated.
#
# SQLite cannot alter a constraint in place, so every future schema change goes
# through Alembic's batch mode, which recreates the table — and to drop the old
# constraint it needs a NAME. Eleven UniqueConstraints in models.py were anonymous;
# naming them was free while no database held real rows, and would have cost a
# rename-everything migration later.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


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
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
