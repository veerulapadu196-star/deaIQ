"""
DealIQ – Groq LLM Service
Centralised abstraction over the Groq API.
All backend LLM calls go through this service.
"""
import logging
from typing import Optional

from groq import Groq, APIError, RateLimitError
from app.config import settings

logger = logging.getLogger(__name__)

_client: Optional[Groq] = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not configured")
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def complete(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.3,
    max_tokens: int = 2048,
) -> tuple[str, str]:
    """
    Call Groq with primary model; fall back to qwen/qwen3-32b on failure.
    Returns (response_text, model_used).
    """
    client = _get_client()
    models = [settings.groq_primary_model, settings.groq_fallback_model]

    last_error: Optional[Exception] = None
    for model in models:
        try:
            logger.info(f"LLM call → model={model}")
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            text = response.choices[0].message.content or ""
            logger.info(f"LLM response received ({len(text)} chars)")
            return text, model
        except RateLimitError as e:
            logger.warning(f"Rate limit on {model}: {e}")
            last_error = e
        except APIError as e:
            logger.warning(f"API error on {model}: {e}")
            last_error = e
        except Exception as e:
            logger.error(f"Unexpected error on {model}: {e}")
            last_error = e

    raise RuntimeError(f"All LLM models failed. Last error: {last_error}") from last_error
