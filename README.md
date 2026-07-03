# Hestabit Chatbot

Internal enterprise knowledge assistant for Hestabit. The application lets authenticated employees ask questions against approved company knowledge sources, while admins can manage departments, users, uploaded documents, URL ingestions, and the RAG knowledge base.

This README documents the completed Phase 1 baseline. Phase 2 will build on this foundation and should be documented separately once its scope is finalized.

## Phase 1 Status

Phase 1 is focused on the working internal chatbot foundation:

- Microsoft Entra ID authentication with NextAuth.js.
- Admin and user role-based access.
- Chat sessions with persisted message history.
- Streaming assistant responses over Server-Sent Events.
- Retrieval-Augmented Generation using LangChain, PostgreSQL, and pgvector.
- Admin-managed document and website ingestion.
- Department-based organization for uploaded knowledge.
- Source citations for document-backed answers.
- Document versioning with latest-version tracking.
- API validation, request-origin checks, upload restrictions, and URL crawl allowlisting.
- Upstash Redis-backed rate limiting for chat and admin ingestion routes.
- Docker setup for the app, PostgreSQL with pgvector, reranker service, and optional Ollama.

## Current Models

| Purpose | Provider / Runtime | Model | Notes |
| --- | --- | --- | --- |
| Chat generation | Groq via LangChain `ChatGroq` | `GROQ_MODEL` from env | `.env.example` uses `llama-3.1-8b-instant`; code fallback is `mixtral-8x7b-32768`. |
| Embeddings | Ollama | `nomic-embed-text` | Used to generate 768-dimensional vectors for pgvector. |
| Reranking | Local HTTP reranker service | `BAAI/bge-reranker-v2-m3` | Optional. If unavailable, retrieval falls back to hybrid ranking. |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, TypeScript, Tailwind CSS, Flowbite / Flowbite React |
| Auth | NextAuth.js v5 beta + Microsoft Entra ID |
| Chat LLM | Groq through LangChain |
| Embeddings | Ollama `nomic-embed-text` |
| RAG | LangChain.js |
| Vector DB | PostgreSQL with pgvector |
| ORM | Prisma |
| Rate limiting | Upstash Redis |
| URL crawling | Firecrawl |
| Reranking | Python FastAPI-style reranker service using `BAAI/bge-reranker-v2-m3` |
| Package manager | pnpm |

## Implemented Features

### Authentication And Access Control

- Microsoft Entra ID login through NextAuth.
- Database-backed sessions using the Prisma adapter.
- Admin role assignment through `ADMIN_EMAIL`.
- Protected chat and admin routes.
- Admin-only access for document upload, URL ingestion, departments, users, and dashboard APIs.

### Chat Experience

- Authenticated user chat interface.
- Chat session creation, listing, loading, and deletion.
- Persisted user and assistant messages.
- Automatic chat title generation from the first user message.
- Streaming token responses using Server-Sent Events.
- Source metadata returned with document-backed answers.
- General conversation path for greetings, small talk, and non-document questions.
- Document query path for internal policies, HR rules, and uploaded document questions.
- Website query path for Hestabit website/company-service content.

### RAG And Retrieval Pipeline

- LangChain-based ingestion and retrieval flow.
- PDF, TXT, and Markdown document loading.
- Recursive text splitting with chunk overlap.
- Ollama embeddings stored in PostgreSQL pgvector.
- Hybrid retrieval from the vector store.
- Optional reranking through a local reranker endpoint.
- Retrieval confidence handling for strong, weak, and missing matches.
- Source filtering for document queries versus website queries.
- Clarification prompts for ambiguous abbreviations like `ML` and `SL`.
- Abbreviation expansion for company and HR terms such as `WFH`, `EL`, `CL`, `LWP`, `Comp Off`, `Zoho`, `Keka`, `TL`, `PM`, `HR`, and related policy terms.
- Contradiction repair when a user challenges a previous incomplete answer.
- Strict answer rules to reduce hallucination, especially around HR/policy numbers, eligibility, salary, leave duration, and other sensitive details.

### Admin Dashboard

- Admin overview dashboard with statistics.
- Department management.
- User management.
- Document table and management controls.
- File upload tab for PDF, TXT, and MD documents.
- URL ingestion tab for approved website crawling.
- Document preview endpoint.
- Upload and ingestion status tracking with `processing`, `ready`, and `failed`.

### Document And URL Ingestion

- Admin file uploads with extension validation for `.pdf`, `.txt`, and `.md`.
- Configurable max upload size using `MAX_UPLOAD_FILE_BYTES`.
- Uploaded files stored under `UPLOAD_DIR`, defaulting to `./uploads`.
- URL ingestion using Firecrawl.
- HTTPS-only crawl validation.
- Crawl host allowlist through `ALLOWED_CRAWL_HOSTS`.
- Internal/private URL protection for crawler inputs.
- Website noise filtering, thin-page filtering, duplicate-page skipping, and priority-page scraping.
- Metadata stored with chunks, including source type, department, document ID, version, source URL, page title, section, and latest-version flag.

### Document Versioning

- New uploads with the same document name and department create a newer version.
- Older matching documents are marked `isLatest: false`.
- Older embeddings are marked as not latest in pgvector metadata.
- Retrieval is designed around latest document metadata to avoid stale source usage.

### Rate Limiting

Rate limiting is implemented with Upstash Redis and fails open when Redis variables are missing, so local development is not blocked.

| Route group | Env variables | Default |
| --- | --- | --- |
| User chat | `RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS` | `20` requests per `3600` seconds |
| User chat burst | `RATE_LIMIT_BURST_REQUESTS`, `RATE_LIMIT_BURST_WINDOW_SECONDS` | `5` requests per `10` seconds |
| Admin RAG/upload | `ADMIN_RAG_RATE_LIMIT_REQUESTS`, `ADMIN_RAG_RATE_LIMIT_WINDOW_SECONDS` | `10` requests per `3600` seconds |
| Admin RAG/upload burst | `ADMIN_RAG_RATE_LIMIT_BURST_REQUESTS`, `ADMIN_RAG_RATE_LIMIT_BURST_WINDOW_SECONDS` | `2` requests per `60` seconds |

When a request is blocked, the API returns HTTP `429` with `Retry-After` and rate-limit headers.

### Security And Validation

- Zod validation for chat, URL upload, and IDs.
- CUID validation for IDs.
- Same-origin mutation checks using `Origin`, `Host`, forwarded headers, and `Sec-Fetch-Site`.
- File type and file size validation for uploads.
- HTTPS-only URL ingestion.
- Crawl domain allowlist.
- Rejection of URLs with credentials, trailing-dot hostnames, localhost, private/internal IP-style hosts, and excluded crawl paths.
- Unauthorized API requests return appropriate `401` or `404` responses.

## API Overview

### Chat APIs

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/chat` | Sends a chat message and streams the assistant response. |
| `GET` / `POST` | `/api/chat/sessions` | Lists or creates chat sessions. |
| `PATCH` / `DELETE` | `/api/chat/sessions/[id]` | Renames or deletes a specific chat session. |
| `GET` | `/api/chat/sessions/[id]/messages` | Reads persisted messages for a session. |

### Admin APIs

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/stats` | Returns admin dashboard statistics. |
| `GET` / `POST` | `/api/admin/departments` | Lists or creates departments. |
| `DELETE` | `/api/admin/departments/[id]` | Deletes a department when it has no assigned documents. |
| `GET` | `/api/admin/documents` | Lists uploaded/ingested documents. |
| `DELETE` | `/api/admin/documents/[id]` | Deletes a document. |
| `GET` | `/api/admin/documents/[id]/preview` | Returns a document preview. |
| `POST` | `/api/admin/upload/file` | Uploads and starts ingestion for PDF/TXT/MD files. |
| `POST` | `/api/admin/upload/url` | Creates and starts ingestion for an approved URL. |

### Auth API

| Route | Purpose |
| --- | --- |
| `/api/auth/[...nextauth]` | NextAuth route handlers for Microsoft Entra ID login/session flow. |

## Data Model

The Prisma schema includes:

- `User`: authenticated users with `user` or `admin` role.
- `Account`, `Session`, `VerificationToken`: NextAuth persistence.
- `Department`: document grouping.
- `Document`: uploaded file or URL ingestion record with type, version, status, and latest flag.
- `ChatSession`: user-owned conversation.
- `ChatMessage`: persisted user/assistant messages and optional source JSON.
- `LangchainPgEmbedding`: pgvector-backed embedding storage.

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+ or Docker Compose Postgres service with pgvector
- Ollama for embeddings
- Groq API key for chat generation
- Microsoft Entra ID app registration
- Firecrawl API key for URL ingestion
- Optional: Upstash Redis for rate limiting
- Optional: local reranker service

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Pull the Ollama embedding model

```bash
ollama pull nomic-embed-text
```

### 3. Set up PostgreSQL with pgvector

Install pgvector if it is not already available:

- macOS: `brew install pgvector`
- Ubuntu: `sudo apt install postgresql-15-pgvector`
- Windows: download from the pgvector releases page

Create the database and extension:

```sql
psql -U postgres
CREATE DATABASE enterprise_chat;
\c enterprise_chat
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### 4. Configure environment

```bash
cp .env.example .env.local
```

Fill these values in `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-generated-secret
AUTH_TRUST_HOST=false
ADMIN_EMAIL=you@yourcompany.com

DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/enterprise_chat

AZURE_AD_CLIENT_ID=replace-with-azure-client-id
AZURE_AD_CLIENT_SECRET=replace-with-azure-client-secret
AZURE_AD_TENANT_ID=replace-with-azure-tenant-id

GROQ_API_KEY=replace-with-groq-api-key
GROQ_MODEL=llama-3.1-8b-instant

OLLAMA_BASE_URL=http://localhost:11434

RERANKER_URL=http://localhost:8000/rerank
RERANKER_MODEL=BAAI/bge-reranker-v2-m3
RERANKER_TIMEOUT_MS=10000

FIRECRAWL_API_KEY=replace-with-firecrawl-api-key
UPLOAD_DIR=./uploads
MAX_UPLOAD_FILE_BYTES=10485760
ALLOWED_CRAWL_HOSTS=hestabit.com,www.hestabit.com

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RATE_LIMIT_REQUESTS=20
RATE_LIMIT_WINDOW_SECONDS=3600
RATE_LIMIT_BURST_REQUESTS=5
RATE_LIMIT_BURST_WINDOW_SECONDS=10
ADMIN_RAG_RATE_LIMIT_REQUESTS=10
ADMIN_RAG_RATE_LIMIT_WINDOW_SECONDS=3600
ADMIN_RAG_RATE_LIMIT_BURST_REQUESTS=2
ADMIN_RAG_RATE_LIMIT_BURST_WINDOW_SECONDS=60
```

Generate `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

### 5. Run Prisma migration and seed

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

### 6. Create uploads directory

```bash
mkdir -p uploads
```

### 7. Start the development server

```bash
pnpm dev
```

Visit `http://localhost:3000`.

## Docker Quick Start

Docker Compose includes:

- Next.js app
- PostgreSQL with pgvector
- Reranker service
- Optional Ollama profile

Start the stack:

```bash
pnpm docker:up
```

Stop the stack:

```bash
pnpm docker:down
```

Notes:

- App host port defaults to `3001` through `APP_PORT`.
- PostgreSQL host port defaults to `5433` through `POSTGRES_PORT`.
- Compose uses `pgvector/pgvector:pg16`.
- Compose sets `OLLAMA_BASE_URL` to `http://host.docker.internal:11434` for host Ollama.
- The optional `ollama` profile can run Ollama in-container when needed.
- The app healthcheck validates unauthorized API guard behavior on `/api/chat/sessions`.

## Azure App Registration

1. Go to Azure Portal -> Entra ID -> App Registrations -> New Registration.
2. Add redirect URI:
   - Local dev: `http://localhost:3000/api/auth/callback/microsoft-entra-id`
   - Docker default: `http://localhost:3001/api/auth/callback/microsoft-entra-id`
3. Add delegated Microsoft Graph permission: `User.Read`.
4. Create a client secret and copy it to `AZURE_AD_CLIENT_SECRET`.
5. Copy the client ID to `AZURE_AD_CLIENT_ID`.
6. Copy the tenant/directory ID to `AZURE_AD_TENANT_ID`.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start local development server. |
| `pnpm build` | Build production Next.js app. |
| `pnpm start` | Start production server after build. |
| `pnpm lint` | Run lint script. |
| `pnpm prisma:generate` | Generate Prisma client. |
| `pnpm prisma:migrate` | Run Prisma development migrations. |
| `pnpm prisma:seed` | Seed initial data. |
| `pnpm db:push` | Push Prisma schema to DB. |
| `pnpm docker:up` | Build and start Docker Compose services. |
| `pnpm docker:down` | Stop Docker Compose services. |
| `pnpm test:smoke:docker` | Run Docker smoke test. |

## Testing Strategy

Phase 1 includes a containerized smoke test:

```bash
pnpm test:smoke:docker
```

The smoke test boots the app and database, validates pgvector availability, checks app reachability, and confirms unauthorized API guard behavior.

For documentation-only changes, at minimum review the README diff. For runtime changes, use:

```bash
pnpm build
pnpm test:smoke:docker
```

## Project Structure

```text
app/
  admin/                  Admin dashboard pages
  api/                    Chat, admin, and auth API routes
  auth/                   Sign-in UI
  chat/                   Chat UI
components/
  admin/                  Admin dashboard components
  chat/                   Chat interface components
  ui/                     Shared UI primitives
lib/
  api/                    API validation, security, rate limit, versioning helpers
  langchain/              LLM, embeddings, ingestion, retrieval, vector store, reranker
  auth.ts                 NextAuth configuration
  prisma.ts               Prisma client singleton
prisma/
  schema.prisma           Database schema
  migrations/             Prisma migrations
  seed.ts                 Seed data
services/reranker/
  app.py                  Local reranking HTTP service
scripts/
  docker-smoke.sh         Containerized smoke test
uploads/
  Uploaded documents, ignored by git
```

## Phase 2 Note

Phase 2 should start from the Phase 1 baseline described here. Any new Phase 2 features, model changes, deployment changes, or architecture decisions should be added to this README as they are finalized.
