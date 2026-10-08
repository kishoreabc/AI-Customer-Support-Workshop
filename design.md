# Design — AI Customer Support Agent

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite + React)                 │
│  ┌──────────────────┐          ┌──────────────────────────┐     │
│  │  Customer App    │          │     Admin Panel           │     │
│  │  /chat           │          │     /admin/*              │     │
│  │  /conversations  │          │     Dashboard, CRUD,      │     │
│  │  /orders         │          │     AI Config, Audit Logs │     │
│  │  /tickets        │          │                           │     │
│  │  /profile        │          │                           │     │
│  └────────┬─────────┘          └────────────┬─────────────┘     │
└───────────┼──────────────────────────────────┼──────────────────┘
            │ HTTP/JSON                        │ HTTP/JSON
            ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Express + TypeScript)               │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────┐   │
│  │   Auth   │  │  RBAC    │  │         API Modules          │   │
│  │ Middleware│  │Middleware│  │  auth, customers, products,  │   │
│  └──────────┘  └──────────┘  │  orders, conversations,      │   │
│                               │  tickets, knowledge, faqs,   │   │
│                               │  agents, ai, admin, audit    │   │
│                               └──────────┬───────────────────┘   │
│                                          │                       │
│  ┌───────────────────────────────────────┼───────────────────┐   │
│  │              AI Agent Service         │                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌───────┴──────┐           │   │
│  │  │  Intent  │  │  Memory  │  │  Tool Router │           │   │
│  │  │Detection │  │ Manager  │  │  (14 tools)  │           │   │
│  │  └──────────┘  └──────────┘  └──────────────┘           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐           │   │
│  │  │   RAG    │  │ Escalation│ │   Response   │           │   │
│  │  │ Retriever│  │ Detector │  │  Generator   │           │   │
│  │  └──────────┘  └──────────┘  └──────────────┘           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    Data Layer                              │  │
│  │  ┌────────────┐  ┌────────────────┐  ┌────────────────┐   │  │
│  │  │   SQLite   │  │  Vector Store  │  │  OpenAI API    │   │  │
│  │  │ (entities) │  │  (embeddings)  │  │  (LLM + embed) │   │  │
│  │  └────────────┘  └────────────────┘  └────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

```
AI Agent Workshop/
├── packages/
│   ├── api/                          # Backend
│   │   ├── src/
│   │   │   ├── app.ts                # Express app bootstrap
│   │   │   ├── server.ts             # Server entry point
│   │   │   ├── config.ts             # Env vars & config
│   │   │   ├── database/
│   │   │   │   ├── connection.ts     # SQLite connection
│   │   │   │   ├── schema.ts         # Table definitions
│   │   │   │   └── seed.ts           # Seed data
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts           # JWT auth middleware
│   │   │   │   ├── rbac.ts           # Role-based access control
│   │   │   │   ├── errorHandler.ts   # Global error handler
│   │   │   │   └── validate.ts       # Request validation
│   │   │   ├── modules/
│   │   │   │   ├── auth/             # register, login, logout
│   │   │   │   ├── customers/        # CRUD + profile
│   │   │   │   ├── products/         # CRUD
│   │   │   │   ├── orders/           # CRUD + status
│   │   │   │   ├── conversations/    # CRUD + messages
│   │   │   │   ├── tickets/          # CRUD + assignment
│   │   │   │   ├── knowledge/        # CRUD + RAG indexing
│   │   │   │   ├── faqs/             # CRUD
│   │   │   │   ├── agents/           # Human agent management
│   │   │   │   ├── ai/               # AI agent, tools, RAG
│   │   │   │   ├── admin/            # Dashboard + config
│   │   │   │   └── audit/            # Audit logs
│   │   │   ├── services/
│   │   │   │   ├── ai-agent.ts       # Core AI orchestration
│   │   │   │   ├── embedding.ts      # Text → embeddings
│   │   │   │   ├── vector-store.ts   # Vector similarity search
│   │   │   │   └── tool-executor.ts  # Tool call routing
│   │   │   └── utils/
│   │   │       ├── response.ts       # Standard API response helper
│   │   │       └── logger.ts         # Logging utility
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          # Frontend
│       ├── src/
│       │   ├── main.tsx              # React entry
│       │   ├── App.tsx               # Router setup
│       │   ├── api/                  # API client + hooks
│       │   │   ├── client.ts         # Axios instance
│       │   │   └── hooks/            # React Query hooks
│       │   ├── components/           # Shared UI components
│       │   │   ├── DataTable.tsx
│       │   │   ├── SearchBar.tsx
│       │   │   ├── FilterPanel.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── StatusBadge.tsx
│       │   │   ├── Pagination.tsx
│       │   │   ├── ConfirmationDialog.tsx
│       │   │   ├── Toast.tsx
│       │   │   ├── LoadingState.tsx
│       │   │   └── EmptyState.tsx
│       │   ├── layouts/
│       │   │   ├── CustomerLayout.tsx
│       │   │   └── AdminLayout.tsx
│       │   ├── features/
│       │   │   ├── auth/             # Login, Register
│       │   │   ├── customer/         # Customer self-service pages
│       │   │   ├── chat/             # AI chat interface
│       │   │   ├── admin/            # Admin dashboard
│       │   │   ├── customers/        # Customer management
│       │   │   ├── products/         # Product management
│       │   │   ├── orders/           # Order management
│       │   │   ├── tickets/          # Ticket management
│       │   │   ├── knowledge/        # Knowledge base management
│       │   │   ├── faqs/             # FAQ management
│       │   │   ├── agents/           # Agent management
│       │   │   └── ai-config/        # AI configuration
│       │   └── styles/
│       │       └── index.css         # Global styles
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── .env.example
├── .gitignore
├── package.json                      # Root workspace package.json
├── tsconfig.base.json
├── prompt.md
├── requirements.md
├── design.md
└── tasks.md
```

---

## 3. Database Design

### 3.1 Entity Relationship Diagram

```
User (1)──────(0..1) CustomerProfile
  │
  └──(0..1) AdminUser / SupportAgent

CustomerProfile (1)──────(N) Order
CustomerProfile (1)──────(N) Conversation
CustomerProfile (1)──────(N) SupportTicket

Order (1)──────(N) OrderItem
OrderItem (N)──────(1) Product

Conversation (1)──────(N) Message
Conversation (1)──────(0..1) SupportTicket

SupportAgent (1)──────(N) SupportTicket (assigned)
SupportAgent (1)──────(N) Conversation (assigned)
```

### 3.2 Key Tables

All tables use auto-incrementing integer primary keys with UUID-style string IDs for external references.

| Table              | Primary Key     | Foreign Keys                          |
|--------------------|-----------------|---------------------------------------|
| users              | id              | —                                     |
| customer_profiles  | id              | userId → users.id                     |
| admin_users        | id              | userId → users.id                     |
| support_agents     | id              | userId → users.id                     |
| conversations      | id              | customerId → customer_profiles.id, assignedAgentId → support_agents.id |
| messages           | id              | conversationId → conversations.id     |
| products           | id              | —                                     |
| orders             | id              | customerId → customer_profiles.id     |
| order_items        | id              | orderId → orders.id, productId → products.id |
| support_tickets    | id              | customerId → customer_profiles.id, conversationId → conversations.id, assignedAgentId → support_agents.id |
| knowledge_documents| id              | —                                     |
| faqs               | id              | —                                     |
| tool_executions    | id              | conversationId → conversations.id     |
| ai_prompts         | id              | —                                     |
| audit_logs         | id              | —                                     |
| document_embeddings| id              | documentId → knowledge_documents.id   |

### 3.3 Vector Store Strategy

Use a `document_embeddings` table in SQLite to store embedding vectors as JSON arrays. Similarity search is performed with cosine similarity computed in JavaScript at query time. This avoids external vector DB dependencies while keeping the workshop self-contained.

```
document_embeddings
├── id
├── documentId (FK → knowledge_documents)
├── chunkIndex
├── chunkText
├── embedding (TEXT — JSON array of floats)
├── createdAt
```

---

## 4. Authentication & Authorization

### 4.1 Authentication Flow

```
Register → hash password (bcrypt) → insert User + CustomerProfile → return JWT
Login    → verify password → return JWT { userId, role, customerId? }
```

- JWTs signed with a server-side secret from env vars.
- Tokens contain: `userId`, `role`, `customerId` (if customer), `exp`.
- Admin login endpoint is **separate** (`/api/v1/auth/admin/login`).

### 4.2 RBAC Matrix

| Resource                | CUSTOMER          | SUPPORT_AGENT          | ADMIN              |
|-------------------------|--------------------|------------------------|---------------------|
| Own profile             | ✅ Read/Update      | —                      | ✅ Full             |
| Other customer data     | ❌                  | ✅ Read (assigned)      | ✅ Full             |
| Products                | ✅ Read             | ✅ Read                 | ✅ Full CRUD        |
| Own orders              | ✅ Read             | ✅ Read (assigned cust) | ✅ Full CRUD        |
| Other customer orders   | ❌                  | ✅ Read (assigned)      | ✅ Full             |
| Own conversations       | ✅ Read/Create      | —                      | ✅ Full             |
| Assigned conversations  | —                  | ✅ Read/Reply           | ✅ Full             |
| Own tickets             | ✅ Read/Create      | —                      | ✅ Full             |
| Assigned tickets        | —                  | ✅ Full                 | ✅ Full             |
| Knowledge base          | ❌                  | ✅ Read                 | ✅ Full CRUD        |
| FAQs                    | ❌                  | ✅ Read                 | ✅ Full CRUD        |
| Agent management        | ❌                  | ❌                      | ✅ Full CRUD        |
| AI configuration        | ❌                  | ❌                      | ✅ Full             |
| Audit logs              | ❌                  | ❌                      | ✅ Read             |
| Admin dashboard         | ❌                  | ✅ Limited              | ✅ Full             |

---

## 5. AI Agent Design

### 5.1 Request Flow

```
Customer message
    ↓
POST /api/v1/agent/chat
    ↓
Auth middleware (extract customerId)
    ↓
AI Agent Service
    ├── 1. Load conversation history (memory)
    ├── 2. Build system prompt (active AIPrompt + customer context)
    ├── 3. Call LLM with tools defined
    ├── 4. If tool_calls in response:
    │       ├── Validate tool authorization
    │       ├── Execute tool (get_customer_orders, search_kb, etc.)
    │       ├── Log ToolExecution
    │       ├── Feed results back to LLM
    │       └── Repeat until final text response
    ├── 5. Save messages (user + assistant + tool) to DB
    ├── 6. Check for escalation triggers
    └── 7. Return response to customer
```

### 5.2 Tool Authorization

Every tool call is validated server-side:
- `get_customer_orders(customerId)` → verify `customerId` matches the authenticated customer.
- `search_customer()` → only available in admin/agent context, never in customer chat.
- All tool inputs are sanitized.

### 5.3 RAG Pipeline

```
Admin creates/updates Knowledge Document
    ↓
Document → Split into chunks (~500 tokens each)
    ↓
Each chunk → OpenAI embeddings API → embedding vector
    ↓
Store in document_embeddings table
    ↓
At query time:
    Customer question → embed → cosine similarity search → top-K chunks → inject into LLM context
```

### 5.4 Escalation Logic

The AI detects escalation needs when:
1. Customer explicitly asks for a human ("I want to talk to a person").
2. Frustration detected (repeated complaints, aggressive language).
3. Tool call fails and issue cannot be resolved.
4. Topic is outside AI's configured supported topics.

On escalation:
1. Create/update SupportTicket with escalation reason.
2. Set conversation status to `ESCALATED` → then `HUMAN_HANDOFF` when agent assigned.
3. AI stops auto-responding to that conversation.
4. Notify admin panel.

---

## 6. Frontend Design

### 6.1 Routing

| Path                        | Layout    | Role Required    |
|-----------------------------|-----------|------------------|
| `/login`                    | Public    | None             |
| `/register`                 | Public    | None             |
| `/admin/login`              | Public    | None             |
| `/chat`                     | Customer  | CUSTOMER         |
| `/conversations`            | Customer  | CUSTOMER         |
| `/orders`                   | Customer  | CUSTOMER         |
| `/tickets`                  | Customer  | CUSTOMER         |
| `/profile`                  | Customer  | CUSTOMER         |
| `/admin`                    | Admin     | ADMIN/SUPPORT    |
| `/admin/customers`          | Admin     | ADMIN            |
| `/admin/customers/:id`      | Admin     | ADMIN            |
| `/admin/products`           | Admin     | ADMIN            |
| `/admin/orders`             | Admin     | ADMIN            |
| `/admin/conversations`      | Admin     | ADMIN/SUPPORT    |
| `/admin/conversations/:id`  | Admin     | ADMIN/SUPPORT    |
| `/admin/tickets`            | Admin     | ADMIN/SUPPORT    |
| `/admin/knowledge`          | Admin     | ADMIN            |
| `/admin/faqs`               | Admin     | ADMIN            |
| `/admin/agents`             | Admin     | ADMIN            |
| `/admin/ai-config`          | Admin     | ADMIN            |
| `/admin/audit-logs`         | Admin     | ADMIN            |

### 6.2 Shared Components

All reusable components from the spec:
`DataTable`, `SearchBar`, `FilterPanel`, `Modal`, `Form`, `StatusBadge`, `Pagination`, `ConfirmationDialog`, `Toast`, `LoadingState`, `EmptyState`

### 6.3 State Management

- **React Query** (`@tanstack/react-query`) for server state (API data fetching, caching, mutations).
- **React Context** for auth state (current user, token, role).
- **Local state** for UI-specific state (form inputs, modals).

---

## 7. API Response Format

All endpoints return:

```typescript
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
```

Paginated endpoints return:

```typescript
interface PaginatedResponse<T> {
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  error: string | null;
}
```

---

## 8. Environment Variables

```env
# Server
PORT=3000
JWT_SECRET=your-secret-key
NODE_ENV=development

# OpenAI (or compatible)
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# AI Defaults
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=1024
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.7
EMBEDDING_MODEL=text-embedding-3-small

# Database
DATABASE_PATH=./data/database.sqlite
```
