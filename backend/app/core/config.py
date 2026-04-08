from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Realtor CRM"
    API_V1_STR: str = "/api/v1"

    # Supabase / PostgreSQL
    # ВАЖНО: Переменная DATABASE_URL должна быть установлена в .env
    # Формат: postgresql://user:password@host:port/database
    DATABASE_URL: str = Field(
        ...,
        description="URL подключения к базе данных PostgreSQL. Обязательно задайте в .env"
    )

    # AI
    OPENAI_API_KEY: Optional[str] = None
    YANDEX_GPT_KEY: Optional[str] = None

    # Redis for Celery
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="URL подключения к Redis (по умолчанию localhost)"
    )

    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
