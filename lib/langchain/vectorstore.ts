import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Document } from "@langchain/core/documents";
import { Prisma } from "@prisma/client"; // UPDATED: needed for Prisma.sql and Prisma.empty
import { embeddings } from "./embeddings";
import { rerankDocuments } from "./reranker";
import { prisma } from "../prisma";


let vectorStore: PGVectorStore | null = null;
export interface RetrievalFilter {
  docId?: string;
  departmentId?: string;
  isLatest?: boolean;
  sourceType?: "document" | "website";
}

const VECTOR_DISTANCE_THRESHOLD = 0.50;
const VECTOR_K = 30;
const RERANK_CANDIDATE_LIMIT = 30;
const RERANK_TOP_K = 5;
const BM25_K1 = 1.2;
const BM25_B = 0.75;
const MIN_BM25_TERM_LENGTH = 3;

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

function buildBm25Terms(query: string): string[] {
  return Array.from(
    new Set(
      extractKeyTerms(query)
        .map(term => term.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase())
        .filter(term => term.length >= MIN_BM25_TERM_LENGTH)
    )
  );
}

export async function getVectorStore(): Promise<PGVectorStore> {
  if(vectorStore){return vectorStore;}

  vectorStore = await PGVectorStore.initialize(embeddings, {
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
  return vectorStore;
}

export async function performKeywordSearch(
  query: string,
  k: number = 6,
  filter?: RetrievalFilter
): Promise<Document[]> {
  try {
    const searchTerms = buildBm25Terms(query);
    if (searchTerms.length === 0) return [];

    const queryTermValues = Prisma.join(
      searchTerms.map(term => Prisma.sql`(${term})`)
    );

    const results = await prisma.$queryRaw<Array<{ id: string; content: string; metadata: Record<string, unknown>; bm25_score: number }>>`
      WITH query_terms(term) AS (
        VALUES ${queryTermValues}
      ),
      filtered AS (
        SELECT id, content, metadata
        FROM langchain_pg_embedding
        WHERE content IS NOT NULL
          AND length(trim(content)) > 0
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
      ),
      doc_lengths AS (
        SELECT
          f.id,
          count(token.token)::double precision AS doc_len
        FROM filtered f
        CROSS JOIN LATERAL regexp_split_to_table(
          lower(coalesce(f.content, '')),
          '[^[:alnum:]]+'
        ) AS token(token)
        WHERE token.token <> ''
        GROUP BY f.id
      ),
      token_counts AS (
        SELECT
          f.id,
          f.content,
          f.metadata,
          token.token AS term,
          count(*)::double precision AS term_freq
        FROM filtered f
        CROSS JOIN LATERAL regexp_split_to_table(
          lower(coalesce(f.content, '')),
          '[^[:alnum:]]+'
        ) AS token(token)
        JOIN query_terms qt ON qt.term = token.token
        GROUP BY f.id, f.content, f.metadata, token.token
      ),
      corpus AS (
        SELECT
          count(*)::double precision AS total_docs,
          avg(doc_len)::double precision AS avg_doc_len
        FROM doc_lengths
      ),
      term_stats AS (
        SELECT
          term,
          count(*)::double precision AS doc_freq
        FROM token_counts
        GROUP BY term
      )
      SELECT
        tc.id,
        tc.content,
        tc.metadata,
        sum(
          ln(1 + ((corpus.total_docs - ts.doc_freq + 0.5) / (ts.doc_freq + 0.5)))
          * (
            (tc.term_freq * (${BM25_K1} + 1))
            / (
              tc.term_freq
              + ${BM25_K1} * (
                1 - ${BM25_B}
                + ${BM25_B} * (dl.doc_len / nullif(corpus.avg_doc_len, 0))
              )
            )
          )
        ) AS bm25_score
      FROM token_counts tc
      JOIN doc_lengths dl ON dl.id = tc.id
      JOIN term_stats ts ON ts.term = tc.term
      CROSS JOIN corpus
      GROUP BY tc.id, tc.content, tc.metadata
      ORDER BY bm25_score DESC
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
    console.error("BM25 keyword search error:", error);
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

  const webFilter = { source: "website", isLatest: true };

  const searchDocument = !opts.sourceType || opts.sourceType === "document";
  const searchWebsite = !opts.sourceType || opts.sourceType === "website";

  const overviewQuery = isOverviewQuery(query) && searchWebsite;
  const [hrResults, webResults, bm25Results, flagshipDocs] = await Promise.all([
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
  for (const doc of bm25Results) {
    const key = generateDocKey(doc);
    const existing = scored.get(key);
    if (existing) {
      existing.score += 0.6;
    } else {
      scored.set(key, { doc, score: 0.6 });
    }
  }

  // Boost website chunks whose page context matches query terms
  if (searchWebsite) {
    const queryTerms = extractKeyTerms(query);
    for (const entry of scored.values()) {
      const meta = entry.doc.metadata as Record<string, unknown>;
      if (meta.source !== "website") continue;
      const title = String(meta.page_title ?? "").toLowerCase();
      const section = String(meta.section ?? "").toLowerCase();
      if (queryTerms.some(t => title.includes(t) || section.includes(t))) {
        entry.score += 0.15;
      }
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

  const fusedCandidates = Array.from(scored.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, RERANK_CANDIDATE_LIMIT);
  const fusedDocs = fusedCandidates.map(({ doc }) => doc);
  const rerankedDocs = await rerankDocuments(query, fusedDocs);
  const topDocs = (rerankedDocs ?? fusedDocs).slice(0, RERANK_TOP_K);

  const selected = new Map<string, Document>();
  for (const doc of topDocs) {
    selected.set(generateDocKey(doc), doc);
  }

  // Use reranked top chunks as anchors, then add neighbors for continuity.
  const adjacentDocs = await fetchAdjacentChunks(
    topDocs.map((doc) => ({ doc, score: 1 })),
    new Map(
      Array.from(selected.entries()).map(([key, doc]) => [
        key,
        { doc, score: 1 },
      ]),
    ),
  );
  for (const doc of adjacentDocs) {
    const key = generateDocKey(doc);
    if (!selected.has(key)) {
      selected.set(key, doc);
    }
  }

  return Array.from(selected.values());
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

async function fetchAdjacentChunks(
  candidates: { doc: Document; score: number }[],
  existing: Map<string, { doc: Document; score: number }>
): Promise<Document[]> {
  const adjacentDocs: Document[] = [];

  for (const { doc } of candidates) {
    const meta = doc.metadata as Record<string, unknown>;
    const idx = (meta.chunkIndex ?? meta.chunk_index) as number | undefined;
    if (typeof idx !== "number") continue;

    const adjacentIndices = [idx - 1, idx + 1].filter(i => i >= 0);
    if (adjacentIndices.length === 0) continue;

    try {
      let rows: Array<{ content: string; metadata: Record<string, unknown> }> = [];

      if (meta.source === "website" && meta.source_url) {
        rows = await prisma.$queryRaw`
          SELECT content, metadata
          FROM langchain_pg_embedding
          WHERE metadata->>'source_url' = ${meta.source_url as string}
            AND (
              (metadata->>'chunk_index')::int = ${idx - 1}
              OR (metadata->>'chunk_index')::int = ${idx + 1}
            )
        `;
      } else if (meta.docId) {
        rows = await prisma.$queryRaw`
          SELECT content, metadata
          FROM langchain_pg_embedding
          WHERE metadata->>'docId' = ${meta.docId as string}
            AND (
              (metadata->>'chunkIndex')::int = ${idx - 1}
              OR (metadata->>'chunkIndex')::int = ${idx + 1}
            )
        `;
      }

      for (const row of rows) {
        const adjDoc = new Document({ pageContent: row.content, metadata: row.metadata });
        const key = generateDocKey(adjDoc);
        if (!existing.has(key) && !adjacentDocs.some(d => generateDocKey(d) === key)) {
          adjacentDocs.push(adjDoc);
        }
      }
    } catch (err) {
      console.error("Adjacency fetch error:", err);
    }
  }

  return adjacentDocs;
}
