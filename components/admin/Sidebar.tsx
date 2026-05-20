"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineDatabase,
  HiOutlineOfficeBuilding,
  HiChat,
  HiLogout,
  HiSparkles,
} from "react-icons/hi";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: HiOutlineHome },
  { href: "/admin/users", label: "Users", icon: HiOutlineUsers },
  { href: "/admin/data-management", label: "Data Management", icon: HiOutlineDatabase },
  { href: "/admin/departments", label: "Departments", icon: HiOutlineOfficeBuilding },
];

interface SidebarContentProps {
  onNavigate?: () => void;
}

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col px-5 py-6">
      <Link
        href="/admin"
        onClick={onNavigate}
        className="rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
      >
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-300 to-emerald-300 text-slate-950 shadow-lg">
          <HiSparkles className="h-6 w-6" />
        </div>
        <p className="font-display text-lg font-semibold text-white">Hestawiki</p>
        <p className="mt-1 text-sm text-slate-300">Operations workspace</p>
      </Link>

      <div className="mt-8 flex flex-1 flex-col justify-between">
        <nav className="space-y-2" aria-label="Admin navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-white text-slate-950 shadow-[0_20px_50px_-25px_rgba(56,189,248,0.6)]"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl transition",
                    isActive ? "bg-slate-950 text-sky-300" : "bg-white/5 text-slate-300",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </Link>
            );
          })}

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Next step</p>
            <p className="mt-2 leading-6">
              Add fresh files each week so answers stay accurate and current.
            </p>
          </div>
        </nav>

        <div className="space-y-2">
          <Link
            href="/chat"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
              <HiChat className="h-5 w-5" />
            </span>
            Open chat workspace
          </Link>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
              <HiLogout className="h-5 w-5" />
            </span>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-80 flex-col border-r border-white/50 bg-slate-950 text-white shadow-[18px_0_60px_-32px_rgba(15,23,42,0.75)]">
      <SidebarContent />
    </aside>
  );
}

export { SidebarContent };
