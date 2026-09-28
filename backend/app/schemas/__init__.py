"""DealIQ schemas package."""
from app.schemas.deal import (
    DealBase,
    DealCreate,
    DealRead,
    DealListItem,
    DealUpdate,
    PipelineSummary,
    DealStage,
    DealStatus,
)
from app.schemas.interaction import InteractionCreate, InteractionRead, InteractionType
from app.schemas.ai import (
    ChatRequest,
    AISection,
    AIResponse,
    CallBriefingResponse,
    FollowUpEmailResponse,
    MemoryCompareRequest,
    MemoryCompareResponse,
)

__all__ = [
    "DealBase",
    "DealCreate",
    "DealRead",
    "DealListItem",
    "DealUpdate",
    "PipelineSummary",
    "DealStage",
    "DealStatus",
    "InteractionCreate",
    "InteractionRead",
    "InteractionType",
    "ChatRequest",
    "AISection",
    "AIResponse",
    "CallBriefingResponse",
    "FollowUpEmailResponse",
    "MemoryCompareRequest",
    "MemoryCompareResponse",
]
