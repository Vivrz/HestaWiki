import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { embeddings } from "./embeddings";

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

export async function getRetriever(opts: RetrievalFilter = {}) {
  const vectorStore = await getVectorStore();
  const filter = {
    isLatest: opts.isLatest ?? true,
    ...(opts.docId ? { docId: opts.docId } : {}),
    ...(opts.departmentId ? { departmentId: opts.departmentId } : {}),
  };

  return vectorStore.asRetriever({
    k: 4,
    filter,
  });
}
