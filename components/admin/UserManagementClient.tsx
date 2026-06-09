"use client";

import { useMemo, useState } from "react";
import { HiOutlineChatAlt2, HiOutlineClock, HiOutlineUsers } from "react-icons/hi";
import { AdminUser, UsagePoint, UserRole } from "./types";
import UserList from "./UserList";
import AdminChart from "@/components/admin/AdminChart";
import { AdminCard, AdminPageHeader, ChartCard, MetricCard } from "@/components/admin/AdminUI";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const ROLES: UserRole[] = ["Admin", "HR", "Engineer", "Finance", "Legal", "Designer", "User"];

interface UserManagementClientProps {
  users: AdminUser[];
  weeklyUsage: UsagePoint[];
  monthlyUsage: UsagePoint[];
  usageStats: {
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    avgSessionMinutes: number;
    avgSessionsPerUser: number;
    totalChatsThisMonth: number;
  };
}

function WeeklyTrendCard({
  data,
}: {
  data: UsagePoint[];
}) {
  const options = {
    chart: { toolbar: { show: false }, fontFamily: "inherit", foreColor: "var(--admin-chart-axis)" },
    colors: ["var(--admin-chart-primary)", "var(--admin-chart-secondary)"],
    dataLabels: { enabled: false },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 0, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] },
    },
    grid: { borderColor: "var(--admin-chart-grid)", strokeDashArray: 3 },
    legend: { show: false },
    stroke: { curve: "smooth" as const, width: 3 },
    xaxis: {
      categories: data.map((point) => point.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { show: false } },
    tooltip: { theme: "dark" },
  };

  return (
    <ChartCard title="Weekly trend" subtitle="Chats and active users for the last 7 days.">
      <AdminChart
        type="area"
        height={270}
        options={options}
        series={[
          { name: "Chats", data: data.map((point) => point.chats) },
          { name: "Users", data: data.map((point) => point.users) },
        ]}
      />
    </ChartCard>
  );
}

function MonthlyTrendCard({
  data,
}: {
  data: UsagePoint[];
}) {
  const options = {
    chart: { toolbar: { show: false }, fontFamily: "inherit", foreColor: "var(--admin-chart-axis)" },
    colors: ["var(--admin-chart-primary)", "var(--admin-chart-secondary)"],
    dataLabels: { enabled: false },
    grid: { borderColor: "var(--admin-chart-grid)", strokeDashArray: 3 },
    legend: { show: false },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "32%" } },
    xaxis: {
      categories: data.map((point) => point.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { show: false } },
    tooltip: { theme: "dark" },
  };

  return (
    <ChartCard title="Monthly trend" subtitle="Chats and active users for the last 6 months.">
      <AdminChart
        type="bar"
        height={270}
        options={options}
        series={[
          { name: "Chats", data: data.map((point) => point.chats) },
          { name: "Users", data: data.map((point) => point.users) },
        ]}
      />
    </ChartCard>
  );
}

export default function UserManagementClient({
  users: initialUsers,
  weeklyUsage,
  monthlyUsage,
  usageStats,
}: UserManagementClientProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const filteredUsers = useMemo(() => {
    let users = initialUsers;

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      users = users.filter(
        (user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
      );
    }

    if (roleFilter) {
      users = users.filter((user) => user.role === roleFilter);
    }

    return users;
  }, [initialUsers, roleFilter, search]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Users" subtitle="Review user activity, inspect chat history, and find people who need onboarding support." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Users active this week"
          value={usageStats.weeklyActiveUsers}
          insight="Users who started at least one chat in the last 7 days."
          icon={<HiOutlineUsers className="h-5 w-5" />}
          tone="primary"
        />
        <MetricCard
          label="Users active this month"
          value={usageStats.monthlyActiveUsers}
          insight="Monthly active users across all teams."
          icon={<HiOutlineUsers className="h-5 w-5" />}
          tone="secondary"
        />
        <MetricCard
          label="Average chat length"
          value={`${usageStats.avgSessionMinutes}m`}
          insight="Average minutes from first to last message."
          icon={<HiOutlineClock className="h-5 w-5" />}
          tone="success"
        />
        <MetricCard
          label="Average chats per person"
          value={usageStats.avgSessionsPerUser}
          insight="How many sessions each user starts on average."
          icon={<HiOutlineChatAlt2 className="h-5 w-5" />}
          tone="warning"
        />
        <MetricCard
          label="Total chats this month"
          value={usageStats.totalChatsThisMonth.toLocaleString()}
          insight="Total sessions started in the current month."
          icon={<HiOutlineChatAlt2 className="h-5 w-5" />}
          tone="primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <WeeklyTrendCard data={weeklyUsage} />
        <MonthlyTrendCard data={monthlyUsage} />
      </div>

      <AdminCard className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--admin-heading)]">Users and chat history</h2>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">Search people, then expand rows to inspect full conversations.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-[220px] rounded-xl border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-link)] placeholder:text-[var(--admin-muted)]"
              />
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="min-w-[160px] rounded-xl border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-link)]"
              >
                <option value="">All roles</option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        <div className="mt-5">
          <UserList users={filteredUsers} />
        </div>
      </AdminCard>
    </div>
  );
}
