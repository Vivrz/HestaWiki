import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totalDocuments, totalDepartments, totalUsers, docsByDept, lastUploads] =
    await Promise.all([
      prisma.document.count({ where: { status: "ready", isLatest: true } }),
      prisma.department.count(),
      prisma.user.count(),
      prisma.department.findMany({
        include: {
          _count: { select: { documents: { where: { isLatest: true } } } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.document.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { department: true, uploadedBy: { select: { name: true } } },
      }),
    ]);

  return NextResponse.json({
    totalDocuments,
    totalDepartments,
    totalUsers,
    docsByDept,
    lastUploads,
  });
}
