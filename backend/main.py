from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx
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
# Configuration is imported from app.core.rate_limiter

app = FastAPI(title="Realtor CRM API", version="1.0.0")

# Регистрируем обработчик превышения лимита
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    max_age=3600,
)

app.include_router(estimation_router, prefix="/api/v1")
app.include_router(messaging_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")
app.include_router(public_router) # Public routes without /api/v1 prefix for shorter URLs

@app.api_route("/supabase-proxy/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def supabase_proxy(path: str, request: Request):
    target_url = f"https://hxivaohzugahjyuaahxc.supabase.co/{path}"
    if request.url.query:
        target_url += f"?{request.url.query}"
    
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("origin", None)
    headers.pop("referer", None)
    
    body = await request.body()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body
        )
        
        response = Response(content=res.content, status_code=res.status_code)
        for k, v in res.headers.items():
            if k.lower() not in ["transfer-encoding", "content-length", "content-encoding"]:
                response.headers[k] = v
        return response

@app.get("/")
async def root():
    return {"message": "Welcome to Realtor CRM API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
