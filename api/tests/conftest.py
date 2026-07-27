"""Shared pytest fixtures.

Tests run against a throwaway database, SQLite by default. `setdefault` is what
makes the engine swappable: CI's Postgres job exports DATABASE_URL before pytest
starts and the same suite runs unchanged against a real server. An untested
Postgres is not a supported Postgres, and the two engines genuinely differ —
foreign keys are enforced, sequences keep climbing after a DELETE, and a value
longer than String(n) is an error rather than a shrug.

The schema is built once per session; tests isolate themselves by wiping rows.
"""

import os

# Must be set BEFORE importing the app so pydantic settings read it.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("ENVIRONMENT", "dev")  # keeps /auth/dev-login enabled

from types import SimpleNamespace  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import models  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402

IS_POSTGRES = engine.dialect.name == "postgresql"


@pytest.fixture(scope="session", autouse=True)
def _schema():
    """Build the schema ONCE for the whole session.

    Per-test drop_all/create_all was the source of intermittent "table already
    exists" / "no such table" failures. Two things compounded: the models contain a
    genuine foreign-key cycle (users -> households -> mahallas.raisi_user_id ->
    users) that drop_all cannot topologically order, so it left tables behind; and
    repeatedly issuing DDL against a file-based SQLite through a connection pool lets
    create_all's existence check run against a connection whose schema view is stale.
    Doing the DDL exactly once removes the whole class of race — tests isolate
    themselves by wiping rows, not by rebuilding tables (see _clean).

    DROP first so a schema left over from a previous run cannot collide. How that is
    done differs by engine, and the difference is the foreign-key cycle: SQLite
    ignores foreign keys unless the pragma is on, so any order works, while Postgres
    enforces them and would refuse. Dropping the whole schema sidesteps ordering
    entirely, and also clears anything the models no longer declare.
    """
    with engine.begin() as conn:
        if IS_POSTGRES:
            conn.exec_driver_sql("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
        else:
            for table in Base.metadata.tables:
                conn.exec_driver_sql(f'DROP TABLE IF EXISTS "{table}"')
        Base.metadata.create_all(bind=conn)
    yield


@pytest.fixture(autouse=True)
def _clean():
    """Empty every table before each test, so each starts from a known-empty world
    without any DDL.

    On Postgres this is one TRUNCATE ... CASCADE: it handles the foreign-key cycle
    in a single statement, and RESTART IDENTITY matters because Postgres sequences
    keep climbing after a DELETE while SQLite's rowids do not — without it the two
    engines would hand out different ids and any test naming one would diverge.
    """
    with engine.begin() as conn:
        if IS_POSTGRES:
            names = ", ".join(f'"{t}"' for t in Base.metadata.tables)
            conn.exec_driver_sql(f"TRUNCATE {names} RESTART IDENTITY CASCADE")
        else:
            for table in reversed(list(Base.metadata.tables)):
                conn.exec_driver_sql(f'DELETE FROM "{table}"')
    yield


@pytest.fixture
def db():
    """A session for arranging/asserting DB state directly in a test."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """An unauthenticated client (no session cookie)."""
    return TestClient(app)


def login(full_name: str, is_admin: bool = False) -> TestClient:
    """A logged-in client (its own cookie jar) for the given user. dev-login
    reuses an existing user by name, so this authenticates the seeded world."""
    client = TestClient(app)
    r = client.post(
        "/api/auth/dev-login", json={"full_name": full_name, "is_admin": is_admin}
    )
    assert r.status_code == 200, r.text
    return client


@pytest.fixture
def as_user():
    """Expose the login helper to tests as a fixture."""
    return login


@pytest.fixture
def world(db):
    """A believable active mahalla:

    - Yoshlik (active) under Pop district, Namangan region
    - founder ── owns a VERIFIED household 'Alfa' (with an unclaimed 'Alisher' row)
    - voucher ── owns a second VERIFIED household 'Beta' (can vouch for others)
    - neighbor ── a mahalla member with NO household of their own
    - stranger ── a member of ANOTHER mahalla (cross-mahalla checks)
    """
    region = models.Region(name_uz="Namangan")
    db.add(region)
    db.flush()
    district = models.District(region_id=region.id, name_uz="Pop")
    db.add(district)
    db.flush()
    mahalla = models.Mahalla(
        district_id=district.id, name="Yoshlik", name_normalized="yoshlik", status="active"
    )
    other_mahalla = models.Mahalla(
        district_id=district.id, name="Chorbog'", name_normalized="chorbog", status="active"
    )
    db.add_all([mahalla, other_mahalla])
    db.flush()

    founder = models.User(full_name="Founder Aka", mahalla_id=mahalla.id)
    voucher = models.User(full_name="Voucher Aka", mahalla_id=mahalla.id)
    neighbor = models.User(full_name="Neighbor Opa", mahalla_id=mahalla.id)
    stranger = models.User(full_name="Stranger Aka", mahalla_id=other_mahalla.id)
    db.add_all([founder, voucher, neighbor, stranger])
    db.flush()

    alfa = models.Household(
        mahalla_id=mahalla.id,
        family_name="Alfa",
        created_by=founder.id,
        verification_status="verified",
        family_history="Bu oila uch avloddan beri shu mahallada yashaydi.",
        generations_here=3,
    )
    beta = models.Household(
        mahalla_id=mahalla.id,
        family_name="Beta",
        created_by=voucher.id,
        verification_status="verified",
    )
    db.add_all([alfa, beta])
    db.flush()
    founder.household_id = alfa.id
    voucher.household_id = beta.id
    # a named member the family listed before he had an account (claim target)
    son = models.HouseholdMember(household_id=alfa.id, full_name="Alisher", is_elder=False)
    db.add(son)
    db.flush()
    db.commit()

    return SimpleNamespace(
        mahalla_id=mahalla.id,
        other_mahalla_id=other_mahalla.id,
        district_id=district.id,
        region_id=region.id,
        founder_id=founder.id,
        voucher_id=voucher.id,
        neighbor_id=neighbor.id,
        stranger_id=stranger.id,
        founder="Founder Aka",
        voucher="Voucher Aka",
        neighbor="Neighbor Opa",
        stranger="Stranger Aka",
        alfa_id=alfa.id,
        beta_id=beta.id,
        son_member_id=son.id,
    )
