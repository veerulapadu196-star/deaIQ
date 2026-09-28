"""
DealIQ – Deal & Interaction Database Service
"""
import logging
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.deal import Deal
from app.models.interaction import Interaction
from app.schemas.deal import DealCreate, DealUpdate, PipelineSummary
from app.services import memory_service

logger = logging.getLogger(__name__)



def get_deal(db: Session, deal_id: int) -> Optional[Deal]:
    return db.query(Deal).filter(Deal.id == deal_id).first()


def get_all_deals(db: Session) -> List[Deal]:
    return db.query(Deal).order_by(Deal.updated_at.desc()).all()


def create_deal(db: Session, data: DealCreate) -> Deal:
    deal = Deal(
        company_name=data.company_name,
        deal_name=data.deal_name,
        deal_value=data.deal_value,
        stage=data.stage,
        status=data.status,
        owner=data.owner,
        expected_close_date=data.expected_close_date,
        next_call_date=data.next_call_date,
    )
    db.add(deal)
    db.flush()

    # Automatically initialize memory bank
    bank_id = memory_service.ensure_memory_bank(
        deal.id, deal.company_name, deal.deal_name
    )
    if bank_id:
        deal.memory_bank_id = bank_id

    db.commit()
    db.refresh(deal)
    logger.info(f"Created deal {deal.id}: {deal.company_name} – {deal.deal_name}")
    return deal


def update_deal(db: Session, deal_id: int, data: DealUpdate) -> Optional[Deal]:
    deal = get_deal(db, deal_id)
    if not deal:
        return None

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(deal, field, value)

    db.commit()
    db.refresh(deal)
    return deal


def get_pipeline_summary(db: Session) -> PipelineSummary:
    total_val = (
        db.query(func.sum(Deal.deal_value))
        .filter(Deal.status == "Active")
        .scalar()
        or 0.0
    )
    active_count = db.query(Deal).filter(Deal.status == "Active").count()
    total_count = db.query(Deal).count()

    # Deals needing attention: Active deals in Discovery stage or with no next call date
    needing_attention = (
        db.query(Deal)
        .filter(
            Deal.status == "Active",
            (Deal.stage == "Discovery") | (Deal.next_call_date.is_(None)),
        )
        .count()
    )

    return PipelineSummary(
        total_pipeline_value=float(total_val),
        active_deals=active_count,
        deals_needing_attention=needing_attention,
        total_deals=total_count,
    )


def create_interaction(
    db: Session,
    deal_id: int,
    content: str,
    interaction_type: str = "Call",
) -> Interaction:
    interaction = Interaction(
        deal_id=deal_id,
        content=content,
        interaction_type=interaction_type,
        memory_saved=False,
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    logger.info(f"Created interaction {interaction.id} for deal {deal_id}")
    return interaction


def get_interactions(db: Session, deal_id: int) -> List[Interaction]:
    return (
        db.query(Interaction)
        .options(joinedload(Interaction.deal))
        .filter(Interaction.deal_id == deal_id)
        .order_by(Interaction.created_at.asc())
        .all()
    )


def get_recent_interactions(db: Session, limit: int = 10) -> List[Interaction]:
    """Retrieve recent sales interactions across all deals, newest first."""
    return (
        db.query(Interaction)
        .options(joinedload(Interaction.deal))
        .order_by(Interaction.created_at.desc(), Interaction.id.desc())
        .limit(limit)
        .all()
    )




def save_interaction_to_memory(
    db: Session,
    deal: Deal,
    interaction: Interaction,
) -> bool:
    """Store an interaction into Hindsight Cloud and mark as saved."""
    bank_id = deal.memory_bank_id
    if not bank_id:
        bank_id = memory_service.ensure_memory_bank(
            deal.id, deal.company_name, deal.deal_name
        )
        if bank_id:
            deal.memory_bank_id = bank_id
            db.commit()

    if not bank_id:
        return False

    memory_content = (
        f"[{interaction.interaction_type}] "
        f"Deal: {deal.deal_name} | Company: {deal.company_name}\n"
        f"{interaction.content}"
    )

    success = memory_service.retain(bank_id, memory_content)
    if success:
        interaction.memory_saved = True
        db.commit()
        db.refresh(interaction)
        logger.info(f"Interaction {interaction.id} saved to memory bank {bank_id}")

    return success
