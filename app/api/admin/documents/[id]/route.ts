import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import fs from "fs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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
    fs.unlinkSync(document.filePath);
  }

  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ message: "Document deleted" });
}
