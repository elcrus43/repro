from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from app.api.estimation import router as estimation_router
from app.api.messaging import router as messaging_router
from app.api.ai import router as ai_router
from app.api.public_property import router as public_router

load_dotenv()

app = FastAPI(title="Realtor CRM API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
