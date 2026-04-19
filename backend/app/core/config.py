from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore")

    app_name: str = "Farmer Market Guide API"
    version: str = "2.1.0"
    host: str = "0.0.0.0"
    port: int = 8000
    data_dir: str = "data"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
