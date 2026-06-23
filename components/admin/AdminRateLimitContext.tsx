"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { RateLimitNotice } from "@/lib/rate-limit-client";
import { usePersistentRateLimitCountdown } from "@/components/ui/useRateLimitCountdown";

interface AdminRateLimitContextValue {
  notice: RateLimitNotice | null;
  toastNotice: RateLimitNotice | null;
  remainingSeconds: number;
  active: boolean;
  startRateLimit: (notice: RateLimitNotice) => void;
  dismissToast: () => void;
  clearRateLimit: () => void;
}

const AdminRateLimitContext = createContext<AdminRateLimitContextValue | null>(null);
const ADMIN_RATE_LIMIT_STORAGE_KEY = "rate-limit:admin";

export function AdminRateLimitProvider({ children }: { children: ReactNode }) {
  const rateLimit = usePersistentRateLimitCountdown(ADMIN_RATE_LIMIT_STORAGE_KEY);

  const value = useMemo<AdminRateLimitContextValue>(() => ({
    notice: rateLimit.notice,
    toastNotice: rateLimit.toastNotice,
    remainingSeconds: rateLimit.remainingSeconds,
    active: rateLimit.active,
    startRateLimit: rateLimit.startRateLimit,
    dismissToast: rateLimit.dismissToast,
    clearRateLimit: rateLimit.clearRateLimit,
  }), [
    rateLimit.active,
    rateLimit.clearRateLimit,
    rateLimit.dismissToast,
    rateLimit.notice,
    rateLimit.remainingSeconds,
    rateLimit.startRateLimit,
    rateLimit.toastNotice,
  ]);

  return (
    <AdminRateLimitContext.Provider value={value}>
      {children}
    </AdminRateLimitContext.Provider>
  );
}

export function useAdminRateLimit() {
  const context = useContext(AdminRateLimitContext);
  if (!context) {
    throw new Error("useAdminRateLimit must be used within AdminRateLimitProvider");
  }
  return context;
}
