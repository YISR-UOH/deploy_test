from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # DB
    DATABASE_URL: str = "postgresql+asyncpg://cartocor:cartocor@db:5432/cartocor"

    # Security
    JWT_SECRET: str = "59xpr-zmZlfI2K7xfpYWA44HavSF4R0aU7Lsty0nmcQ"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 360
    PEPPER: str = "Mk-jxztPtMLfPIqoQD-AGw"

    # App
    APP_NAME: str = "CartocorAPI"
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache

def get_settings() -> Settings:
    return Settings()
