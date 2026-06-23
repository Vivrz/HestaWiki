import { Document } from "@langchain/core/documents";

const DEFAULT_RERANKER_MODEL = "BAAI/bge-reranker-v2-m3";
const DEFAULT_RERANKER_TIMEOUT_MS = 10_000;

type RerankResponse = {
  scores?: unknown;
  results?: unknown;
};

type RerankedDocument = {
  doc: Document;
  score: number;
  originalIndex: number;
};

let warnedDisabled = false;
let warnedFailure = false;

function rerankerModel(): string {
  return process.env.RERANKER_MODEL?.trim() || DEFAULT_RERANKER_MODEL;
}

function rerankerTimeoutMs(): number {
  const parsed = Number(process.env.RERANKER_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RERANKER_TIMEOUT_MS;
}

function parseScores(response: RerankResponse, expectedCount: number): number[] | null {
  if (Array.isArray(response.scores)) {
    const scores = response.scores.map(Number);
    return scores.length === expectedCount && scores.every(Number.isFinite) ? scores : null;
  }

  if (Array.isArray(response.results)) {
    const scores = Array<number | null>(expectedCount).fill(null);
    for (const item of response.results) {
      if (!item || typeof item !== "object") return null;
      const result = item as Record<string, unknown>;
      const index = Number(result.index);
      const score = Number(result.relevance_score ?? result.score);
      if (!Number.isInteger(index) || index < 0 || index >= expectedCount || !Number.isFinite(score)) {
        return null;
      }
      scores[index] = score;
    }
    return scores.every((score) => typeof score === "number" && Number.isFinite(score))
      ? (scores as number[])
      : null;
  }

  return null;
}

export async function rerankDocuments(
  query: string,
  docs: Document[],
): Promise<Document[] | null> {
  const endpoint = process.env.RERANKER_URL?.trim();
  if (!endpoint) {
    if (!warnedDisabled) {
      console.warn("Reranking is disabled because RERANKER_URL is not configured.");
      warnedDisabled = true;
    }
    return null;
  }

  if (docs.length === 0) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), rerankerTimeoutMs());

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: rerankerModel(),
        query,
        documents: docs.map((doc) => doc.pageContent),
        pairs: docs.map((doc) => [query, doc.pageContent]),
      }),
    });

    if (!response.ok) {
      throw new Error(`Reranker returned HTTP ${response.status}`);
    }

    const body = (await response.json()) as RerankResponse;
    const scores = parseScores(body, docs.length);
    if (!scores) {
      throw new Error("Reranker response did not contain valid scores");
    }

    return docs
      .map<RerankedDocument>((doc, originalIndex) => ({
        doc,
        originalIndex,
        score: scores[originalIndex],
      }))
      .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
      .map(({ doc }) => doc);
  } catch (error) {
    if (!warnedFailure) {
      console.warn("Reranking failed; falling back to hybrid ranking:", error);
      warnedFailure = true;
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
