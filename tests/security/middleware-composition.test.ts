// Composed middleware test — exercises applySecurityMiddleware end to
// end across the request shapes the wire-up actually sees.
//
// WHY here, not against the running clerkMiddleware wrapper: the wrapper
// adds Clerk's session-resolution layer that requires real Clerk env vars
// and a live session cookie. The composition this test verifies is the
// inner contract — given (req, userId, { nonce }), what does
// applySecurityMiddleware return — which is exactly what middleware.ts
// delegates to. The integration of clerkMiddleware itself is covered by
// Playwright in tests/routes/auth-protection.spec.ts.
//
// Day-4 update: the helpers now take a `nonce` option. CSP is built per
// request, so the assertion helper no longer compares against a static
// constant — it asserts each header is present with the right *shape*.

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applySecurityMiddleware,
  STATIC_SECURITY_HEADERS,
} from '@/middleware.security';
import {
  DEFAULT_AI_LIMIT_PER_MIN,
  DEFAULT_READ_LIMIT_PER_MIN,
  __setLimiterFactoryForTests,
  type RateLimitTier,
} from '@/lib/security/rate-limit';
import type { Ratelimit } from '@upstash/ratelimit';

type FakeLimit = (id: string) => Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending: Promise<unknown>;
}>;

function createFakeLimiterFactory() {
  // WHY per-test isolation: each describe/it resets the buckets so a noisy
  // earlier test cannot poison a later one. The factory closure is fresh
  // per beforeEach below.
  const buckets = new Map<string, { hits: number; resetAt: number }>();
  const WINDOW_MS = 60_000;
  return (tier: RateLimitTier, limit: number): Ratelimit => {
    const fn: FakeLimit = async (id) => {
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
      return {
        success: cur.hits <= limit,
        limit,
        remaining: Math.max(0, limit - cur.hits),
        reset: cur.resetAt,
        pending: Promise.resolve(),
      };
    };
    return { limit: fn } as unknown as Ratelimit;
  };
}

function makeReq(pathname: string, method = 'GET'): NextRequest {
  return new NextRequest(new URL(`https://throughline.test${pathname}`), {
    method,
  });
}

const TEST_NONCE = 'test-nonce-value';

function assertAllSecurityHeaders(res: { headers: Headers }): void {
  // The six static headers compare equal to the constant; CSP is checked
  // separately because it carries the per-request nonce.
  for (const [name, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    expect(res.headers.get(name)).toBe(value);
  }
  const csp = res.headers.get('Content-Security-Policy');
  expect(csp).toBeTruthy();
  expect(csp).toContain(`'nonce-${TEST_NONCE}'`);
}

beforeEach(() => {
  __setLimiterFactoryForTests(createFakeLimiterFactory());
});

afterEach(() => {
  __setLimiterFactoryForTests(null);
});

describe('applySecurityMiddleware — security headers on every response', () => {
  it('attaches headers to a pass-through API GET for an authenticated user', async () => {
    const res = await applySecurityMiddleware(
      makeReq('/api/applications'),
      'user_authd',
      { nonce: TEST_NONCE },
    );
    expect(res.status).toBe(200);
    assertAllSecurityHeaders(res);
  });

  it('attaches headers to an anonymous request on a public route', async () => {
    const res = await applySecurityMiddleware(makeReq('/sign-in'), null, {
      nonce: TEST_NONCE,
    });
    expect(res.status).toBe(200);
    assertAllSecurityHeaders(res);
  });

  it('attaches headers to a non-API authenticated page navigation', async () => {
    const res = await applySecurityMiddleware(
      makeReq('/dashboard'),
      'user_authd',
      { nonce: TEST_NONCE },
    );
    expect(res.status).toBe(200);
    assertAllSecurityHeaders(res);
  });
});

describe('applySecurityMiddleware — rate-limit boundary', () => {
  it('429s the 61st read-tier API call and still attaches security headers', async () => {
    const userId = 'user_burst_read';
    for (let i = 0; i < DEFAULT_READ_LIMIT_PER_MIN; i++) {
      const ok = await applySecurityMiddleware(
        makeReq('/api/applications'),
        userId,
        { nonce: TEST_NONCE },
      );
      expect(ok.status).toBe(200);
    }
    const blocked = await applySecurityMiddleware(
      makeReq('/api/applications'),
      userId,
      { nonce: TEST_NONCE },
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(blocked.headers.get('X-RateLimit-Limit')).toBe(
      String(DEFAULT_READ_LIMIT_PER_MIN),
    );
    expect(blocked.headers.get('X-RateLimit-Remaining')).toBe('0');
    assertAllSecurityHeaders(blocked);
  });

  it('429s the 11th ai-tier call and uses the ai bucket', async () => {
    const userId = 'user_burst_ai';
    for (let i = 0; i < DEFAULT_AI_LIMIT_PER_MIN; i++) {
      const ok = await applySecurityMiddleware(
        makeReq('/api/alignment'),
        userId,
        { nonce: TEST_NONCE },
      );
      expect(ok.status).toBe(200);
    }
    const blocked = await applySecurityMiddleware(
      makeReq('/api/alignment'),
      userId,
      { nonce: TEST_NONCE },
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('X-RateLimit-Limit')).toBe(
      String(DEFAULT_AI_LIMIT_PER_MIN),
    );
    const body = (await blocked.json()) as { tier: string };
    expect(body.tier).toBe('ai');
  });

  it('does not rate-limit anonymous requests (no userId)', async () => {
    // Public-route fetches without a Clerk session should not consume a
    // bucket — there is no per-user identifier and the routes are explicit
    // in isPublicRoute. The headers test above covers that the response
    // still carries security headers.
    for (let i = 0; i < DEFAULT_READ_LIMIT_PER_MIN + 5; i++) {
      const r = await applySecurityMiddleware(makeReq('/sign-in'), null, {
        nonce: TEST_NONCE,
      });
      expect(r.status).toBe(200);
    }
  });

  it('does not rate-limit non-API routes for authenticated users', async () => {
    for (let i = 0; i < DEFAULT_READ_LIMIT_PER_MIN + 5; i++) {
      const r = await applySecurityMiddleware(
        makeReq('/dashboard'),
        'user_browsing',
        { nonce: TEST_NONCE },
      );
      expect(r.status).toBe(200);
    }
  });

  it('isolates rate-limit buckets per user', async () => {
    for (let i = 0; i < DEFAULT_READ_LIMIT_PER_MIN; i++) {
      await applySecurityMiddleware(makeReq('/api/applications'), 'user_a', {
        nonce: TEST_NONCE,
      });
    }
    const blockedA = await applySecurityMiddleware(
      makeReq('/api/applications'),
      'user_a',
      { nonce: TEST_NONCE },
    );
    expect(blockedA.status).toBe(429);

    const freshB = await applySecurityMiddleware(
      makeReq('/api/applications'),
      'user_b',
      { nonce: TEST_NONCE },
    );
    expect(freshB.status).toBe(200);
  });
});

describe('applySecurityMiddleware — route classification', () => {
  // The kickoff calls out the four AI routes by name. This test pins the
  // mapping so a future refactor that drops a route from AI_ROUTE_PATTERNS
  // fails loudly here rather than silently 60x-ing an expensive endpoint.
  it.each([
    ['/api/alignment', 'ai'],
    ['/api/alignment/abc-123', 'ai'],
    ['/api/documents/resume', 'ai'],
    ['/api/interviews/mock', 'ai'],
    ['/api/skills/ingest', 'ai'],
    ['/api/applications', 'read'],
    ['/api/applications/abc/events', 'read'],
    ['/api/watchlist', 'read'],
    ['/api/discovery', 'read'],
  ])('classifies %s as the %s tier', async (path, expectedTier) => {
    const userId = `user_classify_${expectedTier}_${path}`;
    const res = await applySecurityMiddleware(makeReq(path), userId, {
      nonce: TEST_NONCE,
    });
    expect(res.status).toBe(200);
    // First call always succeeds; the X-RateLimit-Limit header is only set
    // on 429 responses, so the tier is observed implicitly by exhausting
    // the bucket. Instead, drive the bucket to its limit and verify the
    // tier on the resulting 429.
    const limit =
      expectedTier === 'ai' ? DEFAULT_AI_LIMIT_PER_MIN : DEFAULT_READ_LIMIT_PER_MIN;
    for (let i = 1; i < limit; i++) {
      await applySecurityMiddleware(makeReq(path), userId, { nonce: TEST_NONCE });
    }
    const blocked = await applySecurityMiddleware(makeReq(path), userId, {
      nonce: TEST_NONCE,
    });
    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as { tier: string };
    expect(body.tier).toBe(expectedTier);
  });
});
