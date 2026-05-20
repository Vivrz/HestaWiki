"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineDatabase,
  HiOutlineOfficeBuilding,
  HiChat,
  HiLogout,
  HiMoon,
  HiSun,
} from "react-icons/hi";
import { cn } from "@/lib/utils";
import HestawikiWordmark from "@/components/admin/HestawikiWordmark";

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

function useAdminThemeState() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains("admin-light"));
  }, []);

  const toggleTheme = () => {
    const nextLight = !isLight;
    document.documentElement.classList.toggle("admin-light", nextLight);
    document.documentElement.classList.toggle("admin-dark", !nextLight);
    localStorage.setItem("admin-theme", nextLight ? "light" : "dark");
    setIsLight(nextLight);
  };

  return { isLight, toggleTheme };
}

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const { isLight, toggleTheme } = useAdminThemeState();

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <Link
        href="/admin"
        onClick={onNavigate}
        className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
      >
        <HestawikiWordmark tone="dark" />
        <p className="mt-1 text-sm text-zinc-400">Operations workspace</p>
      </Link>

      <div className="mt-7 flex flex-1 flex-col justify-between">
        <nav className="space-y-2" aria-label="Admin navigation">
          <p className="px-4 pb-2 text-xs font-medium text-zinc-500">Pages</p>
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
                    ? "bg-white text-zinc-950 shadow-[0_20px_50px_-25px_rgba(255,255,255,0.45)]"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-xl transition",
                    isActive ? "bg-zinc-950 text-white" : "bg-white/5 text-zinc-300",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </Link>
            );
          })}

          <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300">
            <p className="font-medium text-white">Next step</p>
            <p className="mt-2 leading-6 text-zinc-400">
              Add fresh files each week so answers stay accurate and current.
            </p>
          </div>
        </nav>

        <div className="space-y-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
            onClick={toggleTheme}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
              {isLight ? <HiMoon className="h-5 w-5" /> : <HiSun className="h-5 w-5" />}
            </span>
            {isLight ? "Dark theme" : "Light theme"}
          </button>

          <Link
            href="/chat"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
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

function CollapsedRailButton({
  label,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl text-sm transition",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function CollapsedRailLink({
  href,
  label,
  children,
  className,
  onNavigate,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl text-sm transition",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function AdminCollapsedRail({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const { isLight, toggleTheme } = useAdminThemeState();

  return (
    <aside className="sticky top-4 flex h-[calc(100vh-2rem)] w-14 flex-col overflow-hidden rounded-[24px] bg-[var(--admin-button)] text-white shadow-[0_24px_80px_-42px_rgba(0,0,0,0.85)] lg:top-6 lg:h-[calc(100vh-3rem)]">
      <div className="flex h-full flex-col items-center gap-2 px-2 py-5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

          return (
            <CollapsedRailLink
              key={href}
              href={href}
              label={label}
              onNavigate={onNavigate}
              className={cn(
                isActive
                  ? "bg-white text-zinc-950 shadow-[0_20px_50px_-25px_rgba(255,255,255,0.45)]"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5" />
            </CollapsedRailLink>
          );
        })}

        <div className="flex-1" />

        <CollapsedRailButton
          label={isLight ? "Dark theme" : "Light theme"}
          onClick={toggleTheme}
          className="text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          {isLight ? <HiMoon className="h-5 w-5" /> : <HiSun className="h-5 w-5" />}
        </CollapsedRailButton>

        <CollapsedRailLink
          href="/chat"
          label="Open chat workspace"
          onNavigate={onNavigate}
          className="text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          <HiChat className="h-5 w-5" />
        </CollapsedRailLink>

        <CollapsedRailButton
          label="Sign out"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
        >
          <HiLogout className="h-5 w-5" />
        </CollapsedRailButton>
      </div>
    </aside>
  );
}

export default function AdminSidebar() {
  return (
    <aside className="sticky top-4 flex h-[calc(100vh-2rem)] w-72 flex-col overflow-hidden rounded-[24px] bg-[var(--admin-button)] text-white shadow-[0_24px_80px_-42px_rgba(0,0,0,0.85)] lg:top-6 lg:h-[calc(100vh-3rem)]">
      <SidebarContent />
    </aside>
  );
}

export { SidebarContent, AdminCollapsedRail };
