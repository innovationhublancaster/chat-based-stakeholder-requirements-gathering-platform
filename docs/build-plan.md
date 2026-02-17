## Architecture Overview

This document describes a Vercel-hosted, Next.js 16 (App Router + React Server Components + Turbopack) web platform that captures stakeholder conversations via a guided chat engine, extracts validated requirements using Azure AI Foundry (via Vercel AI SDK @ai-sdk/azure), stores canonical data in NeonDB (serverless Postgres) with Drizzle ORM, uses Upstash Redis for caching, rate-limiting and realtime signaling, stores files/recordings in Vercel Blob, and monitors errors with Sentry.

Key architectural principles and patterns used here:
- Server-first rendering and Server Components for data-heavy, SEO and authenticated pages; client components for interactive pieces (chat widget, drag/drop templates, charts).
- Human-in-the-loop AI: every AI-extracted requirement is stored with provenance (source message IDs, confidence scores) and requires explicit user acceptance before export.
- Event-driven background processing for long-running work (AI batch extraction, transcription enrichment, integration exports) using Upstash Redis as queue and Vercel serverless background functions.
- Tenancy: single application codebase with row-level tenant isolation (org_id on all tables), plus tenant configuration and optional per-tenant data-retention settings.
- Integrations are exported as idempotent, auditable jobs; one-way export for MVP to Jira/GitHub and DOCX/CSV.

C4 System Context Diagram

```mermaid
graph TD
  User["Users: PMs, BAs, Stakeholders\n(Editors, Viewers, External Participants)"]
  NextApp["Web App: Next.js 16 (App Router)\nHosted on Vercel (Edge + Serverless)"]
  AzureAI["Azure AI Foundry\n(via Vercel AI SDK: @ai-sdk/azure)"]
  Neon["NeonDB (serverless Postgres)\n(Drizzle ORM)"]
  Upstash["Upstash Redis\n(cache, rate-limit, pub/sub/queues)"]
  Blob["Vercel Blob\n(files & recordings)"]
  Sentry["Sentry\n(error & performance monitoring)"]
  Integrations["External Integrations: Jira, GitHub, Confluence, Google Drive, Calendar, Slack"]
  EmailSvc["Email Provider (SMTP/SES) for invites & reminders"]

  User -->|1. Use UI (browser/mobile)| NextApp
  NextApp -->|2. Read/Write (API & Server Components)| Neon
  NextApp -->|3. Request AI processing| AzureAI
  AzureAI -->|4. Return suggestions + confidence| NextApp
  NextApp -->|5. Cache / pubsub / rate-limit| Upstash
  NextApp -->|6. Persist attachments| Blob
  NextApp -->|7. Send notifications| EmailSvc
  NextApp -->|8. Send integration exports| Integrations
  NextApp -->|9. Report errors & traces| Sentry
  User -->|10. Upload / Record| Blob

  subgraph Hosting
    NextApp
  end

  style NextApp fill:#f9f,stroke:#333,stroke-width:1px
```

Container / Component Diagram

```mermaid
graph TD
  subgraph Web Client (Browser)
    ClientUI["Next.js Client Components\n- Chat widget (zustand for local state)\n- Template editor (@dnd-kit)\n- Requirement cards (react-markdown, mermaid)\n- Charts (recharts)\n- Auth flows (BetterAuth email/password)\n    "]
    ClientWS["Realtime Layer (SSE / WebRTC signaling)"]
  end

  subgraph Next.js App (Vercel)
    EdgeMiddleware["Edge Middleware (auth guard, rate-limit)"]
    ServerRoutes["Route Handlers / Server Actions\n- REST API endpoints (sessions, messages, requirements, templates)\n- SSE endpoints for streaming updates\n- Webhook receivers"]
    AIService["AI Service Adapter\n- @ai-sdk/azure wrapper + prompt templates\n- Safety & hallucination checks\n- Provenance extractor (maps tokens -> message IDs) "]
    DBLayer["Drizzle ORM Data Layer\n- neon connection pooling patterns\n- repositories: users, orgs, projects, sessions, messages, requirements, audits, integrations, files"]
    FileAPI["Vercel Blob Adapter\n- upload signed URLs, retention metadata"]
    QueueWorker["Background workers (serverless tasks)\n- Upstash queue consumer for AI batch jobs, transcription enrichment, integration exports, email reminders"]
    RedisAdapter["Upstash Redis Adapter\n- cache, rate-limit counters, pub/sub for signalling & locks"]
    IntegrationsMgr["Integrations Manager\n- Jira/GitHub/Confluence adapters (one-way export), webhooks registry, mapping UI endpoints"]
    TranscriptionSvc["Transcription Processor (optional)\n- ingest transcripts -> store in Neon, enrich with speaker tags (deferred)\n- stores audio in Vercel Blob"]
  end

  subgraph External Services
    AzureAI
    NeonDB["NeonDB (Postgres)"]
    VBlob[Vercel Blob]
    Upstash
    Sentry
    Email
    ExternalApps["Jira, GitHub, Confluence, Google Drive, Calendar, Slack"]
  end

  ClientUI -->|HTTP + SSE / WebRTC-signaling| ServerRoutes
  ClientWS -->|SSE / WebRTC signaling| RedisAdapter
  ServerRoutes --> EdgeMiddleware
  ServerRoutes --> AIService
  ServerRoutes --> DBLayer
  ServerRoutes --> FileAPI
  ServerRoutes --> QueueWorker
  QueueWorker --> RedisAdapter
  AIService -->|calls| AzureAI
  DBLayer -->|SQL| NeonDB
  FileAPI -->|store| VBlob
  IntegrationsMgr --> ExternalApps
  ServerRoutes --> Sentry
  RedisAdapter --> Upstash
  TranscriptionSvc --> VBlob
  TranscriptionSvc --> DBLayer

  style AIService fill:#e2f0ff,stroke:#0366d6
  style QueueWorker fill:#fff4e6,stroke:#ff8c00
  style DBLayer fill:#e6ffe6,stroke:#2d8a2d
```

Deployment Topology

```mermaid
graph TD
  subgraph Vercel Platform
    Edge["Edge Network (Middleware + Edge Functions)\n- Auth guard, rate-limits, SSE endpoints"]
    Serverless["Serverless Functions (API routes & background tasks)\n- Route handlers, AI adapter, DB access (Drizzle), integration jobs"]
    StaticCDN["CDN (Turbopack-built assets)\n- Client bundles, static templates"]
    BlobStore["Vercel Blob (Object Storage)"]
  end

  UpstashSvc["Upstash Redis (global)"]
  NeonSvc["NeonDB (serverless Postgres)"]
  AzureAISvc["Azure AI Foundry (regional)"]
  SentrySvc["Sentry"]
  External["External Integrations (Jira/GitHub/Confluence/Email/Calendar)"]
  Users["Users (Browser/Mobile)"]

  Users -->|TLS| CDN
  Users -->|TLS| Edge
  Edge -->|invoke| Serverless
  Serverless -->|SQL over TLS| NeonSvc
  Serverless -->|HTTP/SDK| AzureAISvc
  Serverless -->|HTTP| BlobStore
  Serverless -->|Redis| UpstashSvc
  Serverless -->|HTTP| External
  Serverless -->|errors| SentrySvc
  Edge -->|cache| CDN

  note right of Serverless
    Background workers executed as scheduled or queue-driven
    using Upstash-backed queues; approximate concurrency
    controlled by Vercel function concurrency settings.
  end
```

Notes on Server Components vs Client Components

- Use React Server Components (Next.js App Router) for pages that require DB reads (project overview, analytics dashboards, template library). This reduces client bundle size and leaks less data to the client.
- Chat UI is a client component: it needs local interactivity (zustand for ephemeral UI state, optimistic updates), drag/drop template editing uses @dnd-kit and is client-only.
- AI calls and sensitive transformations always occur server-side (Server Actions / Route Handlers) to keep API keys, logs, and provenance under control.

Provenance and Traceability Pattern

- Every AI suggestion is stored as a RequirementCandidate record which includes: prompt, Azure response tokens, extracted fields, per-field confidence, array of source message IDs and exact quoted spans, and a hashed pointer to the original transcript segment.
- Edits are versioned: RequirementVersion table (author, diff, timestamp). Approval/sign-off creates immutable signed snapshots (store hash + Vercel Blob copy for export). All edits append to AuditLog.

Security & Compliance

- All network traffic uses TLS; Neon and Azure endpoints are called over TLS.
- Encryption at rest is provided by Neon & Vercel Blob (platform-managed). Secrets stored in Vercel Environment Variables and not in code.
- Per-tenant data isolation enforced with org_id + row-level checks in application layer and DB constraints.
- Consent flow: session-level flag (consent_granted) stored per chat session; recordings/transcriptions gated by this flag and retention policy metadata.

Operational Notes

- Monitoring: Sentry for runtime errors + custom metrics emitted to logs (Vercel) for usage metrics; events for AI acceptance rates, exports, and retention triggers recorded.
- Observability: instrument AI acceptance/rejection counts (ModelOps loop) to a telemetry table for off-line model improvement.
- Backups & Migrations: Drizzle migrations run during deployment (CI step) with blue/green pattern for schema changes where needed.

