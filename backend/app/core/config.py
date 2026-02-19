from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
from pydantic import model_validator


class Settings(BaseSettings):
    # LLM Provider
    llm_provider: str = "anthropic"  # "anthropic" or "openai"

    # API Keys
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

    # OpenAI
    openai_model: str = "gpt-4o-mini"  # or "gpt-4o", "gpt-4-turbo"

    @model_validator(mode='after')
    def validate_llm_config(self):
        """Validate that required API keys are present based on LLM provider."""
        if self.llm_provider == "anthropic" and not self.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic")
        if self.llm_provider == "openai" and not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY is required when LLM_PROVIDER=openai")
        if self.llm_provider not in ["anthropic", "openai"]:
            raise ValueError(f"Invalid LLM_PROVIDER: {self.llm_provider}. Must be 'anthropic' or 'openai'")
        return self

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Application
    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"

    # Storage
    storage_path: str = "app/storage/jobs"
    job_retention_hours: int = 24

    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"
    enable_celery_worker: bool = True  # Set to False to disable Celery worker (sync mode only)

    # Models
    test_case_agent_model: str = "claude-sonnet-4-5-20250929"
    qa_agent_model: str = "claude-sonnet-4-5-20250929"

    # Browser Execution
    browser_execution_mode: str = "local"  # "local" or "cloud"
    browser_use_api_key: Optional[str] = None

    @model_validator(mode='after')
    def validate_browser_config(self):
        """Validate browser execution configuration."""
        if self.browser_execution_mode == "cloud" and not self.browser_use_api_key:
            raise ValueError("BROWSER_USE_API_KEY is required when BROWSER_EXECUTION_MODE=cloud")
        if self.browser_execution_mode not in ["local", "cloud"]:
            raise ValueError(f"Invalid BROWSER_EXECUTION_MODE: {self.browser_execution_mode}. Must be 'local' or 'cloud'")
        return self

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra env vars not defined in model


@lru_cache()
def get_settings() -> Settings:
    return Settings()
