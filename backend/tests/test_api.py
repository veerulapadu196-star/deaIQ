"""
DealIQ – Backend API Test Suite
Covers: Health, Deal CRUD, Interactions, Pipeline Summary, AI mock/fallback, Error handling.
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database.database import Base, get_db
from app.models.deal import Deal
from app.models.interaction import Interaction

from sqlalchemy.pool import StaticPool

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


# ─── Health ───────────────────────────────────────────────────────────────────

def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "DealIQ"
    assert "groq_configured" in data
    assert "hindsight_configured" in data


# ─── Deal CRUD ────────────────────────────────────────────────────────────────

def test_create_deal(client):
    payload = {
        "company_name": "TechNova Solutions",
        "deal_name": "AI Automation Platform",
        "deal_value": 1500000.0,
        "stage": "Discovery",
        "status": "Active",
        "owner": "Rahul",
        "expected_close_date": "2026-12-15",
        "next_call_date": "2026-10-05",
    }
    response = client.post("/api/deals", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["company_name"] == "TechNova Solutions"
    assert data["deal_name"] == "AI Automation Platform"
    assert data["deal_value"] == 1500000.0
    assert data["stage"] == "Discovery"
    assert data["owner"] == "Rahul"
    assert data["id"] is not None


def test_list_deals(client):
    client.post("/api/deals", json={
        "company_name": "Acme Technologies",
        "deal_name": "Enterprise Suite",
        "deal_value": 1850000.0,
        "stage": "Negotiation",
        "status": "Active",
        "owner": "Priya",
    })
    response = client.get("/api/deals")
    assert response.status_code == 200
    deals = response.json()
    assert len(deals) >= 1
    assert deals[0]["company_name"] == "Acme Technologies"


def test_get_deal(client):
    create_resp = client.post("/api/deals", json={
        "company_name": "Nova Systems",
        "deal_name": "Cloud Platform",
        "deal_value": 1200000.0,
        "stage": "Proposal",
        "status": "Active",
        "owner": "Arjun",
    })
    deal_id = create_resp.json()["id"]

    response = client.get(f"/api/deals/{deal_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == deal_id
    assert data["company_name"] == "Nova Systems"


def test_get_deal_not_found(client):
    response = client.get("/api/deals/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Deal not found"


def test_create_deal_validation_error(client):
    # Missing required field company_name
    payload = {
        "deal_name": "Cloud Platform",
        "deal_value": 1200000.0,
        "stage": "Proposal",
        "owner": "Arjun",
    }
    response = client.post("/api/deals", json=payload)
    assert response.status_code == 422


def test_pipeline_summary(client):
    client.post("/api/deals", json={
        "company_name": "Deal 1",
        "deal_name": "Product 1",
        "deal_value": 1000000.0,
        "stage": "Discovery",
        "status": "Active",
        "owner": "Rahul",
    })
    client.post("/api/deals", json={
        "company_name": "Deal 2",
        "deal_name": "Product 2",
        "deal_value": 2000000.0,
        "stage": "Proposal",
        "status": "Active",
        "owner": "Priya",
        "next_call_date": "2026-10-10",
    })

    response = client.get("/api/deals/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_pipeline_value"] == 3000000.0
    assert data["active_deals"] == 2
    assert data["deals_needing_attention"] >= 1


# ─── Interactions ─────────────────────────────────────────────────────────────

def test_create_interaction(client):
    deal_resp = client.post("/api/deals", json={
        "company_name": "Brightfield Retail",
        "deal_name": "Inventory Intelligence",
        "deal_value": 850000.0,
        "stage": "Qualification",
        "status": "Active",
        "owner": "Priya",
    })
    deal_id = deal_resp.json()["id"]

    payload = {
        "content": "Customer is interested but concerned about timeline.",
        "interaction_type": "Call",
    }
    response = client.post(f"/api/deals/{deal_id}/interactions", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["deal_id"] == deal_id
    assert "concerned about timeline" in data["content"]
    assert data["interaction_type"] == "Call"


def test_list_interactions(client):
    deal_resp = client.post("/api/deals", json={
        "company_name": "Pinnacle Finance",
        "deal_name": "Compliance Automation",
        "deal_value": 2250000.0,
        "stage": "Proposal",
        "status": "Active",
        "owner": "Rahul",
    })
    deal_id = deal_resp.json()["id"]

    client.post(f"/api/deals/{deal_id}/interactions", json={
        "content": "First call notes.",
        "interaction_type": "Call",
    })
    client.post(f"/api/deals/{deal_id}/interactions", json={
        "content": "Second meeting notes.",
        "interaction_type": "Meeting",
    })

    response = client.get(f"/api/deals/{deal_id}/interactions")
    assert response.status_code == 200
    interactions = response.json()
    assert len(interactions) == 2
    assert interactions[0]["content"] == "First call notes."
    assert interactions[1]["content"] == "Second meeting notes."


def test_interaction_for_nonexistent_deal(client):
    response = client.post("/api/deals/9999/interactions", json={
        "content": "Some note",
        "interaction_type": "Call",
    })
    assert response.status_code == 404


def test_create_interaction_with_memory(client):
    deal_resp = client.post("/api/deals", json={
        "company_name": "Alpha Corp",
        "deal_name": "CRM Solution",
        "deal_value": 500000.0,
        "stage": "Discovery",
        "status": "Active",
        "owner": "Rahul",
    })
    deal_id = deal_resp.json()["id"]

    with patch("app.services.memory_service.retain", return_value=True):
        response = client.post(
            f"/api/deals/{deal_id}/interactions?save_to_memory=true",
            json={"content": "Important note to remember.", "interaction_type": "Call"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["memory_saved"] is True


def test_get_recent_interactions_empty(client):
    response = client.get("/api/interactions/recent")
    assert response.status_code == 200
    assert response.json() == []


def test_get_recent_interactions_ordering_and_context(client):
    # Create two deals
    deal1_resp = client.post("/api/deals", json={
        "company_name": "TechCorp",
        "deal_name": "Cloud Infra",
        "deal_value": 1000000.0,
        "stage": "Discovery",
        "status": "Active",
        "owner": "Rahul",
    })
    deal1_id = deal1_resp.json()["id"]

    deal2_resp = client.post("/api/deals", json={
        "company_name": "BioHealth",
        "deal_name": "Data Analytics",
        "deal_value": 2000000.0,
        "stage": "Proposal",
        "status": "Active",
        "owner": "Priya",
    })
    deal2_id = deal2_resp.json()["id"]

    # Add 3 interactions
    client.post(f"/api/deals/{deal1_id}/interactions", json={
        "content": "First note for TechCorp.",
        "interaction_type": "Call",
    })
    client.post(f"/api/deals/{deal2_id}/interactions", json={
        "content": "Second note for BioHealth.",
        "interaction_type": "Meeting",
    })
    client.post(f"/api/deals/{deal1_id}/interactions", json={
        "content": "Third note for TechCorp.",
        "interaction_type": "Email",
    })

    response = client.get("/api/interactions/recent?limit=2")
    assert response.status_code == 200
    recent = response.json()
    assert len(recent) == 2
    # Newest first
    assert recent[0]["content"] == "Third note for TechCorp."
    assert recent[0]["deal_name"] == "Cloud Infra"
    assert recent[0]["company_name"] == "TechCorp"
    assert recent[0]["interaction_type"] == "Email"

    assert recent[1]["content"] == "Second note for BioHealth."
    assert recent[1]["deal_name"] == "Data Analytics"
    assert recent[1]["company_name"] == "BioHealth"
    assert recent[1]["interaction_type"] == "Meeting"



# ─── AI Endpoints ─────────────────────────────────────────────────────────────

def test_chat_ai(client):
    deal_resp = client.post("/api/deals", json={
        "company_name": "TechNova Solutions",
        "deal_name": "AI Platform",
        "deal_value": 1500000.0,
        "stage": "Discovery",
        "status": "Active",
        "owner": "Rahul",
    })
    deal_id = deal_resp.json()["id"]

    mock_llm_response = (
        "## SUMMARY\n"
        "TechNova is looking for AI automation.\n\n"
        "## CUSTOMER CONCERNS\n"
        "- SAP integration\n"
        "- 45-day deployment timeline\n\n"
        "## RECOMMENDED NEXT STEPS\n"
        "1. Confirm technical specs with CTO\n"
        "2. Submit revised proposal"
    )

    with patch("app.services.llm_service.complete", return_value=(mock_llm_response, "openai/gpt-oss-120b")):
        response = client.post(
            f"/api/deals/{deal_id}/chat",
            json={"question": "What are the customer concerns?", "use_memory": True},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["question"] == "What are the customer concerns?"
        assert data["summary"] == "TechNova is looking for AI automation."
        assert len(data["sections"]) >= 2
        titles = [s["title"].upper() for s in data["sections"]]
        assert "CUSTOMER CONCERNS" in titles
        assert "RECOMMENDED NEXT STEPS" in titles


def test_prepare_call_ai(client):
    deal_resp = client.post("/api/deals", json={
        "company_name": "TechNova",
        "deal_name": "AI Platform",
        "deal_value": 1500000.0,
        "stage": "Discovery",
        "status": "Active",
        "owner": "Rahul",
    })
    deal_id = deal_resp.json()["id"]

    mock_briefing = (
        "## CALL OBJECTIVE\n"
        "Validate SAP integration feasibility.\n\n"
        "## QUESTIONS TO ASK\n"
        "1. Which SAP modules are in scope?\n"
        "2. Who is signing off on budget?"
    )

    with patch("app.services.llm_service.complete", return_value=(mock_briefing, "openai/gpt-oss-120b")):
        response = client.post(f"/api/deals/{deal_id}/prepare-call")
        assert response.status_code == 200
        data = response.json()
        assert data["deal_id"] == deal_id
        assert data["company_name"] == "TechNova"
        assert len(data["sections"]) >= 1


def test_follow_up_email_ai(client):
    deal_resp = client.post("/api/deals", json={
        "company_name": "TechNova",
        "deal_name": "AI Platform",
        "deal_value": 1500000.0,
        "stage": "Discovery",
        "status": "Active",
        "owner": "Rahul",
    })
    deal_id = deal_resp.json()["id"]

    mock_email = (
        "TO: Amit Sharma (VP Operations)\n"
        "SUBJECT: Following up on our AI Automation discussion\n"
        "BODY:\n"
        "Dear Amit,\n\n"
        "Thank you for taking the time to speak today.\n\n"
        "Best regards,\nRahul"
    )

    with patch("app.services.llm_service.complete", return_value=(mock_email, "openai/gpt-oss-120b")):
        response = client.post(f"/api/deals/{deal_id}/follow-up-email")
        assert response.status_code == 200
        data = response.json()
        assert data["deal_id"] == deal_id
        assert "Amit" in data["to"]
        assert "Following up" in data["subject"]
        assert "Dear Amit" in data["body"]


def test_memory_compare_ai(client):
    deal_resp = client.post("/api/deals", json={
        "company_name": "TechNova",
        "deal_name": "AI Platform",
        "deal_value": 1500000.0,
        "stage": "Discovery",
        "status": "Active",
        "owner": "Rahul",
    })
    deal_id = deal_resp.json()["id"]

    mock_mem_on = "## SUMMARY\nWith memory: Customer has SAP concerns."
    mock_mem_off = "## SUMMARY\nWithout memory: Deal is in Discovery."

    with patch("app.services.llm_service.complete", side_effect=[
        (mock_mem_on, "openai/gpt-oss-120b"),
        (mock_mem_off, "openai/gpt-oss-120b"),
    ]):
        response = client.post(
            f"/api/deals/{deal_id}/memory-compare",
            json={"question": "What are the customer concerns?"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["question"] == "What are the customer concerns?"
        assert data["memory_on"]["summary"] == "With memory: Customer has SAP concerns."
        assert data["memory_off"]["summary"] == "Without memory: Deal is in Discovery."


# ─── Error Handling ───────────────────────────────────────────────────────────

def test_invalid_stage(client):
    response = client.post("/api/deals", json={
        "company_name": "Bad Stage Co",
        "deal_name": "Bad Stage Deal",
        "deal_value": 100000.0,
        "stage": "NonExistentStage",
        "owner": "Tester",
    })
    assert response.status_code == 422


def test_negative_deal_value(client):
    response = client.post("/api/deals", json={
        "company_name": "Negative Value Co",
        "deal_name": "Negative Value Deal",
        "deal_value": -5000.0,
        "stage": "Discovery",
        "owner": "Tester",
    })
    assert response.status_code == 422


def test_empty_interaction_content(client):
    deal_resp = client.post("/api/deals", json={
        "company_name": "Test Co",
        "deal_name": "Test Deal",
        "deal_value": 100000.0,
        "stage": "Discovery",
        "owner": "Tester",
    })
    deal_id = deal_resp.json()["id"]

    response = client.post(f"/api/deals/{deal_id}/interactions", json={
        "content": "",
        "interaction_type": "Call",
    })
    assert response.status_code == 422
