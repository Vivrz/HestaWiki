import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { HiArrowRight, HiClipboardList, HiExclamation, HiOutlineClock, HiUpload, HiUserGroup } from "react-icons/hi";

export const dynamic = "force-dynamic";

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
  ]);

  const teamsWithNoFiles = departments.filter((dept) => dept._count.documents === 0).length;
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
  };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  helper: string;
  actionLabel: string;
  actionHref: string;
}

function MetricCard({ title, value, helper, actionLabel, actionHref }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">{helper}</p>
        <Button asChild size="sm" variant="ghost" className="mt-3 h-auto px-0 text-sky-700 hover:bg-transparent hover:text-sky-800">
          <Link href={actionHref}>
            {actionLabel}
            <HiArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
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
    <div className="space-y-6">
      <section className="admin-shell">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Operations command center</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
              Check what needs attention, resolve issues, and keep your team knowledge ready for answers.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/data-management">Add files</Link>
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <HiExclamation className="h-5 w-5 text-amber-600" />
            Attention queue
          </CardTitle>
          <CardDescription>Items that need admin action today.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {attentionItems.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              No urgent issues right now. Your workspace is healthy.
            </div>
          ) : (
            attentionItems.map((item, index) => (
              <div key={`${item.severity}-${index}`} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={item.severity === "High" ? "destructive" : "warning"}>{item.severity}</Badge>
                  <p className="text-sm text-slate-700">{item.text}</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={item.href}>Resolve</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Ready files"
          value={readyDocuments}
          helper="Files currently available for chat answers."
          actionLabel="Manage files"
          actionHref="/admin/data-management?tab=documents"
        />
        <MetricCard
          title="Files needing review"
          value={failedDocuments}
          helper="These failed to process and need a fix."
          actionLabel="Review failures"
          actionHref="/admin/data-management?tab=documents"
        />
        <MetricCard
          title="Departments missing files"
          value={teamsWithNoFiles}
          helper="Departments without any latest files assigned."
          actionLabel="Update departments"
          actionHref="/admin/departments"
        />
        <MetricCard
          title="Inactive users (7d)"
          value={`${inactiveUsers7d}/${totalUsers}`}
          helper="Users who did not start a chat this week."
          actionLabel="Open users"
          actionHref="/admin/users"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HiClipboardList className="h-5 w-5 text-slate-600" />
                Activity logs
              </CardTitle>
              <CardDescription>
                Recent events across files, teams, and people.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/data-management?tab=documents">Open file manager</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-hidden rounded-xl border border-slate-200 p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
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
                  <TableRow key={`${log.event}-${index}`}>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {new Date(log.at).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.area}</TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {log.event}
                    </TableCell>
                    <TableCell>{log.actor}</TableCell>
                    <TableCell>
                      <Badge variant={variant}>{log.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Team file coverage</CardTitle>
            <CardDescription>Find teams that need documents first.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden rounded-xl border border-slate-200 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Latest files</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => {
                  const count = dept._count.documents;
                  return (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium text-slate-900">{dept.name}</TableCell>
                      <TableCell>{count}</TableCell>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HiUpload className="h-5 w-5 text-slate-500" />
              Recently added files
            </CardTitle>
            <CardDescription>Most recent uploads and who added them.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastUploads.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                No files uploaded yet. Add your first file to start training answers.
              </p>
            ) : (
              lastUploads.map((doc) => (
                <div key={doc.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{doc.name}</p>
                    <Badge
                      variant={doc.status === "ready" ? "success" : doc.status === "failed" ? "destructive" : "warning"}
                    >
                      {doc.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{doc.department.name} · {doc.uploadedBy.name ?? "Unknown"}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <HiOutlineClock className="h-3.5 w-3.5" />
                    {new Date(doc.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/data-management?tab=documents">Review all files</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HiUserGroup className="h-5 w-5 text-slate-600" />
            Suggested next actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <li className="rounded-xl border border-slate-200 p-4">Assign at least one file to every team this week.</li>
            <li className="rounded-xl border border-slate-200 p-4">Retry failed uploads before users start asking repeat questions.</li>
            <li className="rounded-xl border border-slate-200 p-4">Review inactive users and confirm onboarding is complete.</li>
            <li className="rounded-xl border border-slate-200 p-4">Clean old duplicate versions to keep search results relevant.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
