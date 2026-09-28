"""
DealIQ – Interactions API router
GET  /api/deals/{deal_id}/interactions
POST /api/deals/{deal_id}/interactions
POST /api/deals/{deal_id}/interactions/{interaction_id}/save-memory
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.interaction import InteractionCreate, InteractionRead
from app.services import deal_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["interactions"])


@router.get("/interactions/recent", response_model=List[InteractionRead])
def get_recent_interactions(
    limit: int = Query(default=10, ge=1, le=100, description="Max recent interactions to retrieve"),
    db: Session = Depends(get_db),
):
    """Retrieve recent sales interactions across all deals, ordered newest first."""
    return deal_service.get_recent_interactions(db, limit=limit)


@router.get("/interactions", response_model=List[InteractionRead])
def list_interactions(
    limit: int = Query(default=10, ge=1, le=100, description="Max interactions to retrieve"),
    db: Session = Depends(get_db),
):
    """Retrieve interactions across all deals, ordered newest first."""
    return deal_service.get_recent_interactions(db, limit=limit)


@router.get("/deals/{deal_id}/interactions", response_model=List[InteractionRead])
def get_interactions(deal_id: int, db: Session = Depends(get_db)):
    deal = deal_service.get_deal(db, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal_service.get_interactions(db, deal_id)



@router.post(
    "/deals/{deal_id}/interactions",
    response_model=InteractionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_interaction(
    deal_id: int,
    data: InteractionCreate,
    save_to_memory: bool = False,
    db: Session = Depends(get_db),
):
    deal = deal_service.get_deal(db, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    interaction = deal_service.create_interaction(
        db, deal_id, data.content, data.interaction_type
    )

    if save_to_memory:
        deal_service.save_interaction_to_memory(db, deal, interaction)

    return interaction


@router.post("/deals/{deal_id}/interactions/{interaction_id}/save-memory")
def save_to_memory(
    deal_id: int,
    interaction_id: int,
    db: Session = Depends(get_db),
):
    deal = deal_service.get_deal(db, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    from app.models.interaction import Interaction

    interaction = (
        db.query(Interaction)
        .filter(
            Interaction.id == interaction_id,
            Interaction.deal_id == deal_id,
        )
        .first()
    )
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")

    success = deal_service.save_interaction_to_memory(db, deal, interaction)

    if success:
        return {"success": True, "message": "Saved to DealIQ memory"}
    else:
        return {
            "success": False,
            "message": "Memory service unavailable. Interaction was saved to database.",
        }
