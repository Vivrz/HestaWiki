import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ingestDocument } from "@/lib/langchain/ingestion";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { url?: string; departmentId?: string };
  const { url, departmentId } = body;

  if (!url || !departmentId) {
    return NextResponse.json(
      { error: "url and departmentId are required" },
      { status: 400 }
    );
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!department) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  const docName = new URL(url).hostname + new URL(url).pathname;

  const existingDocs = await prisma.document.findMany({
    where: {
      name: docName,
      departmentId,
      isLatest: true,
    },
  });

  let version = 1;
  if (existingDocs.length > 0) {
    const maxVersion = Math.max(...existingDocs.map((d) => d.version));
    version = maxVersion + 1;
    await prisma.document.updateMany({
      where: { name: docName, departmentId },
      data: { isLatest: false },
    });
  }

  const doc = await prisma.document.create({
    data: {
      name: docName,
      type: "url",
      sourceUrl: url,
      version,
      isLatest: true,
      status: "processing",
      departmentId,
      uploadedById: session.user.id,
    },
  });

  ingestDocument(doc.id).catch(console.error);

  return NextResponse.json({ docId: doc.id }, { status: 202 });
}
