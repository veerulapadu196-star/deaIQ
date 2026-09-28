"""
DealIQ – End-to-End Live Workflow Verification
Executes the exact 10 steps specified in Section 43 against the real application,
real Groq LLM (openai/gpt-oss-120b), real Hindsight Cloud Memory, and SQLite DB.
"""
import sys
import os

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Put backend on path
sys.path.insert(0, r"f:\DealIQ2\backend")

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

print("=" * 60)
print("DEALIQ LIVE END-TO-END DEMO TEST")
print("=" * 60)

print("\n--- STEP 1: Verify Health Endpoint ---")
r1 = client.get("/api/health")
print("Health status code:", r1.status_code)
print("Health response:", r1.json())
assert r1.status_code == 200
assert r1.json()["app"] == "DealIQ"
assert r1.json()["groq_configured"] is True
assert r1.json()["hindsight_configured"] is True

print("\n--- STEP 2: Create New Deal ---")
deal_payload = {
    "company_name": "TechNova Solutions",
    "deal_name": "AI Automation Platform",
    "deal_value": 1500000.0,
    "stage": "Discovery",
    "status": "Active",
    "owner": "Rahul",
    "next_call_date": "2026-09-30",
}
r2 = client.post("/api/deals", json=deal_payload)
print("Create deal status:", r2.status_code)
deal_data = r2.json()
deal_id = deal_data["id"]
print(f"Deal created: ID={deal_id}, Company='{deal_data['company_name']}', Deal='{deal_data['deal_name']}', Value=₹{deal_data['deal_value']:,.0f}")
assert r2.status_code == 201

print("\n--- STEP 3: Open Deal & Verify ---")
r3 = client.get(f"/api/deals/{deal_id}")
print("Get deal status:", r3.status_code)
d = r3.json()
print(f"Verified deal: {d['company_name']} | Stage: {d['stage']} | Owner: {d['owner']}")
assert r3.status_code == 200

print("\n--- STEP 4: Add First Interaction & Save to Memory ---")
note1 = (
    "Customer is interested in the solution but is concerned about integration with their existing systems. "
    "They need deployment within 45 days. Pricing proposal requested. CTO will join the next meeting."
)
r4 = client.post(
    f"/api/deals/{deal_id}/interactions?save_to_memory=true",
    json={"content": note1, "interaction_type": "Call"},
)
print("Add interaction status:", r4.status_code)
it1 = r4.json()
print("Interaction recorded:", it1["content"][:60], "...")
print("Memory saved in Hindsight:", it1["memory_saved"])
assert r4.status_code == 201

print("\n--- STEP 5: Open AI Copilot & Ask: What are the customer's main concerns? ---")
r5 = client.post(
    f"/api/deals/{deal_id}/chat",
    json={"question": "What are the customer's main concerns?", "use_memory": True},
)
print("AI Copilot status:", r5.status_code)
ai_chat = r5.json()
print("Model used:", ai_chat["model_used"])
print("Memory used:", ai_chat["memory_used"])
print("Summary:", ai_chat.get("summary"))
print("Sections returned:")
for sec in ai_chat.get("sections", []):
    print(f"  [{sec['title']}]")
    for item in sec.get("items", []):
        print(f"    • {item}")
    if sec.get("content"):
        print(f"    {sec['content']}")
assert r5.status_code == 200
assert len(ai_chat.get("sections", [])) > 0

print("\n--- STEP 6: Prepare for Next Call ---")
r6 = client.post(f"/api/deals/{deal_id}/prepare-call")
print("Prepare call status:", r6.status_code)
briefing = r6.json()
print("Briefing model used:", briefing["model_used"])
print("Briefing sections:")
for sec in briefing.get("sections", []):
    print(f"  [{sec['title']}]")
    for item in sec.get("items", []):
        print(f"    • {item}")
    if sec.get("content"):
        print(f"    {sec['content'][:100]}...")
assert r6.status_code == 200
assert len(briefing.get("sections", [])) > 0

print("\n--- STEP 7: Generate Follow-up Email ---")
r7 = client.post(f"/api/deals/{deal_id}/follow-up-email")
print("Follow-up email status:", r7.status_code)
email_data = r7.json()
print("To:", email_data["to"])
print("Subject:", email_data["subject"])
print("Body excerpt:\n", email_data["body"][:250], "\n...")
assert r7.status_code == 200
assert email_data["subject"] != ""
assert email_data["body"] != ""

print("\n--- STEP 8: Add Second Interaction & Save to Memory ---")
note2 = (
    "Customer confirmed that the 45-day timeline is important. "
    "The CTO wants a technical demonstration before pricing approval."
)
r8 = client.post(
    f"/api/deals/{deal_id}/interactions?save_to_memory=true",
    json={"content": note2, "interaction_type": "Meeting"},
)
print("Add interaction 2 status:", r8.status_code)
it2 = r8.json()
print("Interaction 2 memory saved:", it2["memory_saved"])
assert r8.status_code == 201

print("\n--- STEP 9: Ask AI: What changed since our previous discussion? ---")
r9 = client.post(
    f"/api/deals/{deal_id}/chat",
    json={"question": "What changed since our previous discussion?", "use_memory": True},
)
print("Accumulated context query status:", r9.status_code)
ai_q2 = r9.json()
print("Accumulated context summary:", ai_q2.get("summary"))
for sec in ai_q2.get("sections", []):
    print(f"  [{sec['title']}]: {sec.get('items', []) or sec.get('content', '')[:100]}")
assert r9.status_code == 200

print("\n--- STEP 10: Memory Compare (Memory ON vs Memory OFF) ---")
r10 = client.post(
    f"/api/deals/{deal_id}/memory-compare",
    json={"question": "What are the customer's biggest concerns?"},
)
print("Memory Compare status:", r10.status_code)
compare = r10.json()
print("MEMORY ON summary:", compare["memory_on"].get("summary"))
print("MEMORY OFF summary:", compare["memory_off"].get("summary"))
print("Memory ON sections count:", len(compare["memory_on"].get("sections", [])))
print("Memory OFF sections count:", len(compare["memory_off"].get("sections", [])))
assert r10.status_code == 200

print("\n" + "=" * 60)
print("✓ SUCCESS: ALL 10 E2E WORKFLOW DEMO STEPS PASSED PERFECTLY!")
print("=" * 60)
