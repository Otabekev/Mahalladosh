"""Alembic environment.

The URL is never read from alembic.ini — it comes from the same settings object the
app uses, so there is exactly one place that decides which database is in play and
no production password sits in a committed file.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app import models  # noqa: F401 — importing registers every table on Base.metadata
from app.db import DATABASE_URL, Base

config = context.config
if config.config_file_name is not None:
    # disable_existing_loggers=False is load-bearing, not tidiness. It defaults to
    # True, and migrations now run inside the app's startup and inside the test
    # suite — so the default would silently switch off every logger configured
    # before this point. It first showed up as the "bot token never appears in a
    # log line" test passing alone and failing in a full run.
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def _url() -> str:
    """Programmatic override (tests) > `-x url=...` > DATABASE_URL."""
    return (
        config.attributes.get("url")
        or context.get_x_argument(as_dictionary=True).get("url")
        or DATABASE_URL
    )


_OPTS = dict(
    target_metadata=target_metadata,
    # SQLite has no ALTER COLUMN and no ADD CONSTRAINT. Batch mode renders the
    # create-copy-drop-rename recipe automatically, and is a no-op on Postgres.
    render_as_batch=True,
    # Pinned rather than left to the default, because this is what makes the drift
    # guard catch a String(150) quietly widened to String(200).
    compare_type=True,
    # Off deliberately: the models use Python-side defaults (default=utcnow,
    # default=False), never server_default, so this would only produce noise.
    compare_server_default=False,
)


def run_migrations_offline() -> None:
    context.configure(
        url=_url(), literal_binds=True, dialect_opts={"paramstyle": "named"}, **_OPTS
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(_url(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, **_OPTS)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
