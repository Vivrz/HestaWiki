import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");
  const search = searchParams.get("search");

  const documents = await prisma.document.findMany({
    where: {
      ...(department ? { departmentId: department } : {}),
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {}),
    },
    include: {
      department: true,
      uploadedBy: { select: { name: true, email: true } },
    },
    orderBy: [{ name: "asc" }, { version: "desc" }],
  });

  return NextResponse.json(documents);
}
