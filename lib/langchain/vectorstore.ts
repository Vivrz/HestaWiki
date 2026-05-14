import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Document } from "@langchain/core/documents";
import { Prisma } from "@prisma/client"; // UPDATED: needed for Prisma.sql and Prisma.empty
import { embeddings } from "./embeddings";
import { prisma } from "../prisma";

export interface RetrievalFilter {
  docId?: string;
  departmentId?: string;
  isLatest?: boolean;
  sourceType?: "document" | "website";
}

const VECTOR_DISTANCE_THRESHOLD = 0.50;
const VECTOR_K = 12;
const RESULT_LIMIT = 8;

// Boost chunks from these pages for broad overview queries.
const FLAGSHIP_URL_PATTERNS = [
  /^https?:\/\/(www\.)?hestabit\.com\/?$/i,
  /\/what-we-do\/?$/i,
  /\/enterprises\/?$/i,
  /\/digital-transformation\/?$/i,
];

// Terms indicating a broad overview query.
const OVERVIEW_QUERY_TERMS = [
  "products", "services", "offerings", "solutions",
  "what does", "what do", "tell me about hestabit",
  "about hestabit", "overview", "introduce",
];

// Terms indicating deep-intent queries (full page coverage).
const DEEP_INTENT_TERMS = [
  "in detail", "in depth", "walk me through", "tell me everything",
  "explain", "describe", "elaborate", "comprehensive", "complete picture",
  "full story", "step by step", "step-by-step", "day at hestabit",
];

const FLAGSHIP_BOOST = 0.2;

export type QueryIntent = "lookup" | "overview" | "deep";

export function detectIntent(query: string): QueryIntent {
  const q = query.toLowerCase();
  if (DEEP_INTENT_TERMS.some(term => q.includes(term))) return "deep";
  if (OVERVIEW_QUERY_TERMS.some(term => q.includes(term))) return "overview";
  return "lookup";
}

function isOverviewQuery(query: string): boolean {
  return detectIntent(query) === "overview";
}

function isDeepQuery(query: string): boolean {
  return detectIntent(query) === "deep";
}

function isFlagshipChunk(doc: Document): boolean {
  const url = (doc.metadata as Record<string, unknown>).source_url;
  if (typeof url !== "string") return false;
  return FLAGSHIP_URL_PATTERNS.some(pattern => pattern.test(url));
}

async function fetchAllChunksForUrl(
  sourceUrl: string,
  excludeContentPrefixes: Set<string>,
  limit: number = 12,
): Promise<Document[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ content: string; metadata: Record<string, unknown> }>>`
      SELECT content, metadata
      FROM langchain_pg_embedding
      WHERE metadata->>'source' = 'website'
        AND metadata->>'source_url' = ${sourceUrl}
      LIMIT ${limit}
    `;
    return rows
      .filter(r => !excludeContentPrefixes.has(r.content.slice(0, 80)))
      .map(r => new Document({ pageContent: r.content, metadata: r.metadata }));
  } catch (err) {
    console.error("Page expansion fetch error:", err);
    return [];
  }
}

async function fetchFlagshipChunks(limit: number = 4): Promise<Document[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ content: string; metadata: Record<string, unknown>; priority: number }>>`
      SELECT
        content,
        metadata,
        CASE
          WHEN content ILIKE '%digital twin%' AND content ILIKE '%ai agents%' THEN 3
          WHEN content ILIKE '%digital twin%' OR content ILIKE '%ai agents%' THEN 2
          WHEN content ILIKE '%predictive analytics%' OR content ILIKE '%vision intelligence%' THEN 1
          ELSE 0
        END AS priority
      FROM langchain_pg_embedding
      WHERE metadata->>'source' = 'website'
        AND (
          metadata->>'source_url' = 'https://www.hestabit.com/'
          OR metadata->>'source_url' = 'https://www.hestabit.com'
          OR metadata->>'source_url' LIKE 'https://www.hestabit.com/what-we-do%'
          OR metadata->>'source_url' LIKE 'https://www.hestabit.com/enterprises%'
        )
      ORDER BY priority DESC, length(content) DESC
      LIMIT ${limit}
    `;
    return rows.map(r => new Document({ pageContent: r.content, metadata: r.metadata }));
  } catch (err) {
    console.error("Flagship fetch error:", err);
    return [];
  }
}

function extractKeyTerms(query: string): string[] {
  const stopWords = new Set([
    "who", "what", "where", "when", "why", "how", "is", "are", "was", "were",
    "the", "a", "an", "at", "in", "on", "for", "of", "to", "from", "with",
    "about", "tell", "me", "you", "your", "we", "they", "them", "their",
    "hestabit", "involvement", "give", "show", "know", "please", "kindly",
    "details", "detail", "information", "info", "regarding"
  ]);

  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

function buildKeywordQuery(query: string): string {
  const terms = extractKeyTerms(query);
  if (terms.length === 0) return query;
  // Escape single quotes and join with " or " (websearch_to_tsquery supports OR syntax).
  return terms.map(t => t.replace(/'/g, "")).join(" or ");
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

export async function performKeywordSearch(
  query: string,
  k: number = 6,
  filter?: RetrievalFilter
): Promise<Document[]> {
  try {
    const searchQuery = buildKeywordQuery(query);

    // Use websearch_to_tsquery for better multi-word query handling
    const results = await prisma.$queryRaw<Array<{ id: string; content: string; metadata: Record<string, unknown>; rank: number }>>`
      SELECT
        id,
        content,
        metadata,
        ts_rank(to_tsvector('english', content), websearch_to_tsquery('english', ${searchQuery})) as rank
      FROM langchain_pg_embedding
      WHERE
        websearch_to_tsquery('english', ${searchQuery}) @@ to_tsvector('english', content)
        ${filter?.sourceType ? Prisma.sql`AND metadata->>'source' = ${filter.sourceType}` : Prisma.empty}
        AND (
          (
            metadata->>'source' = 'website'
            AND (metadata->>'isLatest' IS NULL OR (metadata->>'isLatest')::boolean = true)
          )
          OR (
            metadata->>'source' = 'document'
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

export async function getHybridRetriever(
  query: string,
  opts: RetrievalFilter = {}
) {
  const vectorStore = await getVectorStore();

  const hrFilter = {
    source: "document",
    isLatest: opts.isLatest ?? true,
    ...(opts.docId ? { docId: opts.docId } : {}),
    ...(opts.departmentId ? { departmentId: opts.departmentId } : {}),
  };

  const webFilter = { source: "website" };

  const searchDocument = !opts.sourceType || opts.sourceType === "document";
  const searchWebsite = !opts.sourceType || opts.sourceType === "website";

  const overviewQuery = isOverviewQuery(query) && searchWebsite;
  const [hrResults, webResults, keywordResults, flagshipDocs] = await Promise.all([
    searchDocument
      ? vectorStore.similaritySearchWithScore(query, VECTOR_K, hrFilter)
      : Promise.resolve([]),
    searchWebsite
      ? vectorStore.similaritySearchWithScore(query, VECTOR_K, webFilter)
      : Promise.resolve([]),
    performKeywordSearch(query, VECTOR_K, opts),
    overviewQuery ? fetchFlagshipChunks(4) : Promise.resolve([] as Document[]),
  ]);

  const filteredHR = hrResults.filter(([_, score]) => score <= VECTOR_DISTANCE_THRESHOLD);
  const filteredWeb = webResults.filter(([_, score]) => score <= VECTOR_DISTANCE_THRESHOLD);

  const scored = new Map<string, { doc: Document; score: number }>();

  for (const [doc, dist] of [...filteredHR, ...filteredWeb]) {
    const key = generateDocKey(doc);
    scored.set(key, { doc, score: (1 - dist) * 0.4 });
  }

  for (const doc of keywordResults) {
    const key = generateDocKey(doc);
    const existing = scored.get(key);
    if (existing) {
      existing.score += 0.6;
    } else {
      scored.set(key, { doc, score: 0.6 });
    }
  }

  if (overviewQuery) {
    for (const entry of scored.values()) {
      if (isFlagshipChunk(entry.doc)) entry.score += FLAGSHIP_BOOST;
    }
    for (const doc of flagshipDocs) {
      const key = generateDocKey(doc);
      const existing = scored.get(key);
      if (existing) {
        existing.score = Math.max(existing.score, 0.85);
      } else {
        scored.set(key, { doc, score: 0.85 });
      }
    }
  }

  const deepQuery = isDeepQuery(query) && searchWebsite;
  if (deepQuery) {
    const urlScores = new Map<string, number>();
    const seenContentPrefixes = new Set<string>();
    for (const { doc, score } of scored.values()) {
      const meta = doc.metadata as Record<string, unknown>;
      if (meta.source !== "website") continue;
      const url = meta.source_url;
      if (typeof url !== "string") continue;
      urlScores.set(url, (urlScores.get(url) ?? 0) + score);
      seenContentPrefixes.add(doc.pageContent.slice(0, 80));
    }

    const topUrl = [...urlScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (topUrl) {
      const extraChunks = await fetchAllChunksForUrl(topUrl, seenContentPrefixes, 12);
      for (const doc of extraChunks) {
        const key = generateDocKey(doc);
        if (!scored.has(key)) {
          scored.set(key, { doc, score: 0.75 });
        }
      }
    }
  }

  const resultLimit = deepQuery ? RESULT_LIMIT + 6 : RESULT_LIMIT;

  return Array.from(scored.values())
    .sort((a, b) => b.score - a.score)
    .map(({ doc }) => doc)
    .slice(0, resultLimit);
}

function generateDocKey(doc: Document): string {
  const meta = doc.metadata as Record<string, unknown>;
  if (meta.source === "website" && meta.source_url) {
    return `web:${meta.source_url}:${String(doc.pageContent).slice(0, 80)}`;
  }
  if (meta.docId && meta.chunkIndex !== undefined) {
    return `doc:${meta.docId}:${meta.chunkIndex}`;
  }
  return `content:${String(doc.pageContent).slice(0, 120)}`;
}

