import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ingestDocument } from "@/lib/langchain/ingestion";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import {
  cuidSchema,
  maxUploadBytes,
  validateMutationRequestOrigin,
} from "@/lib/api/security";
import { markEmbeddingsAsNotLatest } from "@/lib/api/versioning";

export async function POST(req: NextRequest) {
  const originError = validateMutationRequestOrigin(req);
  if (originError) return originError;

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const fileEntry = formData.get("file");
  const departmentIdRaw = formData.get("departmentId");
  const departmentId = typeof departmentIdRaw === "string" ? departmentIdRaw.trim() : null;

  if (!(fileEntry instanceof File) || !departmentId) {
    return NextResponse.json(
      { error: "File and departmentId are required" },
      { status: 400 }
    );
  }
  const file = fileEntry;
  if (!cuidSchema.safeParse(departmentId).success) {
    return NextResponse.json({ error: "Invalid departmentId" }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
  }
  if (file.size > maxUploadBytes()) {
    return NextResponse.json({ error: "File exceeds maximum allowed size" }, { status: 400 });
  }

  const allowedExtensions = [".pdf", ".txt", ".md"];
  const ext = path.extname(file.name).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return NextResponse.json(
      { error: "Only PDF, TXT, and MD files are allowed" },
      { status: 400 }
    );
  }

  const typeMap: Record<string, string> = {
    ".pdf": "pdf",
    ".txt": "text",
    ".md": "md",
  };
  const docType = typeMap[ext];

  const safeOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 120);
  const fileName = `${Date.now()}-${safeOriginalName}`;
  const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const filePath = path.join(uploadDir, fileName);

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!department) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  // Handle versioning
  const existingDocs = await prisma.document.findMany({
    where: {
      name: file.name,
      departmentId,
      isLatest: true,
    },
  });

  let version = 1;
  if (existingDocs.length > 0) {
    const maxVersion = Math.max(...existingDocs.map((d) => d.version));
    version = maxVersion + 1;
    await prisma.document.updateMany({
      where: { name: file.name, departmentId },
      data: { isLatest: false },
    });
    await markEmbeddingsAsNotLatest(existingDocs.map((doc) => doc.id));
  }

  const bytes = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(bytes));

  try {
    const doc = await prisma.document.create({
      data: {
        name: file.name,
        type: docType,
        filePath,
        version,
        isLatest: true,
        status: "processing",
        departmentId,
        uploadedById: session.user.id,
      },
    });

    // Fire-and-forget ingestion
    ingestDocument(doc.id).catch(console.error);

    return NextResponse.json(
      { docId: doc.id, message: "Processing started" },
      { status: 202 }
    );
  } catch {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return NextResponse.json(
      { error: "Failed to store uploaded document" },
      { status: 500 }
    );
  }
}
