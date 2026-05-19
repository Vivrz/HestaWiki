import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cuidSchema } from "@/lib/api/security";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const departmentRaw = searchParams.get("department");
  const searchRaw = searchParams.get("search");
  const department = departmentRaw?.trim() || null;
  const search = searchRaw?.trim() || null;

  if (department && !cuidSchema.safeParse(department).success) {
    return NextResponse.json({ error: "Invalid department filter" }, { status: 400 });
  }
  if (search && search.length > 120) {
    return NextResponse.json({ error: "Search filter too long" }, { status: 400 });
  }

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
