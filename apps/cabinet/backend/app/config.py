"""
Cabinet Configuration Module
Loads environment variables and provides typed configuration settings.
"""

from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    app_name: str = "Cabinet"
    environment: str = "development"
    debug: bool = False
    port: int = 5002
    
    # JWT Authentication (MUST match py.raysourcelabs.com)
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # Cabinet Database (business data)
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "cabinet_db"
    database_user: str = "andora_user"
    database_password: str
    
    # Auth Database (shared with py.raysourcelabs.com)
    auth_database_name: str = "andora_db"
    
    # AI Services
    openai_api_key: str
    anthropic_api_key: Optional[str] = None
    
    # AI Models
    whisper_model: str = "whisper-1"
    embedding_model: str = "text-embedding-ada-002"
    embedding_dimensions: int = 1536
    analysis_model: str = "gpt-4o"
    
    # Text Chunking
    chunk_size: int = 1000
    chunk_overlap: int = 200
    
    # File Upload
    upload_dir: str = "/var/www/cabinet/backend/uploads"
    max_upload_size_mb: int = 500
    allowed_audio_extensions: List[str] = ["mp3", "wav", "m4a", "ogg", "flac", "webm"]
    allowed_video_extensions: List[str] = ["mp4", "mov", "avi", "mkv", "webm"]
    
    # CORS
    cors_origins: str = "https://cabinet.raysourcelabs.com,https://py.raysourcelabs.com"
    
    # Logging
    log_level: str = "INFO"
    log_file: str = "/var/www/cabinet/logs/cabinet.log"
    
    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60
    
    @property
    def cabinet_database_url(self) -> str:
        """SQLAlchemy database URL for cabinet_db."""
        return (
            f"postgresql://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )
    
    @property
    def cabinet_async_database_url(self) -> str:
        """Async SQLAlchemy database URL for cabinet_db."""
        return (
            f"postgresql+asyncpg://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )
    
    @property
    def auth_database_url(self) -> str:
        """SQLAlchemy database URL for andora_db (auth)."""
        return (
            f"postgresql://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.auth_database_name}"
        )
    
    @property
    def auth_async_database_url(self) -> str:
        """Async SQLAlchemy database URL for andora_db (auth)."""
        return (
            f"postgresql+asyncpg://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.auth_database_name}"
        )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def max_upload_size_bytes(self) -> int:
        """Max upload size in bytes."""
        return self.max_upload_size_mb * 1024 * 1024
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Use lru_cache to ensure settings are only loaded once.
    """
    return Settings()


# Convenience function for dependency injection
settings = get_settings()
