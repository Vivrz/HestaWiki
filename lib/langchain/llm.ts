import { ChatGroq } from "@langchain/groq";

export const llm = new ChatGroq({
  model: process.env.GROQ_MODEL ?? "mixtral-8x7b-32768",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.2,
});
