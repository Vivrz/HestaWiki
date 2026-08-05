"use client";

import AdminChart from "@/components/admin/AdminChart";
import { AdminCard } from "@/components/admin/AdminUI";
import { Icon } from "@iconify/react";

export default function DocumentHealthCard({
  readyDocuments,
  processingDocuments,
  failedDocuments,
}: {
  readyDocuments: number;
  processingDocuments: number;
  failedDocuments: number;
}) {
  const total = readyDocuments + processingDocuments + failedDocuments;
  const readyPercent = total > 0 ? Math.round((readyDocuments / total) * 100) : 0;

  const segments = [
    { label: "Ready", value: readyDocuments, color: "var(--admin-chart-success)" },
    { label: "Processing", value: processingDocuments, color: "var(--admin-chart-secondary)" },
    { label: "Failed", value: failedDocuments, color: "var(--admin-chart-error)" },
  ];

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
              fontSize: "26px",
              fontWeight: 700,
              color: "var(--admin-heading)",
              formatter: () => String(total),
            },
            value: {
              show: true,
              fontFamily: "inherit",
              fontSize: "26px",
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
    dataLabels: {
      enabled: true,
      formatter: (value: number) => `${Math.round(value)}%`,
      style: { fontSize: "11px", fontWeight: 700, colors: ["#ffffff"] },
    },
    legend: { show: false },
    tooltip: {
      theme: "dark",
      y: { formatter: (value: number) => `${value} documents` },
    },
  };

  return (
    <AdminCard className="p-6 admin-enter admin-enter-delay-2">
      <div className="flex items-start justify-between">
        <div>
          <h5 className="text-lg font-bold text-[var(--admin-heading)]">Document Health</h5>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">Breakdown of indexed files</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-lightsuccess)] px-2.5 py-1 text-xs font-semibold text-[var(--admin-success)]">
          <Icon icon="tabler:arrow-up-right" width={13} height={13} />
          {readyPercent}% ready
        </span>
      </div>

      <div className="flex items-center justify-center">
        <AdminChart
          type="donut"
          height={235}
          options={options}
          series={[readyDocuments, processingDocuments, failedDocuments]}
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
