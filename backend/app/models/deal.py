"""
DealIQ ORM model – Deal
"""
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import String, Float, DateTime, Date, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    deal_name: Mapped[str] = mapped_column(String(300), nullable=False)
    deal_value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    stage: Mapped[str] = mapped_column(String(100), nullable=False, default="Discovery")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Active")
    owner: Mapped[str] = mapped_column(String(150), nullable=False)
    expected_close_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    next_call_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Hindsight memory bank id for this deal
    memory_bank_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationship
    interactions: Mapped[List["Interaction"]] = relationship(  # noqa: F821
        "Interaction",
        back_populates="deal",
        cascade="all, delete-orphan",
        order_by="Interaction.created_at",
    )

    def __repr__(self) -> str:
        return f"<Deal id={self.id} company={self.company_name!r}>"
