"""
DealIQ ORM model – Interaction
"""
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    deal_id: Mapped[int] = mapped_column(
        ForeignKey("deals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    interaction_type: Mapped[str] = mapped_column(String(50), nullable=False, default="Call")
    # Whether this interaction was successfully saved to Hindsight memory
    memory_saved: Mapped[bool] = mapped_column(default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    # Relationship
    deal: Mapped["Deal"] = relationship("Deal", back_populates="interactions")  # noqa: F821

    @property
    def deal_name(self) -> str:
        return self.deal.deal_name if self.deal else ""

    @property
    def company_name(self) -> str:
        return self.deal.company_name if self.deal else ""

    def __repr__(self) -> str:
        return f"<Interaction id={self.id} deal_id={self.deal_id} type={self.interaction_type!r}>"
