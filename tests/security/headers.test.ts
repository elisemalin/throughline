// Security headers test.
//
// WHY direct buildSecurityHeaders + withSecurityHeaders calls, not a full
// Next request: these helpers ARE the header attachment surface. The
// composed middleware that wraps them is covered separately in
// middleware-composition.test.ts; the nonce migration specifics are in
// csp-nonce.test.ts. This file pins the shape of the seven-header set.

import { NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import {
  STATIC_SECURITY_HEADERS,
  buildSecurityHeaders,
  isAiRoute,
  isApiRoute,
  withSecurityHeaders,
} from '@/middleware.security';

const EXPECTED_HEADER_NAMES = [
  'Content-Security-Policy',
  'Strict-Transport-Security',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Cross-Origin-Opener-Policy',
];

describe('buildSecurityHeaders / withSecurityHeaders', () => {
  it('returns the full seven-header set', () => {
    const headers = buildSecurityHeaders({ nonce: 'test-nonce', isDev: false });
    for (const name of EXPECTED_HEADER_NAMES) {
      expect(headers[name]).toBeTruthy();
    }
    expect(Object.keys(headers)).toHaveLength(7);
  });

  it('attaches every header to a NextResponse via withSecurityHeaders', () => {
    const res = withSecurityHeaders(NextResponse.next(), {
      nonce: 'test-nonce',
      isDev: false,
    });
    for (const name of EXPECTED_HEADER_NAMES) {
      expect(res.headers.get(name)).toBeTruthy();
    }
  });

  it('STATIC_SECURITY_HEADERS lists the six non-CSP headers', () => {
    // Header count is asserted so adding/removing one forces the
    // threat-model.md table to be updated in the same diff.
    expect(Object.keys(STATIC_SECURITY_HEADERS)).toHaveLength(6);
    for (const name of EXPECTED_HEADER_NAMES) {
      if (name === 'Content-Security-Policy') continue;
      expect(STATIC_SECURITY_HEADERS[name]).toBeTruthy();
    }
  });

  it('CSP allows Anthropic + Clerk origins for connect-src', () => {
    const csp = buildSecurityHeaders({ nonce: 'n', isDev: false })['Content-Security-Policy']!;
    expect(csp).toContain('https://api.anthropic.com');
    expect(csp).toContain('clerk.com');
  });

  it('CSP denies framing entirely', () => {
    const csp = buildSecurityHeaders({ nonce: 'n', isDev: false })['Content-Security-Policy']!;
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('HSTS uses a 1-year max-age', () => {
    expect(STATIC_SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age=31536000');
  });

  it('Permissions-Policy disables camera, microphone, geolocation', () => {
    const pp = STATIC_SECURITY_HEADERS['Permissions-Policy']!;
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
