"use client";

import { HiClock } from "react-icons/hi";
import { cn } from "@/lib/utils";
import { formatCountdown } from "@/lib/rate-limit-client";

interface RateLimitCountdownBadgeProps {
  remainingSeconds: number;
  className?: string;
  tone?: "chat" | "admin";
}

export default function RateLimitCountdownBadge({
  remainingSeconds,
  className,
  tone = "chat",
}: RateLimitCountdownBadgeProps) {
  if (remainingSeconds <= 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex h-9 max-w-full items-center gap-2 rounded-full border px-3 text-xs font-semibold tabular-nums",
        tone === "admin"
          ? "border-red-500/25 bg-red-500/10 text-[var(--admin-error)]"
          : "border-red-500/25 bg-red-500/10 text-red-500",
        className,
      )}
      title="Rate limit countdown"
    >
      <HiClock className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">Rate limit</span>
      <span>{formatCountdown(remainingSeconds)}</span>
    </div>
  );
}
