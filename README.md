# Hestabit Chatbot

Internal enterprise knowledge assistant built with Next.js, LangChain, pgvector, and Microsoft Entra ID authentication.

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL 15+ installed locally with pgvector extension
- Ollama installed ([https://ollama.com](https://ollama.com))

## Setup

### 1. Pull Ollama models

```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

### 2. Set up PostgreSQL with pgvector

**Install pgvector (if not installed):**
- Mac: `brew install pgvector`
- Ubuntu: `sudo apt install postgresql-15-pgvector`
- Windows: Download from [pgvector releases](https://github.com/pgvector/pgvector/releases)

**Create database and enable extension:**
```sql
psql -U postgres
CREATE DATABASE enterprise_chat;
\c enterprise_chat
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### 3. Install dependencies

```bash
pnpm install
```

### 4. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32`
- `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`
- `ADMIN_EMAIL` — email of the admin user
- `OLLAMA_BASE_URL` — defaults to `http://localhost:11434`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — enables API rate limiting
- `RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS` — normal chat sustained limit, default `20` per `3600` seconds
- `RATE_LIMIT_BURST_REQUESTS`, `RATE_LIMIT_BURST_WINDOW_SECONDS` — normal chat burst limit, default `5` per `10` seconds
- `ADMIN_RAG_RATE_LIMIT_REQUESTS`, `ADMIN_RAG_RATE_LIMIT_WINDOW_SECONDS` — admin upload/RAG sustained limit, default `10` per `3600` seconds
- `ADMIN_RAG_RATE_LIMIT_BURST_REQUESTS`, `ADMIN_RAG_RATE_LIMIT_BURST_WINDOW_SECONDS` — admin upload/RAG burst limit, default `2` per `60` seconds

If the Upstash Redis variables are missing, rate limiting fails open so local development is not blocked.

### 5. Run database migrations and seed

```bash
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

### 6. Create uploads directory

```bash
mkdir -p uploads
```

### 7. Start development server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Docker Quick Start

1. Copy Docker environment template:

```bash
cp .env.docker.example .env.docker
```

2. Start app + Postgres with Docker Compose:

```bash
pnpm docker:up
```

3. Stop services:

```bash
pnpm docker:down
```

Notes:
- App host port defaults to `3001` in Docker (`APP_PORT`) to avoid conflicts with local dev servers on `3000`.
- Auth host validation is enabled via `AUTH_TRUST_HOST=true` in Docker to trust requests on `localhost:${APP_PORT}`.
- Compose includes pgvector-enabled Postgres and initializes the `vector` extension.
- Postgres host port defaults to `5433` in Docker (`POSTGRES_PORT`) to avoid conflicts with local Postgres on `5432`.
- Ollama is external by default through `OLLAMA_BASE_URL` (set to `host.docker.internal` in Docker examples).
- An optional Compose profile named `ollama` exists if you want to run Ollama in-container.

## Testing Strategy (Containerized)

- Fast quality gate: lint + build in CI.
- Docker smoke gate: boots Postgres + app, verifies pgvector extension, checks app reachability, and validates unauthorized API guard behavior.
- Local smoke command:

```bash
pnpm test:smoke:docker
```

## Azure App Registration

1. Go to Azure Portal → Entra ID → App Registrations → New Registration
2. Add Redirect URI:
   - Local dev: `http://localhost:3000/api/auth/callback/azure-ad`
   - Docker default: `http://localhost:3001/api/auth/callback/azure-ad`
3. API Permissions: `User.Read` (Microsoft Graph, delegated)
4. Create a client secret → copy value to `AZURE_AD_CLIENT_SECRET`
5. Copy Client ID → `AZURE_AD_CLIENT_ID`
6. Copy Tenant ID (Directory ID) → `AZURE_AD_TENANT_ID`

## Architecture

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | Flowbite + Flowbite React |
| Auth | NextAuth.js v5 + Microsoft Entra ID |
| LLM | Ollama (llama3.2) |
| Embeddings | Ollama (nomic-embed-text) |
| RAG | LangChain.js |
| Vector DB | pgvector (PostgreSQL) |
| ORM | Prisma |
| Package Manager | pnpm |

## Features

- **Admin Dashboard**: Upload PDF/TXT/MD files or URLs per department
- **RAG Pipeline**: LangChain handles loading → splitting → embedding → retrieval → generation
- **Streaming Chat**: Real-time token streaming via SSE
- **Document Versioning**: Automatic versioning with isLatest tracking
- **Role-based Access**: Admin and user roles via Microsoft SSO
- **Source Citations**: Each assistant response shows source documents

## Project Structure

```
app/
  admin/          # Admin dashboard pages
  chat/           # Chat interface
  api/            # API routes
components/
  admin/          # Admin UI components
  chat/           # Chat UI components
lib/
  langchain/      # RAG pipeline (embeddings, llm, vectorstore, ingestion, retrieval)
  auth.ts         # NextAuth configuration
  prisma.ts       # Prisma client singleton
prisma/
  schema.prisma   # Database schema
  seed.ts         # Seed data
```
