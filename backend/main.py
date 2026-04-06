from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
import os

load_dotenv()

from app.core.rate_limiter import limiter, AI_RATE_LIMIT, MESSAGING_RATE_LIMIT, ESTIMATION_RATE_LIMIT
from app.api.estimation import router as estimation_router
from app.api.messaging import router as messaging_router
from app.api.ai import router as ai_router
from app.api.public_property import router as public_router

# ─── CORS Configuration ───────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

# ─── Rate Limiting ────────────────────────────────────────────────
# 100 запросов в минуту на IP (базовый лимит)
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# Более строгие лимиты для дорогих операций
AI_RATE_LIMIT = "10/minute"       # AI генерация — дорого
MESSAGING_RATE_LIMIT = "30/minute" # Мессенджинг — защита от спама
ESTIMATION_RATE_LIMIT = "20/minute" # Оценка — внешний API

app = FastAPI(title="Realtor CRM API", version="1.0.0")

# Регистрируем обработчик превышения лимита
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    max_age=3600,
)

app.include_router(estimation_router, prefix="/api/v1")
app.include_router(messaging_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")
app.include_router(public_router) # Public routes without /api/v1 prefix for shorter URLs

@app.get("/")
async def root():
    return {"message": "Welcome to Realtor CRM API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
