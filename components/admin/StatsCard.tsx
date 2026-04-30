"use client";

import { Card } from "flowbite-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  color = "blue",
}: StatsCardProps) {
  const colorClasses = {
    blue: {
      iconWrap: "bg-sky-100 text-sky-700 ring-sky-200",
      accent: "from-sky-500/15 to-cyan-500/5",
    },
    green: {
      iconWrap: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      accent: "from-emerald-500/15 to-lime-500/5",
    },
    purple: {
      iconWrap: "bg-violet-100 text-violet-700 ring-violet-200",
      accent: "from-violet-500/15 to-fuchsia-500/5",
    },
    yellow: {
      iconWrap: "bg-amber-100 text-amber-700 ring-amber-200",
      accent: "from-amber-500/15 to-orange-500/5",
    },
    pink: {
      iconWrap: "bg-rose-100 text-rose-700 ring-rose-200",
      accent: "from-rose-500/15 to-pink-500/5",
    },
  } as const;

  const styles = colorClasses[color as keyof typeof colorClasses] ?? colorClasses.blue;

  return (
    <Card className={`overflow-hidden border-white/60 bg-gradient-to-br ${styles.accent} shadow-none`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-4xl font-bold text-slate-950">{value}</p>
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${styles.iconWrap}`}>
          <div>{icon}</div>
        </div>
      </div>
    </Card>
  );
}
