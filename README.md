# Telecom AI Customer Support & Service Management Platform

An enterprise-grade Telecom Customer Support Platform powered by a production-ready **FastAPI AI Agent System**, OpenAI Function Calling, strict Customer Data Isolation, a 7-Step Network Troubleshooting Engine, RAG Knowledge Retrieval, and a modern React Frontend.

---

## 🌟 Key Highlights & AI Agent Architecture

### 🤖 Core AI Agent System (`app/agent/`)

The platform's AI Agent System is designed specifically for telecom customer support and service management:

1. **Intent Routing Engine (`app/agent/intent_router.py`)**:
   - Classifies customer messages across **18 telecom-specific domains**:
     - `PLAN_INQUIRY`, `DATA_USAGE`, `RECHARGE`, `BILLING`, `NETWORK_ISSUE`, `5G_QUERY`, `SIM_SERVICES`, `ROAMING`, `VAS`, `HUMAN_ESCALATION`, `GREETING`, `ACCOUNT_INFO`, `PAYMENT_STATUS`, `COMPLAINT`, `KNOWLEDGE_QUERY`, `DEVICE_SUPPORT`, `OFFERS_PROMOTIONS`, `OUTAGE_CHECK`.
   - **Frustration & Sentiment Analysis**: Detects negative emotions, repeated complaints, and high-frustration phrases to trigger priority handling.
   - **Explicit Human Representative Detection**: Identifies requests like "agent", "human", "representative", "operator", "speak to someone" to trigger human handoff.

2. **21 Telecom Function Calling Tools (`app/agent/tools.py` & `app/agent/tool_executor.py`)**:
   - Strictly typed OpenAI JSON schemas and server-side validated execution:
     - **Plans & Tariffs**: `get_active_plan`, `get_available_plans`, `compare_plans`, `get_roaming_plans`
     - **Usage & Monitoring**: `get_data_usage`, `get_voice_usage`, `get_sms_usage`
     - **Recharge & Payments**: `get_recharge_status`, `get_recharge_history`, `initiate_recharge`
     - **Billing & Invoices**: `get_bill`, `get_bill_history`, `download_bill`
     - **SIM & eSIM**: `get_sim_details`, `check_sim_status`, `request_sim_swap`
     - **Network Diagnostics & Coverage**: `check_network_status`, `check_network_outage`, `check_5g_coverage`
     - **Support & Operations**: `create_ticket`, `escalate_to_human`

3. **Strict Customer Tenant Isolation**:
   - All tool executions enforce customer scope (`customer_id`).
   - Customers can **never** query or mutate another customer's plans, usage, SIMs, recharge history, or bills.
   - Administrative search tools (e.g., `search_customer`) are forbidden in customer chat sessions.
   - Full audit logging of all AI tool executions (`app/agent/tool_executor.py`).

4. **7-Step Guided Network Troubleshooting Engine (`app/agent/troubleshooting.py`)**:
   - State-machine driven troubleshooting flow:
     1. `DETECT_ISSUE` (Identify problem type: slow speed, call drop, no signal, latency)
     2. `OUTAGE_CHECK` (Verify regional cell tower status & active outages)
     3. `DEVICE_REBOOT` (Guide airplane mode / device restart)
     4. `SIM_VERIFICATION` (Check SIM card health & provisioning state)
     5. `APN_SETTINGS` (Check telecom Access Point Name configuration)
     6. `SPEED_TEST` (Capture latency, download/upload metrics)
     7. `RESOLUTION_OR_ESCALATION` (Resolve or auto-create priority network ticket)

5. **Retrieval-Augmented Generation (RAG) (`app/agent/rag.py`)**:
   - TF-IDF lexical and vector similarity retrieval across telecom Knowledge Base guides and FAQs.
   - Grounded context injection into system prompts to prevent hallucinations.

6. **Conversational Memory & Human Takeover Lock (`app/agent/orchestrator.py`)**:
   - Multi-turn conversation history tracking in SQLite.
   - Instant suspension of AI automatic replies once a conversation is escalated to human agents (`is_escalated = 1`).
   - Seamless deterministic offline engine fallback when external LLM API credentials are not set.

---

## 🏗️ Project Structure

```
AI Agent Workshop/
├── app/                           # FastAPI AI Agent & Telecom Backend
│   ├── main.py                    # FastAPI application, CORS & route mounting
│   ├── config.py                  # Environment settings (Pydantic Settings)
│   ├── agent/                     # 🧠 Telecom AI Agent System
│   │   ├── intent_router.py       # 18-intent classifier & frustration detector
│   │   ├── tools.py               # 21 OpenAI function schemas
│   │   ├── tool_executor.py       # Isolated execution of telecom tools
│   │   ├── troubleshooting.py     # 7-step guided network diagnostics engine
│   │   ├── rag.py                 # RAG retriever (KB & FAQs)
│   │   └── orchestrator.py        # Agent loop, LLM call, memory & takeover lock
│   ├── api/                       # API Endpoints (Uniform { data, error } envelope)
│   │   ├── auth.py                # Login, registration, token refresh
│   │   ├── chat.py                # Multi-turn chat & conversational history
│   │   ├── plans.py               # 5G/4G plans, comparisons, roaming
│   │   ├── subscriptions.py       # Active customer subscriptions
│   │   ├── usage.py               # Real-time data, voice & SMS metrics
│   │   ├── recharges.py           # Recharge processing & status
│   │   ├── bills.py               # Billing records & itemized invoices
│   │   ├── sims.py                # SIM & eSIM management & swap requests
│   │   ├── network.py             # 5G coverage, outages & speed tests
│   │   ├── tickets.py             # Support tickets & escalation
│   │   └── admin.py               # Admin dashboard, audit logs & telemetry
│   ├── core/                      # Security & Envelope Responses
│   │   ├── security.py            # JWT token validation & bcrypt password hashing
│   │   └── response.py            # Consistent { data, error } responses
│   └── data/                      # Database & Demo Data
│       ├── database.py            # SQLite connection & 16-table telecom schema
│       └── seed.py                # Seed subscribers, plans, usage, outages, KB
│
├── packages/
│   ├── api/                       # Node.js / Express reference backend
│   └── web/                       # React 18 + Vite Customer & Operations Portal
│
├── tests/                         # Pytest Suite for FastAPI & Agent
│   ├── test_agent.py              # Unit tests for tools, intent, RAG, troubleshooting
│   └── test_api.py                # Integration tests for FastAPI endpoints
│
├── requirements.txt               # Python dependencies
├── pytest.ini                     # Pytest configuration
├── package.json                   # Root scripts & workspaces
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Python**: 3.11+ or 3.12+
- **Node.js**: v18+ or v20+
- **npm**: v9+

### 2. Environment Setup

Create and configure your `.env` file in the project root:
```bash
cp .env.example .env
```

Set your OpenAI credentials in `.env` (optional - deterministic offline agent runs automatically if omitted):
```env
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
JWT_SECRET=super-secret-jwt-key-change-in-production
DATABASE_PATH=app/data/telecom.sqlite
```

### 3. Install Dependencies

**Python Dependencies:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Frontend Dependencies:**
```bash
npm install
```

### 4. Initialize & Seed Database
```bash
npm run seed:fastapi
```
*Seeds customers Alice and Bob, 6 5G tariff plans, live usage statistics, SIM/eSIM profiles, regional outages in Chennai and Pune, and KB/FAQ articles.*

### 5. Run the Application

**Run FastAPI Backend (Port 3000):**
```bash
npm run dev:fastapi
# or directly:
./.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
```

**Run React Web Portal (Port 5173):**
```bash
npm run dev:web
```

- **Customer & Admin Web App**: `http://localhost:5173`
- **FastAPI Backend & Interactive Swagger Docs**: `http://localhost:3000/docs`

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Customer ID | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Customer** | `alice@example.com` | `password123` | `cust-1` | Mumbai 5G subscriber, active data plan & usage |
| **Customer** | `bob@example.com` | `password123` | `cust-2` | Chennai subscriber, affected by regional outage |
| **Support Agent** | `sarah@company.com` | `agent123` | - | Operations agent for ticket desk |
| **Admin** | `admin@company.com` | `admin123` | - | Full administrative access & audit log review |

---

## 🧪 Testing

Run both the FastAPI test suite and the Node API test suite:
```bash
npm test
```

To run only the FastAPI AI Agent test suite:
```bash
npm run test:fastapi
```

### Verified Test Cases:
- **Tenant Isolation**: Customer 1 is forbidden from accessing Customer 2's bills, SIMs, and recharges.
- **Admin Tool Protection**: Administrative tools like `search_customer` are blocked in customer chat sessions.
- **Telecom Tools**: Active plan, live data usage, roaming packs, 5G coverage, SIM status, and bill breakdowns execute correctly.
- **Troubleshooting Engine**: 7-step guided troubleshooting transitions through steps and auto-resolves or creates tickets.
- **Frustration & Escalation**: Sentiment analysis flags frustration; human requests immediately transfer conversation and lock AI auto-reply.
- **RAG Retrieval**: Telecom queries return relevant knowledge articles and FAQs.
- **API Endpoints**: Auth, chat, plans, usage, recharges, bills, SIMs, network, tickets, and admin stats conform to `{ data, error }`.

---

## 📄 License
MIT
