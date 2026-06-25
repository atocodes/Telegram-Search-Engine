"""Central configuration loaded from environment / .env."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Telegram
    tg_api_id: int = 0
    tg_api_hash: str = ""
    tg_phone: str = ""
    tg_session_string: str = ""

    # Crawl safety
    tg_min_delay_seconds: float = 4.0
    tg_jitter_seconds: float = 3.0
    tg_messages_per_channel: int = 40
    tg_max_channels_per_run: int = 50
    tg_allow_join: bool = False

    # Database
    database_url: str = ""

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"
    ollama_api_key: str = ""

    # Meilisearch
    # If meili_url is empty, search transparently falls back to Postgres FTS.
    meili_url: str = "http://localhost:7700"
    meili_master_key: str = ""
    meili_index: str = "channels"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    # Comma-separated allowed origins for CORS (the deployed frontend URL).
    # Empty = allow all (fine for local dev). Set in production.
    cors_origins: str = ""


settings = Settings()
