from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Google AI
    google_api_key: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Backend service
    backend_service_url: str = "http://localhost:3001"

    # Shared secret used to authenticate requests from the backend.
    # Must match AGENT_INTERNAL_SECRET in the backend's environment.
    internal_secret: str = ""

    # Server
    port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
