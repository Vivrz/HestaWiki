"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HiOutlineChatAlt2, HiOutlineClock, HiOutlineUsers } from "react-icons/hi";
import { AdminUser, UsagePoint, UserRole } from "./types";
import UserList from "./UserList";
import { AdminMetricTile, AdminPageHeader, AdminPanel } from "@/components/admin/AdminUI";
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

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-[var(--admin-panel-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 text-xs font-semibold text-[var(--admin-text)]">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function TrendCardHeader({
  title,
  subtitle,
  rangeLabel,
}: {
  title: string;
  subtitle: string;
  rangeLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold text-[var(--admin-text)]">{title}</h2>
        <p className="mt-1 text-xs text-[var(--admin-text)]">{subtitle}</p>
      </div>
      <span className="rounded-lg bg-[var(--admin-panel-soft)] px-3 py-1.5 text-xs font-medium text-[var(--admin-text)]">
        {rangeLabel}
      </span>
    </div>
  );
}

function WeeklyTrendCard({
  data,
}: {
  data: UsagePoint[];
}) {
  return (
    <AdminPanel className="p-5">
      <TrendCardHeader title="Weekly trend" subtitle="Total for the last 7 days" rangeLabel="Last 7 days" />
      <div className="mt-7 h-[235px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="weeklyTrend-primary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--admin-chart-primary-fill-start)" />
                <stop offset="100%" stopColor="var(--admin-chart-primary-fill-end)" />
              </linearGradient>
              <linearGradient id="weeklyTrend-secondary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--admin-chart-secondary-fill-start)" />
                <stop offset="100%" stopColor="var(--admin-chart-secondary-fill-end)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-chart-grid)" />
            <XAxis dataKey="label" axisLine={{ stroke: "var(--admin-chart-axis)" }} tickLine={false} tick={{ fontSize: 11, fill: "var(--admin-chart-axis)" }} dy={8} />
            <YAxis hide />
            <Tooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="chats" name="Chats" stroke="var(--admin-chart-primary)" strokeWidth={2} fill="url(#weeklyTrend-primary)" />
            <Area type="monotone" dataKey="users" name="Users" stroke="var(--admin-chart-secondary)" strokeWidth={2} fill="url(#weeklyTrend-secondary)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AdminPanel>
  );
}

function MonthlyTrendCard({
  data,
}: {
  data: UsagePoint[];
}) {
  return (
    <AdminPanel className="p-5">
      <TrendCardHeader title="Monthly trend" subtitle="Total for the last 30 days" rangeLabel="Last 30 days" />
      <div className="mt-7 h-[235px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-chart-grid)" />
            <XAxis dataKey="label" axisLine={{ stroke: "var(--admin-chart-axis)" }} tickLine={false} tick={{ fontSize: 11, fill: "var(--admin-chart-axis)" }} dy={8} />
            <YAxis hide />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar dataKey="chats" name="Chats" fill="var(--admin-chart-primary)" radius={[7, 7, 0, 0]} maxBarSize={72} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AdminPanel>
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
        <AdminMetricTile
          label="Users active this week"
          value={usageStats.weeklyActiveUsers}
          insight="Users who started at least one chat in the last 7 days."
          icon={<HiOutlineUsers className="h-5 w-5" />}
        />
        <AdminMetricTile
          label="Users active this month"
          value={usageStats.monthlyActiveUsers}
          insight="Monthly active users across all teams."
          icon={<HiOutlineUsers className="h-5 w-5" />}
        />
        <AdminMetricTile
          label="Average chat length"
          value={`${usageStats.avgSessionMinutes}m`}
          insight="Average minutes from first to last message."
          icon={<HiOutlineClock className="h-5 w-5" />}
        />
        <AdminMetricTile
          label="Average chats per person"
          value={usageStats.avgSessionsPerUser}
          insight="How many sessions each user starts on average."
          icon={<HiOutlineChatAlt2 className="h-5 w-5" />}
        />
        <AdminMetricTile
          label="Total chats this month"
          value={usageStats.totalChatsThisMonth.toLocaleString()}
          insight="Total sessions started in the current month."
          icon={<HiOutlineChatAlt2 className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <WeeklyTrendCard data={weeklyUsage} />
        <MonthlyTrendCard data={monthlyUsage} />
      </div>

      <AdminPanel className="p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--admin-text)]">Users and chat history</h2>
              <p className="mt-1 text-sm text-[var(--admin-text)]">Search people, then expand rows to inspect full conversations.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-[220px] border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] text-[var(--admin-text)] placeholder:text-[var(--admin-text)]"
              />
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="min-w-[160px] border-[var(--admin-panel-border)] bg-[var(--admin-panel-soft)] text-[var(--admin-text)]"
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
      </AdminPanel>
    </div>
  );
}
