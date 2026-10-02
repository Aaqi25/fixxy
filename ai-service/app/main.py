"""FIXXY Brain — FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings


app = FastAPI(
    title="FIXXY Brain",
    description=(
        "AI Tutor Brain for FIXXY — misconception classification, "
        "teaching strategy selection, and personalized tutoring."
    ),
    version="0.1.0",
)

# CORS — allow Node.js backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes at both root and /api/v1
app.include_router(router)
app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.service_name,
        "version": "0.1.0",
    }
