import Link from "next/link";
import { HiArrowRight, HiClipboardList, HiSearch } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import AdminSidebarToggleButton from "@/components/admin/AdminSidebarToggleButton";

interface AdminPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminPanel({ children, className = "" }: AdminPanelProps) {
  return (
    <section className={`rounded-[22px] border border-[var(--admin-panel-border)] bg-[var(--admin-panel)] text-[var(--admin-text)] shadow-[0_18px_55px_-42px_rgba(0,0,0,0.85)] ${className}`}>
      {children}
    </section>
  );
}

interface AdminPageHeaderProps {
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionHref?: string;
}

export function AdminPageHeader({ title, subtitle, actionLabel, actionHref }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <AdminSidebarToggleButton />
        <div>
          <h1 className="text-xl font-semibold text-zinc-950">{title}</h1>
          <p className="text-sm text-zinc-600">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-10 min-w-0 items-center gap-2 rounded-xl bg-[var(--admin-control)] px-3 text-sm text-[var(--admin-control-text)] sm:w-72">
          <HiSearch className="h-4 w-4 shrink-0" />
          <span className="truncate">Type to search...</span>
        </div>
        {actionLabel && actionHref ? (
          <Button asChild className="rounded-xl bg-[var(--admin-button)] text-[var(--admin-button-text)] hover:bg-black">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

interface AdminMetricTileProps {
  label: string;
  value: string | number;
  insight: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
}

export function AdminMetricTile({ label, value, insight, icon, actionLabel, actionHref }: AdminMetricTileProps) {
  return (
    <AdminPanel className="p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-[var(--admin-text)]">{label}</p>
        {icon ? (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--admin-panel-soft)] text-[var(--admin-text)]">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--admin-text)]">{value}</p>
      <p className="mt-4 min-h-10 text-sm leading-5 text-[var(--admin-text)]">{insight}</p>
      {actionLabel && actionHref ? (
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="mt-3 h-auto px-0 !text-[var(--admin-text)] hover:bg-transparent hover:!text-[var(--admin-text)] [&_svg]:!text-[var(--admin-text)]"
        >
          <Link href={actionHref}>
            {actionLabel}
            <HiArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
    </AdminPanel>
  );
}

export function DarkTableFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--admin-panel-border)]">
      {children}
    </div>
  );
}
