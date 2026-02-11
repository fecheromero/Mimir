from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # API Keys
    anthropic_api_key: str

    # Redis
    redis_url: str = "redis://localhost:6379"

    # SSO (Optional)
    sso_provider: str = "google"
    sso_client_id: str = ""
    sso_client_secret: str = ""
    sso_redirect_uri: str = ""

    # Application
    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"

    # Storage
    storage_path: str = "app/storage/jobs"
    job_retention_hours: int = 24

    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    # Models
    test_case_agent_model: str = "claude-3-7-sonnet-20250219"
    qa_agent_model: str = "claude-3-7-sonnet-20250219"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
