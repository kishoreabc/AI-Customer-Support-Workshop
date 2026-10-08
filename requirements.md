# Requirements — AI Customer Support Agent

## 1. Overview

A full-stack AI Customer Support Agent with a secure Admin Panel. Two user-facing sides:

| Side     | Users                      | Purpose                                    |
|----------|----------------------------|--------------------------------------------|
| Customer | End-user customers         | AI chat, orders, tickets, profile           |
| Admin    | Admins, Support Agents     | CRM, product/order/ticket/KB management    |

The single purpose is **AI-powered customer support**. No productivity, task, reminder, habit, or social modules.

---

## 2. Functional Requirements

### 2.1 Customer Application

| ID   | Requirement                                               |
|------|-----------------------------------------------------------|
| C-01 | Customer can register with email/password                 |
| C-02 | Customer can log in / log out                             |
| C-03 | Customer can start a new AI support conversation          |
| C-04 | Customer can continue previous conversations              |
| C-05 | Customer can ask questions to the AI agent                |
| C-06 | Customer can view conversation history                    |
| C-07 | Customer can view their orders                            |
| C-08 | Customer can view order status                            |
| C-09 | Customer can view support tickets                         |
| C-10 | Customer can create support tickets                       |
| C-11 | Customer can request human support                        |
| C-12 | Customer can view ticket status                           |
| C-13 | Customer can update information when requested by support |

### 2.2 AI Support Agent

| ID   | Requirement                                                        |
|------|--------------------------------------------------------------------|
| A-01 | Understand customer intent                                         |
| A-02 | Maintain conversation context (memory)                             |
| A-03 | Retrieve customer information when authorized                      |
| A-04 | Search knowledge base via RAG                                      |
| A-05 | Search product information                                         |
| A-06 | Search order information                                           |
| A-07 | Check support ticket information                                   |
| A-08 | Use structured tool calls when required                            |
| A-09 | Ask clarification questions when necessary                         |
| A-10 | Detect customer frustration                                        |
| A-11 | Detect requests requiring human intervention                       |
| A-12 | Escalate to human agent when necessary                             |
| A-13 | Never fabricate customer/product/order/refund/ticket information    |
| A-14 | Only access data belonging to the authenticated customer           |
| A-15 | Stop responding automatically after human takeover                  |
| A-16 | Search FAQs before generating unsupported answers                  |

### 2.3 AI Support Tools

| Tool                    | Description                                   |
|-------------------------|-----------------------------------------------|
| get_customer_profile    | Retrieve authenticated customer profile       |
| search_customer         | Search customer records (admin context)        |
| get_customer_orders     | List orders for authenticated customer        |
| get_order_details       | Get full order details by orderId             |
| get_order_status        | Get order status by orderId                   |
| search_products         | Search product catalog                        |
| get_product_details     | Get product details by productId              |
| get_refund_status       | Check refund status for an order              |
| create_support_ticket   | Create a new support ticket                   |
| get_support_ticket      | Get ticket details by ticketId                |
| update_support_ticket   | Update an existing ticket                     |
| escalate_to_human       | Escalate conversation to human agent          |
| search_knowledge_base   | RAG search over knowledge documents           |
| search_faq              | Search FAQ entries                            |

### 2.4 Admin Panel

| ID   | Requirement                                      |
|------|--------------------------------------------------|
| D-01 | Admin dashboard with support metrics             |
| D-02 | Customer CRUD + search/filter/deactivate          |
| D-03 | Customer profile page with orders/conversations/tickets |
| D-04 | Product CRUD + search/filter                      |
| D-05 | Order CRUD + status management + tracking         |
| D-06 | Conversation monitoring + history inspection      |
| D-07 | Support ticket CRUD + assignment + priority       |
| D-08 | Knowledge base CRUD + publish/unpublish + re-index |
| D-09 | FAQ CRUD + publish/unpublish + categorization     |
| D-10 | Human agent CRUD + ticket assignment + workload   |
| D-11 | AI configuration (model, temp, tokens, RAG params)|
| D-12 | AI system prompt management with versioning       |
| D-13 | Audit logs with filtering                        |

### 2.5 AI → Human Handoff

| ID   | Requirement                                                    |
|------|----------------------------------------------------------------|
| H-01 | When escalation triggered, create/update support ticket        |
| H-02 | Assign human agent to ticket                                   |
| H-03 | Conversation status becomes HUMAN_HANDOFF                      |
| H-04 | AI stops auto-responding until returned to AI mode             |
| H-05 | Human agent sees full conversation + customer + order context  |
| H-06 | Human agent can reply to customer                              |
| H-07 | After resolution, conversation marked RESOLVED                 |

---

## 3. Non-Functional Requirements

| ID    | Category       | Requirement                                           |
|-------|----------------|-------------------------------------------------------|
| NF-01 | Type Safety    | Strict TypeScript across backend and frontend         |
| NF-02 | Modularity     | Backend modules and frontend features isolated        |
| NF-03 | API Format     | All APIs return `{ data: T, error: string | null }`  |
| NF-04 | HTTP Codes     | Proper HTTP status codes on every response            |
| NF-05 | Error Handling | Comprehensive error handling throughout               |
| NF-06 | UX States      | Loading, empty, and error states on every page        |
| NF-07 | Build          | Production build must succeed cleanly                 |
| NF-08 | Testing        | All tests pass (Vitest)                               |

---

## 4. Security Requirements

| ID   | Requirement                                                      |
|------|------------------------------------------------------------------|
| S-01 | Role-based access control: ADMIN, SUPPORT_AGENT, CUSTOMER       |
| S-02 | CUSTOMER can never access admin routes                           |
| S-03 | CUSTOMER can only access own data                                |
| S-04 | SUPPORT_AGENT cannot modify AI configuration                     |
| S-05 | AI accesses data via server-side tools, never direct DB access   |
| S-06 | Every tool call validated and authorized server-side             |
| S-07 | API keys stored server-side only (env vars / secret store)       |
| S-08 | API keys never exposed to frontend                               |
| S-09 | Passwords never displayed to admins                              |
| S-10 | JWT-based authentication with secure token handling              |
| S-11 | Admin login separate from customer login                         |

---

## 5. Data Entities

| Entity            | Key Fields                                                                                |
|-------------------|-------------------------------------------------------------------------------------------|
| User              | userId, email, passwordHash, role, createdAt                                               |
| CustomerProfile   | customerId, userId, firstName, lastName, phone, address, city, state, country, postalCode, status, tags, notes |
| AdminUser         | adminId, userId, name, department, status                                                  |
| SupportAgent      | agentId, userId, name, email, role, status, department, lastActiveAt                       |
| Conversation      | conversationId, customerId, assignedAgentId, status, escalationReason, timestamps          |
| Message           | messageId, conversationId, senderType, content, toolCallId, metadata, timestamp            |
| Product           | productId, name, SKU, description, category, price, currency, stock, availability, warranty, returnPolicy |
| Order             | orderId, customerId, orderDate, totalAmount, currency, paymentStatus, orderStatus, shipping, tracking, items |
| OrderItem         | orderItemId, orderId, productId, quantity, unitPrice                                       |
| SupportTicket     | ticketId, customerId, conversationId, subject, description, category, priority, status, assignedAgent |
| KnowledgeDocument | documentId, title, content, category, tags, source, status, createdBy, timestamps          |
| FAQ               | faqId, question, answer, category, tags, status, timestamps                                |
| ToolExecution     | executionId, conversationId, toolName, input, output, status, timestamp                    |
| AIPrompt          | promptId, version, content, status, createdBy, createdAt                                   |
| AuditLog          | logId, actorId, actorType, action, entityType, entityId, metadata, timestamp               |

---

## 6. API Routes

| Prefix                    | Purpose                        |
|---------------------------|--------------------------------|
| `/api/v1/auth/*`          | Authentication (register, login, logout) |
| `/api/v1/customer/*`      | Customer self-service          |
| `/api/v1/conversations/*` | Conversation management        |
| `/api/v1/agent/*`         | AI agent chat endpoint         |
| `/api/v1/products/*`      | Product management             |
| `/api/v1/orders/*`        | Order management               |
| `/api/v1/tickets/*`       | Support ticket management      |
| `/api/v1/knowledge/*`     | Knowledge base management      |
| `/api/v1/faqs/*`          | FAQ management                 |
| `/api/v1/admin/*`         | Admin dashboard + config       |
| `/api/v1/agents/*`        | Human agent management         |
| `/api/v1/audit-logs/*`    | Audit log access               |

---

## 7. Technology Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Backend   | Node.js, TypeScript, Express |
| Frontend  | React, TypeScript, Vite      |
| Database  | SQLite (better-sqlite3)      |
| AI/LLM    | OpenAI-compatible API        |
| Embeddings| OpenAI embeddings API        |
| Vector DB | SQLite-based vector store    |
| Testing   | Vitest                       |

---

## 8. Acceptance Criteria (36 items)

See prompt.md §29 for the full numbered checklist (C1–C10 customer, D11–D21 admin, A22–A27 AI, S28–S31 security, Q32–Q36 quality).
