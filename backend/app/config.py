"""
DealIQ Application Configuration
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    app_name: str = "DealIQ"
    app_env: str = "development"
    log_level: str = "INFO"

    # Database
    database_url: str = "sqlite:///./dealiq.db"

    # Groq AI
    groq_api_key: str = ""
    groq_primary_model: str = "openai/gpt-oss-120b"
    groq_fallback_model: str = "qwen/qwen3-32b"

    # Hindsight Memory
    hindsight_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
