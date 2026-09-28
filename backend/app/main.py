"""
DealIQ – FastAPI Application Entry Point
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database.database import create_tables
from app.api.deals import router as deals_router
from app.api.interactions import router as interactions_router
from app.api.ai import router as ai_router

logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: create tables on startup."""
    logger.info("DealIQ backend starting...")
    create_tables()
    logger.info("Database tables ready.")
    yield
    logger.info("DealIQ backend shutting down.")


app = FastAPI(
    title="DealIQ API",
    description="Intelligent Sales Workspace – Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routes ──────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(deals_router, prefix=API_PREFIX)
app.include_router(interactions_router, prefix=API_PREFIX)
app.include_router(ai_router, prefix=API_PREFIX)


# ─── Health ──────────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["health"])
def health():
    return {
        "status": "ok",
        "app": "DealIQ",
        "version": "1.0.0",
        "groq_configured": bool(settings.groq_api_key),
        "hindsight_configured": bool(settings.hindsight_api_key),
    }


# ─── Global error handler ────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": True, "message": "An unexpected error occurred"},
    )
