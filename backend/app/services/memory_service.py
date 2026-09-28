"""
DealIQ – Hindsight Memory Service
Uses the Hindsight Cloud REST API directly via httpx.
Base: https://api.hindsight.vectorize.io
"""
import logging
import httpx
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

HINDSIGHT_BASE = "https://api.hindsight.vectorize.io"
TIMEOUT = 25.0  # seconds


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.hindsight_api_key}",
        "Content-Type": "application/json",
    }


def _is_configured() -> bool:
    return bool(settings.hindsight_api_key)


def ensure_memory_bank(deal_id: int, company_name: str, deal_name: str) -> Optional[str]:
    """
    Return the Hindsight memory bank ID for this deal.
    In Hindsight Cloud, banks are auto-created on first write.
    """
    if not _is_configured():
        logger.warning("HINDSIGHT_API_KEY not configured – memory features disabled")
        return None
    return f"dealiq-deal-{deal_id}"


def retain(memory_bank_id: str, content: str) -> bool:
    """
    Store information in the deal's memory bank via Hindsight Cloud.
    POST /v1/default/banks/{bank_id}/memories
    """
    if not _is_configured():
        return False

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            payload = {
                "items": [
                    {
                        "content": content,
                        "context": "sales",
                    }
                ]
            }
            resp = client.post(
                f"{HINDSIGHT_BASE}/v1/default/banks/{memory_bank_id}/memories",
                json=payload,
                headers=_headers(),
            )
            if resp.status_code in (200, 201, 202):
                logger.info(f"Memory retained in bank {memory_bank_id}")
                return True
            else:
                logger.warning(f"Failed to retain memory: {resp.status_code} {resp.text}")
                return False
    except Exception as e:
        logger.error(f"Memory retain error: {e}")
        return False


def recall(memory_bank_id: str, query: str, top_k: int = 5) -> str:
    """
    Retrieve relevant memories from the deal's memory bank via Hindsight Cloud.
    POST /v1/default/banks/{bank_id}/memories/recall
    """
    if not _is_configured():
        return ""

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            payload = {
                "query": query,
                "budget": "mid",
            }
            resp = client.post(
                f"{HINDSIGHT_BASE}/v1/default/banks/{memory_bank_id}/memories/recall",
                json=payload,
                headers=_headers(),
            )
            if resp.status_code == 200:
                data = resp.json()
                results = (
                    data.get("results", [])
                    if isinstance(data, dict)
                    else (data if isinstance(data, list) else [])
                )
                if not results:
                    return ""

                memories = []
                for i, result in enumerate(results[:top_k], 1):
                    content = (
                        result.get("text")
                        or result.get("content")
                        or result.get("memory")
                        or str(result)
                    )
                    memories.append(f"{i}. {content}")

                return "\n".join(memories)
            else:
                logger.warning(f"Failed to recall memories: {resp.status_code} {resp.text}")
                return ""
    except Exception as e:
        logger.error(f"Memory recall error: {e}")
        return ""
