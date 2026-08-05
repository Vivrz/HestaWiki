"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import SimpleBar from "simplebar-react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import HestawikiWordmark from "@/components/admin/HestawikiWordmark";
import { Button } from "@/components/ui/button";
import RateLimitCountdownBadge from "@/components/ui/RateLimitCountdownBadge";
import RateLimitToast from "@/components/ui/RateLimitToast";
import {
  AdminRateLimitProvider,
  useAdminRateLimit,
} from "@/components/admin/AdminRateLimitContext";

const navSections = [
  {
    heading: "Home",
    children: [
      { id: "dashboard", name: "Dashboard", icon: "solar:widget-add-line-duotone", url: "/admin" },
      { id: "users", name: "Users", icon: "solar:users-group-rounded-linear", url: "/admin/users" },
      { id: "data", name: "Data Management", icon: "solar:database-linear", url: "/admin/data-management" },
      { id: "departments", name: "Departments", icon: "solar:buildings-2-linear", url: "/admin/departments" },
    ],
  },
  {
    heading: "Workspace",
    children: [
      { id: "chat", name: "Open chat workspace", icon: "solar:chat-round-line-linear", url: "/chat" },
    ],
  },
];

type AdminTheme = "light" | "dark";

interface AdminThemeContextValue {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function applyAdminTheme(theme: AdminTheme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("admin-dark");
    root.classList.remove("admin-light");
  } else {
    root.classList.add("admin-light");
    root.classList.remove("admin-dark");
  }
}

function getStoredAdminTheme(): AdminTheme {
  if (typeof window === "undefined") return "light";
  try {
    return localStorage.getItem("admin-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>("light");

  useLayoutEffect(() => {
    setThemeState(getStoredAdminTheme());
  }, []);

  useLayoutEffect(() => {
    applyAdminTheme(theme);
    try {
      localStorage.setItem("admin-theme", theme);
    } catch {}
  }, [theme]);

  const value = useMemo<AdminThemeContextValue>(() => ({
    theme,
    setTheme: setThemeState,
  }), [theme]);

  return (
    <AdminThemeContext.Provider value={value}>
      {children}
    </AdminThemeContext.Provider>
  );
}

function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("useAdminTheme must be used within AdminThemeProvider");
  }
  return context;
}

function isActivePath(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

function ThemeToggle() {
  const { theme, setTheme } = useAdminTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Use light theme" : "Use dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="hover:text-[var(--admin-primary)] px-[15px] group rounded-full flex justify-center items-center cursor-pointer text-[var(--admin-muted)] relative"
    >
      <span className="flex items-center justify-center relative after:absolute after:w-10 after:h-10 after:rounded-full after:-top-1/2 group-hover:after:bg-[var(--admin-lightprimary)]">
        <Icon icon={isDark ? "solar:sun-bold-duotone" : "tabler:moon"} width={20} />
      </span>
    </button>
  );
}

function SidebarLayout({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { theme } = useAdminTheme();
  const isDark = theme === "dark";

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--admin-border)] bg-[var(--admin-card)]">
      <div className="flex h-16 shrink-0 items-center border-b border-[var(--admin-border)] px-5">
        <Link href="/admin" onClick={onClose} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--admin-primary)] to-[var(--admin-secondary)] text-white shadow-md shadow-[var(--admin-lightprimary)]">
            <Icon icon="solar:widget-4-bold-duotone" width={18} height={18} />
          </span>
          <HestawikiWordmark tone={isDark ? "dark" : "light"} />
        </Link>
      </div>

      <SimpleBar className="min-h-0 flex-1">
        <nav className="flex flex-col gap-6 px-3 py-5">
          {navSections.map((section) => (
            <div key={section.heading}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                {section.heading}
              </p>
              <div className="space-y-1">
                {section.children.map((item) => {
                  const isActive = isActivePath(pathname, item.url);

                  return (
                    <Link
                      key={item.id}
                      href={item.url}
                      onClick={onClose}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                        isActive
                          ? "bg-[var(--admin-lightprimary)] text-[var(--admin-primary)]"
                          : "text-[var(--admin-link)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-heading)]",
                      )}
                    >
                      {isActive ? (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[var(--admin-primary)]" />
                      ) : null}
                      <Icon
                        icon={item.icon}
                        width={20}
                        height={20}
                        className={cn(
                          "shrink-0 transition-colors",
                          isActive
                            ? "text-[var(--admin-primary)]"
                            : "text-[var(--admin-muted)] group-hover:text-[var(--admin-primary)]",
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </SimpleBar>

      <div className="shrink-0 space-y-1 border-t border-[var(--admin-border)] p-3">
        <div className="flex items-center justify-between rounded-xl px-2">
          <span className="text-xs font-semibold text-[var(--admin-muted)]">Theme</span>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
        >
          <Icon icon="solar:logout-2-linear" width={20} height={20} />
          <span className="truncate">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function AdminHeader({ onMenu }: { onMenu: () => void }) {
  const [isSticky, setIsSticky] = useState(false);
  const { remainingSeconds } = useAdminRateLimit();

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-30 ${isSticky ? "bg-[var(--admin-background)] shadow-md" : "bg-transparent"}`}>
      <nav className="rounded-none py-4 sm:ps-6 sm:pe-10 flex justify-between items-center px-6">
        <button
          type="button"
          onClick={onMenu}
          className="px-[15px] hover:text-[var(--admin-primary)] text-[var(--admin-link)] relative after:absolute after:w-10 after:h-10 after:rounded-full hover:after:bg-[var(--admin-lightprimary)] after:bg-transparent rounded-full xl:hidden flex justify-center items-center cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Icon icon="tabler:menu-2" height={20} width={20} />
        </button>

        <div className="block xl:hidden">
          <HestawikiWordmark tone="light" size="sm" />
        </div>

        <div className="hidden xl:flex items-center justify-between w-full">
          <div className="relative">
            <Icon
              icon="solar:magnifer-linear"
              width={18}
              height={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]"
            />
            <input
              type="search"
              placeholder="Search..."
              className="h-10 w-[280px] rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] pl-10 pr-3 text-sm text-[var(--admin-link)] outline-none placeholder:text-[var(--admin-muted)] focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-lightprimary)]"
            />
          </div>

          <div className="flex items-center">
            <RateLimitCountdownBadge remainingSeconds={remainingSeconds} tone="admin" className="mr-2" />
            <ThemeToggle />
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-xl border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-link)] hover:bg-[var(--admin-soft)]"
            >
              <Link href="/chat">
                <Icon icon="solar:chat-round-line-linear" width={18} height={18} />
                Chat
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex xl:hidden items-center">
          <RateLimitCountdownBadge remainingSeconds={remainingSeconds} tone="admin" className="mr-2" />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toastNotice, dismissToast } = useAdminRateLimit();

  return (
    <div className="min-h-screen bg-[var(--admin-background)] font-[var(--font-admin)] text-[var(--admin-heading)]">
      <RateLimitToast notice={toastNotice} onDismiss={dismissToast} />
      <div className="flex w-full min-h-screen">
        <div className="page-wrapper flex w-full">
          <div className="hidden xl:block">
            <SidebarLayout />
          </div>
          <div className="body-wrapper min-w-0 flex-1 bg-[var(--admin-background)]">
            <AdminHeader onMenu={() => setIsOpen(true)} />
            <main className="container mx-auto max-w-[1400px] px-4 py-6 sm:px-6 xl:px-8 xl:py-[30px]">
              {children}
            </main>
          </div>
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[260px] overflow-hidden bg-[var(--admin-card)] shadow-2xl">
            <SidebarLayout onClose={() => setIsOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <AdminRateLimitProvider>
        <AdminShellInner>{children}</AdminShellInner>
      </AdminRateLimitProvider>
    </AdminThemeProvider>
  );
}
