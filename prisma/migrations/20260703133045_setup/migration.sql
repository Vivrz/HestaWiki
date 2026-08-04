-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "langchain_pg_embedding" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "content" TEXT,
    "metadata" JSONB,
    "embedding" vector(768) NOT NULL,

    CONSTRAINT "langchain_pg_embedding_pkey" PRIMARY KEY ("id")
);
