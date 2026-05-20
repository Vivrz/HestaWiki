import { prisma } from "@/lib/prisma";
import { AdminMetricTile, AdminPageHeader, AdminPanel, DarkTableFrame } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import {
  HiArrowRight,
  HiClipboardList,
  HiExclamation,
  HiOutlineClock,
  HiUpload,
  HiUserGroup,
} from "react-icons/hi";

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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

async function getDashboardData() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    readyDocuments,
    failedDocuments,
    processingDocuments,
    totalUsers,
    inactiveUsers7d,
    departments,
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
    prisma.department.findMany({
      include: {
        _count: { select: { documents: { where: { isLatest: true } } } },
      },
      orderBy: { name: "asc" },
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
      take: 4,
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
      take: 4,
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
    if (recentUsersMap.size >= 4 || recentUsersMap.has(user.id)) {
      continue;
    }

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
    .slice(0, 4);

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
      event: `Team created: ${team.name}`,
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
    departments,
    lastUploads,
    teamsWithNoFiles,
    activityLogs,
    recentUsers,
  };
}

export default async function AdminDashboard() {
  const {
    readyDocuments,
    failedDocuments,
    processingDocuments,
    totalUsers,
    inactiveUsers7d,
    departments,
    lastUploads,
    teamsWithNoFiles,
    activityLogs,
    recentUsers,
  } = await getDashboardData();

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
          text: `${teamsWithNoFiles} team${teamsWithNoFiles > 1 ? "s" : ""} have no files assigned yet.`,
          href: "/admin/departments",
        }
      : null,
  ].filter(Boolean) as Array<{ severity: "High" | "Medium"; text: string; href: string }>;

  return (
    <div className="space-y-6 pb-8">
      <AdminPageHeader title="Hey, Admin" subtitle="Welcome back to dashboard" actionLabel="Add files" actionHref="/admin/data-management" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricTile
          label="Ready files"
          value={readyDocuments}
          insight="Files currently available for chat answers."
          actionLabel="Manage files"
          actionHref="/admin/data-management?tab=documents"
        />
        <AdminMetricTile
          label="Files needing review"
          value={failedDocuments}
          insight="These failed to process and need a fix."
          actionLabel="Review failures"
          actionHref="/admin/data-management?tab=documents"
        />
        <AdminMetricTile
          label="Departments missing files"
          value={teamsWithNoFiles}
          insight="Departments without any latest files assigned."
          actionLabel="Update departments"
          actionHref="/admin/departments"
        />
        <AdminMetricTile
          label="Inactive users (7d)"
          value={`${inactiveUsers7d}/${totalUsers}`}
          insight="Users who did not start a chat this week."
          actionLabel="Open users"
          actionHref="/admin/users"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.6fr]">
        <div className="flex h-full min-h-0 flex-col gap-5">
          <AdminPanel className="flex min-h-0 flex-1 flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <HiUserGroup className="h-5 w-5 text-[var(--admin-text)]" />
                  Recent users
                </h2>
                <p className="mt-1 text-sm text-[var(--admin-text)]">Latest people active in the workspace.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-[var(--admin-text)]">
                {recentUsers.length} shown
              </span>
            </div>
            <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto">
              {recentUsers.length === 0 ? (
                <div className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] p-4 text-sm text-[var(--admin-text)]">
                  No users found yet.
                </div>
              ) : (
                recentUsers.map((user) => (
                  <div key={user.id} className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] p-4">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img src={user.image} alt={`${user.name} avatar`} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--admin-panel)] text-xs font-semibold text-[var(--admin-text)]">
                          {getInitials(user.name)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--admin-text)]">{user.name}</p>
                        <p className="truncate text-xs text-[var(--admin-text)]">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[var(--admin-text)]">
                          {user.hasChats ? formatDistanceToNow(user.lastActiveAt, { addSuffix: true }) : "No chats yet"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--admin-text)]">
                          {user.sessionCount} {user.sessionCount === 1 ? "chat" : "chats"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>

          <AdminPanel className="flex min-h-0 flex-1 flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <HiExclamation className="h-5 w-5 text-amber-300" />
                  Attention queue
                </h2>
                <p className="mt-1 text-sm text-[var(--admin-text)]">Items that need admin action today.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-[var(--admin-text)]">{attentionItems.length} open</span>
            </div>
            <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto">
              {attentionItems.length === 0 ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                  No urgent issues right now. Your workspace is healthy.
                </div>
              ) : (
                attentionItems.map((item, index) => (
                  <div key={`${item.severity}-${index}`} className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={item.severity === "High" ? "destructive" : "warning"}>{item.severity}</Badge>
                      <p className="text-sm leading-5 text-[var(--admin-text)]">{item.text}</p>
                    </div>
                    <Button asChild size="sm" variant="ghost" className="mt-3 h-auto px-0 text-[var(--admin-text)] hover:bg-transparent hover:text-[var(--admin-text)]">
                      <Link href={item.href}>
                        Resolve
                        <HiArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>
        </div>

        <AdminPanel className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <HiClipboardList className="h-5 w-5 text-[var(--admin-text)]" />
                Activity logs
              </h2>
              <p className="mt-1 text-sm text-[var(--admin-text)]">Recent events across files, teams, and people.</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="border border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] !text-[var(--admin-text)] hover:bg-white/10 hover:!text-[var(--admin-text)]">
              <Link href="/admin/data-management?tab=documents">Open file manager</Link>
            </Button>
          </div>
          <DarkTableFrame>
            <Table className="[&_td]:!text-[var(--admin-text)] [&_th]:!text-[var(--admin-table-head-text)]">
              <TableHeader className="!bg-[var(--admin-table-head-bg)]">
                <TableRow className="border-[var(--admin-panel-border)]">
                  <TableHead className="text-[var(--admin-table-head-text)]">Time</TableHead>
                  <TableHead className="text-[var(--admin-table-head-text)]">Area</TableHead>
                  <TableHead className="text-[var(--admin-table-head-text)]">Event</TableHead>
                  <TableHead className="text-[var(--admin-table-head-text)]">Actor</TableHead>
                  <TableHead className="text-[var(--admin-table-head-text)]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-[var(--admin-panel-border)]">
                {activityLogs.length === 0 ? (
                  <TableRow className="border-[var(--admin-panel-border)]">
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-[var(--admin-text)]">
                      No recent activity yet.
                    </TableCell>
                  </TableRow>
                ) : activityLogs.map((log, index) => {
                  const variant =
                    log.status === "ready"
                      ? "success"
                      : log.status === "failed"
                        ? "destructive"
                        : log.status === "processing"
                          ? "warning"
                          : log.status === "created"
                            ? "secondary"
                            : "default";

                  return (
                    <TableRow key={`${log.event}-${index}`} className="border-[var(--admin-panel-border)] hover:bg-white/[0.03]">
                      <TableCell className="whitespace-nowrap text-xs text-[var(--admin-text)]">
                        {new Date(log.at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium text-[var(--admin-text)]">{log.area}</TableCell>
                      <TableCell className="font-medium text-[var(--admin-text)]">
                        {log.event}
                      </TableCell>
                      <TableCell className="text-[var(--admin-text)]">{log.actor}</TableCell>
                      <TableCell>
                        <Badge variant={variant}>{log.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DarkTableFrame>
        </AdminPanel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AdminPanel className="p-6">
          <h2 className="text-lg font-semibold">Team file coverage</h2>
          <p className="mt-1 text-sm text-[var(--admin-text)]">Find teams that need documents first.</p>
          <DarkTableFrame>
            <Table className="[&_td]:!text-[var(--admin-text)] [&_th]:!text-[var(--admin-table-head-text)]">
              <TableHeader className="!bg-[var(--admin-table-head-bg)]">
                <TableRow className="border-[var(--admin-panel-border)]">
                  <TableHead className="text-[var(--admin-table-head-text)]">Team</TableHead>
                  <TableHead className="text-[var(--admin-table-head-text)]">Latest files</TableHead>
                  <TableHead className="text-[var(--admin-table-head-text)]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-[var(--admin-panel-border)]">
                {departments.map((dept) => {
                  const count = dept._count.documents;
                  return (
                    <TableRow key={dept.id} className="border-[var(--admin-panel-border)] hover:bg-white/[0.03]">
                      <TableCell className="font-medium text-[var(--admin-text)]">{dept.name}</TableCell>
                      <TableCell className="text-[var(--admin-text)]">{count}</TableCell>
                      <TableCell>
                        {count > 0 ? (
                          <Badge variant="success">Covered</Badge>
                        ) : (
                          <Badge variant="warning">Needs files</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DarkTableFrame>
        </AdminPanel>

        <AdminPanel className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <HiUpload className="h-5 w-5 text-[var(--admin-text)]" />
            Recently added files
          </h2>
          <p className="mt-1 text-sm text-[var(--admin-text)]">Most recent uploads and who added them.</p>
          <div className="mt-5 space-y-3">
            {lastUploads.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-[var(--admin-text)]">
                No files uploaded yet. Add your first file to start training answers.
              </p>
            ) : (
              lastUploads.map((doc) => (
                <div key={doc.id} className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--admin-text)]">{doc.name}</p>
                    <Badge
                      variant={doc.status === "ready" ? "success" : doc.status === "failed" ? "destructive" : "warning"}
                    >
                      {doc.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--admin-text)]">{doc.department.name} · {doc.uploadedBy.name ?? "Unknown"}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[var(--admin-text)]">
                    <HiOutlineClock className="h-3.5 w-3.5" />
                    {new Date(doc.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
            <Button asChild variant="ghost" className="w-full border border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] !text-[var(--admin-text)] hover:bg-white/10 hover:!text-[var(--admin-text)]">
              <Link href="/admin/data-management?tab=documents">Review all files</Link>
            </Button>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel className="p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <HiUserGroup className="h-5 w-5 text-[var(--admin-text)]" />
          Suggested next actions
        </h2>
        <ul className="mt-5 grid gap-3 text-sm text-[var(--admin-text)] sm:grid-cols-2">
          <li className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] p-4">Assign at least one file to every team this week.</li>
          <li className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] p-4">Retry failed uploads before users start asking repeat questions.</li>
          <li className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] p-4">Review inactive users and confirm onboarding is complete.</li>
          <li className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] p-4">Clean old duplicate versions to keep search results relevant.</li>
        </ul>
      </AdminPanel>
    </div>
  );
}
