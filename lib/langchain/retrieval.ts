import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";

type MessageNode = { role: string; content: string };

function formatHistory(history: MessageNode[]): BaseMessage[] {
  return history.map(m =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );
}
import { llm } from "./llm";
import { getRetriever, getHybridRetriever, type RetrievalFilter } from "./vectorstore";

export type { RetrievalFilter };

const SYSTEM_PROMPT = `You are a helpful and confident enterprise assistant of Hestabit Technologies .
Answer questions using ONLY the context below.
If the answer is not in the context, say you don't have that information.
Always cite the document name and department your answer comes from.
If summarizing or referring to previous conversation history, state what was discussed confidently without doubting or apologizing for your past answers.
Crucially, if there are multiple policies or excessive details in the context, filter them and ONLY show the policies or answers that are most important and most semantically aligned to the user's specific query. Keep answers concise and avoid listing edge-cases unless explicitly asked.
Format your response as a clear, natural message. DO NOT use markdown formatting like **bolding** or bullet points and should only answer using numbering when answering in a instruction format .
Ambiguity Management : If a query contains a abbreviation like : (ML which stands for Maternity leave or Medical leave then respectfully ask the User to specify which one they are asking about ).
Strict Rule to follow : If the answer is long or in points format then always use numbering like 1. 2. 3 ... to answer in points 
Most strict Rule to follow : When you get the retrieved answer then only answer on the basis of the retrieved context ... 
Also , keep a note of one thing if a user ask something about any other organisation apart of the 
CONTEXT:
{context}`;

const GENERAL_SYSTEM_PROMPT = `You are a friendly, witty, and respectful enterprise assistant.
Answer the user's general queries conversationally, like a simple text message.
Keep it simple, short, and funny where appropriate.
DO NOT use bullet points, numbered steps, or markdown formatting like **bolding**.
Do not give instructions. Just reply in a natural, respectful, and engaging manner.
If the user asks about sensitive/personal information (like a colleague's salary, HR gossip, or individual employee data), playfully and wittily deflect the question and tell them to ask their respected HR instead.
If asked about previous conversation or chat history, state confidently what was discussed without second-guessing yourself or apologizing.
Do not reference any documents or knowledge base.`;

const CLASSIFIER_PROMPT = `You are a query classifier for an enterprise document assistant.
Classify the user query into one of two categories:

document_query → user is asking about general company policies, official HR rules,
department procedures, WFH rules, leave policy, uploaded documents,
or anything that requires searching the internal knowledge base manuals.

general → greetings, general knowledge, coding help, math,
small talk, OR questions about sensitive/personal employee information (like a colleague's salary, gossips, or individual employee data) that should not be in the policy documents.

Reply with ONLY one word: general OR document_query. No explanation.

Query: {query}`;


// Abbreviation map for enterprise terminology
const ABBREVIATION_MAP: Record<string, string> = {
  // People & Roles
  "HR": "Human Resources",
  "TL": "Team Lead",
  "PM": "Project Manager",
  "PM Team": "Project Management Team",
  "DevOps": "Development Operations Team",
  "CEO": "Chief Executive Officer",
  "CTO": "Chief Technology Officer",
  "Management": "Company Leadership / Decision Makers",
  "Director": "Senior Company Leadership Authority",
  "Department Head": "Functional Head of Department",
  "Reporting Manager": "Immediate Supervisor",
  "Resource": "Employee / Staff Member",

  // Work From Home & Daily Ops
  "WFH": "Work From Home",
  "EOD Report": "End of Day Work Summary",
  "Standup Meeting": "Daily progress sync meeting",
  "Random Audit": "HR availability verification check",
  "Availability Policy": "Mandatory working-hour presence rule",
  "Escalation Policy": "Disciplinary escalation workflow",
  "Infrastructure Requirement": "Mandatory employee setup for remote work",

  // Leave TypesMaternity Leave / Medical Leave",
  "CL": "Casual Leave",
  "SL": "Sick Leave / Medical Leave",
  "EL": "Earned Leave",
  "LWP": "Leave Without Pay",
  "ML": "Maternity Leave / Medical Leave",
  "Comp Off": "Compensatory Leave",
  "Holiday Year": "January 1 – December 31 leave cycle",
  "Sandwich Leave": "Leave counted including weekends between leave days",
  "Probation Period": "Initial employment evaluation phase",
  "Leave Encashment": "Conversion of unused earned leave into salary equivalent",

  // Maternity & Special Leave
  "Maternity Leave": "Paid leave granted to female employee for childbirth",
  "Commissioning Mother": "Biological mother using surrogate delivery",
  "Adopting Mother": "Female employee adopting child under 3 months age",
  "Miscarriage Leave": "Leave granted after pregnancy loss",
  "Nursing Breaks": "Work breaks allowed for breastfeeding",
  "Gross Misconduct": "Serious disciplinary violation under company rules",
  "Notice of Claim": "Formal maternity benefit request submission",

  // Tools & Platforms
  "Slack": "Internal communication platform",
  "Zoho": "Work-hour logging system",
  "Keka": "Attendance and leave tracking system",
  "Time Doctor": "Productivity monitoring software",
  "TeamViewer": "Remote monitoring software",

  // Attendance & Compliance
  "Attendance Marking": "Daily presence confirmation process",
  "Clock-In": "Start of working hours registration",
  "Clock-Out": "End of working hours registration",
  "Video Presence Requirement": "Mandatory availability during video calls",
  "Availability Window": "Required working-hour availability period",
  "Task Logging": "Recording work completed during the day",
  "Work Proof Submission": "Evidence of completed assigned tasks",
  "Quality Standards Compliance": "Maintaining expected output quality",
  "Reporting Hierarchy": "Structured supervisor communication flow",
  "Approval Workflow": "Leave or task authorization process",
};

// Expand abbreviations to improve semantic search
export function expandAbbreviations(query: string): string {
  let expandedQuery = query;

  // Sort keys by word count (descending) - multi-word before single-word
  // Prevents partial replacements like "PM" matching in "PM Team"
  const sortedKeys = Object.keys(ABBREVIATION_MAP).sort((a, b) => {
    const countA = a.split(/\s+/).length;
    const countB = b.split(/\s+/).length;
    return countB - countA;
  });

  // Replace each abbreviation with its expansion
  // Using word boundaries (\b) and case-insensitive matching (gi)
  for (const key of sortedKeys) {
    const regex = new RegExp(`\\b${key}\\b`, "gi");
    expandedQuery = expandedQuery.replace(regex, (match) => `${match} (${ABBREVIATION_MAP[key]})`);
  }

  return expandedQuery;
}


export async function classifyQuery(
  query: string
): Promise<"general" | "document_query"> {
  try {
    const classifierPrompt = CLASSIFIER_PROMPT.replace("{query}", query);
    const message = new HumanMessage(classifierPrompt);
    const response = await llm.invoke([message]);
    const content = (response.content as string).trim().toLowerCase();

    if (content === "general") {
      return "general";
    }
    return "document_query";
  } catch {
    return "document_query";
  }
}

export async function* streamGeneralAnswer(
  query: string,
  history: MessageNode[] = [],
): AsyncGenerator<string, void, unknown> {
  try {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", GENERAL_SYSTEM_PROMPT],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
    ]);

    const formattedPrompt = await prompt.formatMessages({
      input: query,
      chat_history: formatHistory(history),
    });
    const stream = await llm.stream(formattedPrompt);

    for await (const chunk of stream) {
      if (typeof chunk.content === "string" && chunk.content) {
        yield chunk.content;
      }
    }
  } catch {
    yield "An error occurred while processing your request.";
  }
}

export async function* streamAnswer(
  query: string,
  opts: RetrievalFilter = {},
  history: MessageNode[] = []
): AsyncGenerator<string, void, unknown> {
  // Use hybrid retriever for better short query handling
  const hybridDocs = await getHybridRetriever(query, opts);

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  // Create a simple document-based chain without retriever
  // We'll manually pass the hybridDocs
  try {
    const formatted = await prompt.formatMessages({
      input: query,
      context: hybridDocs.map((doc) => doc.pageContent).join("\n\n"),
      chat_history: formatHistory(history),
    });
    const stream = await llm.stream(formatted);

    for await (const chunk of stream) {
      if (typeof chunk.content === "string" && chunk.content) {
        yield chunk.content;
      }
    }
  } catch (error) {
    yield "An error occurred while processing your request.";
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
  // Use hybrid retriever for better short query handling
  const hybridDocs = await getHybridRetriever(query, opts);

  // Deduplicate by docId — multiple chunks from the same doc count once
  const seen = new Set<string>();
  const sources: SourceMetadata[] = [];

  for (const doc of hybridDocs) {
    const { docId } = doc.metadata as SourceMetadata;
    if (!seen.has(docId)) {
      seen.add(docId);
      sources.push(doc.metadata as SourceMetadata);
    }
  }

  return sources;
}