import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

type CounterKind = "sustained" | "burst";

export type RateLimitPolicy = {
  scope: "user-chat" | "admin-rag";
  sustainedLimit: number;
  sustainedWindowSeconds: number;
  burstLimit: number;
  burstWindowSeconds: number;
};

type CounterResult = {
  kind: CounterKind;
  limit: number;
  count: number;
  remaining: number;
  retryAfter: number;
  resetAt: number;
  allowed: boolean;
};

export type RateLimitDecision =
  | { allowed: true; headers: Record<string, string> }
  | {
      allowed: false;
      headers: Record<string, string>;
      retryAfter: number;
    };

let redisClient: Redis | null | undefined;
let warnedMissingConfig = false;
let warnedRedisFailure = false;

function positiveIntFromEnv(name: string, fallback: number): number {
  const value = process.env[name];
  const parsed = value ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function userChatRateLimitPolicy(): RateLimitPolicy {
  return {
    scope: "user-chat",
    sustainedLimit: positiveIntFromEnv("RATE_LIMIT_REQUESTS", 20),
    sustainedWindowSeconds: positiveIntFromEnv("RATE_LIMIT_WINDOW_SECONDS", 3600),
    burstLimit: positiveIntFromEnv("RATE_LIMIT_BURST_REQUESTS", 5),
    burstWindowSeconds: positiveIntFromEnv("RATE_LIMIT_BURST_WINDOW_SECONDS", 10),
  };
}

export function adminRagRateLimitPolicy(): RateLimitPolicy {
  return {
    scope: "admin-rag",
    sustainedLimit: positiveIntFromEnv("ADMIN_RAG_RATE_LIMIT_REQUESTS", 10),
    sustainedWindowSeconds: positiveIntFromEnv(
      "ADMIN_RAG_RATE_LIMIT_WINDOW_SECONDS",
      3600,
    ),
    burstLimit: positiveIntFromEnv("ADMIN_RAG_RATE_LIMIT_BURST_REQUESTS", 2),
    burstWindowSeconds: positiveIntFromEnv(
      "ADMIN_RAG_RATE_LIMIT_BURST_WINDOW_SECONDS",
      60,
    ),
  };
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!warnedMissingConfig) {
      console.warn(
        "Rate limiting is disabled because Upstash Redis environment variables are missing.",
      );
      warnedMissingConfig = true;
    }
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function sanitizeIdentity(identity: string): string {
  const safeIdentity = identity.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 160);
  return safeIdentity || "unknown";
}

function counterKey(
  policy: RateLimitPolicy,
  identity: string,
  kind: CounterKind,
): string {
  return `rate_limit:${policy.scope}:${sanitizeIdentity(identity)}:${kind}`;
}

async function consumeCounter(
  redis: Redis,
  key: string,
  kind: CounterKind,
  limit: number,
  windowSeconds: number,
): Promise<CounterResult> {
  const count = await redis.incr(key);
  let ttl = await redis.ttl(key);

  if (count === 1 || ttl < 0) {
    await redis.expire(key, windowSeconds);
    ttl = windowSeconds;
  }

  const retryAfter = Math.max(1, ttl);
  const resetAt = Math.floor(Date.now() / 1000) + retryAfter;

  return {
    kind,
    limit,
    count,
    remaining: Math.max(0, limit - count),
    retryAfter,
    resetAt,
    allowed: count <= limit,
  };
}

function headersForCounter(counter: CounterResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(counter.limit),
    "X-RateLimit-Remaining": String(counter.remaining),
    "X-RateLimit-Reset": String(counter.resetAt),
  };
}

export async function checkRateLimit(
  policy: RateLimitPolicy,
  identity: string,
): Promise<RateLimitDecision> {
  const redis = getRedisClient();
  if (!redis) {
    return { allowed: true, headers: {} };
  }

  try {
    const sustained = await consumeCounter(
      redis,
      counterKey(policy, identity, "sustained"),
      "sustained",
      policy.sustainedLimit,
      policy.sustainedWindowSeconds,
    );
    const burst = await consumeCounter(
      redis,
      counterKey(policy, identity, "burst"),
      "burst",
      policy.burstLimit,
      policy.burstWindowSeconds,
    );

    const blockedCounters = [sustained, burst].filter((counter) => !counter.allowed);
    if (blockedCounters.length > 0) {
      const blockingCounter = blockedCounters.reduce((current, next) =>
        next.retryAfter > current.retryAfter ? next : current,
      );

      return {
        allowed: false,
        retryAfter: blockingCounter.retryAfter,
        headers: {
          ...headersForCounter(blockingCounter),
          "Retry-After": String(blockingCounter.retryAfter),
        },
      };
    }

    return { allowed: true, headers: headersForCounter(sustained) };
  } catch (error) {
    if (!warnedRedisFailure) {
      console.warn("Rate limiting failed open because Redis returned an error:", error);
      warnedRedisFailure = true;
    }
    return { allowed: true, headers: {} };
  }
}

export function rateLimitExceededResponse(
  decision: Extract<RateLimitDecision, { allowed: false }>,
): NextResponse {
  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      retryAfter: decision.retryAfter,
    },
    { status: 429, headers: decision.headers },
  );
}
