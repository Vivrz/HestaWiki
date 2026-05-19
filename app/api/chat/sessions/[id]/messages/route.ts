import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cuidSchema } from "@/lib/api/security";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!cuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const chatSession = await prisma.chatSession.findUnique({
    where: { id },
  });

  if (!chatSession || chatSession.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}
