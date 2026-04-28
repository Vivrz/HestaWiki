import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Document } from "@langchain/core/documents";
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
    // Raw SQL query using PostgreSQL full-text search
    const results = await prisma.$queryRaw`
      SELECT 
        id,
        content,
        metadata,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) as rank
      FROM langchain_pg_embedding
      WHERE 
        plainto_tsquery('english', ${query}) @@ to_tsvector('english', content)
        AND (metadata->>'isLatest')::boolean = ${filter?.isLatest ?? true}
        ${filter?.docId ? `AND metadata->>'docId' = ${filter.docId}` : ""}
        ${filter?.departmentId ? `AND metadata->>'departmentId' = ${filter.departmentId}` : ""}
      ORDER BY rank DESC
      LIMIT ${k}
    ` as Array<{ id: string; content: string; metadata: Record<string, unknown>; rank: number }>;

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
  const filter = {
    isLatest: opts.isLatest ?? true,
    ...(opts.docId ? { docId: opts.docId } : {}),
    ...(opts.departmentId ? { departmentId: opts.departmentId } : {}),
  };

  // For short queries, use hybrid search
  const isShortQuery = query.split(/\s+/).length <= 3;

  const vectorResults = await vectorStore.similaritySearch(query, 6, filter);

  if (isShortQuery) {
    // Also perform keyword search for short queries
    const keywordResults = await performKeywordSearch(query, 6, filter);

    // Combine and deduplicate results
    const combined = new Map<string, Document>();

    // Add vector results (semantic relevance)
    vectorResults.forEach((doc, idx) => {
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

  return vectorResults;
}

