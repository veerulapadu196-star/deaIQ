# From First Call to Close: Building a Sales Assistant With Hindsight

Most LLM applications built on top of CRMs fail for a boring reason: models have no persistent memory across conversations, and naive retrieval-augmented generation (RAG) dumps too much irrelevant noise into the prompt. When an account executive asks a sales assistant what a prospect said about pricing three weeks ago, generic vector search often returns a generic sales deck snippet or confuses one client's objection with another's.

I built DealIQ to solve this specific failure mode. DealIQ is a sales intelligence workspace that pairs a relational operational database with isolated, deal-level long-term memory. Instead of tossing raw transcripts into a massive shared vector index, it maintains discrete memory banks per deal using Hindsight. Below is how the system is architected, the problems encountered when trying to make LLMs track evolving business context, and what I learned about stateful AI systems in production.

---

## What the System Does and How It Hangs Together

A sales deal is rarely a single transaction; it is an ongoing negotiation spanning weeks or months, dozens of calls, multiple stakeholders, and changing requirements. An assistant that only sees the latest prompt is effectively starting from scratch every single day.

DealIQ combines three core layers:

1. **Relational System of Record:** A FastAPI backend backed by SQLAlchemy tracks structured entities: company name, stage, owner, deal value, milestones, and timestamped interaction logs.
2. **Long-Term Deal Memory:** A dedicated memory bank for each deal hosted on [Hindsight](https://github.com/vectorize-io/hindsight), an open-source long-term memory engine. This engine extracts temporal facts, stakeholder associations, and objections whenever call notes or meeting summaries are submitted.
3. **Inference & Synthesis:** High-throughput LLMs via Groq (running `openai/gpt-oss-120b` with automated fallback to `qwen/qwen3-32b`) that receive structured deal state and recalled memory vectors to generate pre-call briefings, answers to ad-hoc rep questions, and follow-up emails.

Here is the operational flow:

```
[ Frontend: React + TS Workspace ]
                 │
                 ▼  REST API
   [ FastAPI Backend Services ]
         │               │
         ▼               ▼
  [ Relational DB ]  [ Hindsight Engine ]
  (Deals & Logs)     (Deal-Specific Memory Banks)
         │               │
         └───────┬───────┘
                 ▼
         [ Groq LLM Inference ]
         (Structured Markdown Output)
```

The system does not replace the CRM database. Rather, it runs alongside it. The database holds hard state (stage, dates, pipeline values), while Hindsight manages unstructured, conversational nuance.

---

## The Core Technical Challenge: Why Naive RAG Fails Enterprise Sales

When engineers first add memory to an assistant, the standard reflex is to embed every transcript chunk into Pinecone, Weaviate, or pgvector, and run cosine similarity against the user's latest query.

In practice, that architecture breaks down quickly in multi-stakeholder sales:

1. **Cross-Tenant and Cross-Deal Leakage:** If you search globally across all deals, a query like *"What did they say about budget?"* frequently retrieves high-scoring embeddings from completely unrelated customer accounts.
2. **Temporal Blindness:** Embeddings measure semantic similarity, not chronology. If a prospect said *"We have no budget"* in January, but approved ₹15,00,000 in March after a scope change, semantic search often returns both without understanding which fact supersedes the other.
3. **Prompt Bloat:** Shoveling whole call transcripts into a 128k context window incurs severe latency penalties, increases inference costs, and dilutes the model's attention.

To address this, we integrated Hindsight to treat memory as an active cognitive service rather than a passive document store. The foundation of this approach relies on modern [Vectorize agent memory](https://vectorize.io/what-is-agent-memory), where information is parsed into discrete entities, relationships, and temporal contexts before retrieval.

Instead of a single global index, every deal in DealIQ is provisioned with its own distinct memory bank ID: `dealiq-deal-{deal_id}`. Memories retained in one deal are physically impossible to retrieve in another.

---

## Code-Backed Implementation

Let's look at the actual mechanics of how this works in code.

### 1. Partitioned Memory Provisioning and Retention

When an account executive logs a discovery call or negotiation note, the system writes the record to SQLite and dispatches an asynchronous retain event to Hindsight.

Here is how `memory_service.py` handles bank provisioning and retention:

```python
def ensure_memory_bank(deal_id: int, company_name: str, deal_name: str) -> Optional[str]:
    """Return the Hindsight memory bank ID for this deal."""
    if not _is_configured():
        logger.warning("HINDSIGHT_API_KEY not configured – memory disabled")
        return None
    return f"dealiq-deal-{deal_id}"


def retain(memory_bank_id: str, content: str) -> bool:
    """Store information in the deal's memory bank via Hindsight REST API."""
    if not _is_configured():
        return False

    try:
        with httpx.Client(timeout=25.0) as client:
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
            return resp.status_code in (200, 201, 202)
    except Exception as e:
        logger.error(f"Memory retain error: {e}")
        return False
```

Notice the payload structure: we pass `"context": "sales"`. Hindsight's indexing engine analyzes the content, identifies key entities (stakeholders, deadlines, dollar amounts), and associates them with the deal bank.

### 2. Context-Aware Memory Recall with Budget Constraints

When preparing a pre-call briefing or handling a query in Copilot, we do not simply pass the raw user query to Hindsight. We query with an engineered retrieval intent and specify a retrieval budget according to the [Hindsight documentation](https://hindsight.vectorize.io/):

```python
def recall(memory_bank_id: str, query: str, top_k: int = 5) -> str:
    """Retrieve relevant memories from the deal's memory bank."""
    if not _is_configured():
        return ""

    try:
        with httpx.Client(timeout=25.0) as client:
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
                results = data.get("results", []) if isinstance(data, dict) else []
                if not results:
                    return ""

                memories = []
                for i, result in enumerate(results[:top_k], 1):
                    content = result.get("text") or result.get("content") or str(result)
                    memories.append(f"{i}. {content}")

                return "\n".join(memories)
            return ""
    except Exception as e:
        logger.error(f"Memory recall error: {e}")
        return ""
```

The `"budget": "mid"` parameter is critical. Rather than forcing the retrieval engine into an expensive exhaustive search or returning a brittle single match, it balances token retrieval depth with API response latency, returning concise, deduplicated memory statements.

### 3. Assembling the Grounded Prompt

Once memories are recalled, the AI service constructs a strictly bounded context prompt. If an interaction has occurred, the prompt includes both the database-backed metadata and the Hindsight-extracted memories:

```python
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

user_msg_parts.extend(["", f"QUESTION: {question}"])
user_message = "\n".join(user_msg_parts)
```

The system prompt enforces strict constraints:
- Answer using **ONLY** the provided deal information and memory context.
- Do not invent facts or extrapolate beyond verified interactions.
- If information is missing, explicitly state that it is unavailable.

---

## Observing the Behavior: Memory ON vs. Memory OFF

To verify that Hindsight genuinely changes model performance rather than acting as a redundant caching layer, we built a dedicated side-by-side evaluation endpoint (`/api/deals/{id}/memory-compare`).

In this test, the system executes two completions simultaneously for the same deal:
1. **Memory ON:** Prompt receives deal metadata, interaction logs, and Hindsight recalled memories.
2. **Memory OFF:** Prompt receives only high-level deal metadata (company name, stage, owner, value).

Consider a real interaction logged for an enterprise prospect, TechNova Solutions:

> *"Met with Amit Sharma (VP Operations). Confirmed budget is signed off at ₹15,00,000. Their main hesitation is integration with an on-premise SAP ECC 6.0 instance and a mandatory 45-day rollout SLA."*

We then asked the assistant: **"What are the customer's main concerns and technical risks?"**

### Response with Memory OFF
```markdown
## SUMMARY
TechNova Solutions is an active deal in the Discovery stage valued at ₹15,00,000.

## CUSTOMER CONCERNS
- Specific customer concerns have not been documented in the deal overview.

## RISKS
- Early stage risk: Without recorded discovery call notes, technical requirements and timelines remain unverified.

## RECOMMENDED NEXT STEPS
1. Schedule a discovery call with the deal owner to uncover technical requirements.
```

The model admits it knows nothing beyond the CRM header. If instructed carelessly without negative constraints, standard LLMs hallucinate plausible-sounding enterprise concerns (e.g., security, compliance) that have nothing to do with this account.

### Response with Memory ON (Hindsight)
```markdown
## SUMMARY
TechNova's primary concerns center on legacy SAP ECC 6.0 integration compatibility and meeting a strict 45-day deployment deadline, despite their ₹15,00,000 budget being approved.

## KEY FINDINGS
- Budget of ₹15,00,000 is officially approved by VP of Operations Amit Sharma.
- Existing tech stack relies on on-premise SAP ECC 6.0.

## CUSTOMER CONCERNS
- Feasibility of connecting to legacy SAP architecture without custom middleware.
- Risk of implementation slipping past the required 45-day delivery window.

## RECOMMENDED NEXT STEPS
1. Request SAP connector API specifications ahead of next week's architecture review.
2. Provide a 45-day phased implementation milestone schedule to Amit Sharma.
```

When inspecting the recalled Hindsight payload, the retrieval engine did not just regurgitate the raw paragraph. It extracted structured entity facts:

```text
1. Integration with legacy SAP ECC 6.0 and a 45-day deployment timeline are the primary concerns for the AI Automation Platform project. | When: 2026-09-28 | Involving: Amit Sharma (VP of Operations at TechNova Solutions)
2. TechNova Solutions has approved a budget of Rs 15,00,000 for the AI Automation Platform project, as confirmed by VP of Operations Amit Sharma.
```

Because Hindsight extracts who said what and associates specific dates with each commitment, the downstream LLM generates actionable, concrete recommendations without needing a 10,000-word prompt.

---

## Lessons Learned

Building an assistant that genuinely tracks multi-month conversational threads taught us several practical lessons:

### 1. Partition Memory by Domain Entity, Not User or Org
Early on, it was tempting to create a single memory bank for the entire sales team or company. That was a mistake. Reps discuss overlapping software stacks across dozens of competitors and prospects. Partitioning memory banks strictly by deal entity (`dealiq-deal-{deal_id}`) eliminated cross-talk, reduced vector search space, and guaranteed data isolation across customer accounts.

### 2. Dual-Write to Relational and Vector Stores
Do not attempt to turn your vector or memory engine into an operational database. SQLite or PostgreSQL remains the single source of truth for deal status, pipeline calculations, and user permissions. Hindsight is our memory subsystem for unstructured semantic nuances. Using relational foreign keys to link database records to memory banks gave us ACID compliance where it matters and flexible recall where it counts.

### 3. Query Synthesis Beats Raw Rep Questions
When reps ask casual questions like *"What's next?"* or *"Are they ready to sign?"*, sending that raw phrase into a vector recall engine yields mediocre results. We found that for structured workflows (such as pre-call briefings), synthesizing the recall query beforehand—e.g., querying for `"key concerns, objections, decision makers, and next steps for {company_name}"`—drastically improves retrieval quality.

### 4. Deterministic Output Formatting Prevents UI Failures
LLM output must map cleanly to web application components. We designed our system prompts to enforce markdown section headers (`## SUMMARY`, `## CUSTOMER CONCERNS`, `## RISKS`, `## RECOMMENDED NEXT STEPS`) and wrote regex parsers to transform these into typed UI cards in React. Strict formatting rules combined with low model temperature (0.2–0.3) eliminated output parsing errors completely.

---

## Conclusion

Stateless LLMs provide impressive one-off answers, but enterprise workflows demand context that survives across days and weeks. By separating operational CRM records from long-term memory banks and anchoring model prompts with Hindsight, we turned an amnesic chatbot into an assistant that sales engineers actually trust before stepping into a customer meeting.
