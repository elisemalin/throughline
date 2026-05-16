// Upstash Redis sliding-window rate limiter.
//
// WHY: every /api/* route gets a per-user (Clerk userId) sliding window.
// Two tiers — `read` for default routes, `ai` for the Anthropic-facing
// endpoints — because an AI generation burns far more downstream tokens
// than a list-applications fetch.
//
// Key shape: tl:rl:<userId>:<bucket>:<window>  per REDIS_KEY_PREFIXES.rateLimit
// from /contracts/storage.ts. The trailing :<window> is appended internally
// by @upstash/ratelimit's sliding-window algorithm.

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { REDIS_KEY_PREFIXES } from '@/contracts/storage';

export const DEFAULT_READ_LIMIT_PER_MIN = 60;
export const DEFAULT_AI_LIMIT_PER_MIN = 10;

export type RateLimitTier = 'read' | 'ai';

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number;                                       // ms epoch
  retryAfterSeconds: number;
  tier: RateLimitTier;
};

// ---------------------------------------------------------------------------
// Limiter resolver
//
// WHY a Map of limiters keyed by tier+limit: @upstash/ratelimit caches its
// scripts and analytics buffers per instance. Reusing instances across
// requests keeps the per-route invocation cheap. Different limits get
// different instances because the underlying script binds the limit.
// ---------------------------------------------------------------------------

let injectedLimiterFactory: ((tier: RateLimitTier, limit: number) => Ratelimit) | null = null;
let redisSingleton: Redis | null = null;
const limiterCache = new Map<string, Ratelimit>();

function getRedis(): Redis {
  if (redisSingleton) return redisSingleton;
  // WHY explicit env check: @upstash/redis's fromEnv throws a generic
  // "Upstash Redis credentials not set" that's easy to miss in CI logs.
  // A targeted error lists which var is missing.
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      'rate-limit: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set',
    );
  }
  redisSingleton = new Redis({ url, token });
  return redisSingleton;
}

function getLimiter(tier: RateLimitTier, limit: number): Ratelimit {
  if (injectedLimiterFactory) return injectedLimiterFactory(tier, limit);
  const cacheKey = `${tier}:${limit}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;
  const limiter = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(limit, '1 m'),
    prefix: `${REDIS_KEY_PREFIXES.rateLimit}${tier}`,
    analytics: false,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

// ---------------------------------------------------------------------------
// Public API
//
// WHY identifier-first signature: callers in Next.js middleware already
// have Clerk's userId resolved from auth(). Coupling rateLimit to a
// NextRequest would force a re-auth inside this module and break
// edge-runtime compatibility where Clerk's helpers vary.
// ---------------------------------------------------------------------------

export async function rateLimit(
  identifier: string,
  opts: { read?: number; ai?: number } = {},
): Promise<RateLimitResult> {
  const tier: RateLimitTier = opts.ai !== undefined ? 'ai' : 'read';
  const limit =
    tier === 'ai'
      ? (opts.ai ?? DEFAULT_AI_LIMIT_PER_MIN)
      : (opts.read ?? DEFAULT_READ_LIMIT_PER_MIN);

  const limiter = getLimiter(tier, limit);
  const result = await limiter.limit(identifier);
  const now = Date.now();
  const retryAfterSeconds = Math.max(0, Math.ceil((result.reset - now) / 1000));

  return {
    ok: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    retryAfterSeconds,
    tier,
  };
}

// ---------------------------------------------------------------------------
// Test seam
//
// WHY: integration tests for the middleware must hit a route 61 times and
// observe the 61st as 429 without depending on a live Upstash account. The
// injected factory replaces the real Ratelimit with an in-memory shim that
// honors the same contract. Not exported through the package barrel; the
// double-underscore signals "test-only".
// ---------------------------------------------------------------------------

export function __setLimiterFactoryForTests(
  factory: ((tier: RateLimitTier, limit: number) => Ratelimit) | null,
): void {
  injectedLimiterFactory = factory;
  limiterCache.clear();
}
