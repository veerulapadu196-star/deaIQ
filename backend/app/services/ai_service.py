"""
DealIQ – AI Service
Orchestrates context building, memory retrieval, LLM calls, and structured response parsing.
"""
import re
import logging
from typing import Optional, List

from app.models.deal import Deal
from app.models.interaction import Interaction
from app.schemas.ai import (
    AISection,
    AIResponse,
    CallBriefingResponse,
    FollowUpEmailResponse,
)
from app.services import llm_service, memory_service

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# System Prompts (Strictly grounded in Deal + Memory)
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are DealIQ, an intelligent sales assistant.

Answer using ONLY the provided deal information and memory context.

RULES:
- Do not invent facts.
- If information is unavailable, clearly say that it is not available.
- Prioritize factual information from the deal and memory.
- Provide concise, actionable answers for salespeople.
- When appropriate, structure answers into:
  Summary
  Key Findings
  Customer Concerns
  Risks
  Recommended Next Steps
- Do not claim to know information that is not present.
- Currency is Indian Rupees (₹). Use Indian numbering format (e.g. ₹15,00,000).

RESPONSE FORMAT (use ## heading followed by bullets or numbered points):

## SUMMARY
Brief 1-2 sentence direct answer.

## KEY FINDINGS
- Finding 1
- Finding 2

## CUSTOMER CONCERNS
- Concern 1
- Concern 2

## RISKS
- Risk 1

## RECOMMENDED NEXT STEPS
1. Action item 1
2. Action item 2

Only include sections that are directly supported by the context."""


CALL_PREP_SYSTEM_PROMPT = """You are DealIQ, an intelligent sales assistant preparing a call briefing.

RULES:
- Use ONLY the provided deal information and memory context.
- Do not invent facts.
- Create a practical, actionable call briefing.
- Currency is Indian Rupees (₹).

OUTPUT FORMAT (strictly follow these headings):

## CALL OBJECTIVE
The primary goal for the next call.

## WHAT HAPPENED PREVIOUSLY
Summary of previous interactions and customer comments.

## CUSTOMER CONCERNS
- Concern 1
- Concern 2

## IMPORTANT PEOPLE
- Names and roles of key stakeholders/decision makers.

## QUESTIONS TO ASK
1. Question 1
2. Question 2
3. Question 3

## TALKING POINTS
- Talking point 1
- Talking point 2

## RECOMMENDED NEXT STEP
Action item to secure by end of call."""


EMAIL_SYSTEM_PROMPT = """You are DealIQ, an intelligent sales assistant generating a professional follow-up email.

RULES:
- Use ONLY the provided deal information and memory context.
- Do not invent facts.
- Write a professional, warm, and concise follow-up email.
- Reference actual discussed points, commitments, and timeline.
- Currency is Indian Rupees (₹).

OUTPUT FORMAT (strictly format like this):
TO: [Recipient name/role]
SUBJECT: [Clear, compelling subject line]
BODY:
[Email greeting]

[Paragraph acknowledging the conversation and key points discussed]

[Clear next steps / call to action]

[Professional sign-off]
[Sender name / Account Executive]"""


# ─────────────────────────────────────────────────────────────────────────────
# Parsing helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_sections(text: str) -> List[AISection]:
    """Parse markdown headings (## SECTION) into structured AISection objects."""
    sections: List[AISection] = []
    current_title: Optional[str] = None
    current_lines: List[str] = []

    for line in text.splitlines():
        header_match = re.match(r"^#{1,3}\s+(.+)$", line.strip())
        if header_match:
            if current_title:
                sections.append(_build_section(current_title, current_lines))
            current_title = header_match.group(1).strip()
            current_lines = []
        else:
            if current_title is not None:
                current_lines.append(line)

    if current_title:
        sections.append(_build_section(current_title, current_lines))

    # If no headings were parsed, create a single General section
    if not sections and text.strip():
        items = [
            l.strip().lstrip("•-*0123456789. ")
            for l in text.strip().splitlines()
            if l.strip()
        ]
        sections.append(
            AISection(
                title="Response",
                items=items if len(items) > 1 else [],
                content=text.strip() if len(items) <= 1 else None,
            )
        )

    return sections


def _build_section(title: str, lines: List[str]) -> AISection:
    raw_text = "\n".join(lines).strip()
    items: List[str] = []

    for line in lines:
        line_s = line.strip()
        if not line_s:
            continue
        bullet_match = re.match(r"^[-*•]\s+(.+)$", line_s)
        num_match = re.match(r"^\d+\.\s+(.+)$", line_s)
        if bullet_match:
            items.append(bullet_match.group(1).strip())
        elif num_match:
            items.append(num_match.group(1).strip())

    content = None if items else raw_text
    return AISection(title=title, items=items, content=content)


def _format_inr(val: float) -> str:
    int_val = int(val)
    s = str(int_val)
    if len(s) <= 3:
        return f"₹{s}"
    last3 = s[-3:]
    rest = s[:-3]
    parts = []
    for i in range(len(rest), 0, -2):
        start = max(0, i - 2)
        parts.insert(0, rest[start:i])
    return f"₹{','.join(parts)},{last3}"


def _build_deal_context(deal: Deal) -> str:
    lines = [
        f"DEAL: {deal.deal_name}",
        f"COMPANY: {deal.company_name}",
        f"VALUE: {_format_inr(deal.deal_value)}",
        f"STAGE: {deal.stage}",
        f"STATUS: {deal.status}",
        f"OWNER: {deal.owner}",
    ]
    if deal.expected_close_date:
        lines.append(f"EXPECTED CLOSE: {deal.expected_close_date.strftime('%d %B %Y')}")
    if deal.next_call_date:
        lines.append(f"NEXT CALL DATE: {deal.next_call_date.strftime('%d %B %Y')}")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# AI Actions
# ─────────────────────────────────────────────────────────────────────────────

def chat_with_deal(
    deal: Deal,
    interactions: List[Interaction],
    question: str,
    use_memory: bool = True,
) -> AIResponse:
    deal_ctx = _build_deal_context(deal)

    # Historical interactions in database
    interaction_texts = []
    for idx, it in enumerate(interactions, 1):
        interaction_texts.append(
            f"Interaction {idx} ({it.interaction_type} on {it.created_at.strftime('%d %b %Y')}):\n{it.content}"
        )
    interactions_ctx = (
        "\n\n".join(interaction_texts) if interaction_texts else "No prior interactions."
    )

    # Recalled memory from Hindsight
    recalled = ""
    if use_memory and deal.memory_bank_id:
        recalled = memory_service.recall(deal.memory_bank_id, question, top_k=5)

    user_msg_parts = [
        "=== DEAL INFORMATION ===",
        deal_ctx,
        "",
        "=== RECORDED INTERACTIONS ===",
        interactions_ctx,
    ]

    if recalled:
        user_msg_parts.extend(["", "=== RELEVANT LONG-TERM MEMORY (Hindsight) ===", recalled])
    elif use_memory:
        user_msg_parts.extend(["", "=== RELEVANT LONG-TERM MEMORY ===", "No long-term memories found."])
    else:
        user_msg_parts.extend(["", "=== MEMORY ===", "[Memory Disabled - Only Deal Information Available]"])

    user_msg_parts.extend(["", f"QUESTION: {question}"])
    user_message = "\n".join(user_msg_parts)

    raw_response, model_used = llm_service.complete(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        temperature=0.2,
    )

    sections = _parse_sections(raw_response)
    summary_text = None
    for s in sections:
        if s.title.upper() == "SUMMARY":
            summary_text = s.content or (s.items[0] if s.items else None)
            break

    return AIResponse(
        question=question,
        summary=summary_text,
        sections=sections,
        answer_raw=raw_response,
        memory_used=bool(use_memory and recalled),
        recalled_memories=recalled if recalled else None,
        model_used=model_used,
    )


def prepare_call(
    deal: Deal,
    interactions: List[Interaction],
) -> CallBriefingResponse:
    deal_ctx = _build_deal_context(deal)

    interaction_texts = []
    for idx, it in enumerate(interactions, 1):
        interaction_texts.append(
            f"Interaction {idx} ({it.interaction_type}):\n{it.content}"
        )
    interactions_ctx = (
        "\n\n".join(interaction_texts) if interaction_texts else "No prior interactions recorded."
    )

    recalled = ""
    if deal.memory_bank_id:
        recalled = memory_service.recall(
            deal.memory_bank_id,
            f"key concerns, objections, decision makers, and next steps for {deal.company_name}",
            top_k=6,
        )

    user_msg_parts = [
        "=== DEAL INFORMATION ===",
        deal_ctx,
        "",
        "=== PREVIOUS INTERACTIONS ===",
        interactions_ctx,
    ]
    if recalled:
        user_msg_parts.extend(["", "=== LONG-TERM MEMORY ===", recalled])

    user_msg_parts.extend([
        "",
        f"Prepare a comprehensive, structured Next Call Briefing for the sales rep meeting with {deal.company_name}.",
    ])
    user_message = "\n".join(user_msg_parts)

    raw_response, model_used = llm_service.complete(
        system_prompt=CALL_PREP_SYSTEM_PROMPT,
        user_message=user_message,
        temperature=0.3,
    )

    sections = _parse_sections(raw_response)

    return CallBriefingResponse(
        deal_id=deal.id,
        company_name=deal.company_name,
        deal_name=deal.deal_name,
        deal_value=deal.deal_value,
        sections=sections,
        briefing_raw=raw_response,
        model_used=model_used,
    )


def generate_follow_up_email(
    deal: Deal,
    interactions: List[Interaction],
) -> FollowUpEmailResponse:
    deal_ctx = _build_deal_context(deal)

    recent_content = "No interactions recorded yet."
    if interactions:
        last = interactions[-1]
        recent_content = f"Latest Interaction ({last.interaction_type}):\n{last.content}"

    recalled = ""
    if deal.memory_bank_id:
        recalled = memory_service.recall(
            deal.memory_bank_id,
            f"commitments, next steps, pricing, questions for {deal.company_name}",
            top_k=4,
        )

    user_msg_parts = [
        "=== DEAL INFORMATION ===",
        deal_ctx,
        "",
        "=== RECENT INTERACTION ===",
        recent_content,
    ]
    if recalled:
        user_msg_parts.extend(["", "=== KEY MEMORIES ===", recalled])

    user_msg_parts.extend([
        "",
        f"Generate a professional follow-up email from the sales executive ({deal.owner}) to the client at {deal.company_name}.",
    ])
    user_message = "\n".join(user_msg_parts)

    raw_response, model_used = llm_service.complete(
        system_prompt=EMAIL_SYSTEM_PROMPT,
        user_message=user_message,
        temperature=0.3,
    )

    # Parse TO, SUBJECT, BODY
    to_val = f"Decision Makers at {deal.company_name}"
    subject_val = f"Follow-up: {deal.company_name} & DealIQ – {deal.deal_name}"
    body_val = raw_response

    to_match = re.search(r"^TO:\s*(.+)$", raw_response, re.MULTILINE | re.IGNORECASE)
    subject_match = re.search(r"^SUBJECT:\s*(.+)$", raw_response, re.MULTILINE | re.IGNORECASE)
    body_match = re.search(r"^BODY:\s*(.+)", raw_response, re.MULTILINE | re.DOTALL | re.IGNORECASE)

    if to_match:
        to_val = to_match.group(1).strip()
    if subject_match:
        subject_val = subject_match.group(1).strip()
    if body_match:
        body_val = body_match.group(1).strip()

    return FollowUpEmailResponse(
        deal_id=deal.id,
        to=to_val,
        subject=subject_val,
        body=body_val,
        model_used=model_used,
    )


def memory_compare(
    deal: Deal,
    interactions: List[Interaction],
    question: str,
) -> tuple[AIResponse, AIResponse]:
    """
    Run the question twice:
    1. Memory ON (deal context + Hindsight memory + question)
    2. Memory OFF (deal context only + question, without historical memory)
    """
    memory_on = chat_with_deal(deal, interactions, question, use_memory=True)
    memory_off = chat_with_deal(deal, interactions=[], question=question, use_memory=False)

    return memory_on, memory_off
