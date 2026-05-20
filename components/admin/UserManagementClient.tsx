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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function MetricTile({
  label,
  value,
  insight,
  icon,
}: {
  label: string;
  value: string | number;
  insight: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            {icon}
          </span>
        </div>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">{insight}</p>
      </CardContent>
    </Card>
  );
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
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
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
      <section className="admin-shell">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Users</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Understand who is using chat</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
          Review user activity, inspect chat history, and find people who need onboarding support.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile
          label="Users active this week"
          value={usageStats.weeklyActiveUsers}
          insight="Users who started at least one chat in the last 7 days."
          icon={<HiOutlineUsers className="h-5 w-5" />}
        />
        <MetricTile
          label="Users active this month"
          value={usageStats.monthlyActiveUsers}
          insight="Monthly active users across all teams."
          icon={<HiOutlineUsers className="h-5 w-5" />}
        />
        <MetricTile
          label="Average chat length"
          value={`${usageStats.avgSessionMinutes}m`}
          insight="Average minutes from first to last message."
          icon={<HiOutlineClock className="h-5 w-5" />}
        />
        <MetricTile
          label="Average chats per person"
          value={usageStats.avgSessionsPerUser}
          insight="How many sessions each user starts on average."
          icon={<HiOutlineChatAlt2 className="h-5 w-5" />}
        />
        <MetricTile
          label="Total chats this month"
          value={usageStats.totalChatsThisMonth.toLocaleString()}
          insight="Total sessions started in the current month."
          icon={<HiOutlineChatAlt2 className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly trend</CardTitle>
            <CardDescription>Shows whether usage is rising or dropping over the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={weeklyUsage}>
                <defs>
                  <linearGradient id="weeklyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5A4" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0EA5A4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis hide />
                <Tooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="chats" name="Chats" stroke="#0EA5A4" strokeWidth={2} fill="url(#weeklyGradient)" />
                <Area type="monotone" dataKey="users" name="Users" stroke="#6366f1" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly trend</CardTitle>
            <CardDescription>Compares monthly chat volume over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis hide />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="chats" name="Chats" fill="#0EA5A4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Users and chat history</CardTitle>
              <CardDescription>Search people, then expand rows to inspect full conversations.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-[220px]"
              />
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="min-w-[160px]"
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
        </CardHeader>
        <CardContent>
          <UserList users={filteredUsers} />
        </CardContent>
      </Card>
    </div>
  );
}
