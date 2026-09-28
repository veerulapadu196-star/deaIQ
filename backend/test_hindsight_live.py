import sys
import time
import io

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.services import memory_service

bank_id = "dealiq-test-live-bank"

print(f"=== Hindsight Memory Live Integration Test ===")
print(f"Bank ID: {bank_id}")
print(f"Base URL: {memory_service.HINDSIGHT_BASE}")
print(f"Configured: {memory_service._is_configured()}\n")

test_content = (
    "[Meeting] Deal: AI Automation Platform | Company: TechNova Solutions\n"
    "Customer VP of Operations Amit Sharma confirmed: budget approved at Rs 15,00,000. "
    "Primary concern is integration with legacy SAP ECC 6.0 and tight 45-day deployment timeline."
)

print("Step 1: Storing memory via memory_service.retain()...")
retain_ok = memory_service.retain(bank_id, test_content)
print(f"Retain status: {'SUCCESS' if retain_ok else 'FAILED'}\n")

if retain_ok:
    print("Waiting 3 seconds for Hindsight indexing...")
    time.sleep(3)

    query = "What did Amit Sharma say about SAP and budget?"
    print(f"Step 2: Recalling memory with query: '{query}'...")
    recalled_text = memory_service.recall(bank_id, query, top_k=3)
    
    if recalled_text:
        print("\n--- RECALLED MEMORIES FROM HINDSIGHT ---")
        print(recalled_text)
        print("-----------------------------------------")
        print("\nHindsight Memory Test: PASSED")
    else:
        print("Recall returned empty (indexing may still be in progress). Retrying in 4 seconds...")
        time.sleep(4)
        recalled_text = memory_service.recall(bank_id, query, top_k=3)
        if recalled_text:
            print("\n--- RECALLED MEMORIES FROM HINDSIGHT ---")
            print(recalled_text)
            print("-----------------------------------------")
            print("\nHindsight Memory Test: PASSED")
        else:
            print("Hindsight Recall: No memories returned yet.")
