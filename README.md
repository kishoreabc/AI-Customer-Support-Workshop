# Enterprise AI Customer Support & Operations Suite

An end-to-end, production-grade AI Customer Support Platform with an autonomous AI reasoning engine, server-side tool calling, Retrieval-Augmented Generation (RAG), strict Customer Data Isolation, and a full-featured Administrator & Support Operations Panel.

---

## 🌟 Key Features

### 🤖 Autonomous AI Support Agent
- **LLM Tool Calling**: 14 strictly typed, server-validated tools (order tracking, order cancellation, returns, ticket creation, customer profile lookup, FAQ and knowledge retrieval, escalation).
- **Customer Data Isolation**: Server-enforced boundary ensuring customers can **never** access or modify another customer's orders, tickets, or profiles. Sensitive administrative tools (`search_customer`, `update_order_status`, etc.) are prohibited for customer sessions.
- **RAG Knowledge Retrieval**: Chunked vector indexing with cosine similarity search across knowledge base guides and FAQs.
- **Real-Time Human Escalation**: Automatic sentiment/frustration analysis and explicit representative request detection. AI halts automatic responses upon human handoff.

### 👥 Customer Support Portal
- **Interactive AI Support Chat**: Real-time multi-turn conversation with active tool execution indicators and escalation alerts.
- **Order Management**: View order histories, delivery statuses, tracking numbers, and cancellation eligibility.
- **Support Tickets**: File, view, and track the status of support tickets.
- **Customer Profile**: Manage contact details and shipping addresses.

### 🛡️ Admin & Support Operations Panel
- **Operational Dashboard**: Real-time metrics for open tickets, active AI conversations, human escalations, customer statuses, and recent audit activity.
- **Customer Management**: Search, filter, inspect 360° customer profiles, orders, tickets, and conversations.
- **Order Operations**: Inspect orders, line items, and override order statuses.
- **Ticket Desk**: Assign support agents, prioritize, update resolution statuses, and add notes.
- **Knowledge Base & FAQs**: Draft, publish, edit, and vector-index customer support articles.
- **AI Engine Configuration**: Real-time hyperparameter adjustment (model selection, temperature, token limits, RAG top-K, similarity thresholds) without exposing API keys.
- **Prompt Versioning**: Immutable history of system behavior prompts with one-click rollback and deployment.
- **Security & Audit Logs**: Detailed audit trail of administrative interventions, state changes, and AI tool calls.

---

## 🏗️ Architecture & Technology Stack

```
AI Agent Workshop/
├── packages/
│   ├── api/                   # Backend Express + TypeScript Server
│   │   ├── src/
│   │   │   ├── database/      # SQLite connection (node:sqlite) & schema (17 tables)
│   │   │   ├── middleware/    # JWT Auth, strict RBAC, validation, error handler
│   │   │   ├── modules/       # Domain modules (auth, customers, orders, tickets, ai, audit, etc.)
│   │   │   ├── services/      # AI Agent, RAG vector store, tool definitions, tool executor
│   │   │   └── tests/         # Vitest security & isolation test suite
│   │   └── package.json
│   │
│   └── web/                   # Frontend React 18 + Vite SPA
│       ├── src/
│       │   ├── api/           # Centralized API client ({ data, error } unwrap)
│       │   ├── components/    # Shared design system components (DataTable, Modal, etc.)
│       │   ├── context/       # AuthContext & session management
│       │   ├── features/      # Customer & Admin feature pages
│       │   ├── layouts/       # CustomerLayout & AdminLayout
│       │   └── styles/        # Vanilla CSS design tokens & dark glassmorphism
│       └── package.json
│
├── package.json               # Monorepo npm workspaces config
└── tsconfig.base.json         # Base TypeScript configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ or v22+ recommended)
- **npm**: v9.0.0 or higher

### 2. Installation
Install all monorepo dependencies across `api` and `web`:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
PORT=3000
JWT_SECRET=super-secret-jwt-key-change-in-production
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```
*(Note: If `OPENAI_API_KEY` is not provided or set to a placeholder, the AI engine uses an internal deterministic offline reasoning engine with real SQLite tool calling, allowing full testing and demonstration without external API dependencies.)*

### 4. Database Setup & Seeding
Initialize the SQLite schema and seed the database with demo customers, products, orders, knowledge base articles, and administrators:
```bash
npm run seed
```

### 5. Running the Application
Launch both backend API and frontend Vite server concurrently:
```bash
npm run dev
```
- **Customer & Admin Portal**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000`

---

## 🔑 Demo Login Credentials

### Customer Accounts
| Role | Email | Password | Customer ID | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Customer** | `alice@example.com` | `password123` | `cust-1` | Has active orders & tickets |
| **Customer** | `bob@example.com` | `password123` | `cust-2` | Has pending orders |

### Support & Operations Accounts
| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@company.com` | `admin123` | Full administrative control, AI config & audit logs |
| **Support Agent** | `sarah@company.com` | `agent123` | Customer desk, order updates, ticket assignment |

---

## 🧪 Testing & Verification

Run the security and isolation test suite:
```bash
npm test
```

### Test Coverage Highlights:
1. Rejection of `search_customer` tool in customer chat context.
2. Cross-customer data isolation (denying access when Customer 1 queries Customer 2 orders).
3. Retrieval of own customer orders.
4. Sentiment and frustration keyword detection.
5. Detection of human representative requests.
6. Automatic escalation and halt of AI auto-reply on human takeover.

---

## 📦 Production Build

Compile both frontend and backend for production:
```bash
npm run build
```

---

## 📄 License
MIT
