# Aegis TelcoAI — Autonomous Telecom Customer Support Agent

An enterprise-grade, autonomous Telecom Customer Support Agent built with **FastAPI**, **LangGraph**, **RAG (Knowledge Base)**, and simulated **Telecom Operational APIs (OSS/BSS)**, designed directly from the architecture specification:

```
                         ┌─────────────────────┐
                         │      Customer       │
                         └──────────┬──────────┘
                                    ↓
                    ┌───────────────────────────┐
                    │   Web / Mobile / Chat     │
                    └────────────┬──────────────┘
                                 ↓
                    ┌───────────────────────────┐
                    │      API / Backend        │
                    │         FastAPI           │
                    └────────────┬──────────────┘
                                 ↓
                  ┌───────────────────────────────┐
                  │     AI Telecom Support Agent  │
                  │           LangGraph           │
                  └──────────────┬────────────────┘
                                 ↓
                    ┌─────────────────────────┐
                    │   Issue Understanding   │
                    │ Classification + Intent  │
                    └────────────┬────────────┘
                                 ↓
                 ┌───────────────┼────────────────┐
                 ↓               ↓                ↓
          Customer Context      RAG          Telecom APIs
                 ↓               ↓                ↓
          ┌────────────┐   ┌────────────┐   ┌─────────────┐
          │ Customer   │   │ Knowledge  │   │ Network     │
          │ Database   │   │ Base       │   │ Billing     │
          │            │   │            │   │ Account     │
          └─────┬──────┘   └─────┬──────┘   └──────┬──────┘
                └─────────────────┼─────────────────┘
                                  ↓
                         ┌─────────────────┐
                         │   LLM Reasoning │
                         └────────┬────────┘
                                  ↓
                         ┌─────────────────┐
                         │ Action / Decision│
                         └────────┬────────┘
                                  ↓
                       ┌──────────┴──────────┐
                       ↓                     ↓
                ┌──────────────┐      ┌───────────────┐
                │ Auto Resolve │      │ Human Support │
                └──────┬───────┘      └───────┬───────┘
                       └──────────┬────────────┘
                                  ↓
                         ┌─────────────────┐
                         │ Response / Ticket│
                         └────────┬────────┘
                                  ↓
                              Customer
```

---

## 🌟 Key Architecture Capabilities

1. **Web / Mobile / Chat UI**:
   - Sleek dark-mode glassmorphic dashboard with live telemetry HUD.
   - Real-time **Architecture & Reasoning Visualizer** that highlights each LangGraph node as it executes.
   - Interactive customer persona switcher & pre-configured one-click test scenarios.

2. **API / Backend (FastAPI)**:
   - High-throughput asynchronous REST API exposing conversational endpoints, customer CRM data, tickets queue, and telemetry inspectors.
   - Swagger OpenAPI interactive documentation at `http://localhost:8000/docs`.

3. **LangGraph StateGraph Workflow**:
   - **`understand_issue`**: Intent classification, sentiment analysis, urgency evaluation, and customer churn risk scoring.
   - **`fetch_customer_context`**: Pulls customer tier, plan specifications, active devices, and tenure from the **Customer Database**.
   - **`retrieve_knowledge`**: RAG semantic search across Standard Operating Procedures (SOPs), SLAs, and troubleshooting guides in the **Knowledge Base**.
   - **`query_telecom_apis`**: Live telemetry extraction from:
     - **Network API**: GPON fiber optical power (dBm), ONT LOS alarms, 5G cell tower congestion, radio bearer states.
     - **Billing API**: Current balances, itemized roaming overages, payment statuses.
     - **Account API**: Provisioned SIM/eSIM profiles, roaming feature toggles.
   - **`llm_reasoning`**: Synthesizes customer entitlement, live line diagnostics, and policy thresholds.
   - **`action_decision` (Conditional Routing)**:
     - 🚀 **Auto Resolve**: Executes automated remediations (e.g. remote OLT port hard bounce, $50 courtesy waiver credit, eSIM QR profile delivery, OTA SIM reprovisioning).
     - 🎟️ **Human Support**: Generates official incident tickets (P1/P2) with diagnostic attachments, routed to specialized queues (`NOC_TIER3_ENTERPRISE`, `TIER2_FIBER_DISPATCH`, `BILLING_SPECIALIST`).
   - **`format_response`**: Synthesizes a personalized, empathetic response with resolution details or ticket tracking reference.

4. **Multi-Model Support**:
   - Works with **Google Gemini** (`gemini-2.5-flash`), **OpenAI** (`gpt-4o-mini`), or the built-in **Deterministic Telecom Reasoning Engine** that runs 100% offline without requiring paid API keys.

---

## 🚀 Quickstart

### 1. Prerequisites
- Python 3.10+ (Tested on Python 3.12)

### 2. Environment Setup
```bash
# Clone or navigate to the workshop directory
cd "AI Agent Workshop"

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. (Optional) Configure LLM Keys
Copy `.env.example` to `.env` and insert your Gemini or OpenAI API key:
```bash
cp .env.example .env
```
*(If no API key is provided, the application automatically uses the built-in Telecom Reasoning Engine).*

### 4. Run the Application
```bash
.venv/bin/python main.py
```
Open your browser at **`http://localhost:8000`**.

---

## 🧪 Interactive Test Scenarios

The web UI includes 5 pre-configured scenarios corresponding to distinct architectural paths:

| Scenario | Customer | Issue | LangGraph Decision | Action Taken |
| :--- | :--- | :--- | :--- | :--- |
| **Fiber Red Light** | Bob Smith (`CUST-102`) | Optical LOS alarm on Nokia ONT | `AUTO_RESOLVE` | Remote OLT port hard bounce restores optical RX to -19.1 dBm |
| **Roaming Dispute** | Carlos Rodriguez (`CUST-103`) | $65 roaming charge from Mexico trip | `AUTO_RESOLVE` | Applies authorized $50 courtesy credit under VIP policy |
| **eSIM Transfer** | Elena Rostova (`CUST-104`) | New phone needs eSIM QR code | `AUTO_RESOLVE` | Issues GSMA-compliant LPA QR activation profile |
| **5G Slow Speed** | Alice Chen (`CUST-101`) | Stale radio bearer session | `AUTO_RESOLVE` | Sends OTA carrier reprovisioning signal |
| **Enterprise Outage** | David Miller (`CUST-105`) | 10Gbps leased line BGP flapping | `HUMAN_SUPPORT` | Generates P1 Incident Ticket dispatched to NOC Engineering |

---

## 📁 Project Structure

```
AI Agent Workshop/
├── app/
│   ├── __init__.py
│   ├── config.py                 # App settings & LLM configuration
│   ├── models/
│   │   ├── schemas.py            # Pydantic schemas (AgentState, ChatRequest, etc.)
│   ├── data/
│   │   ├── database.py           # Customer Database (CRM profiles)
│   │   ├── knowledge_base.py     # Telecom SOP documents (RAG corpus)
│   │   └── tickets.py            # Support ticket repository
│   ├── services/
│   │   ├── telecom_apis.py       # Simulated Telecom OSS/BSS APIs (Network, Billing, Account)
│   │   ├── rag_service.py        # Knowledge Base retrieval engine
│   │   └── llm_service.py        # Unified Gemini / OpenAI / Deterministic LLM service
│   ├── agent/
│   │   ├── state.py              # LangGraph AgentState TypedDict
│   │   ├── nodes.py              # LangGraph individual node implementations
│   │   └── graph.py              # StateGraph assembly & conditional routing
│   └── api/
│       └── routes.py             # FastAPI REST endpoints
├── static/
│   ├── index.html                # 3-column interactive operations dashboard
│   ├── css/
│   │   └── styles.css            # Dark-mode glassmorphic stylesheet
│   └── js/
│       └── app.js                # Frontend controller & real-time visualizer
├── tests/
│   └── test_agent.py             # Automated unit & integration tests
├── main.py                       # FastAPI entry point
├── requirements.txt              # Pinned dependencies
├── .env.example                  # Environment variables template
└── README.md                     # Documentation
```

---

## 🔌 API Reference

### `POST /api/chat`
Execute the full LangGraph agent pipeline.
```json
{
  "customer_id": "CUST-102",
  "message": "My fiber box has a solid red light and internet is down."
}
```

### `GET /api/customers`
Retrieve all registered demo customer accounts.

### `GET /api/tickets`
List all escalated support tickets in the queue.

### `GET /api/telecom/{category}/{customer_id}`
Inspect live telemetry for `network`, `billing`, or `account`.

### `GET /api/graph`
Returns the node and edge topology metadata of the LangGraph agent.

---

## 🧪 Running Automated Tests

```bash
.venv/bin/python -m unittest discover tests
```
All tests validate end-to-end execution of both auto-resolution and human escalation paths.
