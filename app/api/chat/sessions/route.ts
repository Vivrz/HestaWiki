import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateMutationRequestOrigin } from "@/lib/api/security";

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.chatSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { messages: true } },
    },
  });

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
