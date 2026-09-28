"""
DealIQ Pydantic Schemas – Interaction
"""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

InteractionType = Literal["Call", "Meeting", "Email", "Note"]


class InteractionCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    interaction_type: InteractionType = "Call"


class InteractionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    deal_id: int
    deal_name: Optional[str] = None
    company_name: Optional[str] = None
    content: str
    interaction_type: str
    memory_saved: bool
    created_at: datetime

