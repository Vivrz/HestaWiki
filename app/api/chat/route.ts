import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  classifyQuery,
  streamGeneralAnswer,
  getClarificationRequired,
  retrieveEvidence,
  streamAnswerFromEvidence,
  buildStandaloneQuery,
  getContradictionRepairResponse,
  shouldForceDocumentQuery,
} from "@/lib/langchain/retrieval";
import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  cuidSchema,
  validateMutationRequestOrigin,
} from "@/lib/api/security";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  userChatRateLimitPolicy,
} from "@/lib/api/rate-limit";

const chatRequestSchema = z.object({
  sessionId: cuidSchema,
  message: z.string().trim().min(1).max(4000),
});

function generateSessionTitle(message: string): string {
  const cleaned = message
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, " ")
    .trim();

  if (!cleaned) return "New Chat";

  const stopWords = new Set([
    "the", "a", "an", "is", "are", "to", "for", "in", "on", "at", "of",
    "and", "or", "but", "with", "please", "can", "you", "me", "i", "we",
    "my", "our", "this", "that", "these", "those", "about", "from",
  ]);

  const words = cleaned.split(" ").filter(Boolean);
  const keyWords = words.filter((word) => !stopWords.has(word.toLowerCase()));
  const selectedWords = (keyWords.length >= 3 ? keyWords : words).slice(0, 7);
  const title = selectedWords.join(" ").slice(0, 72).trim();

  if (!title) return "New Chat";
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export async function POST(req: NextRequest) {
  const originError = validateMutationRequestOrigin(req);
  if (originError) return originError;

  const user = await getAuthenticatedUser();
  if (!user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const rateLimit = await checkRateLimit(userChatRateLimitPolicy(), user.id);
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
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

        const contradictionRepair = getContradictionRepairResponse(message, previousMessages);
        if (contradictionRepair) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ queryType: "general" })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: contradictionRepair })}\n\n`));

          const sources: Prisma.InputJsonValue = [];
          await prisma.chatMessage.create({
            data: {
              sessionId,
              role: "assistant",
              content: contradictionRepair,
              sources,
            },
          });

          const doneEvent = `data: ${JSON.stringify({ done: true, sources })}\n\n`;
          controller.enqueue(encoder.encode(doneEvent));
          return;
        }

        // Step 1: Rewrite vague follow-ups into standalone search intent.
        const standaloneQuery = buildStandaloneQuery(message, previousMessages);

        // Strong policy keywords always route to document retrieval. Ambiguous
        // business terms like CEO, HR, PM, CTO, and DevOps are left to the classifier.
        const forceDocumentQuery = shouldForceDocumentQuery(standaloneQuery);

        // Step 2: Classify the standalone query (Passing history for anti-trickery)
        const queryType = forceDocumentQuery
          ? "document_query"
          : await classifyQuery(standaloneQuery, previousMessages);
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

          const evidence = await retrieveEvidence(standaloneQuery, retrievalOpts, previousMessages);
          sources = evidence.sources as unknown as Prisma.InputJsonValue;
          console.info("Chat retrieval diagnostics", evidence.diagnostics);

          for await (const token of streamAnswerFromEvidence(message, evidence, previousMessages)) {
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
          const title = generateSessionTitle(message);
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
      ...rateLimit.headers,
    },
  });
}
