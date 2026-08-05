import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AnimatedNumber from "@/components/admin/AnimatedNumber";

interface AdminCardProps {
  children: ReactNode;
  className?: string;
}

export function AdminCard({ children, className = "" }: AdminCardProps) {
  return (
    <section
      className={cn(
        "admin-dashboard-card rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-heading)] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-16px_rgba(16,24,40,0.25)]",
        className,
      )}
    >
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
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-normal text-[var(--admin-heading)] sm:text-[28px]">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--admin-muted)]">{subtitle}</p>
      </div>
      {actionLabel && actionHref ? (
        <Button
          asChild
          className="h-10 rounded-xl bg-[var(--admin-primary)] px-4 text-white hover:bg-[var(--admin-primary-emphasis)]"
        >
          <Link href={actionHref}>
            {actionLabel}
            <Icon icon="solar:arrow-right-linear" width={17} height={17} />
          </Link>
        </Button>
      ) : null}
    </header>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  insight: string;
  icon?: ReactNode;
  actionLabel?: string;
  actionHref?: string;
  tone?: "primary" | "secondary" | "success" | "warning" | "error";
}

const toneClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  primary: "bg-[var(--admin-lightprimary)] text-[var(--admin-primary)]",
  secondary: "bg-[var(--admin-lightsecondary)] text-[var(--admin-secondary)]",
  success: "bg-[var(--admin-lightsuccess)] text-[var(--admin-success)]",
  warning: "bg-[var(--admin-lightwarning)] text-[var(--admin-warning)]",
  error: "bg-[var(--admin-lighterror)] text-[var(--admin-error)]",
};

export function MetricCard({
  label,
  value,
  insight,
  icon,
  actionLabel,
  actionHref,
  tone = "primary",
}: MetricCardProps) {
  return (
    <AdminCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--admin-muted)]">{label}</p>
          <p className="mt-3 truncate text-3xl font-bold tracking-normal text-[var(--admin-heading)]">
            <AnimatedNumber value={value} />
          </p>
        </div>
        <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", toneClasses[tone])}>
          {icon ?? <Icon icon="solar:chart-square-linear" width={22} height={22} />}
        </span>
      </div>
      <p className="mt-4 min-h-10 text-sm leading-5 text-[var(--admin-muted)]">{insight}</p>
      {actionLabel && actionHref ? (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mt-3 h-auto px-0 text-[var(--admin-primary)] hover:bg-transparent hover:text-[var(--admin-primary-emphasis)]"
        >
          <Link href={actionHref}>
            {actionLabel}
            <Icon icon="solar:arrow-right-linear" width={15} height={15} />
          </Link>
        </Button>
      ) : null}
    </AdminCard>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  subtitleClassName?: string;
  action?: ReactNode;
}

export function AdminCardHeader({ title, subtitle, subtitleClassName, action }: CardHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-bold tracking-normal text-[var(--admin-heading)]">{title}</h2>
        {subtitle ? <p className={cn("mt-1 text-sm leading-5 text-[var(--admin-muted)]", subtitleClassName)}>{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ChartCard({ title, subtitle, subtitleClassName, action, children, className = "" }: AdminCardProps & CardHeaderProps) {
  return (
    <AdminCard className={cn("p-5", className)}>
      <AdminCardHeader title={title} subtitle={subtitle} subtitleClassName={subtitleClassName} action={action} />
      <div className="mt-5">{children}</div>
    </AdminCard>
  );
}

export function TableCard({ title, subtitle, subtitleClassName, action, children, className = "" }: AdminCardProps & CardHeaderProps) {
  return (
    <AdminCard className={cn("p-5", className)}>
      <AdminCardHeader title={title} subtitle={subtitle} subtitleClassName={subtitleClassName} action={action} />
      <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)]">{children}</div>
    </AdminCard>
  );
}

export function TableFrame({ children, className = "" }: AdminCardProps) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-[var(--admin-border)]", className)}>
      {children}
    </div>
  );
}

export const AdminPanel = AdminCard;
export const AdminMetricTile = MetricCard;
export const DarkTableFrame = TableFrame;
