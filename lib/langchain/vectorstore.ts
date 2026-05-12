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

const VECTOR_DISTANCE_THRESHOLD = 0.55;
const VECTOR_K = 12;
const RESULT_LIMIT = 8;

// URLs that summarize the company's offerings. Chunks from these pages are
// boosted for broad/overview queries because they tend to enumerate flagship
// products and services in one place.
const FLAGSHIP_URL_PATTERNS = [
  /^https?:\/\/(www\.)?hestabit\.com\/?$/i,
  /\/what-we-do\/?$/i,
  /\/enterprises\/?$/i,
  /\/digital-transformation\/?$/i,
];

// Words that indicate the user is asking a broad overview question. Only in
// this case do we boost the flagship pages, so specific deep queries (like
// "saumya tenguria") aren't drowned out by generic landing-page chunks.
const OVERVIEW_QUERY_TERMS = [
  "products", "services", "offerings", "solutions",
  "what does", "what do", "tell me about hestabit",
  "about hestabit", "overview", "introduce",
];

// Phrases indicating the user wants the FULL coverage of a single topic / page,
// not just a top fact. For these queries we expand retrieval to include all
// chunks of the most-relevant page (Layer 2 — page expansion).
const DEEP_INTENT_TERMS = [
  "in detail", "in depth", "walk me through", "tell me everything",
  "explain", "describe", "elaborate", "comprehensive", "complete picture",
  "full story", "step by step", "step-by-step", "day at hestabit",
];

const FLAGSHIP_BOOST = 0.2;

export type QueryIntent = "lookup" | "overview" | "deep";

// Classifies how MUCH context the user needs, independent of WHICH source.
// - lookup:   single-fact answer (e.g., "who is the CEO")
// - overview: broad survey of an area (e.g., "what products do you have")
// - deep:    full coverage of one topic/page (e.g., "tell me in detail about a day at hestabit")
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

// For deep-intent queries the user wants the FULL coverage of one topic, so
// after standard retrieval we identify the top page (by aggregate score across
// its chunks) and fetch the remaining chunks of that page from Postgres. This
// guarantees the LLM gets the whole page rather than a few scattered chunks.
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

// Directly fetch chunks from flagship landing pages. Used for broad overview
// queries where the homepage chunk's embedding is often too generic to pass
// vector similarity threshold but its content is exactly what the user wants.
//
// Priority: chunks that explicitly enumerate Hestabit's flagship offerings
// ("AI Agents", "Predictive Analytics", "Vision Intelligence", "Digital Twin")
// rank first, since those are the canonical "products" answer.
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

// Extract key terms from query for better keyword search.
// Returns an array of significant terms (stop words and generic words removed).
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

// Build a tsquery expression that ORs all key terms so ANY match boosts the chunk.
// Falls back to the raw query if no significant terms remain.
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

// BM25/Keyword search using PostgreSQL full-text search
export async function performKeywordSearch(
  query: string,
  k: number = 6,
  filter?: RetrievalFilter
): Promise<Document[]> {
  try {
    // Build an OR tsquery from the key terms so ANY matching term surfaces the chunk.
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

// Hybrid retriever combining vector search + keyword search (ALWAYS hybrid)
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

  // Determine which sources to search based on classifier routing
  const searchDocument = !opts.sourceType || opts.sourceType === "document";
  const searchWebsite = !opts.sourceType || opts.sourceType === "website";

  // For broad overview queries, directly fetch flagship landing-page chunks in
  // parallel — they often summarize the company's products/services in one
  // place but their embedding distance is too generic to clear the vector
  // threshold against verbose user queries.
  const overviewQuery = isOverviewQuery(query) && searchWebsite;

  // Search sources in parallel with increased k for better coverage
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

  // Filter by relevance threshold (lower distance = better match)
  const filteredHR = hrResults.filter(([_, score]) => score <= VECTOR_DISTANCE_THRESHOLD);
  const filteredWeb = webResults.filter(([_, score]) => score <= VECTOR_DISTANCE_THRESHOLD);

  // Build scored map: vector score (0.4 weight) + keyword boost (0.6 weight)
  // Prioritize keyword matches (BM25) over generic vector hits
  const scored = new Map<string, { doc: Document; score: number }>();

  // Add vector results with normalized score (invert distance so higher = better)
  for (const [doc, dist] of [...filteredHR, ...filteredWeb]) {
    const key = generateDocKey(doc);
    const vectorScore = (1 - dist) * 0.4; // Reduced from 0.6
    scored.set(key, { doc, score: vectorScore });
  }

  // Merge keyword results with boost
  for (const doc of keywordResults) {
    const key = generateDocKey(doc);
    const existing = scored.get(key);
    if (existing) {
      // Found in both vector + keyword → boost score significantly
      existing.score += 0.6; // Increased from 0.4
    } else {
      // Keyword-only result — still valuable for exact-match queries
      scored.set(key, { doc, score: 0.6 }); // Increased from 0.4
    }
  }

  // Boost any already-retrieved flagship chunks for broad/overview queries.
  if (overviewQuery) {
    for (const entry of scored.values()) {
      if (isFlagshipChunk(entry.doc)) {
        entry.score += FLAGSHIP_BOOST;
      }
    }
    // Inject directly-fetched flagship chunks with a strong baseline score so
    // they reliably appear in the final RESULT_LIMIT slice.
    for (const doc of flagshipDocs) {
      const key = generateDocKey(doc);
      const existing = scored.get(key);
      const baseline = 0.85;
      if (existing) {
        existing.score = Math.max(existing.score, baseline);
      } else {
        scored.set(key, { doc, score: baseline });
      }
    }
  }

  // Layer 2: Same-page chunk expansion for deep-intent queries.
  // Identify the website page with the highest aggregate score across retrieved
  // chunks, then pull the remaining chunks of that page so the LLM sees the
  // whole topic rather than scattered fragments.
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
      // Inject with a baseline score just below the highest existing score so
      // they appear in the result set without overriding strong direct matches.
      const baseline = 0.75;
      for (const doc of extraChunks) {
        const key = generateDocKey(doc);
        if (!scored.has(key)) {
          scored.set(key, { doc, score: baseline });
        }
      }
    }
  }

  // Deep queries need more context (full page coverage); other queries keep
  // the tighter default to stay focused.
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

