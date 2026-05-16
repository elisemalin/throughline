// CSP nonce migration tests.
//
// Day-4 migration: the static `script-src 'self' 'strict-dynamic'` from
// Day 2/3 broke inline scripts Next emits at render time (router-state
// hydration, chunk preloads), most visibly on the /skills import modal.
// This file pins the nonce contract:
//
//   - generateNonce returns a fresh value per call with high entropy.
//   - buildSecurityHeaders interpolates the nonce into script-src and
//     style-src (style-src only in prod; dev keeps 'unsafe-inline' for
//     Tailwind HMR).
//   - The dev branch includes 'unsafe-eval' so React's server-error
//     reconstruction works; prod strips it.
//   - applySecurityMiddleware forwards the nonce as the x-nonce request
//     header so server components (notably app/layout.tsx) can read it
//     and pass it to ClerkProvider.

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applySecurityMiddleware,
  buildSecurityHeaders,
  generateNonce,
} from '@/middleware.security';
import { __setLimiterFactoryForTests } from '@/lib/security/rate-limit';
import type { Ratelimit } from '@upstash/ratelimit';

// Identity limiter — always allows. The nonce surface is independent of
// the rate limiter, but applySecurityMiddleware reads the limiter for
// `/api/*` paths, so it must not be the real Upstash factory in tests.
function permissiveLimiterFactory() {
  return (_tier: 'read' | 'ai', limit: number): Ratelimit => {
    const limit_ = async (_id: string) => ({
      success: true,
      limit,
      remaining: limit,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    });
    return { limit: limit_ } as unknown as Ratelimit;
  };
}

function makeReq(pathname: string): NextRequest {
  return new NextRequest(new URL(`https://throughline.test${pathname}`));
}

beforeEach(() => {
  __setLimiterFactoryForTests(permissiveLimiterFactory());
});

afterEach(() => {
  __setLimiterFactoryForTests(null);
});

describe('generateNonce', () => {
  it('returns a non-empty string', () => {
    const nonce = generateNonce();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(20);
  });

  it('returns a different value on every call', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(generateNonce());
    expect(seen.size).toBe(100);
  });

  it('is base64-encoded (urlsafe charset)', () => {
    // CSP nonce parsing accepts the standard base64 alphabet plus '='. Reject
    // any character outside that set to catch a regression that switched to
    // hex or raw bytes (which would break the browser's nonce match).
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe('buildSecurityHeaders — CSP shape with nonce', () => {
  it('interpolates the nonce into script-src', () => {
    const headers = buildSecurityHeaders({ nonce: 'NONCE_X', isDev: false });
    const csp = headers['Content-Security-Policy']!;
    expect(csp).toContain("script-src 'self' 'nonce-NONCE_X' 'strict-dynamic'");
  });

  it('omits the nonce token when no nonce is provided', () => {
    // Some test paths (and the legacy static-content fetch path) call
    // buildSecurityHeaders with no nonce. The CSP must still be valid:
    // script-src 'self' 'strict-dynamic' (no nonce token at all).
    const csp = buildSecurityHeaders({ isDev: false })['Content-Security-Policy']!;
    expect(csp).not.toContain("'nonce-");
    expect(csp).toContain("script-src 'self' 'strict-dynamic'");
  });

  it('emits style-src with nonce in prod, unsafe-inline in dev', () => {
    const prod = buildSecurityHeaders({ nonce: 'N', isDev: false })['Content-Security-Policy']!;
    expect(prod).toContain("style-src 'self' 'nonce-N'");
    expect(prod).not.toContain("'unsafe-inline'");

    const dev = buildSecurityHeaders({ nonce: 'N', isDev: true })['Content-Security-Policy']!;
    expect(dev).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("adds 'unsafe-eval' to script-src only in dev", () => {
    const dev = buildSecurityHeaders({ nonce: 'N', isDev: true })['Content-Security-Policy']!;
    expect(dev).toContain("'unsafe-eval'");

    const prod = buildSecurityHeaders({ nonce: 'N', isDev: false })['Content-Security-Policy']!;
    expect(prod).not.toContain("'unsafe-eval'");
  });

  it('includes upgrade-insecure-requests', () => {
    const csp = buildSecurityHeaders({ nonce: 'N', isDev: false })['Content-Security-Policy']!;
    expect(csp).toContain('upgrade-insecure-requests');
  });
});

describe('applySecurityMiddleware — nonce plumbing', () => {
  it('sets the CSP response header with the supplied nonce', async () => {
    const res = await applySecurityMiddleware(makeReq('/dashboard'), 'user_1', {
      nonce: 'NONCE_RES',
    });
    const csp = res.headers.get('Content-Security-Policy')!;
    expect(csp).toContain("'nonce-NONCE_RES'");
  });

  it('forwards the nonce on the x-nonce request header via the Next middleware mechanism', async () => {
    // NextResponse.next({ request: { headers } }) signals Next to overwrite
    // selected request headers via an x-middleware-override-headers list
    // plus per-header x-middleware-request-<name> values. Asserting the
    // override list is the cleanest way to verify the nonce reaches the
    // downstream handler — pure unit test, no Next runtime required.
    const res = await applySecurityMiddleware(makeReq('/dashboard'), 'user_1', {
      nonce: 'NONCE_REQ',
    });
    const overrideList = res.headers.get('x-middleware-override-headers');
    expect(overrideList).toContain('x-nonce');
    const forwarded = res.headers.get('x-middleware-request-x-nonce');
    expect(forwarded).toBe('NONCE_REQ');
  });

  it('does not forward x-nonce when no nonce is supplied', async () => {
    const res = await applySecurityMiddleware(makeReq('/dashboard'), 'user_1');
    const overrideList = res.headers.get('x-middleware-override-headers') ?? '';
    expect(overrideList).not.toContain('x-nonce');
  });

  it('attaches the nonce-bearing CSP to a 429 rate-limit response too', async () => {
    // A 429 short-circuits before render — but the response is still HTML/JSON
    // that the browser parses, so the CSP must be present and well-formed.
    // Override the limiter to always deny.
    __setLimiterFactoryForTests((_tier, limit) => {
      const denyLimit = async () => ({
        success: false,
        limit,
        remaining: 0,
        reset: Date.now() + 30_000,
        pending: Promise.resolve(),
      });
      return { limit: denyLimit } as unknown as Ratelimit;
    });

    const res = await applySecurityMiddleware(makeReq('/api/applications'), 'user_burst', {
      nonce: 'NONCE_429',
    });
    expect(res.status).toBe(429);
    const csp = res.headers.get('Content-Security-Policy')!;
    expect(csp).toContain("'nonce-NONCE_429'");
  });
});
