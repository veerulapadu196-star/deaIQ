"""
DealIQ – AI/Chat API router
POST /api/deals/{deal_id}/chat
POST /api/deals/{deal_id}/prepare-call
POST /api/deals/{deal_id}/follow-up-email
POST /api/deals/{deal_id}/memory-compare
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.ai import (
    ChatRequest,
    AIResponse,
    CallBriefingResponse,
    FollowUpEmailResponse,
    MemoryCompareRequest,
    MemoryCompareResponse,
)
from app.services import deal_service, ai_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ai"])


def _get_deal_or_404(deal_id: int, db: Session):
    deal = deal_service.get_deal(db, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal


@router.post("/deals/{deal_id}/chat", response_model=AIResponse)
def chat_about_deal(
    deal_id: int,
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    deal = _get_deal_or_404(deal_id, db)
    interactions = deal_service.get_interactions(db, deal_id)

    try:
        return ai_service.chat_with_deal(
            deal, interactions, request.question, request.use_memory
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Chat error for deal {deal_id}: {e}")
        raise HTTPException(status_code=500, detail="AI service encountered an error")


@router.post("/deals/{deal_id}/prepare-call", response_model=CallBriefingResponse)
def prepare_call(
    deal_id: int,
    db: Session = Depends(get_db),
):
    deal = _get_deal_or_404(deal_id, db)
    interactions = deal_service.get_interactions(db, deal_id)

    try:
        return ai_service.prepare_call(deal, interactions)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Prepare-call error for deal {deal_id}: {e}")
        raise HTTPException(status_code=500, detail="AI service encountered an error")


@router.post("/deals/{deal_id}/follow-up-email", response_model=FollowUpEmailResponse)
def follow_up_email(
    deal_id: int,
    db: Session = Depends(get_db),
):
    deal = _get_deal_or_404(deal_id, db)
    interactions = deal_service.get_interactions(db, deal_id)

    try:
        return ai_service.generate_follow_up_email(deal, interactions)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Email generation error for deal {deal_id}: {e}")
        raise HTTPException(status_code=500, detail="AI service encountered an error")


@router.post("/deals/{deal_id}/memory-compare", response_model=MemoryCompareResponse)
def memory_compare(
    deal_id: int,
    request: MemoryCompareRequest,
    db: Session = Depends(get_db),
):
    deal = _get_deal_or_404(deal_id, db)
    interactions = deal_service.get_interactions(db, deal_id)

    try:
        memory_on, memory_off = ai_service.memory_compare(
            deal, interactions, request.question
        )
        return MemoryCompareResponse(
            question=request.question,
            memory_on=memory_on,
            memory_off=memory_off,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Memory-compare error for deal {deal_id}: {e}")
        raise HTTPException(status_code=500, detail="AI service encountered an error")
