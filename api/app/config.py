from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # api/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), extra="ignore")

    environment: str = "dev"
    secret_key: str = "change-me"
    database_url: str = f"sqlite:///{BASE_DIR / 'mahalladosh.db'}"
    telegram_bot_token: str = ""
    petition_threshold: int = 5
    vouch_threshold: int = 2
    proposal_seconds_coordination: int = 3
    proposal_seconds_punitive: int = 5
    proposal_window_hours: int = 48
    proposal_quorum: int = 3
    session_days: int = 30

    @property
    def is_dev(self) -> bool:
        return self.environment.lower() in ("dev", "development", "local")


settings = Settings()
