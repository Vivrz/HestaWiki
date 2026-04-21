import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { llm } from "./llm";
import { getRetriever, type RetrievalFilter } from "./vectorstore";

export type { RetrievalFilter };

const SYSTEM_PROMPT = `You are a helpful enterprise assistant.
Answer questions using ONLY the context below.
If the answer is not in the context, say you don't have that information.
Always cite the document name and department your answer comes from.

CONTEXT:
{context}`;

export async function* streamAnswer(
  query: string,
  opts: RetrievalFilter = {}
): AsyncGenerator<string, void, unknown> {
  const retriever = await getRetriever(opts);

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    ["human", "{input}"],
  ]);

  const combineDocsChain = await createStuffDocumentsChain({ llm, prompt });
  const retrievalChain = await createRetrievalChain({
    retriever,
    combineDocsChain,
  });

  const stream = await retrievalChain.stream({ input: query });

  for await (const chunk of stream) {
    if (chunk.answer) {
      yield chunk.answer as string;
    }
  }
}

export interface SourceMetadata {
  docId: string;
  docName: string;
  departmentId: string;
  department: string;
  version: number;
  chunkIndex: number;
  isLatest: string; // stored as JSON boolean but ->>' returns text
}

export async function getRelevantSources(
  query: string,
  opts: RetrievalFilter = {}
): Promise<SourceMetadata[]> {
  const retriever = await getRetriever(opts);
  const docs = await retriever.invoke(query);

  // Deduplicate by docId — multiple chunks from the same doc count once
  const seen = new Set<string>();
  const sources: SourceMetadata[] = [];

  for (const doc of docs) {
    const { docId } = doc.metadata as SourceMetadata;
    if (!seen.has(docId)) {
      seen.add(docId);
      sources.push(doc.metadata as SourceMetadata);
    }
  }

  return sources;
}
