import { ChatGroq } from "@langchain/groq";

let llmClient: ChatGroq | null = null;

export function getLlm(): ChatGroq {
  if (llmClient) return llmClient;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is required for chat generation");
  }

  llmClient = new ChatGroq({
    model: process.env.GROQ_MODEL ?? "mixtral-8x7b-32768",
    apiKey,
    temperature: 0,
  });

  return llmClient;
}
