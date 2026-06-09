"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type ChartType = "area" | "bar" | "donut" | "line";

interface AdminChartProps {
  type: ChartType;
  height: number | string;
  series: unknown[];
  options: Record<string, unknown>;
}

export default function AdminChart({ type, height, series, options }: AdminChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const safeOptions = useMemo(() => {
    const chartOptions = (options.chart && typeof options.chart === "object" ? options.chart : {}) as Record<string, unknown>;

    return {
      ...options,
      chart: {
        ...chartOptions,
        animations: { enabled: false },
      },
    };
  }, [options]);

  if (!mounted) {
    return <div aria-hidden="true" style={{ height }} />;
  }

  const chartOptions = safeOptions.chart as Record<string, unknown>;
  const chartKey = `${type}-${String(chartOptions.id ?? "")}-${String(height)}`;

  return (
    <ReactApexChart
      key={chartKey}
      type={type}
      height={height}
      width="100%"
      series={series as never}
      options={safeOptions as never}
    />
  );
}
