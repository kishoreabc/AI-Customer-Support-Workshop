Build a full-stack AI Customer Support Agent with a secure Admin Panel.

The application has two main sides:

1. Customer Side
   - Customer authentication
   - AI customer-support chat
   - Conversation history
   - Support tickets
   - Human escalation

2. Admin Side
   - Customer management
   - Product management
   - Order management
   - Knowledge-base management
   - FAQ management
   - Support ticket management
   - AI configuration
   - Human agent management
   - Conversation monitoring
   - Customer information management

The primary purpose of the application is AI-powered customer support.

Do NOT build unrelated productivity, task management, reminder, habit, or social modules.

==================================================
1. CUSTOMER APPLICATION
==================================================

Create a customer-facing application where customers can:

- Register
- Login
- Logout
- Start a new support conversation
- Continue previous conversations
- Ask questions to the AI support agent
- View conversation history
- View their orders
- View order status
- View support tickets
- Create support tickets
- Request human support
- View ticket status
- Update information when requested by support

The main customer experience should be the AI support chat.

==================================================
2. AI CUSTOMER SUPPORT AGENT
==================================================

Implement an AI-powered customer support agent.

Architecture:

Customer
   ↓
Chat UI
   ↓
Support API
   ↓
AI Support Agent
   ├── Intent Detection
   ├── Conversation Memory
   ├── Knowledge Retrieval / RAG
   ├── Customer Data Retrieval
   ├── Order Data Retrieval
   ├── Tool Calling
   ├── Response Generation
   └── Human Escalation
           ↓
     Admin / Human Agent

The AI agent must:

- Understand customer intent.
- Maintain conversation context.
- Retrieve customer information when authorized.
- Search the knowledge base.
- Search product information.
- Search order information.
- Check support-ticket information.
- Use tools when required.
- Ask clarification questions when necessary.
- Detect frustration.
- Detect requests requiring human intervention.
- Escalate when necessary.
- Never fabricate customer, product, order, refund, or ticket information.

The AI must only access data belonging to the authenticated customer.

==================================================
3. ADMIN PANEL
==================================================

Create a separate secure Admin Panel.

Admin routes must be protected using role-based access control.

Roles:

ADMIN
SUPPORT_AGENT
CUSTOMER

Customers must NEVER be able to access admin routes.

Admin login should be separate from the customer experience.

Admin dashboard should contain:

- Overview
- Customers
- Products
- Orders
- Conversations
- Support Tickets
- Knowledge Base
- FAQs
- Human Agents
- AI Configuration
- System Activity / Audit Logs

==================================================
4. ADMIN DASHBOARD
==================================================

Create a dashboard showing:

- Total customers
- Active customers
- Open support tickets
- Escalated conversations
- Resolved tickets
- Active conversations
- Number of AI conversations
- Number of human escalations
- Recent support activity

Keep the dashboard focused on customer-support operations.

==================================================
5. CUSTOMER MANAGEMENT
==================================================

Admins must be able to create, view, edit, search, filter, and deactivate customers.

Customer fields:

- customerId
- firstName
- lastName
- email
- phone
- dateOfBirth (optional)
- address
- city
- state
- country
- postalCode
- customerStatus
- accountCreatedAt
- lastLoginAt
- notes
- tags

Customer status:

ACTIVE
INACTIVE
SUSPENDED

Admin actions:

- Add customer
- Edit customer
- View customer
- Search customer
- Filter customers
- Deactivate customer
- Reactivate customer
- View customer's orders
- View customer's conversations
- View customer's support tickets

Do not expose sensitive customer information unnecessarily.

Passwords must never be displayed to admins.

==================================================
6. CUSTOMER PROFILE
==================================================

Create a detailed customer profile page.

The admin should see:

Customer Information
├── Basic details
├── Contact details
├── Address
├── Account status
├── Customer tags
└── Internal notes

Customer Activity
├── Orders
├── Conversations
├── Support tickets
└── Recent activity

The AI agent can use relevant customer information when answering support questions.

Example:

Customer:
"What is the status of my recent order?"

AI:
→ Identify authenticated customer
→ Retrieve customer's recent orders
→ Retrieve order status
→ Respond with the actual order information

Never allow the AI to access another customer's information.

==================================================
7. PRODUCT MANAGEMENT
==================================================

Admins must be able to manage products.

Product fields:

- productId
- name
- SKU
- description
- category
- price
- currency
- stockQuantity
- availabilityStatus
- specifications
- warrantyInformation
- returnPolicy
- createdAt
- updatedAt

Admin actions:

- Add product
- Edit product
- Delete/deactivate product
- Search products
- Filter products
- Update stock
- View product details

The AI support agent must be able to search product information.

Example:

Customer:
"Does the X100 laptop have a warranty?"

AI:
→ Search product database
→ Retrieve warranty information
→ Respond using actual product data.

==================================================
8. ORDER MANAGEMENT
==================================================

Admins must be able to create and manage customer orders.

Order fields:

- orderId
- customerId
- orderDate
- totalAmount
- currency
- paymentStatus
- orderStatus
- shippingAddress
- estimatedDeliveryDate
- trackingNumber
- items
- createdAt
- updatedAt

Order status:

PENDING
CONFIRMED
PROCESSING
SHIPPED
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
RETURNED

Payment status:

PENDING
PAID
FAILED
REFUNDED
PARTIALLY_REFUNDED

Admin actions:

- Create order
- View order
- Update order status
- Search orders
- Filter orders
- View customer orders
- Add tracking information

The AI must NEVER invent order information.

==================================================
9. SUPPORT TOOLS FOR AI
==================================================

Create structured tools that the AI agent can call.

Tools:

get_customer_profile
search_customer
get_customer_orders
get_order_details
get_order_status
search_products
get_product_details
get_refund_status
create_support_ticket
get_support_ticket
update_support_ticket
escalate_to_human
search_knowledge_base
search_faq

Example:

Customer:
"Where is my order?"

AI:
→ get_customer_orders()
→ identify latest order
→ get_order_status()
→ respond with actual status.

Example:

Customer:
"I want to return my laptop."

AI:
→ get_order_details()
→ search_knowledge_base()
→ search FAQ / return policy
→ explain return procedure
→ create ticket if required.

==================================================
10. KNOWLEDGE BASE MANAGEMENT
==================================================

Admins must be able to manage the AI knowledge base.

Knowledge-base content can include:

- FAQs
- Company policies
- Product documentation
- Shipping policies
- Return policies
- Refund policies
- Warranty policies
- Troubleshooting guides
- Terms and conditions
- General support documentation

Knowledge document fields:

- documentId
- title
- content
- category
- tags
- source
- status
- createdBy
- createdAt
- updatedAt

Admin actions:

- Add document
- Edit document
- Delete document
- Publish/unpublish document
- Search documents
- Filter by category
- Re-index document

When a document is created or updated:

Document
→ Chunking
→ Embedding
→ Vector Database
→ Available for RAG

==================================================
11. FAQ MANAGEMENT
==================================================

Create an FAQ management section.

FAQ fields:

- faqId
- question
- answer
- category
- tags
- status
- createdAt
- updatedAt

Admin can:

- Add FAQ
- Edit FAQ
- Delete FAQ
- Publish/unpublish FAQ
- Search FAQs
- Categorize FAQs

The AI agent should search FAQs before generating unsupported answers.

==================================================
12. SUPPORT TICKET MANAGEMENT
==================================================

Admins and support agents must be able to manage support tickets.

Ticket fields:

- ticketId
- customerId
- conversationId
- subject
- description
- category
- priority
- status
- assignedAgent
- escalationReason
- internalNotes
- createdAt
- updatedAt
- resolvedAt

Priority:

LOW
MEDIUM
HIGH
URGENT

Status:

OPEN
IN_PROGRESS
WAITING_FOR_CUSTOMER
RESOLVED
CLOSED

Admin/support-agent actions:

- View tickets
- Search tickets
- Filter tickets
- Assign ticket
- Change priority
- Change status
- Add internal notes
- Reply to customer
- Resolve ticket
- Reopen ticket

==================================================
13. HUMAN AGENT MANAGEMENT
==================================================

Admins can manage human support agents.

Agent fields:

- agentId
- name
- email
- role
- status
- department
- createdAt
- lastActiveAt

Roles:

ADMIN
SUPPORT_AGENT

Statuses:

ACTIVE
INACTIVE
SUSPENDED

Admin actions:

- Add support agent
- Edit support agent
- Deactivate agent
- Assign tickets
- View agent workload

==================================================
14. AI + HUMAN HANDOFF
==================================================

Implement seamless AI-to-human escalation.

Flow:

Customer
   ↓
AI Agent
   ↓
Issue requires human?
   ↓ YES
Create/Update Ticket
   ↓
Assign Human Agent
   ↓
Human takes over
   ↓
Customer receives response

When a human agent takes over:

- Conversation status becomes HUMAN_HANDOFF.
- AI must stop automatically responding to the conversation.
- Human agent can view complete conversation history.
- Human agent can view relevant customer information.
- Human agent can view related orders and tickets.
- Human agent can respond to the customer.

After resolution, the conversation can be marked RESOLVED.

==================================================
15. CONVERSATION MANAGEMENT
==================================================

Conversation fields:

- conversationId
- customerId
- assignedAgentId
- status
- escalationReason
- createdAt
- updatedAt
- resolvedAt

Statuses:

OPEN
AI_ACTIVE
WAITING_FOR_CUSTOMER
ESCALATED
HUMAN_HANDOFF
RESOLVED
CLOSED

Message fields:

- messageId
- conversationId
- senderType
- content
- timestamp
- toolCallId
- metadata

Sender types:

CUSTOMER
AI
HUMAN_AGENT
SYSTEM

Admin/support agents must be able to inspect complete conversation history.

==================================================
16. AI CONFIGURATION PANEL
==================================================

Create an admin-only AI configuration page.

Allow admins to configure:

- AI model
- System instructions
- Temperature
- Maximum response tokens
- RAG top-K
- Similarity threshold
- Maximum conversation history
- Escalation threshold
- AI enabled/disabled

Do not expose API keys in the frontend.

API keys must be stored only in environment variables or a secure server-side secret store.

==================================================
17. AI SYSTEM PROMPT MANAGEMENT
==================================================

Allow admins to manage the customer-support behavior configuration.

The AI system instructions should define:

- Company behavior
- Tone
- Supported topics
- Unsupported topics
- Escalation rules
- Refund rules
- Privacy rules
- Response style

Version system prompts.

Store:

- promptId
- version
- content
- status
- createdBy
- createdAt

Only one prompt version should be active at a time.

==================================================
18. AUDIT LOGS
==================================================

Create an audit-log system for important admin and AI actions.

Log:

- login
- customer creation
- customer modification
- customer deactivation
- product modification
- order modification
- ticket assignment
- ticket status changes
- knowledge-base changes
- AI configuration changes
- human escalation
- AI tool calls

Audit log fields:

- logId
- actorId
- actorType
- action
- entityType
- entityId
- metadata
- timestamp

Admins can view and filter audit logs.

==================================================
19. SECURITY
==================================================

Implement role-based access control.

Permissions:

CUSTOMER:
- Own profile
- Own conversations
- Own orders
- Own tickets

SUPPORT_AGENT:
- Assigned conversations
- Customer support information
- Tickets
- Relevant customer information

ADMIN:
- Full administrative access

Never allow:

- Customer → Admin panel
- Customer → Other customer's data
- Support agent → Unauthorized administrative configuration
- AI → Direct unrestricted database access

The AI must access backend tools rather than directly accessing the database.

Validate and authorize every tool call server-side.

==================================================
20. DATABASE
==================================================

Create the following entities:

User
CustomerProfile
AdminUser
SupportAgent
Conversation
Message
Product
Order
OrderItem
SupportTicket
KnowledgeDocument
FAQ
ToolExecution
AIPrompt
AuditLog

Relationships must be clearly defined.

Example:

User
 ├── CustomerProfile
 ├── Conversations
 ├── Orders
 └── SupportTickets

Conversation
 ├── Messages
 └── SupportTicket

Order
 └── OrderItems

==================================================
21. API STRUCTURE
==================================================

Use:

/api/v1/auth/*
/api/v1/customer/*
/api/v1/conversations/*
/api/v1/agent/*
/api/v1/products/*
/api/v1/orders/*
/api/v1/tickets/*
/api/v1/knowledge/*
/api/v1/faqs/*
/api/v1/admin/*
/api/v1/agents/*
/api/v1/audit-logs/*

All APIs should return:

{
  "data": T,
  "error": string | null
}

Use proper HTTP status codes.

==================================================
22. ADMIN UI
==================================================

Create a professional admin dashboard.

Sidebar:

Dashboard
Customers
Products
Orders
Conversations
Tickets
Knowledge Base
FAQs
Support Agents
AI Configuration
Audit Logs
Settings

Each section should support:

- Search
- Filtering
- Pagination
- Create
- Edit
- View
- Delete/deactivate where appropriate

Use reusable components:

DataTable
SearchBar
FilterPanel
Modal
Form
StatusBadge
Pagination
ConfirmationDialog
Toast
LoadingState
EmptyState

==================================================
23. CUSTOMER UI
==================================================

Customer sidebar:

AI Support
My Conversations
My Orders
My Tickets
Profile

Main focus:

AI Support Chat

The chat interface should display:

- Conversation history
- AI typing/loading state
- Tool/action status where appropriate
- Escalation status
- Human-agent handoff
- Ticket information

==================================================
24. TECHNOLOGY
==================================================

Backend:

Node.js
TypeScript
Express

Frontend:

React
TypeScript
Vite

Database:

SQLite

AI:

LLM API
Embeddings
Vector Database
RAG

Testing:

Vitest

Use strict TypeScript.

Keep frontend and backend modular.

==================================================
25. PROJECT STRUCTURE
==================================================

Use a structure similar to:

packages/
├── api/
│   └── src/
│       ├── modules/
│       │   ├── auth/
│       │   ├── customers/
│       │   ├── products/
│       │   ├── orders/
│       │   ├── conversations/
│       │   ├── tickets/
│       │   ├── knowledge/
│       │   ├── faqs/
│       │   ├── agents/
│       │   ├── ai/
│       │   └── audit/
│       ├── middleware/
│       ├── database/
│       └── app.ts
│
└── web/
    └── src/
        ├── features/
        │   ├── auth/
        │   ├── customer/
        │   ├── chat/
        │   ├── admin/
        │   ├── customers/
        │   ├── products/
        │   ├── orders/
        │   ├── tickets/
        │   ├── knowledge/
        │   ├── faqs/
        │   ├── agents/
        │   └── ai-config/
        ├── components/
        └── app/

==================================================
26. TESTING
==================================================

Create tests for:

Authentication
Authorization
Customer CRUD
Product CRUD
Order CRUD
Conversation management
AI agent
RAG retrieval
Tool calling
Ticket creation
Ticket assignment
Human escalation
Knowledge-base management
FAQ management
Admin permissions
Customer data isolation
Audit logging

Important security tests:

1. Customer cannot access another customer's order.
2. Customer cannot access another customer's conversation.
3. Customer cannot access admin routes.
4. Support agent cannot modify AI configuration.
5. Unauthorized tool calls are rejected.
6. AI cannot access customer data without authenticated customer context.

==================================================
27. AI AGENT TEST SCENARIOS
==================================================

Scenario 1:
Customer asks a FAQ question.

Expected:
AI retrieves FAQ/knowledge-base information and answers.

Scenario 2:
Customer asks about an order.

Expected:
AI retrieves authenticated customer's order and returns actual status.

Scenario 3:
Customer asks about another customer's order.

Expected:
Request is rejected.

Scenario 4:
Customer asks about return policy.

Expected:
AI retrieves return policy from knowledge base.

Scenario 5:
Customer requests a refund.

Expected:
AI checks refund policy and creates/escalates a ticket if human approval is required.

Scenario 6:
Customer becomes frustrated.

Expected:
AI detects frustration and offers human escalation.

Scenario 7:
Customer explicitly asks for a human.

Expected:
Conversation is escalated immediately.

Scenario 8:
Knowledge base has no relevant information.

Expected:
AI must not hallucinate. It should explain that it cannot verify the answer and offer human support.

Scenario 9:
Support tool fails.

Expected:
AI must not claim the operation succeeded.

Scenario 10:
Human agent takes over.

Expected:
AI stops responding automatically until the conversation is returned to AI mode.

==================================================
28. NON-GOALS
==================================================

Do NOT implement:

- Productivity management
- Task boards
- Reminder systems
- Habit tracking
- Social media
- Marketing automation
- Unrelated analytics
- Cryptocurrency
- Financial trading

Everything must support the customer-support use case.

==================================================
29. ACCEPTANCE CRITERIA
==================================================

The application is complete only when:

CUSTOMER:

1. Customer can register/login.
2. Customer can start an AI conversation.
3. AI maintains conversation context.
4. AI can search the knowledge base.
5. AI can retrieve customer information.
6. AI can retrieve order information.
7. AI can create support tickets.
8. Customer can request human support.
9. Customer can view their tickets.
10. Customer can view their conversations.

ADMIN:

11. Admin can login.
12. Admin can create/edit/deactivate customers.
13. Admin can manage products.
14. Admin can manage orders.
15. Admin can manage knowledge-base documents.
16. Admin can manage FAQs.
17. Admin can manage support agents.
18. Admin can monitor conversations.
19. Admin can manage support tickets.
20. Admin can configure AI behavior.
21. Admin can view audit logs.

AI:

22. AI uses RAG for company-specific information.
23. AI uses tools for customer/order operations.
24. AI does not fabricate information.
25. AI respects customer data isolation.
26. AI can detect when human escalation is required.
27. AI stops responding after human takeover.

SECURITY:

28. RBAC is enforced server-side.
29. Customers cannot access admin APIs.
30. Customers cannot access other customers' data.
31. API keys are never exposed to the frontend.

QUALITY:

32. TypeScript type-check passes.
33. All tests pass.
34. Production build succeeds.
35. Error handling is implemented.
36. Loading and empty states are implemented.

Before writing application code, generate:

1. requirements.md
2. design.md
3. tasks.md

Review the requirements and design for consistency before implementation.

Do not implement features outside this specification.