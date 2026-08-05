import { prisma } from "@/lib/prisma";
import AdminChart from "@/components/admin/AdminChart";
import AnimatedNumber from "@/components/admin/AnimatedNumber";
import DashboardHeroCard from "@/components/admin/DashboardHeroCard";
import DocumentHealthCard from "@/components/admin/DocumentHealthCard";
import SourcesByTypeCard from "@/components/admin/SourcesByTypeCard";
import { AdminCard, AdminCardHeader, ChartCard, TableCard } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Icon } from "@iconify/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

export const dynamic = "force-dynamic";

type DashboardRecentUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  lastActiveAt: Date;
  sessionCount: number;
  hasChats: boolean;
};

function statusVariant(status: string) {
  if (status === "ready") return "success" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "processing") return "warning" as const;
  if (status === "created") return "secondary" as const;
  return "default" as const;
}

function activityStatusVariant(status: string) {
  if (status === "ready") return "success" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "processing") return "warning" as const;
  if (status === "created") return "secondary" as const;
  return "default" as const;
}

function timelineAccent(status: string) {
  if (status === "ready") return "border-[var(--admin-primary)]";
  if (status === "failed") return "border-[var(--admin-error)]";
  if (status === "processing") return "border-[var(--admin-warning)]";
  if (status === "created") return "border-[var(--admin-secondary)]";
  return "border-[var(--admin-success)]";
}

function formatDashboardDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

async function getDashboardData() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [
    readyDocuments,
    failedDocuments,
    processingDocuments,
    totalUsers,
    inactiveUsers7d,
    todaySessions,
    departments,
    sourceTypes,
    lastUploads,
    recentSessions,
    recentTeams,
    recentActiveUsers,
    recentUsersWithoutChats,
  ] = await Promise.all([
    prisma.document.count({ where: { status: "ready", isLatest: true } }),
    prisma.document.count({ where: { status: "failed", isLatest: true } }),
    prisma.document.count({ where: { status: "processing", isLatest: true } }),
    prisma.user.count(),
    prisma.user.count({
      where: {
        chatSessions: {
          none: {
            createdAt: { gte: sevenDaysAgo },
          },
        },
      },
    }),
    prisma.chatSession.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.department.findMany({
      include: {
        _count: { select: { documents: { where: { isLatest: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.document.groupBy({
      by: ["type"],
      where: { isLatest: true },
      _count: { _all: true },
    }),
    prisma.document.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        department: true,
        uploadedBy: { select: { name: true } },
      },
    }),
    prisma.chatSession.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.department.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
      select: { name: true, createdAt: true },
    }),
    prisma.chatSession.findMany({
      distinct: ["userId"],
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            _count: { select: { chatSessions: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        chatSessions: {
          none: {},
        },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        _count: { select: { chatSessions: true } },
      },
    }),
  ]);

  const teamsWithNoFiles = departments.filter((dept) => dept._count.documents === 0).length;
  const recentUsersMap = new Map<string, DashboardRecentUser>();

  for (const session of recentActiveUsers) {
    recentUsersMap.set(session.user.id, {
      id: session.user.id,
      name: session.user.name ?? "Unknown User",
      email: session.user.email,
      image: session.user.image,
      lastActiveAt: session.createdAt,
      sessionCount: session.user._count.chatSessions,
      hasChats: true,
    });
  }

  for (const user of recentUsersWithoutChats) {
    if (recentUsersMap.size >= 5 || recentUsersMap.has(user.id)) continue;
    recentUsersMap.set(user.id, {
      id: user.id,
      name: user.name ?? "Unknown User",
      email: user.email,
      image: user.image,
      lastActiveAt: user.createdAt,
      sessionCount: user._count.chatSessions,
      hasChats: false,
    });
  }

  const recentUsers = Array.from(recentUsersMap.values())
    .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime())
    .slice(0, 5);

  const activityLogs = [
    ...lastUploads.map((doc) => ({
      at: doc.createdAt,
      area: doc.department.name,
      event: `Uploaded: ${doc.name}`,
      actor: doc.uploadedBy.name ?? "Unknown",
      status: doc.status,
    })),
    ...recentSessions.map((session) => ({
      at: session.createdAt,
      area: "Users",
      event: `Chat started (${session._count.messages} messages)`,
      actor: session.user.name ?? session.user.email ?? "Unknown",
      status: "active",
    })),
    ...recentTeams.map((team) => ({
      at: team.createdAt,
      area: "Departments",
      event: `Department created: ${team.name}`,
      actor: "Admin",
      status: "created",
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 12);

  return {
    readyDocuments,
    failedDocuments,
    processingDocuments,
    totalUsers,
    inactiveUsers7d,
    todaySessions,
    departments,
    sourceTypes,
    lastUploads,
    teamsWithNoFiles,
    activityLogs,
    recentUsers,
  };
}

function SalesOverviewCard({
  activityByDay,
}: {
  activityByDay: Array<{ label: string; uploads: number; chats: number }>;
}) {
  const totalUploads = activityByDay.reduce((sum, item) => sum + item.uploads, 0);
  const totalChats = activityByDay.reduce((sum, item) => sum + item.chats, 0);
  const options = {
    chart: {
      toolbar: { show: false },
      type: "bar",
      fontFamily: "inherit",
      foreColor: "var(--admin-chart-axis)",
      stacked: true,
      animations: {
        enabled: true,
        speed: 400,
        animateGradually: { enabled: true, delay: 80 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
    },
    colors: ["var(--admin-chart-primary)", "var(--admin-chart-secondary)"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "22%",
        borderRadius: 5,
        borderRadiusApplication: "end",
        borderRadiusWhenStacked: "last",
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: "var(--admin-chart-grid)", strokeDashArray: 3 },
    xaxis: {
      categories: activityByDay.map((item) => item.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        show: true,
      },
    },
    tooltip: {
      theme: "dark",
    },
  };

  return (
    <AdminCard className="h-full p-6 pb-0 admin-enter admin-enter-delay-1">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h5 className="text-lg font-bold text-[var(--admin-heading)]">Knowledge Activity</h5>
          <p className="text-sm text-[var(--admin-muted)]">Overview of uploads and chats</p>
        </div>
        <span className="w-fit rounded-lg bg-[var(--admin-background)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-muted)]">
          Last 7 days
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--admin-lightprimary)] px-3 py-1 text-xs font-semibold text-[var(--admin-primary)]">
          <span className="h-2 w-2 rounded-full bg-[var(--admin-primary)]" />
          {totalUploads} uploads
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--admin-lightsecondary)] px-3 py-1 text-xs font-semibold text-[var(--admin-secondary)]">
          <span className="h-2 w-2 rounded-full bg-[var(--admin-secondary)]" />
          {totalChats} chats
        </span>
      </div>
      <AdminChart
        type="bar"
        height={316}
        options={options}
        series={[
          { name: "Uploads", data: activityByDay.map((item) => item.uploads) },
          { name: "Chats", data: activityByDay.map((item) => item.chats) },
        ]}
      />
    </AdminCard>
  );
}

function DashboardKpiStrip({
  totalUsers,
  activeUsers,
  latestDocumentTotal,
  departmentTotal,
  readinessPercent,
  attentionTotal,
}: {
  totalUsers: number;
  activeUsers: number;
  latestDocumentTotal: number;
  departmentTotal: number;
  readinessPercent: number;
  attentionTotal: number;
}) {
  const cards = [
    {
      label: "Total Users",
      value: totalUsers,
      insight: `${activeUsers} active this week`,
      icon: "solar:users-group-rounded-linear",
      tone: "bg-[var(--admin-primary)] text-white",
    },
    {
      label: "Knowledge Files",
      value: latestDocumentTotal,
      insight: `${readinessPercent}% ready for answers`,
      icon: "solar:documents-linear",
      tone: "bg-[var(--admin-secondary)] text-white",
    },
    {
      label: "Departments",
      value: departmentTotal,
      insight: "Coverage across teams",
      icon: "solar:buildings-2-linear",
      tone: "bg-[var(--admin-success)] text-white",
    },
    {
      label: "Needs Review",
      value: attentionTotal,
      insight: attentionTotal > 0 ? "Admin action required" : "Workspace is healthy",
      icon: "solar:shield-warning-linear",
      tone: attentionTotal > 0
        ? "bg-[var(--admin-warning)] text-white"
        : "bg-[var(--admin-lightprimary)] text-[var(--admin-primary)]",
    },
  ];

  return (
    <div className="grid grid-cols-12 gap-6">
      {cards.map((item, index) => (
        <AdminCard
          key={item.label}
          className={`col-span-12 p-5 admin-enter admin-enter-delay-${Math.min(index + 1, 4)} sm:col-span-6 xl:col-span-3`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--admin-muted)]">{item.label}</p>
              <p className="mt-3 text-3xl font-bold leading-none text-[var(--admin-heading)]">
                <AnimatedNumber value={item.value} />
              </p>
              <p className="mt-3 truncate text-sm font-medium text-[var(--admin-muted)]">{item.insight}</p>
            </div>
            <span className={`admin-kpi-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${item.tone}`}>
              <Icon icon={item.icon} width={23} height={23} />
            </span>
          </div>
        </AdminCard>
      ))}
    </div>
  );
}

function EngagementSparkCard({
  activeUsers,
  totalUsers,
  inactiveUsers7d,
  failedDocuments,
  processingDocuments,
  teamsWithNoFiles,
  activityByDay,
}: {
  activeUsers: number;
  totalUsers: number;
  inactiveUsers7d: number;
  failedDocuments: number;
  processingDocuments: number;
  teamsWithNoFiles: number;
  activityByDay: Array<{ label: string; uploads: number; chats: number }>;
}) {
  const attentionTotal = failedDocuments + processingDocuments + teamsWithNoFiles;
  const activePercent = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const options = {
    chart: {
      id: "admin-engagement-spark",
      type: "area",
      height: 64,
      sparkline: { enabled: true },
      fontFamily: "inherit",
      foreColor: "var(--admin-chart-axis)",
      toolbar: { show: false },
    },
    colors: ["var(--admin-chart-secondary)"],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0,
        inverseColors: false,
        opacityFrom: 0.18,
        opacityTo: 0,
        stops: [20, 180],
      },
    },
    markers: { size: 0 },
    tooltip: {
      theme: "dark",
      x: { show: false },
    },
  };

  return (
    <AdminCard className="overflow-hidden p-0 admin-enter admin-enter-delay-3">
      <div className="px-6 pt-6">
        <div className="mb-2 flex items-center justify-between">
          <h5 className="text-lg font-bold text-[var(--admin-heading)]">User Engagement</h5>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--admin-secondary)] text-white">
            <Icon icon="tabler:messages" className="text-xl" />
          </div>
        </div>
        <div className="mb-4 grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <h4 className="mb-3 text-xl font-bold text-[var(--admin-heading)]">
              <AnimatedNumber value={activeUsers} />
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center justify-center rounded-full bg-[var(--admin-lightprimary)] p-1">
                <Icon icon="tabler:arrow-up-left" className="text-[var(--admin-primary)]" />
              </span>
              <p className="text-[var(--admin-heading)]">{activePercent}%</p>
              <p className="text-[var(--admin-muted)]">active this week</p>
            </div>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-3 text-xs font-medium text-[var(--admin-muted)]">
          <span className="rounded-full bg-[var(--admin-background)] px-2.5 py-1">{inactiveUsers7d} inactive</span>
          <span className="rounded-full bg-[var(--admin-background)] px-2.5 py-1">{attentionTotal} needs review</span>
        </div>
      </div>
      <AdminChart
        type="area"
        height={64}
        options={options}
        series={[{ name: "Activity", data: activityByDay.map((item) => item.chats + item.uploads) }]}
      />
    </AdminCard>
  );
}

function RecentUsersTimeline({ recentUsers }: { recentUsers: DashboardRecentUser[] }) {
  return (
    <AdminCard className="h-full w-full p-6 admin-enter admin-enter-delay-1">
      <div className="flex flex-col gap-1.5">
        <h5 className="text-lg font-bold text-[var(--admin-heading)]">Recent Users</h5>
        <p className="text-sm text-[var(--admin-muted)]">Latest people active in the workspace.</p>
      </div>
      <div className="mt-6">
        {recentUsers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] p-4 text-sm text-[var(--admin-muted)]">
            No users found yet.
          </div>
        ) : (
          recentUsers.slice(0, 6).map((user, index) => {
            const isLastItem = index === Math.min(recentUsers.length, 6) - 1;
            return (
              <div key={user.id} className="flex gap-x-3">
                <div className="w-1/4 text-end">
                  <span className="text-xs font-semibold text-[var(--admin-heading)]">
                    {user.hasChats ? formatDistanceToNow(user.lastActiveAt, { addSuffix: false }) : "new"}
                  </span>
                </div>
                <div className={`relative ${isLastItem ? "after:hidden" : ""} after:absolute after:bottom-0 after:start-3.5 after:top-7 after:w-px after:-translate-x-[0.5px] after:bg-[var(--admin-border)]`}>
                  <div className="relative z-10 flex h-7 w-7 items-center justify-center">
                    <div className={`h-3 w-3 rounded-full border-2 bg-transparent ${timelineAccent(user.hasChats ? "ready" : "created")}`} />
                  </div>
                </div>
                <div className="w-1/4 grow pb-6 pt-0.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--admin-lightprimary)] text-xs font-bold uppercase text-[var(--admin-primary)]">
                      {user.name.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--admin-heading)]">{user.name}</p>
                      <p className="truncate text-sm text-[var(--admin-muted)]">{user.email}</p>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    {user.sessionCount} {user.sessionCount === 1 ? "chat" : "chats"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AdminCard>
  );
}

function ActivityPerformanceTable({
  activityLogs,
}: {
  activityLogs: Array<{ at: Date; area: string; event: string; actor: string; status: string }>;
}) {
  return (
    <AdminCard className="flex h-full w-full flex-col p-6 admin-enter admin-enter-delay-2">
      <div className="mb-6">
        <h5 className="text-lg font-bold text-[var(--admin-heading)]">Activity Performance</h5>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">Recent events across files, departments, and users.</p>
      </div>
      <div className="-m-1.5 overflow-x-auto">
        <div className="inline-block min-w-full p-1.5 align-middle">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--admin-border)]">
                <TableHead className="text-sm font-semibold text-[var(--admin-heading)]">#</TableHead>
                <TableHead className="text-sm font-semibold text-[var(--admin-heading)]">Area</TableHead>
                <TableHead className="text-sm font-semibold text-[var(--admin-heading)]">Event</TableHead>
                <TableHead className="text-sm font-semibold text-[var(--admin-heading)]">Status</TableHead>
                <TableHead className="text-sm font-semibold text-[var(--admin-heading)]">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLogs.length === 0 ? (
                <TableRow className="border-[var(--admin-border)]">
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-[var(--admin-heading)]">
                    No recent activity yet.
                  </TableCell>
                </TableRow>
              ) : activityLogs.slice(0, 6).map((log, index) => (
                <TableRow key={`${log.event}-${index}`} className="border-b border-[var(--admin-border)]">
                  <TableCell>
                    <p className="text-sm font-semibold text-[var(--admin-heading)]">{index + 1}</p>
                  </TableCell>
                  <TableCell className="min-w-[180px] ps-0">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--admin-lightprimary)] text-[var(--admin-primary)]">
                        <Icon
                          icon={log.event.startsWith("Uploaded:") ? "solar:document-add-linear" : log.event.startsWith("Chat started") ? "solar:chat-round-line-linear" : "solar:buildings-2-linear"}
                          width={19}
                          height={19}
                        />
                      </span>
                      <div className="min-w-0">
                        <h6 className="mb-1 truncate text-sm font-semibold text-[var(--admin-heading)]">{log.area}</h6>
                        <p className="truncate text-xs font-medium text-[var(--admin-muted)]">{log.actor}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[240px]">
                    <p className="line-clamp-2 text-sm font-medium text-[var(--admin-heading)]">{log.event}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={activityStatusVariant(log.status)}>{log.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="whitespace-nowrap text-sm font-medium text-[var(--admin-heading)]">
                      {formatDashboardDate(log.at)}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminCard>
  );
}

export default async function AdminDashboard() {
  const {
    readyDocuments,
    failedDocuments,
    processingDocuments,
    totalUsers,
    inactiveUsers7d,
    todaySessions,
    departments,
    sourceTypes,
    lastUploads,
    teamsWithNoFiles,
    activityLogs,
    recentUsers,
  } = await getDashboardData();

  const activeUsers = Math.max(totalUsers - inactiveUsers7d, 0);
  const latestDocumentTotal = readyDocuments + processingDocuments + failedDocuments;
  const readinessPercent = latestDocumentTotal > 0 ? Math.round((readyDocuments / latestDocumentTotal) * 100) : 0;
  const attentionTotal = failedDocuments + processingDocuments + teamsWithNoFiles;
  const activityByDay = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      uploads: 0,
      chats: 0,
    };
  });

  for (const log of activityLogs) {
    const key = new Date(log.at).toISOString().slice(0, 10);
    const bucket = activityByDay.find((item) => item.key === key);
    if (!bucket) continue;
    if (log.event.startsWith("Uploaded:")) bucket.uploads += 1;
    if (log.event.startsWith("Chat started")) bucket.chats += 1;
  }

  const attentionItems = [
    failedDocuments > 0
      ? {
          severity: "High",
          text: `${failedDocuments} file${failedDocuments > 1 ? "s" : ""} failed and need re-upload or retry.`,
          href: "/admin/data-management?tab=documents",
        }
      : null,
    processingDocuments > 0
      ? {
          severity: "Medium",
          text: `${processingDocuments} file${processingDocuments > 1 ? "s" : ""} still processing.`,
          href: "/admin/data-management?tab=documents",
        }
      : null,
    teamsWithNoFiles > 0
      ? {
          severity: "Medium",
          text: `${teamsWithNoFiles} department${teamsWithNoFiles > 1 ? "s" : ""} have no files assigned yet.`,
          href: "/admin/departments",
        }
      : null,
  ].filter(Boolean) as Array<{ severity: "High" | "Medium"; text: string; href: string }>;

  const topDepartments = [...departments]
    .sort((a, b) => b._count.documents - a._count.documents)
    .slice(0, 8);

  const departmentOptions = {
    chart: {
      toolbar: { show: false },
      fontFamily: "inherit",
      foreColor: "var(--admin-chart-axis)",
      animations: {
        enabled: true,
        speed: 400,
        animateGradually: { enabled: true, delay: 80 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
    },
    colors: ["var(--admin-chart-primary)"],
    dataLabels: {
      enabled: true,
      style: { fontSize: "12px", fontWeight: 700, colors: ["var(--admin-heading)"] },
      offsetY: -6,
    },
    grid: { borderColor: "var(--admin-chart-grid)", strokeDashArray: 3 },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: "34%",
        endingShape: "rounded" as const,
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0,
        opacityFrom: 0.95,
        opacityTo: 0.6,
        stops: [0, 100],
      },
    },
    xaxis: {
      categories: topDepartments.map((dept) => dept.name),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { rotate: -20, trim: true, style: { colors: "var(--admin-chart-axis)" } },
    },
    yaxis: { labels: { show: false } },
    tooltip: { theme: "dark" },
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <DashboardHeroCard todayChats={todaySessions} readinessPercent={readinessPercent} />
      </div>

      <DashboardKpiStrip
        totalUsers={totalUsers}
        activeUsers={activeUsers}
        latestDocumentTotal={latestDocumentTotal}
        departmentTotal={departments.length}
        readinessPercent={readinessPercent}
        attentionTotal={attentionTotal}
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <SalesOverviewCard activityByDay={activityByDay} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              <DocumentHealthCard
                readyDocuments={readyDocuments}
                processingDocuments={processingDocuments}
                failedDocuments={failedDocuments}
              />
            </div>
            <div className="col-span-12">
              <SourcesByTypeCard sourceTypes={sourceTypes} />
            </div>
            <div className="col-span-12">
              <EngagementSparkCard
                activeUsers={activeUsers}
                totalUsers={totalUsers}
                inactiveUsers7d={inactiveUsers7d}
                failedDocuments={failedDocuments}
                processingDocuments={processingDocuments}
                teamsWithNoFiles={teamsWithNoFiles}
                activityByDay={activityByDay}
              />
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <RecentUsersTimeline recentUsers={recentUsers} />
        </div>
        <div className="col-span-12 flex lg:col-span-8">
          <ActivityPerformanceTable activityLogs={activityLogs} />
        </div>

        <div className="col-span-12 lg:col-span-8">
          <ChartCard title="Department coverage" subtitle="Latest files across the most covered departments." className="h-full admin-enter admin-enter-delay-3">
            <AdminChart
              type="bar"
              height={300}
              options={departmentOptions}
              series={[{ name: "Latest files", data: topDepartments.map((dept) => dept._count.documents) }]}
            />
          </ChartCard>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <AdminCard className="h-full p-6 admin-enter admin-enter-delay-4">
            <AdminCardHeader title="Attention queue" subtitle="Items that need admin action today." />
            <div className="mt-5 space-y-3">
              {attentionItems.length === 0 ? (
                <div className="rounded-xl border border-emerald-300/50 bg-[var(--admin-lightsuccess)] p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-[var(--admin-success)]">
                      <Icon icon="solar:check-circle-linear" width={20} height={20} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--admin-success)]">Workspace healthy</p>
                      <p className="mt-1 text-sm leading-5 text-[var(--admin-muted)]">No urgent issues right now.</p>
                    </div>
                  </div>
                </div>
              ) : (
                attentionItems.map((item, index) => (
                  <div key={`${item.severity}-${index}`} className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-background)] p-4 transition hover:border-[var(--admin-primary)]">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-lightwarning)] text-[var(--admin-warning)]">
                        <Icon icon="solar:shield-warning-linear" width={19} height={19} />
                      </span>
                      <div>
                        <Badge variant={item.severity === "High" ? "destructive" : "warning"}>{item.severity}</Badge>
                        <p className="mt-2 text-sm leading-5 text-[var(--admin-heading)]">{item.text}</p>
                        <Button asChild size="sm" variant="ghost" className="mt-2 h-auto px-0 text-[var(--admin-primary)] hover:bg-transparent hover:text-[var(--admin-primary-emphasis)]">
                          <Link href={item.href}>Resolve</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminCard>
        </div>

        <div className="col-span-12">
          <TableCard
            title="Recently added files"
            subtitle="Most recent uploads and who added them."
            subtitleClassName="text-[var(--admin-heading)]"
            className="admin-enter admin-enter-delay-4"
            action={
              <Button asChild variant="outline" size="sm" className="rounded-xl border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-link)] hover:bg-[var(--admin-soft)]">
                <Link href="/admin/data-management?tab=documents">Review all files</Link>
              </Button>
            }
          >
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--admin-border)]">
                  <TableHead className="text-sm font-semibold text-[var(--admin-heading)]">File</TableHead>
                  <TableHead className="text-sm font-semibold text-[var(--admin-heading)]">Department</TableHead>
                  <TableHead className="text-sm font-semibold text-[var(--admin-heading)]">Added by</TableHead>
                  <TableHead className="text-sm font-semibold text-[var(--admin-heading)]">Status</TableHead>
                  <TableHead className="text-sm font-semibold text-[var(--admin-heading)]">Added on</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastUploads.length === 0 ? (
                  <TableRow className="border-[var(--admin-border)]">
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-[var(--admin-heading)]">
                      No files uploaded yet. Add your first file to start training answers.
                    </TableCell>
                  </TableRow>
                ) : lastUploads.map((doc) => (
                  <TableRow key={doc.id} className="border-b border-[var(--admin-border)] transition hover:bg-[var(--admin-background)]">
                    <TableCell className="min-w-[240px]">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-lightprimary)] text-[var(--admin-primary)]">
                          <Icon
                            icon={doc.type === "url" ? "solar:link-round-linear" : doc.type === "pdf" ? "solar:file-text-linear" : "solar:document-text-linear"}
                            width={20}
                            height={20}
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--admin-heading)]">{doc.name}</p>
                          <p className="mt-1 text-xs font-medium uppercase text-[var(--admin-muted)]">
                            {doc.type} source / v{doc.version}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-[var(--admin-background)] px-3 py-1 text-xs font-semibold text-[var(--admin-heading)]">
                        {doc.department.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-[var(--admin-heading)]">{doc.uploadedBy.name ?? "Unknown"}</p>
                    </TableCell>
                    <TableCell><Badge variant={statusVariant(doc.status)}>{doc.status}</Badge></TableCell>
                  <TableCell>
                    <p className="whitespace-nowrap text-sm font-medium text-[var(--admin-heading)]">
                        {formatDashboardDate(doc.createdAt)}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        </div>
      </div>
    </div>
  );
}
