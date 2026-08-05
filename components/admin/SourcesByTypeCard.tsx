"use client";

import AdminChart from "@/components/admin/AdminChart";
import { AdminCard } from "@/components/admin/AdminUI";

const SOURCE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  url: { label: "URLs", color: "var(--admin-chart-secondary)" },
  pdf: { label: "PDFs", color: "var(--admin-chart-primary)" },
  md: { label: "Markdown", color: "var(--admin-chart-success)" },
  text: { label: "Text", color: "var(--admin-chart-warning)" },
};

export default function SourcesByTypeCard({
  sourceTypes,
}: {
  sourceTypes: Array<{ type: string; _count: { _all: number } }>;
}) {
  const segments = sourceTypes.map((entry) => ({
    label: SOURCE_TYPE_LABELS[entry.type]?.label ?? entry.type,
    value: entry._count._all,
    color: SOURCE_TYPE_LABELS[entry.type]?.color ?? "var(--admin-chart-primary)",
  }));
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  const options = {
    chart: {
      type: "donut" as const,
      fontFamily: "inherit",
      foreColor: "var(--admin-chart-axis)",
      toolbar: { show: false },
      animations: {
        enabled: true,
        animateGradually: { enabled: true, delay: 120 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
    },
    labels: segments.map((segment) => segment.label),
    colors: segments.map((segment) => segment.color),
    plotOptions: {
      pie: {
        donut: {
          size: "78%",
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              fontFamily: "inherit",
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--admin-heading)",
              formatter: () => String(total),
            },
            value: {
              show: true,
              fontFamily: "inherit",
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--admin-heading)",
            },
            name: {
              show: true,
              fontFamily: "inherit",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--admin-muted)",
            },
          },
        },
      },
    },
    stroke: { show: true, width: 4, colors: ["var(--admin-card)"] },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { theme: "dark", y: { formatter: (value: number) => `${value} sources` } },
  };

  return (
    <AdminCard className="flex h-full flex-col p-6 admin-enter admin-enter-delay-3">
      <div className="flex items-start justify-between">
        <div>
          <h5 className="text-lg font-bold text-[var(--admin-heading)]">Sources by type</h5>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">How your knowledge base is composed</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <AdminChart
          type="donut"
          height={220}
          options={options}
          series={segments.map((segment) => segment.value)}
        />
      </div>

      <div className="mt-1 space-y-2.5">
        {segments.map((segment) => {
          const percent = total > 0 ? Math.round((segment.value / total) * 100) : 0;
          return (
            <div key={segment.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-[var(--admin-heading)]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: segment.color }} />
                {segment.label}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-bold text-[var(--admin-heading)]">{segment.value}</span>
                <span className="w-10 text-right text-xs text-[var(--admin-muted)]">{percent}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </AdminCard>
  );
}
