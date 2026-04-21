import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";

export const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
});
