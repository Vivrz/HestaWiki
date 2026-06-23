"use client";

import { useEffect, useState } from "react";
import { HiExclamationCircle, HiX } from "react-icons/hi";
import { cn } from "@/lib/utils";
import { type RateLimitNotice, formatCountdown } from "@/lib/rate-limit-client";
import { useRateLimitCountdown } from "@/components/ui/useRateLimitCountdown";

export type { RateLimitNotice };

interface RateLimitToastProps {
  notice: RateLimitNotice | null;
  onDismiss: () => void;
  durationMs?: number;
}

export default function RateLimitToast({
  notice,
  onDismiss,
  durationMs = 6000,
}: RateLimitToastProps) {
  const [visible, setVisible] = useState(false);
  const { remainingSeconds } = useRateLimitCountdown(notice);

  useEffect(() => {
    if (!notice) {
      setVisible(false);
      return;
    }

    setVisible(false);
    const frame = window.requestAnimationFrame(() => setVisible(true));
    const timeout = window.setTimeout(onDismiss, durationMs);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [durationMs, notice, onDismiss]);

  if (!notice) return null;

  const retryMessage = remainingSeconds > 0
    ? `Try again in ${formatCountdown(remainingSeconds)}.`
    : null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "fixed right-4 top-4 z-[120] w-[calc(100vw-2rem)] max-w-sm rounded-[7px] border border-white/10 bg-[#1F1F1E] p-4 text-white shadow-xl shadow-slate-900/25 transition-all duration-200 sm:right-6 sm:top-6",
        visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300">
          <HiExclamationCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Rate limit exceeded</p>
          <p className="mt-1 text-sm leading-5 text-neutral-300">
            {notice.message || "Please wait before trying again."}
          </p>
          {retryMessage ? (
            <p className="mt-1 text-sm font-medium text-red-300">
              {retryMessage}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss rate limit notification"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white"
        >
          <HiX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
