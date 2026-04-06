"""
Rate limiting configuration for the FastAPI app.
Separated to avoid circular imports.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Базовый лимит: 100 запросов в минуту на IP
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# Более строгие лимиты для дорогих операций
AI_RATE_LIMIT = "10/minute"         # AI генерация — дорого
MESSAGING_RATE_LIMIT = "30/minute"  # Мессенджинг — защита от спама
ESTIMATION_RATE_LIMIT = "20/minute" # Оценка — внешний API
PUBLIC_PAGE_RATE_LIMIT = "60/minute" # Публичные страницы
