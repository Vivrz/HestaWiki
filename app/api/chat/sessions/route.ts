import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateMutationRequestOrigin } from "@/lib/api/security";

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
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

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionsRaw = await prisma.chatSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { messages: true } },
      messages: {
        where: { role: "user" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  const sessions = await Promise.all(
    sessionsRaw.map(async ({ messages, ...session }) => {
      const firstUserMessage = messages[0]?.content ?? "";
      const rawSlice = firstUserMessage ? firstUserMessage.slice(0, 60) : "";
      const rawSliceTitle = rawSlice.trim();
      const generatedTitle = firstUserMessage
        ? generateSessionTitle(firstUserMessage)
        : session.title;
      const shouldNormalizeTitle =
        session.title === "New Chat" ||
        session.title.length > 54 ||
        (rawSliceTitle && (session.title === rawSlice || session.title === rawSliceTitle));

      if (shouldNormalizeTitle && generatedTitle !== session.title) {
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { title: generatedTitle },
        });
      }

      return {
        ...session,
        title: shouldNormalizeTitle ? generatedTitle : session.title,
      };
    }),
  );

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const originError = validateMutationRequestOrigin(req);
  if (originError) return originError;

  const user = await getAuthenticatedUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof createSessionSchema> = {};
  const hasBody = Number(req.headers.get("content-length") ?? "0") > 0;
  try {
    const raw = (await req.json()) as unknown;
    const parsed = createSessionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    if (hasBody) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    // Empty body is fine; title defaults to "New Chat".
  }
  const chatSession = await prisma.chatSession.create({
    data: {
      title: body.title ?? "New Chat",
      userId: user.id,
    },
  });

  return NextResponse.json(chatSession, { status: 201 });
}
