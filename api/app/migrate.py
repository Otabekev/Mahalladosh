"""Bring the database up to the latest migration.

Called from the app's lifespan, which replaced `Base.metadata.create_all`. Those
two cannot coexist: create_all would build the tables without writing an
`alembic_version` row, and the next `alembic upgrade head` would then try to create
tables that already exist.

Running migrations at startup is the right trade for this stage — one instance, a
free-tier deploy, and a demo that has to work the moment it boots. It stops being
right the moment there is more than one instance, because N processes would race
the same DDL. That is what `run_migrations_on_start` is for: set it false and run
`alembic upgrade head` as a release step instead, before the new instances start.
"""

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config

from .db import DATABASE_URL

logger = logging.getLogger("mahalladosh.migrate")

API_DIR = Path(__file__).resolve().parent.parent


def alembic_config(url: str | None = None) -> Config:
    cfg = Config(str(API_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(API_DIR / "migrations"))
    # env.py reads this ahead of DATABASE_URL, so callers can target another database
    cfg.attributes["url"] = url or DATABASE_URL
    return cfg


def upgrade_to_head(url: str | None = None) -> None:
    logger.info("Applying database migrations")
    command.upgrade(alembic_config(url), "head")
