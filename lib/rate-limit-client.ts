export interface RateLimitNotice {
  message?: string;
  retryAfter?: number;
  retryUntil?: number;
}

function positiveNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function retryUntilFromHeaders(res: Response): number | undefined {
  const resetAtSeconds = positiveNumber(res.headers.get("X-RateLimit-Reset"));
  if (resetAtSeconds) {
    const resetAtMs = resetAtSeconds * 1000;
    if (resetAtMs > Date.now()) return resetAtMs;
  }

  const retryAfterSeconds = positiveNumber(res.headers.get("Retry-After"));
  return retryAfterSeconds ? Date.now() + retryAfterSeconds * 1000 : undefined;
}

export async function readRateLimitNotice(res: Response): Promise<RateLimitNotice> {
  const headerRetryUntil = retryUntilFromHeaders(res);

  try {
    const body = (await res.json()) as { error?: string; retryAfter?: number };
    const bodyRetryAfter =
      typeof body.retryAfter === "number" &&
      Number.isFinite(body.retryAfter) &&
      body.retryAfter > 0
        ? body.retryAfter
        : undefined;
    const retryUntil = headerRetryUntil ?? (bodyRetryAfter ? Date.now() + bodyRetryAfter * 1000 : undefined);

    return {
      message: body.error && body.error !== "Rate limit exceeded"
        ? body.error
        : "Please wait before trying again.",
      retryAfter: retryUntil ? Math.ceil((retryUntil - Date.now()) / 1000) : bodyRetryAfter,
      retryUntil,
    };
  } catch {
    return {
      message: "Please wait before trying again.",
      retryAfter: headerRetryUntil ? Math.ceil((headerRetryUntil - Date.now()) / 1000) : undefined,
      retryUntil: headerRetryUntil,
    };
  }
}

export function remainingSecondsFromNotice(notice: RateLimitNotice | null): number {
  if (!notice) return 0;
  if (notice.retryUntil) {
    return Math.max(0, Math.ceil((notice.retryUntil - Date.now()) / 1000));
  }
  return Math.max(0, Math.ceil(notice.retryAfter ?? 0));
}

export function normalizeRateLimitNotice(notice: RateLimitNotice): RateLimitNotice {
  const retryUntil = notice.retryUntil ??
    (notice.retryAfter && notice.retryAfter > 0
      ? Date.now() + notice.retryAfter * 1000
      : undefined);

  return {
    ...notice,
    retryUntil,
    retryAfter: retryUntil
      ? Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000))
      : notice.retryAfter,
  };
}

export function isActiveRateLimitNotice(notice: RateLimitNotice | null): notice is RateLimitNotice {
  return remainingSecondsFromNotice(notice) > 0;
}

export function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const hourMinutes = minutes % 60;
    return `${hours}:${String(hourMinutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
