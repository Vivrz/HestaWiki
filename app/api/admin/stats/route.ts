import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totalDocuments, totalDepartments, totalUsers, docsByDept, lastUploads, allSessions] =
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
      prisma.chatSession.findMany({
        include: { messages: { orderBy: { createdAt: "asc" } } }
      }),
    ]);

  let totalSessionMinutes = 0;
  let sessionsWithDuration = 0;

  allSessions.forEach(session => {
    if (session.messages.length > 1) {
      const start = session.createdAt.getTime();
      const end = session.messages[session.messages.length - 1].createdAt.getTime();
      const diffMinutes = (end - start) / 60000;
      if (diffMinutes > 0 && diffMinutes < 60) {
        totalSessionMinutes += diffMinutes;
        sessionsWithDuration++;
      }
    }
  });

  const avgSessionMinutes = sessionsWithDuration > 0 
    ? parseFloat((totalSessionMinutes / sessionsWithDuration).toFixed(1)) 
    : 0;
  
  const avgSessionsPerUser = totalUsers > 0 
    ? parseFloat((allSessions.length / totalUsers).toFixed(1))
    : 0;

  return NextResponse.json({
    totalDocuments,
    totalDepartments,
    totalUsers,
    docsByDept,
    lastUploads,
    avgSessionMinutes,
    avgSessionsPerUser
  });
}
