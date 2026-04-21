import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamAnswer, getRelevantSources } from "@/lib/langchain/retrieval";
import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = (await req.json()) as { sessionId?: string; message?: string };
  const { sessionId, message } = body;

  if (!sessionId || !message) {
    return new Response(
      JSON.stringify({ error: "sessionId and message are required" }),
      { status: 400 },
    );
  }

  const chatSession = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!chatSession || chatSession.userId !== session.user.id) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
    });
  }

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
        const sources = await getRelevantSources(message);
        let fullAnswer = "";

          for await (const token of streamAnswer(message)) {
          fullAnswer += token;
          const event = `data: ${JSON.stringify({ token })}\n\n`;
          controller.enqueue(encoder.encode(event));
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
        const errorMsg =
          error instanceof Error ? error.message : "An error occurred";
        const errorEvent = `data: ${JSON.stringify({ error: errorMsg })}\n\n`;
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
    },
  });
}
