import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import {
  cuidSchema,
  validateMutationRequestOrigin,
} from "@/lib/api/security";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = validateMutationRequestOrigin(req);
  if (originError) return originError;

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!cuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Delete embeddings from pgvector table
  const client = await pool.connect();
  try {
    await client.query(
      `DELETE FROM langchain_pg_embedding WHERE metadata->>'docId' = $1`,
      [id]
    );
  } finally {
    client.release();
  }

  // Delete file from filesystem if it exists
  if (document.filePath && fs.existsSync(document.filePath)) {
    const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
    const resolvedPath = path.resolve(document.filePath);
    if (resolvedPath.startsWith(`${uploadRoot}${path.sep}`)) {
      fs.unlinkSync(document.filePath);
    }
  }

  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ message: "Document deleted" });
}
