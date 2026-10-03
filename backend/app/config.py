import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TraceHarvest Central Backend API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = ""
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:traceharvest_secure_2026@localhost:5432/traceharvest_db"
    )
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "traceharvest_central_secret_key_nigeria_2026"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
