"""DealIQ API package."""
from app.api.deals import router as deals_router
from app.api.interactions import router as interactions_router
from app.api.ai import router as ai_router

__all__ = ["deals_router", "interactions_router", "ai_router"]
