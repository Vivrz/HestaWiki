import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DEFAULT_ALLOWED_CRAWL_HOSTS = ["hestabit.com", "www.hestabit.com"];

export const cuidSchema = z.string().cuid();

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function getAllowedRequestOrigins(req: NextRequest): Set<string> {
  const origins = new Set<string>();
  const nextOrigin = normalizeOrigin(req.nextUrl.origin);
  if (nextOrigin) origins.add(nextOrigin);

  const proto =
    firstHeaderValue(req.headers.get("x-forwarded-proto")) ??
    req.nextUrl.protocol.replace(":", "") ??
    "http";

  const host = firstHeaderValue(req.headers.get("host"));
  if (host) {
    const derived = normalizeOrigin(`${proto}://${host}`);
    if (derived) origins.add(derived);
  }

  const forwardedHost = firstHeaderValue(req.headers.get("x-forwarded-host"));
  if (forwardedHost) {
    const derived = normalizeOrigin(`${proto}://${forwardedHost}`);
    if (derived) origins.add(derived);
  }

  return origins;
}

export function validateMutationRequestOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return NextResponse.json({ error: "Invalid origin header" }, { status: 403 });
  }

  const allowedOrigins = getAllowedRequestOrigins(req);
  if (!allowedOrigins.has(normalizedOrigin)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const fetchSite = req.headers.get("sec-fetch-site");
  if (
    fetchSite &&
    fetchSite !== "same-origin" &&
    fetchSite !== "same-site" &&
    fetchSite !== "none"
  ) {
    return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  }

  return null;
}

export function parseAllowedCrawlHosts(): string[] {
  const fromEnv = process.env.ALLOWED_CRAWL_HOSTS
    ?.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_ALLOWED_CRAWL_HOSTS;
}

export function isAllowedCrawlUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  if (parsed.hostname.endsWith(".")) return false;

  const hostname = parsed.hostname.toLowerCase();
  const allowedHosts = parseAllowedCrawlHosts();
  return allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export function maxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_FILE_BYTES;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 10 * 1024 * 1024;
}
