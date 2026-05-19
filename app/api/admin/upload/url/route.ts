import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ingestDocument } from "@/lib/langchain/ingestion";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  cuidSchema,
  isAllowedCrawlUrl,
  validateMutationRequestOrigin,
} from "@/lib/api/security";
import { markEmbeddingsAsNotLatest } from "@/lib/api/versioning";

const uploadUrlSchema = z.object({
  url: z.string().trim().url().max(2048),
  departmentId: cuidSchema,
});

export async function POST(req: NextRequest) {
  const originError = validateMutationRequestOrigin(req);
  if (originError) return originError;

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof uploadUrlSchema>;
  try {
    const body = (await req.json()) as unknown;
    const parsed = uploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, departmentId } = payload;
  if (!isAllowedCrawlUrl(url)) {
    return NextResponse.json(
      { error: "URL is not allowed. Use an approved HTTPS domain." },
      { status: 400 }
    );
  }

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!department) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  const parsedUrl = new URL(url);
  const docName = `${parsedUrl.hostname}${parsedUrl.pathname}`;

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
    await markEmbeddingsAsNotLatest(existingDocs.map((doc) => doc.id));
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
