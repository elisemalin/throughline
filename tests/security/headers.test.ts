// Security headers test.
//
// WHY a direct withSecurityHeaders() call, not a full Next.js request: this
// surface IS the header attachment helper. The middleware composes it
// around NextResponse.next() so verifying the helper covers the contract;
// integration with Foundation's middleware.ts is reviewed at PR-time, not
// asserted here (Foundation owns that file).

import { NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import {
  SECURITY_HEADERS,
  isAiRoute,
  isApiRoute,
  withSecurityHeaders,
} from '@/middleware.security';

describe('withSecurityHeaders', () => {
  it('attaches the full expected header set', () => {
    const res = withSecurityHeaders(NextResponse.next());
    const expected = [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
    ];
    for (const name of expected) {
      expect(res.headers.get(name)).toBe(SECURITY_HEADERS[name]);
    }
    // Header count is asserted so adding/removing a header forces the
    // /docs/threat-model.md table to be updated in the same diff.
    expect(Object.keys(SECURITY_HEADERS)).toHaveLength(7);
  });

  it('CSP allows Anthropic + Clerk origins for connect-src', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy']!;
    expect(csp).toContain('https://api.anthropic.com');
    expect(csp).toContain('clerk.com');
  });

  it('CSP denies framing entirely', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy']!;
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('HSTS uses a 1-year max-age', () => {
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age=31536000');
  });

  it('Permissions-Policy disables camera, microphone, geolocation', () => {
    const pp = SECURITY_HEADERS['Permissions-Policy']!;
    expect(pp).toContain('camera=()');
    expect(pp).toContain('microphone=()');
    expect(pp).toContain('geolocation=()');
  });
});

describe('route classifiers', () => {
  it('flags AI routes for the ai tier', () => {
    expect(isAiRoute('/api/alignment')).toBe(true);
    expect(isAiRoute('/api/alignment/123')).toBe(true);
    expect(isAiRoute('/api/documents')).toBe(true);
    expect(isAiRoute('/api/interviews/mock')).toBe(true);
    expect(isAiRoute('/api/skills/ingest')).toBe(true);
  });

  it('does not flag non-AI API routes', () => {
    expect(isAiRoute('/api/applications')).toBe(false);
    expect(isAiRoute('/api/watchlist')).toBe(false);
    expect(isAiRoute('/api/healthz')).toBe(false);
  });

  it('flags any /api/ path as an API route', () => {
    expect(isApiRoute('/api/applications')).toBe(true);
    expect(isApiRoute('/api/anything/at/all')).toBe(true);
    expect(isApiRoute('/dashboard')).toBe(false);
    expect(isApiRoute('/')).toBe(false);
  });
});
