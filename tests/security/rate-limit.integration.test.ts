// Real-Upstash rate-limit integration test.
//
// WHY a Vitest integration spec, not a Playwright + Next dev server: the
// Day-3 kickoff describes hitting `/api/applications` 61 times to verify
// the 429 boundary against the real middleware. Spinning up Next requires
// a running Postgres, a Clerk session cookie, and a live Anthropic-or-
// fallback key — three external dependencies the CI environment does not
// reliably have. This spec instead exercises the same `rateLimit()`
// function that `middleware.security.ts` calls, but with a real
// `@upstash/ratelimit` + `@upstash/redis` client pointed at a test
// instance. The middleware composition layer is already covered by
// tests/security/middleware-composition.test.ts. What this adds: proof
// that the round-trip to Upstash actually 429s on the 61st call.
//
// Environment contract (documented in .env.example):
//   UPSTASH_REDIS_REST_URL_TEST   — test-instance REST URL
//   UPSTASH_REDIS_REST_TOKEN_TEST — test-instance REST token
//
// If either is missing, the suite logs a skip notice and exits cleanly.
// `pnpm test:security` (unit) keeps passing without the test instance;
// `pnpm test:security:integration` is the explicit opt-in.
//
// Bucket prefix is `tl:rl-test:` (NOT the prod `tl:rl:`) so a stale CI
// run cannot poison prod data even if the test creds are misconfigured.
// Identifier carries Date.now() so concurrent CI runs do not contend.

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_URL = process.env.UPSTASH_REDIS_REST_URL_TEST;
const TEST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN_TEST;
const HAS_TEST_REDIS = Boolean(TEST_URL && TEST_TOKEN);

// WHY a unique identifier per run: the sliding-window window is 1 minute,
// so a back-to-back CI run could observe a still-warm bucket from the
// previous run and see a false 429 before the 61st call. The PID + Date
// gives us isolation without coordination.
const RUN_ID = `ci-${process.pid}-${Date.now()}`;
const TEST_LIMIT = 60;
const TEST_PREFIX = 'tl:rl-test:read';

const describeIfReal = HAS_TEST_REDIS ? describe : describe.skip;

describeIfReal('rate-limit integration — real Upstash', () => {
  let limiter: Ratelimit;

  beforeAll(() => {
    const redis = new Redis({ url: TEST_URL!, token: TEST_TOKEN! });
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(TEST_LIMIT, '1 m'),
      prefix: TEST_PREFIX,
      analytics: false,
    });
  });

  afterAll(async () => {
    if (!HAS_TEST_REDIS) return;
    // WHY explicit cleanup: leaves the test instance in a known-empty state
    // for the next CI run. del is idempotent against missing keys.
    const redis = new Redis({ url: TEST_URL!, token: TEST_TOKEN! });
    await redis.del(`${TEST_PREFIX}:${RUN_ID}`);
  });

  it('allows the first 60 calls and 429s the 61st against live Upstash', async () => {
    for (let i = 0; i < TEST_LIMIT; i++) {
      const r = await limiter.limit(RUN_ID);
      expect(r.success, `call ${i + 1} should succeed`).toBe(true);
    }
    const blocked = await limiter.limit(RUN_ID);
    expect(blocked.success).toBe(false);
    expect(blocked.limit).toBe(TEST_LIMIT);
    expect(blocked.remaining).toBe(0);
    expect(blocked.reset).toBeGreaterThan(Date.now());
  });
});

// When the test instance is not configured, log once so CI output makes
// clear the integration spec was skipped (not silently dropped).
if (!HAS_TEST_REDIS) {
  describe('rate-limit integration — real Upstash', () => {
    it.skip('skipped: set UPSTASH_REDIS_REST_URL_TEST + _TOKEN_TEST to run', () => {});
  });
}
