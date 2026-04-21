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

## Azure App Registration

1. Go to Azure Portal → Entra ID → App Registrations → New Registration
2. Add Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
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
