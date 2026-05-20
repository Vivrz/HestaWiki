import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  cuidSchema,
  validateMutationRequestOrigin,
} from "@/lib/api/security";

const renameSessionSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = validateMutationRequestOrigin(req);
  if (originError) return originError;

  const user = await getAuthenticatedUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!cuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  let payload: z.infer<typeof renameSessionSchema>;
  try {
    const body = (await req.json()) as unknown;
    const parsed = renameSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const chatSession = await prisma.chatSession.findUnique({
    where: { id },
  });

  if (!chatSession || chatSession.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.chatSession.update({
    where: { id },
    data: { title: payload.title },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = validateMutationRequestOrigin(req);
  if (originError) return originError;

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

  await prisma.chatSession.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

