"""The guard that keeps migrations honest.

The tests deliberately still build their schema with `create_all` — running 300
tests through migrations would be slower and would fail 300 times with confusing
errors when one column drifted. Instead ONE test upgrades a throwaway database to
head and asks Alembic to compare the result against the models.

That strictly dominates the alternative: it catches an added column, a widened
type and a missing index that no feature test would ever touch, it fails exactly
once with the pending operation named, and it costs a fraction of a second.

If this fails, you changed models.py and did not generate a migration:

    cd api && .venv/Scripts/python.exe -m alembic revision --autogenerate -m "what changed"
"""

from pathlib import Path

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine

from app.db import Base

API_DIR = Path(__file__).resolve().parent.parent


def _alembic_config(url: str) -> Config:
    cfg = Config(str(API_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(API_DIR / "migrations"))
    cfg.attributes["url"] = url  # read by migrations/env.py, ahead of DATABASE_URL
    return cfg


@pytest.fixture
def migrated(tmp_path):
    """A throwaway database built purely by running the migrations."""
    url = f"sqlite:///{tmp_path / 'migrated.db'}"
    command.upgrade(_alembic_config(url), "head")
    engine = create_engine(url)
    yield engine
    engine.dispose()


def test_migrations_match_the_models(migrated):
    """A database at head must be indistinguishable from create_all's output."""
    with migrated.connect() as conn:
        diff = compare_metadata(
            MigrationContext.configure(conn, opts={"compare_type": True}),
            Base.metadata,
        )
    assert diff == [], (
        "models.py and the migrations disagree. Pending operations:\n"
        + "\n".join(f"  {d}" for d in diff)
        + "\n\nGenerate one:  cd api && python -m alembic revision --autogenerate -m '...'"
    )


def test_migrations_create_every_table(migrated):
    """A blunt second check: the tables the app expects are actually there."""
    from sqlalchemy import inspect

    present = set(inspect(migrated).get_table_names())
    expected = set(Base.metadata.tables)
    assert expected - present == set(), f"migrations never create: {expected - present}"


def test_the_migration_chain_downgrades_to_nothing(tmp_path):
    """A migration you cannot reverse is a migration you cannot deploy confidently."""
    url = f"sqlite:///{tmp_path / 'down.db'}"
    cfg = _alembic_config(url)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")

    from sqlalchemy import inspect

    engine = create_engine(url)
    try:
        left = set(inspect(engine).get_table_names()) - {"alembic_version"}
        assert left == set(), f"downgrade left tables behind: {left}"
    finally:
        engine.dispose()
