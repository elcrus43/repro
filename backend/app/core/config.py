from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Realtor CRM"
    API_V1_STR: str = "/api/v1"
    
    # Supabase / PostgreSQL
    DATABASE_URL: str = "postgresql://postgres:password@db.hxivaohzugahjyuaahxc.supabase.co:5432/postgres"
    
    # AI
    OPENAI_API_KEY: Optional[str] = None
    YANDEX_GPT_KEY: Optional[str] = None
    
    # Redis for Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
