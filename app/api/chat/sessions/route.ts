import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.chatSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: string } = {};
  try {
    body = await req.json() as { title?: string };
  } catch {
    // empty body is fine — title defaults to "New Chat"
  }
  const chatSession = await prisma.chatSession.create({
    data: {
      title: body.title ?? "New Chat",
      userId: session.user.id,
    },
  });

  return NextResponse.json(chatSession, { status: 201 });
}
