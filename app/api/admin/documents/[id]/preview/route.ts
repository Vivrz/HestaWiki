import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cuidSchema } from "@/lib/api/security";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const contentTypes: Record<string, string> = {
  pdf: "application/pdf",
  text: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!cuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  const document = await prisma.document.findUnique({
    where: { id },
    select: { filePath: true, name: true, type: true },
  });

  if (!document?.filePath) {
    return NextResponse.json({ error: "Document file not found" }, { status: 404 });
  }

  const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
  const resolvedPath = path.resolve(document.filePath);
  if (!resolvedPath.startsWith(`${uploadRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid document path" }, { status: 400 });
  }

  try {
    const file = await fs.readFile(resolvedPath);
    const contentType = contentTypes[document.type] ?? "application/octet-stream";

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.name)}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Document file not found" }, { status: 404 });
  }
}
