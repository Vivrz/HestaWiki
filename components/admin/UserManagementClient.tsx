"use client";

import { useState, useMemo } from "react";
import { Card, TextInput, Select } from "flowbite-react";
import {
  HiOutlineUsers,
  HiOutlineChartPie,
  HiOutlineClock,
  HiOutlineChatAlt2,
  HiSearch,
} from "react-icons/hi";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  AdminUser,
  UserRole,
  UsagePoint,
} from "./types";
import UserList from "./UserList";

const ROLES: UserRole[] = ["Admin", "HR", "Engineer", "Finance", "Legal", "Designer", "User"];

interface KpiTileProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bg: string;
}

function KpiTile({ label, value, icon, bg }: KpiTileProps) {
  return (
    <div className={`rounded-2xl ${bg} px-5 py-5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-1.5 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/70 text-slate-700 shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

function ChartTooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

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
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    if (roleFilter) {
      users = users.filter((u) => u.role === roleFilter);
    }

    return users;
  }, [initialUsers, search, roleFilter]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <section className="page-hero">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
          User Management
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
          See who&apos;s asking, what they need, and how the platform is used.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Monitor user activity, view chat histories, and understand how your
          team interacts with the enterprise knowledge base.
        </p>
      </section>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiTile
          label="Weekly Active"
          value={usageStats.weeklyActiveUsers}
          icon={<HiOutlineUsers className="h-6 w-6" />}
          bg="bg-tile-blue"
        />
        <KpiTile
          label="Monthly Active"
          value={usageStats.monthlyActiveUsers}
          icon={<HiOutlineChartPie className="h-6 w-6" />}
          bg="bg-tile-mint"
        />
        <KpiTile
          label="Avg Session"
          value={`${usageStats.avgSessionMinutes}m`}
          icon={<HiOutlineClock className="h-6 w-6" />}
          bg="bg-tile-lavender"
        />
        <KpiTile
          label="Sessions / User"
          value={usageStats.avgSessionsPerUser}
          icon={<HiOutlineChatAlt2 className="h-6 w-6" />}
          bg="bg-sky-100"
        />
        <KpiTile
          label="Total Chats"
          value={usageStats.totalChatsThisMonth.toLocaleString()}
          icon={<HiOutlineChatAlt2 className="h-6 w-6" />}
          bg="bg-tile-peach"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Weekly Usage */}
        <Card className="glass-panel rounded-[1.75rem] border-white/60">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Weekly Usage</h2>
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              Last 7 days
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={weeklyUsage}>
              <defs>
                <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0EA5A4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0EA5A4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis hide />
              <Tooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="chats"
                name="Chats"
                stroke="#0EA5A4"
                strokeWidth={2}
                fill="url(#chatGrad)"
              />
              <Area
                type="monotone"
                dataKey="users"
                name="Users"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly Usage */}
        <Card className="glass-panel rounded-[1.75rem] border-white/60">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Monthly Usage</h2>
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              Last 6 months
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis hide />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="chats"
                name="Chats"
                fill="#0EA5A4"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Users */}
      <Card className="glass-panel rounded-[1.75rem] border-white/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Recent Users</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <TextInput
              // icon={HiSearch}
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[220px]"
            />
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="min-w-[160px]"
            >
              <option value="">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <UserList users={filteredUsers} />
      </Card>
    </div>
  );
}
