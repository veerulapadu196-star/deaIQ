"""
DealIQ Pydantic Schemas – AI / Copilot / Actions
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    use_memory: bool = True


class AISection(BaseModel):
    title: str
    items: List[str] = []
    content: Optional[str] = None


class AIResponse(BaseModel):
    question: str
    summary: Optional[str] = None
    sections: List[AISection] = []
    answer_raw: str = ""
    memory_used: bool = False
    recalled_memories: Optional[str] = None
    model_used: str = ""


class CallBriefingResponse(BaseModel):
    deal_id: int
    company_name: str
    deal_name: str
    deal_value: float
    sections: List[AISection] = []
    briefing_raw: str = ""
    model_used: str = ""


class FollowUpEmailResponse(BaseModel):
    deal_id: int
    to: str
    subject: str
    body: str
    model_used: str = ""


class MemoryCompareRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class MemoryCompareResponse(BaseModel):
    question: str
    memory_on: AIResponse
    memory_off: AIResponse
