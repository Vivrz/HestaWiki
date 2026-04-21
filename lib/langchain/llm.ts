import { ChatOllama } from "@langchain/community/chat_models/ollama";

export const llm = new ChatOllama({
  model: "llama3.2",
  baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  temperature: 0.2,
});
