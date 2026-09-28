"""
DealIQ – Deals API router
GET  /api/deals
POST /api/deals
GET  /api/deals/{deal_id}
PUT  /api/deals/{deal_id}
GET  /api/deals/summary
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.deal import DealCreate, DealRead, DealListItem, DealUpdate, PipelineSummary
from app.services import deal_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("", response_model=List[DealListItem])
def list_deals(db: Session = Depends(get_db)):
    return deal_service.get_all_deals(db)


@router.post("", response_model=DealRead, status_code=status.HTTP_201_CREATED)
def create_deal(data: DealCreate, db: Session = Depends(get_db)):
    try:
        deal = deal_service.create_deal(db, data)
        return deal
    except Exception as e:
        logger.error(f"Failed to create deal: {e}")
        raise HTTPException(status_code=500, detail="Failed to create deal")


@router.get("/summary", response_model=PipelineSummary)
def pipeline_summary(db: Session = Depends(get_db)):
    return deal_service.get_pipeline_summary(db)


@router.get("/{deal_id}", response_model=DealRead)
def get_deal(deal_id: int, db: Session = Depends(get_db)):
    deal = deal_service.get_deal(db, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal


@router.put("/{deal_id}", response_model=DealRead)
def update_deal(deal_id: int, data: DealUpdate, db: Session = Depends(get_db)):
    deal = deal_service.update_deal(db, deal_id, data)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal
