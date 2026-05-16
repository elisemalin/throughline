// Rate-limit integration test.
//
// WHY a fake limiter, not real Upstash: the test must run in CI without
// hitting an external Redis. The fake matches @upstash/ratelimit's
// Ratelimit#limit contract — sliding window semantics over a per-process
// Map keyed by (prefix + identifier). The injected factory swaps it in via
// the __setLimiterFactoryForTests test seam exported from rate-limit.ts.

import type { Ratelimit } from '@upstash/ratelimit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_AI_LIMIT_PER_MIN,
  DEFAULT_READ_LIMIT_PER_MIN,
  __setLimiterFactoryForTests,
  rateLimit,
  type RateLimitTier,
} from '@/lib/security/rate-limit';

type LimiterFn = (id: string) => Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending: Promise<unknown>;
}>;

function createFakeLimiterFactory() {
  const buckets = new Map<string, { hits: number; resetAt: number }>();
  const WINDOW_MS = 60_000;

  return (tier: RateLimitTier, limit: number): Ratelimit => {
    const fn: LimiterFn = async (id) => {
      const key = `${tier}:${id}`;
      const now = Date.now();
      const cur = buckets.get(key);
      if (!cur || now >= cur.resetAt) {
        buckets.set(key, { hits: 1, resetAt: now + WINDOW_MS });
        return {
          success: true,
          limit,
          remaining: limit - 1,
          reset: now + WINDOW_MS,
          pending: Promise.resolve(),
        };
      }
      cur.hits += 1;
      const success = cur.hits <= limit;
      return {
        success,
        limit,
        remaining: Math.max(0, limit - cur.hits),
        reset: cur.resetAt,
        pending: Promise.resolve(),
      };
    };
    return { limit: fn } as unknown as Ratelimit;
  };
}

beforeEach(() => {
  __setLimiterFactoryForTests(createFakeLimiterFactory());
});

afterEach(() => {
  __setLimiterFactoryForTests(null);
});

describe('rateLimit — read tier', () => {
  it('allows the first 60 calls and 429s the 61st', async () => {
    const userId = 'user_read_burst';
    for (let i = 0; i < DEFAULT_READ_LIMIT_PER_MIN; i++) {
      const r = await rateLimit(userId, { read: DEFAULT_READ_LIMIT_PER_MIN });
      expect(r.ok).toBe(true);
      expect(r.tier).toBe('read');
    }
    const blocked = await rateLimit(userId, { read: DEFAULT_READ_LIMIT_PER_MIN });
    expect(blocked.ok).toBe(false);
    expect(blocked.tier).toBe('read');
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('uses the default read limit when no opts are passed', async () => {
    const r = await rateLimit('user_default', {});
    expect(r.limit).toBe(DEFAULT_READ_LIMIT_PER_MIN);
    expect(r.tier).toBe('read');
  });
});

describe('rateLimit — ai tier', () => {
  it('allows the first 10 calls and 429s the 11th', async () => {
    const userId = 'user_ai_burst';
    for (let i = 0; i < DEFAULT_AI_LIMIT_PER_MIN; i++) {
      const r = await rateLimit(userId, { ai: DEFAULT_AI_LIMIT_PER_MIN });
      expect(r.ok).toBe(true);
      expect(r.tier).toBe('ai');
    }
    const blocked = await rateLimit(userId, { ai: DEFAULT_AI_LIMIT_PER_MIN });
    expect(blocked.ok).toBe(false);
    expect(blocked.tier).toBe('ai');
  });

  it('isolates buckets between users', async () => {
    for (let i = 0; i < DEFAULT_AI_LIMIT_PER_MIN; i++) {
      await rateLimit('user_a', { ai: DEFAULT_AI_LIMIT_PER_MIN });
    }
    const blockedA = await rateLimit('user_a', { ai: DEFAULT_AI_LIMIT_PER_MIN });
    expect(blockedA.ok).toBe(false);

    const freshB = await rateLimit('user_b', { ai: DEFAULT_AI_LIMIT_PER_MIN });
    expect(freshB.ok).toBe(true);
  });

  it('isolates ai bucket from read bucket for the same user', async () => {
    for (let i = 0; i < DEFAULT_AI_LIMIT_PER_MIN; i++) {
      await rateLimit('user_mix', { ai: DEFAULT_AI_LIMIT_PER_MIN });
    }
    const blockedAi = await rateLimit('user_mix', { ai: DEFAULT_AI_LIMIT_PER_MIN });
    expect(blockedAi.ok).toBe(false);

    // Read bucket should still be fresh.
    const okRead = await rateLimit('user_mix', { read: DEFAULT_READ_LIMIT_PER_MIN });
    expect(okRead.ok).toBe(true);
  });
});
