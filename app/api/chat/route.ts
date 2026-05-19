import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  streamAnswer,
  getRelevantSources,
  classifyQuery,
  streamGeneralAnswer,
  expandAbbreviations,
  getClarificationRequired,
  containsKnownAbbreviation,
} from "@/lib/langchain/retrieval";
import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  cuidSchema,
  validateMutationRequestOrigin,
} from "@/lib/api/security";

const chatRequestSchema = z.object({
  sessionId: cuidSchema,
  message: z.string().trim().min(1).max(4000),
});

export async function POST(req: NextRequest) {
  const originError = validateMutationRequestOrigin(req);
  if (originError) return originError;

  const user = await getAuthenticatedUser();
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  let payload: z.infer<typeof chatRequestSchema>;
  try {
    const body = (await req.json()) as unknown;
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
      });
    }
    payload = parsed.data;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400 },
    );
  }
  const { sessionId, message } = payload;

  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!chatSession || chatSession.userId !== user.id) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
    });
  }

  let previousMessages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  previousMessages = previousMessages.reverse();

  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: "user",
      content: message,
    },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 0: Check for ambiguous terms requiring clarification (Generalized)
        const clarification = getClarificationRequired(message);

        if (clarification) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ queryType: "general" })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: clarification })}\n\n`));

          let sources: Prisma.InputJsonValue = [];

          await prisma.chatMessage.create({
            data: {
              sessionId,
              role: "assistant",
              content: clarification,
              sources: sources as unknown as Prisma.InputJsonValue,
            },
          });

          const doneEvent = `data: ${JSON.stringify({ done: true, sources })}\n\n`;
          controller.enqueue(encoder.encode(doneEvent));
          return;
        }

        // Step 1: Expand abbreviations for better semantic search
        const expandedQuery = expandAbbreviations(message);

        // Known abbreviations and policy keywords always route to document retrieval.
        const forceDocumentQuery =
          /\bwfh\b|work\s*from\s*home/i.test(message) ||
          containsKnownAbbreviation(message) ||
          /\bzoho\b/i.test(message) ||
          /\btask\s*tracker\b/i.test(message) ||
          /\battendance\b/i.test(message) ||
          /\bstand\s*up\b|\bstandup\b/i.test(message) ||
          /\bleave\s*(policy|management|balance|request|approval)?\b/i.test(message) ||
          /\b(eod|end\s*of\s*day)\s*report\b/i.test(message) ||
          /\b(compliance|consequences|disciplinary)\b/i.test(message);

        // Step 2: Classify the expanded query (Passing history for anti-trickery)
        const queryType = forceDocumentQuery
          ? "document_query"
          : await classifyQuery(expandedQuery, previousMessages);
        const queryTypeEvent = `data: ${JSON.stringify({ queryType })}\n\n`;
        controller.enqueue(encoder.encode(queryTypeEvent));

        let fullAnswer = "";
        let sources: Prisma.InputJsonValue = [];

        if (queryType === "general") {
          // For general queries, use original message
          for await (const token of streamGeneralAnswer(message, previousMessages)) {
            fullAnswer += token;
            const event = `data: ${JSON.stringify({ token })}\n\n`;
            controller.enqueue(encoder.encode(event));
          }
        } else {
          // Route retrieval to the correct source so HR/document chunks don't
          // leak into website answers (and vice versa). The classifier already
          // picked the right bucket; we just thread that decision through.
          const retrievalOpts =
            queryType === "website_query"
              ? { sourceType: "website" as const }
              : { sourceType: "document" as const };

          // For document_query and website_query, use expanded query for better retrieval accuracy
          sources = (await getRelevantSources(expandedQuery, retrievalOpts)) as unknown as Prisma.InputJsonValue;
          for await (const token of streamAnswer(expandedQuery, retrievalOpts, previousMessages)) {
            fullAnswer += token;
            const event = `data: ${JSON.stringify({ token })}\n\n`;
            controller.enqueue(encoder.encode(event));
          }
        }

        await prisma.chatMessage.create({
          data: {
            sessionId,
            role: "assistant",
            content: fullAnswer,
            sources: sources as unknown as Prisma.InputJsonValue,
          },
        });

        // Update session title from first message if still default
        if (chatSession.title === "New Chat") {
          const title = message.slice(0, 60);
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { title },
          });
        }

        const doneEvent = `data: ${JSON.stringify({ done: true, sources })}\n\n`;
        controller.enqueue(encoder.encode(doneEvent));
      } catch (error) {
        console.error("Chat stream failed:", error);
        const errorEvent = `data: ${JSON.stringify({ error: "Unable to process request" })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
