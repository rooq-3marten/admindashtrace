import logging
import os
import secrets
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TraceHarvest Central Backend API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = ""
    # Set DATABASE_URL in the environment. With nothing set, a local SQLite file is used for development.
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./traceharvest_dev.db")
    # Set SECRET_KEY in the environment. It signs login tokens, so it must be long, random and private.
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

if not settings.SECRET_KEY:
    # Never fall back to a key that is written in the source code: anyone could forge login tokens with it.
    logging.getLogger("traceharvest").warning(
        "SECRET_KEY is not set. Using a temporary random key, so every login ends when the server restarts. "
        "Set SECRET_KEY in the environment."
    )
    settings.SECRET_KEY = secrets.token_urlsafe(48)
