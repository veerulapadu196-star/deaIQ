"""
DealIQ Pydantic Schemas – Deal
"""
from datetime import datetime, date
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict

DealStage = Literal[
    "Discovery",
    "Qualification",
    "Proposal",
    "Negotiation",
    "Closed Won",
    "Closed Lost",
]

DealStatus = Literal["Active", "On Hold", "Closed"]


class DealBase(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=200)
    deal_name: str = Field(..., min_length=1, max_length=300)
    deal_value: float = Field(..., ge=0, description="Deal value in INR (₹)")
    stage: DealStage = "Discovery"
    status: DealStatus = "Active"
    owner: str = Field(..., min_length=1, max_length=150)
    expected_close_date: Optional[date] = None
    next_call_date: Optional[date] = None


class DealCreate(DealBase):
    pass


class DealUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=200)
    deal_name: Optional[str] = Field(None, min_length=1, max_length=300)
    deal_value: Optional[float] = Field(None, ge=0)
    stage: Optional[DealStage] = None
    status: Optional[DealStatus] = None
    owner: Optional[str] = Field(None, min_length=1, max_length=150)
    expected_close_date: Optional[date] = None
    next_call_date: Optional[date] = None


class DealListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    deal_name: str
    deal_value: float
    stage: str
    status: str
    owner: str
    expected_close_date: Optional[date] = None
    next_call_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime


from app.schemas.interaction import InteractionRead


class DealRead(DealBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    memory_bank_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    interactions: List[InteractionRead] = []


DealRead.model_rebuild()


class PipelineSummary(BaseModel):
    total_pipeline_value: float
    active_deals: int
    deals_needing_attention: int
    total_deals: int

