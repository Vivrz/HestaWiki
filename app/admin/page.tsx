import { prisma } from "@/lib/prisma";
import StatsCard from "@/components/admin/StatsCard";
import {
  Badge,
  Timeline,
  TimelineBody,
  TimelineContent,
  TimelineItem,
  TimelinePoint,
  TimelineTime,
  TimelineTitle,
} from "flowbite-react";
import {
  HiDocumentText,
  HiOfficeBuilding,
  HiUsers,
  HiOutlineClock,
  HiOutlineChatAlt2,
} from "react-icons/hi";

export const dynamic = "force-dynamic";

async function getStats() {
  const [
    totalDocuments,
    totalDepartments,
    totalUsers,
    docsByDept,
    lastUploads,
    allSessions
  ] = await Promise.all([
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

  return {
    totalDocuments,
    totalDepartments,
    totalUsers,
    docsByDept,
    lastUploads,
    avgSessionMinutes,
    avgSessionsPerUser
  };
}

export default async function AdminDashboard() {
  const {
    totalDocuments,
    totalDepartments,
    totalUsers,
    docsByDept,
    lastUploads,
    avgSessionMinutes,
    avgSessionsPerUser
  } = await getStats();

  return (
    <div className="space-y-8">
      <section className="page-hero">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.24),transparent_60%)] lg:block" />
        <div className="relative max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
            Admin dashboard
          </p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950 sm:text-5xl">
            Keep your knowledge base tidy, current, and ready for answers.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Review document coverage, watch recent uploads, and manage the content that powers internal chat responses.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Ready Documents"
          value={totalDocuments}
          icon={<HiDocumentText className="h-6 w-6" />}
          color="blue"
        />
        <StatsCard
          title="Departments"
          value={totalDepartments}
          icon={<HiOfficeBuilding className="h-6 w-6" />}
          color="green"
        />
        <StatsCard
          title="Registered Users"
          value={totalUsers}
          icon={<HiUsers className="h-6 w-6" />}
          color="purple"
        />
        <StatsCard
          title="Avg Session Time"
          value={`${avgSessionMinutes}m`}
          icon={<HiOutlineClock className="h-6 w-6" />}
          color="yellow"
        />
        <StatsCard
          title="Avg Sessions/User"
          value={avgSessionsPerUser}
          icon={<HiOutlineChatAlt2 className="h-6 w-6" />}
          color="pink"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="glass-panel rounded-[1.75rem] p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">
                Documents per department
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Quick view of current latest-document coverage.
              </p>
            </div>
            <Badge color="info" className="hidden sm:inline-flex">
              {docsByDept.length} teams
            </Badge>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80">
            <table className="min-w-full divide-y divide-slate-200 bg-white text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Department
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Documents
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {docsByDept.length > 0 ? (
                  docsByDept.map((dept) => (
                    <tr key={dept.id} className="bg-white">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {dept.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                          {dept._count.documents}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No departments found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="glass-panel rounded-[1.75rem] p-6">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-slate-950">
              Latest uploads
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Most recent content entering the retrieval pipeline.
            </p>
          </div>
          <Timeline>
            {lastUploads.map((doc) => (
              <TimelineItem key={doc.id}>
                <TimelinePoint />
                <TimelineContent>
                  <TimelineTime>
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </TimelineTime>
                  <TimelineTitle>{doc.name}</TimelineTitle>
                  <TimelineBody>
                    {doc.department.name} • {doc.uploadedBy.name ?? "Unknown"}
                  </TimelineBody>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </section>
      </div>
    </div>
  );
}
