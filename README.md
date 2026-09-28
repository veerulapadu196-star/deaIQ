# DealIQ — Intelligent Sales Workspace

> *"It remembers your deals so you can focus on what happens next."*

DealIQ is an AI-powered sales workspace prototype that uses long-term memory to help sales reps retain critical deal context, prepare for upcoming calls, generate targeted follow-ups, and contrast memory-informed intelligence with generic LLM responses.

---

## Architecture Overview

```
                      DealIQ (Frontend - React + Vite + TS)
                                      │
                                      ▼
                      FastAPI Backend (app/main.py)
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
SQLite Database               Hindsight Cloud                Groq LLM
(SQLAlchemy Models)           (Vectorize Memory)      (openai/gpt-oss-120b)
- Deals                       - Banks per deal        - Fallback: qwen/qwen3-32b
- Interactions                - Retain / Recall       - Structured prompting
```

- **Frontend:** React 19, Vite, TypeScript, Lucide Icons, Vanilla CSS Design System with rich typography (Inter + JetBrains Mono) and responsive layout.
- **Backend:** Python FastAPI, Pydantic v2, SQLAlchemy ORM, SQLite for prototype development (swappable to PostgreSQL).
- **AI Engine:** Groq API (`openai/gpt-oss-120b` primary with `qwen/qwen3-32b` fallback).
- **Long-Term Memory:** Hindsight Cloud (`https://api.hindsight.vectorize.io`).
- **Currency:** Indian Rupees (`₹`) formatted with the Indian numbering system everywhere.

---

## Directory Structure

```
DealIQ/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deals.py
│   │   │   ├── interactions.py
│   │   │   ├── ai.py
│   │   │   └── health.py
│   │   ├── database/
│   │   │   ├── database.py
│   │   │   └── seed.py
│   │   ├── models/
│   │   │   ├── deal.py
│   │   │   └── interaction.py
│   │   ├── schemas/
│   │   │   ├── deal.py
│   │   │   ├── interaction.py
│   │   │   └── ai.py
│   │   ├── services/
│   │   │   ├── deal_service.py
│   │   │   ├── memory_service.py
│   │   │   ├── llm_service.py
│   │   │   └── ai_service.py
│   │   ├── config.py
│   │   └── main.py
│   ├── tests/
│   │   └── test_api.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── deals.ts
│   │   │   ├── interactions.ts
│   │   │   └── ai.ts
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── deals/
│   │   │   ├── layout/
│   │   │   └── ai/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Deals.tsx
│   │   │   ├── DealDetails.tsx
│   │   │   ├── Copilot.tsx
│   │   │   └── MemoryCompare.tsx
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
└── README.md
```

---

## Quickstart

### 1. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows (or source venv/bin/activate on Linux/Mac)
pip install -r requirements.txt
cp .env.example .env       # Configure GROQ_API_KEY & HINDSIGHT_API_KEY
python -m app.database.seed
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev                # Running on http://localhost:3000
```

### 3. Run Backend Tests

```bash
cd backend
pytest tests/test_api.py -v
```

---

## 10-Step End-to-End Workflow Demonstration

1. **Dashboard / Deals:** View seeded deals in Indian Rupees (`₹15,00,000`, `₹18,50,000`, etc.).
2. **Create Deal:** Click `+ New Deal`, enter details (Company: TechNova Solutions, Deal: AI Automation Platform, Value: ₹15,00,000, Stage: Discovery, Owner: Rahul, Next Call: 30 September).
3. **Open Deal:** Access `/deals/:id` to inspect deal metrics and previous interaction timeline.
4. **Add Interaction & Save to Memory:** Enter call notes and click `Save to Memory` to retain customer objections and requirements in Hindsight Cloud.
5. **AI Copilot:** Navigate to `/copilot`, select the deal, and ask questions (e.g., *"What are the customer's main concerns?"*).
6. **Structured AI Response:** Review structured sections: `SUMMARY`, `KEY FINDINGS`, `CUSTOMER CONCERNS`, `RISKS`, `RECOMMENDED NEXT STEPS`.
7. **Prepare for Next Call:** Click `Prepare for Next Call` to generate a comprehensive sales briefing with call objectives, questions to ask, talking points, and next steps.
8. **Follow-up Email:** Click `Generate Follow-up Email` to draft an editable email tailored to recent discussions with 1-click `[Copy]` and `[Regenerate]`.
9. **Accumulated Memory:** Record additional interactions; observe how the AI synthesizes historical context with newly provided facts.
10. **Memory Compare:** Navigate to `/memory-compare` and run side-by-side comparisons of **Memory ON** (context-aware intelligence) vs. **Memory OFF** (generic responses without deal history).
