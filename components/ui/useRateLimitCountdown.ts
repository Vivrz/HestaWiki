"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import {
  type RateLimitNotice,
  isActiveRateLimitNotice,
  normalizeRateLimitNotice,
  remainingSecondsFromNotice,
} from "@/lib/rate-limit-client";

export function useRateLimitCountdown(
  notice: RateLimitNotice | null,
  onExpire?: () => void,
) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    remainingSecondsFromNotice(notice),
  );

  useEffect(() => {
    const tick = () => {
      const nextRemaining = remainingSecondsFromNotice(notice);
      setRemainingSeconds(nextRemaining);
      if (notice && nextRemaining <= 0) onExpire?.();
    };

    tick();
    if (!notice) return;

    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [notice, onExpire]);

  return {
    active: remainingSeconds > 0,
    remainingSeconds,
  };
}

function readStoredNotice(storageKey: string): RateLimitNotice | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RateLimitNotice;
    return isActiveRateLimitNotice(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function usePersistentRateLimitCountdown(storageKey: string) {
  const [notice, setNotice] = useState<RateLimitNotice | null>(null);
  const [toastNotice, setToastNotice] = useState<RateLimitNotice | null>(null);

  const clearRateLimit = useCallback(() => {
    setNotice(null);
    setToastNotice(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const countdown = useRateLimitCountdown(notice, clearRateLimit);

  useEffect(() => {
    const storedNotice = readStoredNotice(storageKey);
    if (storedNotice) {
      setNotice(storedNotice);
    } else if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const startRateLimit = useCallback((nextNotice: RateLimitNotice) => {
    const normalized = normalizeRateLimitNotice(nextNotice);
    if (!isActiveRateLimitNotice(normalized)) return;

    setNotice(normalized);
    setToastNotice(normalized);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(normalized));
    }
  }, [storageKey]);

  const dismissToast = useCallback(() => {
    setToastNotice(null);
  }, []);

  return useMemo(() => ({
    notice,
    toastNotice,
    ...countdown,
    startRateLimit,
    dismissToast,
    clearRateLimit,
  }), [clearRateLimit, countdown, dismissToast, notice, startRateLimit, toastNotice]);
}
