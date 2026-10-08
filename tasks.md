# Tasks — AI Customer Support Agent

## Phase 1: Project Setup & Infrastructure

- [x] Task 1.1: Clean existing project files
- [x] Task 1.2: Initialize monorepo with npm workspaces
- [x] Task 1.3: Set up `packages/api` — TypeScript, Express, build scripts
- [x] Task 1.4: Set up `packages/web` — React, Vite, TypeScript
- [x] Task 1.5: Create `.env.example`, `.gitignore`, `tsconfig.base.json`
- [x] Task 1.6: Configure shared TypeScript paths

## Phase 2: Backend — Database & Core

- [x] Task 2.1: SQLite connection (`node:sqlite` DatabaseSync)
- [x] Task 2.2: Schema definition — all 17 tables including vectors and audit logs
- [x] Task 2.3: Seed script — demo admin, support agents, customers, products, orders, FAQs, KB docs
- [x] Task 2.4: Standard API response helper (`{ data, error }`)
- [x] Task 2.5: Logger utility

## Phase 3: Backend — Auth & Middleware

- [x] Task 3.1: Auth module — register, login (customer), admin login
- [x] Task 3.2: JWT middleware — token verification, user injection
- [x] Task 3.3: RBAC middleware — role gate per route + Customer Data Isolation
- [x] Task 3.4: Error handler middleware
- [x] Task 3.5: Request validation middleware (zod)

## Phase 4: Backend — CRUD Modules

- [x] Task 4.1: Customers module — CRUD + search + filter + profile
- [x] Task 4.2: Products module — CRUD + search + filter
- [x] Task 4.3: Orders module — CRUD + status + tracking + order items
- [x] Task 4.4: Conversations module — CRUD + messages
- [x] Task 4.5: Tickets module — CRUD + assignment + priority + status
- [x] Task 4.6: Knowledge base module — CRUD + publish/unpublish
- [x] Task 4.7: FAQs module — CRUD + publish/unpublish
- [x] Task 4.8: Agents module — CRUD + workload
- [x] Task 4.9: Admin module — dashboard stats + AI config + system prompt management
- [x] Task 4.10: Audit module — log creation + query + filtering

## Phase 5: Backend — AI Agent

- [x] Task 5.1: AI agent service — LLM integration (OpenAI-compatible)
- [x] Task 5.2: Tool definitions (14 tools with schemas)
- [x] Task 5.3: Tool executor — routing + authorization + execution
- [x] Task 5.4: Embedding service — text → vector
- [x] Task 5.5: Vector store — storage + cosine similarity search
- [x] Task 5.6: RAG pipeline — chunking + indexing + retrieval
- [x] Task 5.7: Conversation memory manager
- [x] Task 5.8: Escalation detection logic
- [x] Task 5.9: Human handoff flow
- [x] Task 5.10: AI chat endpoint (`POST /api/v1/agent/chat`)

## Phase 6: Frontend — Foundation

- [x] Task 6.1: Global CSS — design system, variables, dark theme
- [x] Task 6.2: API client + auth interceptors
- [x] Task 6.3: Auth context + protected route components
- [x] Task 6.4: Shared components — DataTable, SearchBar, Modal, StatusBadge, Pagination, ConfirmationDialog, LoadingState, EmptyState
- [x] Task 6.5: Customer layout (sidebar + content)
- [x] Task 6.6: Admin layout (sidebar + content)
- [x] Task 6.7: Router setup (React Router v6)

## Phase 7: Frontend — Auth Pages

- [x] Task 7.1: Customer login page
- [x] Task 7.2: Customer register page
- [x] Task 7.3: Admin login page

## Phase 8: Frontend — Customer Pages

- [x] Task 8.1: AI Support Chat page (live tool indicators, streaming/polling, human escalation banner)
- [x] Task 8.2: Conversations list page
- [x] Task 8.3: Orders list page
- [x] Task 8.4: Tickets list page
- [x] Task 8.5: Profile page

## Phase 9: Frontend — Admin Pages

- [x] Task 9.1: Admin Dashboard (metrics + recent activity)
- [x] Task 9.2: Customer Management (list + profile + CRUD)
- [x] Task 9.3: Product Management (list + CRUD)
- [x] Task 9.4: Order Management (list + CRUD + status)
- [x] Task 9.5: Conversation Monitoring (list + detail + messages)
- [x] Task 9.6: Ticket Management (list + CRUD + assignment)
- [x] Task 9.7: Knowledge Base Management (list + CRUD + publish)
- [x] Task 9.8: FAQ Management (list + CRUD + publish)
- [x] Task 9.9: Agent Management (list + CRUD)
- [x] Task 9.10: AI Configuration page
- [x] Task 9.11: Audit Logs page (list + filter)

## Phase 10: Integration & Polish

- [x] Task 10.1: Wire AI chat to backend — responsive agent tool responses
- [x] Task 10.2: Human handoff UI (status indicators, agent messages)
- [x] Task 10.3: RAG knowledge search & retrieval integration
- [x] Task 10.4: Error handling and feedback across forms
- [x] Task 10.5: Loading/empty states on all pages
- [x] Task 10.6: User feedback banners and badges

## Phase 11: Testing

- [x] Task 11.1: Auth tests — register, login, token validation
- [x] Task 11.2: RBAC tests — permission enforcement
- [x] Task 11.3: Customer data isolation tests
- [x] Task 11.4: CRUD tests — all modules
- [x] Task 11.5: AI agent tests — tool calling, RAG, escalation
- [x] Task 11.6: Security tests (6 scenarios from spec)

## Phase 12: Final Validation

- [x] Task 12.1: TypeScript type-check passes (`tsc --noEmit` and build)
- [x] Task 12.2: All tests pass
- [x] Task 12.3: Production build succeeds
- [x] Task 12.4: Verify 36 acceptance criteria from prompt.md §29
- [x] Task 12.5: Git commit + push to origin
