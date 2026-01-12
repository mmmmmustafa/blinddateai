from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, chat, matching, onboarding
from app.database import engine, Base

app = FastAPI(
    title="BlindDate API",
    description="AI-powered blind dating app backend",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["Onboarding"])
app.include_router(matching.router, prefix="/api/matching", tags=["Matching"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])


@app.on_event("startup")
async def startup():
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
async def root():
    return {"message": "BlindDate API", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
