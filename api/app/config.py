from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # api/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), extra="ignore")

    # Defaults to production so a deploy that forgets to configure anything is
    # LOCKED, not open. is_dev unlocks /auth/dev-login, which reuses an existing
    # account by name — including the seeded admin — so a fail-open default would
    # hand the platform to anyone who found the URL. Dev machines opt in via .env.
    environment: str = "production"
    secret_key: str = "change-me"
    database_url: str = f"sqlite:///{BASE_DIR / 'mahalladosh.db'}"
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""  # e.g. MahalladoshBot — enables the Login Widget
    # --- Telegram DM sender (app/telegram.py) ---
    # An empty token already means "off", which is what keeps dev machines and CI
    # off the network; this flag is the separate runtime kill switch for prod.
    telegram_dm_enabled: bool = True
    telegram_api_base: str = "https://api.telegram.org"
    telegram_timeout_seconds: float = 5.0  # a stalled DM must not hold a worker
    telegram_dm_workers: int = 4  # small pool: DMs are I/O-bound and never urgent
    public_web_url: str = ""  # e.g. https://mahalladosh.uz — makes DM links tappable
    petition_threshold: int = 5
    vouch_threshold: int = 2
    proposal_seconds_coordination: int = 3
    proposal_seconds_punitive: int = 5
    proposal_window_hours: int = 48
    proposal_quorum: int = 3
    # Where uploaded images are written. Empty = api/uploads, which is INSIDE the
    # application directory and therefore wiped on every redeploy of a container.
    # Point this at a mounted volume in production; see check_uploads_durable().
    upload_dir: str = ""
    # Acknowledges that losing uploads on redeploy is fine here (a throwaway demo).
    # Without it, a production start with an in-app upload path logs a loud warning.
    uploads_may_be_ephemeral: bool = False
    session_days: int = 30
    # Migrations run at startup, which is right for one instance and wrong for
    # several — N processes would race the same DDL. Set false and run
    # `alembic upgrade head` as a release step once you scale past one.
    run_migrations_on_start: bool = True

    @property
    def is_dev(self) -> bool:
        return self.environment.lower() in ("dev", "development", "local")


settings = Settings()
