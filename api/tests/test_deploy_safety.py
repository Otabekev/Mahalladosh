"""Two landmines that would have gone off the first time this was deployed.

Neither was a live bug — there is no deploy yet. Both were things that become
severe the moment there is one, so the guards are pinned here before the deploy
kit is written rather than after.
"""

import logging

from app import models
from app.config import Settings
from app.routers import uploads

# ---------- 1. a login must never confer admin ----------


def test_dev_login_cannot_mint_an_admin(db, world, client):
    """It used to take is_admin straight from the request body."""
    r = client.post(
        "/api/auth/dev-login",
        json={"full_name": "Yangi Odam", "is_admin": True},  # ignored: not in the schema
    )
    assert r.status_code == 200
    assert r.json()["is_admin"] is False
    assert db.query(models.User).filter_by(full_name="Yangi Odam").one().is_admin is False


def test_dev_login_cannot_promote_an_existing_neighbour(db, world, client):
    """The worse of the two: naming any existing user with is_admin=true promoted
    THEM. An attacker did not even need an account of their own."""
    r = client.post(
        "/api/auth/dev-login", json={"full_name": world.neighbor, "is_admin": True}
    )
    assert r.status_code == 200
    assert db.get(models.User, world.neighbor_id).is_admin is False


def test_a_seeded_admin_is_still_reachable_in_dev(db, world, client):
    """The fix must not break the thing dev-login is for: logging into a seeded
    account. Admin comes from the DATA, never from the request."""
    db.get(models.User, world.founder_id).is_admin = True
    db.commit()
    r = client.post("/api/auth/dev-login", json={"full_name": world.founder})
    assert r.status_code == 200 and r.json()["is_admin"] is True


def test_the_environment_default_is_locked_not_open(monkeypatch):
    """The gate on dev-login. A deploy that forgets to configure ENVIRONMENT must
    be closed — the default used to be "dev", which meant a forgotten variable
    exposed a login that reuses any seeded account by name, admin included.

    Both the env var and the .env file are removed here, because "configured
    nothing at all" is exactly the case under test (conftest itself exports
    ENVIRONMENT=dev, which would otherwise mask the default)."""
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    fresh = Settings(_env_file=None)
    assert fresh.environment == "production"
    assert fresh.is_dev is False


# ---------- 2. uploads must not vanish silently ----------


def _settings(**over):
    base = {"environment": "production", "uploads_may_be_ephemeral": False}
    base.update(over)
    return Settings(_env_file=None, **base)


def test_production_warns_when_uploads_live_inside_the_app(monkeypatch, caplog):
    """The silence was the bug: rows keep pointing at /api/uploads/<uuid>.jpg, the
    files are gone after a redeploy, and nothing is logged anywhere."""
    monkeypatch.setattr(uploads, "settings", _settings())
    monkeypatch.setattr(uploads, "UPLOAD_DIR", uploads.DEFAULT_UPLOAD_DIR)
    with caplog.at_level(logging.WARNING, logger="mahalladosh.uploads"):
        uploads.check_uploads_durable()
    assert "UPLOADS ARE NOT DURABLE" in caplog.text


def test_a_mounted_volume_is_accepted_quietly(monkeypatch, caplog, tmp_path):
    monkeypatch.setattr(uploads, "settings", _settings(upload_dir=str(tmp_path)))
    monkeypatch.setattr(uploads, "UPLOAD_DIR", tmp_path)
    with caplog.at_level(logging.WARNING, logger="mahalladosh.uploads"):
        uploads.check_uploads_durable()
    assert "NOT DURABLE" not in caplog.text


def test_a_demo_may_opt_into_ephemeral_uploads(monkeypatch, caplog):
    """Losing uploads is fine for a throwaway demo — it just has to be a decision
    somebody made, rather than something nobody noticed."""
    monkeypatch.setattr(uploads, "settings", _settings(uploads_may_be_ephemeral=True))
    monkeypatch.setattr(uploads, "UPLOAD_DIR", uploads.DEFAULT_UPLOAD_DIR)
    with caplog.at_level(logging.WARNING, logger="mahalladosh.uploads"):
        uploads.check_uploads_durable()
    assert "NOT DURABLE" not in caplog.text


def test_development_is_never_nagged(monkeypatch, caplog):
    monkeypatch.setattr(uploads, "settings", _settings(environment="dev"))
    monkeypatch.setattr(uploads, "UPLOAD_DIR", uploads.DEFAULT_UPLOAD_DIR)
    with caplog.at_level(logging.WARNING, logger="mahalladosh.uploads"):
        uploads.check_uploads_durable()
    assert "NOT DURABLE" not in caplog.text
