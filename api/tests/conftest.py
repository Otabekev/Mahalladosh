"""Shared pytest fixtures.

Tests run against a throwaway SQLite database (DATABASE_URL is set below, before
the app is imported, so settings pick it up). The schema is rebuilt for every
test, so each test starts from a known-empty world and never touches the dev DB.
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


@pytest.fixture(autouse=True)
def _fresh_schema():
    """Drop + recreate every table around each test for full isolation."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


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
        founder="Founder Aka",
        voucher="Voucher Aka",
        neighbor="Neighbor Opa",
        stranger="Stranger Aka",
        alfa_id=alfa.id,
        beta_id=beta.id,
        son_member_id=son.id,
    )
