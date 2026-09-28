"""
DealIQ Database Seeder
Seeds 5 realistic deals with realistic sales interactions into the SQLite database.
Run: python -m app.database.seed
"""
import sys
import os
import logging
from datetime import date

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database.database import SessionLocal, create_tables
from app.models.deal import Deal
from app.models.interaction import Interaction
from app.services import memory_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


SEED_DEALS = [
    {
        "company_name": "TechNova Solutions",
        "deal_name": "AI Automation Platform",
        "deal_value": 1500000.0,
        "stage": "Discovery",
        "status": "Active",
        "owner": "Rahul",
        "expected_close_date": date(2026, 12, 15),
        "next_call_date": date(2026, 10, 5),
        "interactions": [
            {
                "content": (
                    "Initial discovery call with TechNova. The VP of Operations, Amit Sharma, "
                    "showed strong interest in AI automation to reduce manual data entry. "
                    "They currently process 10,000+ invoices per month manually. "
                    "Main concern is integration with their existing SAP system. "
                    "Budget approval is with CFO – Priya Mehta. "
                    "Next step: technical team walkthrough requested."
                ),
                "interaction_type": "Call",
            }
        ],
    },
    {
        "company_name": "Acme Technologies",
        "deal_name": "Enterprise Software Suite",
        "deal_value": 1850000.0,
        "stage": "Negotiation",
        "status": "Active",
        "owner": "Priya",
        "expected_close_date": date(2026, 11, 30),
        "next_call_date": date(2026, 10, 2),
        "interactions": [
            {
                "content": (
                    "Acme's procurement team has reviewed the proposal. "
                    "They are satisfied with the feature set but are pushing for a 15% discount. "
                    "Decision makers: CEO Rajesh Kumar and CTO Deepak Nair. "
                    "They want the contract signed before end of November to meet their Q4 budget. "
                    "Main concern is data security and on-premise deployment option."
                ),
                "interaction_type": "Meeting",
            },
            {
                "content": (
                    "Follow-up call with Deepak Nair (CTO). He requested a security audit report "
                    "and a detailed SLA document. Confirmed that on-premise deployment is a hard requirement. "
                    "Willing to move forward if we can provide 99.9% uptime guarantee."
                ),
                "interaction_type": "Call",
            },
        ],
    },
    {
        "company_name": "Nova Systems",
        "deal_name": "Cloud Migration Platform",
        "deal_value": 1200000.0,
        "stage": "Proposal",
        "status": "Active",
        "owner": "Arjun",
        "expected_close_date": date(2026, 12, 31),
        "next_call_date": date(2026, 10, 8),
        "interactions": [
            {
                "content": (
                    "Nova Systems is migrating from on-premise to cloud. "
                    "They have 200TB of legacy data. Timeline: migration must complete in 6 months. "
                    "Spoke with Head of IT, Sanjay Reddy. "
                    "Currently evaluating 3 vendors including us. "
                    "Price sensitivity noted – they have a budget cap of ₹15,00,000. "
                    "Our proposal of ₹12,00,000 is competitive."
                ),
                "interaction_type": "Meeting",
            }
        ],
    },
    {
        "company_name": "Brightfield Retail",
        "deal_name": "Inventory Intelligence System",
        "deal_value": 850000.0,
        "stage": "Qualification",
        "status": "Active",
        "owner": "Priya",
        "expected_close_date": date(2027, 1, 31),
        "next_call_date": date(2026, 10, 12),
        "interactions": [
            {
                "content": (
                    "Introductory call with Brightfield's COO, Meera Joshi. "
                    "They operate 85 retail stores across 12 cities. "
                    "Current inventory system is spreadsheet-based – causing stockouts and overstocking. "
                    "AI-driven demand forecasting is their primary interest. "
                    "Meera needs to present a business case to the board before any purchase decision."
                ),
                "interaction_type": "Call",
            }
        ],
    },
    {
        "company_name": "Pinnacle Finance",
        "deal_name": "Compliance Automation Suite",
        "deal_value": 2250000.0,
        "stage": "Proposal",
        "status": "Active",
        "owner": "Rahul",
        "expected_close_date": date(2026, 11, 15),
        "next_call_date": date(2026, 9, 30),
        "interactions": [
            {
                "content": (
                    "Pinnacle Finance needs regulatory compliance automation for RBI reporting. "
                    "Currently spending 400 man-hours per month on manual compliance tasks. "
                    "Chief Compliance Officer, Vikram Singh, is the champion. "
                    "The deal has executive support from the MD. "
                    "They need GDPR + RBI data localisation compliance built in. "
                    "Proposal sent. Awaiting feedback from their legal team."
                ),
                "interaction_type": "Email",
            },
            {
                "content": (
                    "Legal team review complete. Two questions raised: "
                    "1. Data residency – all data must remain in India. "
                    "2. Audit trail – need 7-year immutable logs. "
                    "Both requirements are feasible on our platform. "
                    "Vikram confirmed that if we address these in a revised proposal, "
                    "they can sign before November 15th."
                ),
                "interaction_type": "Call",
            },
        ],
    },
]


def seed():
    logger.info("Starting DealIQ database seeding...")
    create_tables()
    db = SessionLocal()

    try:
        existing = db.query(Deal).count()
        if existing > 0:
            logger.info(f"Database already has {existing} deals. Skipping seed.")
            return

        for deal_data in SEED_DEALS:
            interactions_data = deal_data.pop("interactions", [])

            deal = Deal(**deal_data)
            db.add(deal)
            db.flush()

            # Provision Hindsight memory bank
            bank_id = memory_service.ensure_memory_bank(
                deal.id, deal.company_name, deal.deal_name
            )
            if bank_id:
                deal.memory_bank_id = bank_id

            for idata in interactions_data:
                interaction = Interaction(
                    deal_id=deal.id,
                    content=idata["content"],
                    interaction_type=idata["interaction_type"],
                    memory_saved=False,
                )
                db.add(interaction)
                db.flush()

                # Sync with Hindsight memory
                if bank_id:
                    memory_content = (
                        f"[{interaction.interaction_type}] "
                        f"Deal: {deal.deal_name} | Company: {deal.company_name}\n"
                        f"{interaction.content}"
                    )
                    success = memory_service.retain(bank_id, memory_content)
                    if success:
                        interaction.memory_saved = True

            logger.info(f"  ✓ Seeded deal: {deal.company_name} – {deal.deal_name}")

        db.commit()
        logger.info("Database seeding complete: 5 realistic deals created.")

    except Exception as e:
        db.rollback()
        logger.error(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
