import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Document } from "@langchain/core/documents";
import { Prisma } from "@prisma/client"; // UPDATED: needed for Prisma.sql and Prisma.empty
import { embeddings } from "./embeddings";
import { prisma } from "../prisma";

export interface RetrievalFilter {
  docId?: string;
  departmentId?: string;
  isLatest?: boolean;
}

export async function getVectorStore(): Promise<PGVectorStore> {
  return await PGVectorStore.initialize(embeddings, {
    postgresConnectionOptions: {
      connectionString: process.env.DATABASE_URL,
    },
    tableName: "langchain_pg_embedding",
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
  });
}

// BM25/Keyword search using PostgreSQL full-text search
export async function performKeywordSearch(
  query: string,
  k: number = 6,
  filter?: RetrievalFilter
): Promise<Document[]> {
  try {
    // Raw SQL query using PostgreSQL full-text search with safe Prisma.sql formatting
    const results = await prisma.$queryRaw<Array<{ id: string; content: string; metadata: Record<string, unknown>; rank: number }>>`
      SELECT 
        id,
        content,
        metadata,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) as rank
      FROM langchain_pg_embedding
      WHERE 
        plainto_tsquery('english', ${query}) @@ to_tsvector('english', content)
        AND (
          (
            metadata->>'source' = 'website'
            AND (metadata->>'isLatest' IS NULL OR (metadata->>'isLatest')::boolean = true)
          )
          OR (
            (metadata->>'source' = 'document')
            AND (metadata->>'isLatest')::boolean = ${filter?.isLatest ?? true}
            ${filter?.docId ? Prisma.sql`AND metadata->>'docId' = ${filter.docId}` : Prisma.empty}
            ${filter?.departmentId ? Prisma.sql`AND metadata->>'departmentId' = ${filter.departmentId}` : Prisma.empty}
          )
        )
      ORDER BY rank DESC
      LIMIT ${k}
    `;

    return results.map(
      (result) =>
        new Document({
          pageContent: result.content,
          metadata: result.metadata,
        })
    );
  } catch (error) {
    console.error("Keyword search error:", error);
    return [];
  }
}

// Hybrid retriever combining vector search + keyword search
export async function getHybridRetriever(
  query: string,
  opts: RetrievalFilter = {}
) {
  const vectorStore = await getVectorStore();

  // HR filter
  const hrFilter = {
    source: "document",
    isLatest: opts.isLatest ?? true,
    ...(opts.docId ? { docId: opts.docId } : {}),
    ...(opts.departmentId ? { departmentId: opts.departmentId } : {}),
  };

  // Website filter
  const webFilter = {
    source: "website",
  };

  // For short queries, use hybrid search
  const isShortQuery = query.split(/\s+/).length <= 3;

  // Search BOTH HR documents and website chunks
  const [hrResults, webResults] = await Promise.all([
    vectorStore.similaritySearchWithScore(query, 6, hrFilter),
    vectorStore.similaritySearchWithScore(query, 6, webFilter),
  ]);

  // Combine and sort by score (lower distance is better)
  const combinedVectors = [...hrResults, ...webResults]
    .sort((a, b) => a[1] - b[1]);

  const allVectors = combinedVectors.map(([doc]) => doc);

  if (isShortQuery) {
    // Also perform keyword search for short queries
    const keywordResults = await performKeywordSearch(query, 6, opts);

    // Combine and deduplicate results
    const combined = new Map<string, Document>();

    // Add vector results (semantic relevance)
    allVectors.forEach((doc, idx) => {
      const key = doc.pageContent.slice(0, 100);
      combined.set(key, doc);
    });

    // Add keyword results (exact matches benefit)
    keywordResults.forEach((doc) => {
      const key = doc.pageContent.slice(0, 100);
      if (!combined.has(key)) {
        combined.set(key, doc);
      }
    });

    return Array.from(combined.values()).slice(0, 6);
  }

  return allVectors.slice(0, 6);
}

