// Security middleware: rate limit + security headers.
//
// WHY a standalone module, not a root middleware.ts: Next.js only honors
// one middleware entry point and Foundation owns /middleware.ts (Clerk
// auth). This file exports composable helpers that Foundation's
// clerkMiddleware callback wires in — see the integration example at the
// bottom. Splitting auth from rate-limit and headers keeps each agent's
// blast radius narrow and the diff reviewable.

import { NextResponse, type NextRequest } from 'next/server';
import {
  DEFAULT_AI_LIMIT_PER_MIN,
  DEFAULT_READ_LIMIT_PER_MIN,
  rateLimit,
} from '@/lib/security/rate-limit';

// ---------------------------------------------------------------------------
// AI route classifier
//
// WHY the regex list lives here, not in /contracts/api.ts: it is enforcement
// metadata, not protocol. The AI tier kicks in for any endpoint that drives
// a Claude generation; Backend Core's route registry is the truth, this is
// the gate.
// ---------------------------------------------------------------------------

const AI_ROUTE_PATTERNS: readonly RegExp[] = [
  /^\/api\/alignment(\/|$)/,
  /^\/api\/documents(\/|$)/,
  /^\/api\/interviews\/mock(\/|$)/,
  /^\/api\/skills\/ingest(\/|$)/,
];

export function isAiRoute(pathname: string): boolean {
  return AI_ROUTE_PATTERNS.some((re) => re.test(pathname));
}

export function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

// ---------------------------------------------------------------------------
// Security headers
//
// HEADER CHOICES:
//   CSP: strict-dynamic with explicit Clerk + Anthropic origins. nonce-based
//     script execution would be ideal but Next 15 App Router does not surface
//     a stable nonce per render in middleware; strict-dynamic with allowlisted
//     origins is the documented Next.js+Clerk recipe.
//   HSTS: 31536000s (1y). includeSubDomains; preload omitted because the
//     Vercel preview subdomains are not preload-eligible.
//   X-Frame-Options DENY: legacy header retained alongside frame-ancestors
//     'none' (in CSP) for older browsers.
//   X-Content-Type-Options nosniff: standard.
//   Referrer-Policy: strict-origin-when-cross-origin balances UX with leak
//     prevention; full no-referrer breaks Clerk OAuth callbacks.
//   Permissions-Policy: deny camera, microphone, geolocation. The product
//     has no use for any of them.
//   Cross-Origin-Opener-Policy: same-origin. Defense in depth against
//     window.opener attacks; pairs with the BYOK browser-direct call to
//     Anthropic where a popup could otherwise reach back into our origin.
// ---------------------------------------------------------------------------

const CSP_DIRECTIVES = [
  "default-src 'self'",
  // strict-dynamic with Next's inline-style requirement; Tailwind 4 emits
  // a style tag at runtime in dev that needs 'unsafe-inline' for styles.
  "script-src 'self' 'strict-dynamic' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.anthropic.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
] as const;

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': CSP_DIRECTIVES.join('; '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export function withSecurityHeaders(res: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(name, value);
  }
  return res;
}

// ---------------------------------------------------------------------------
// Rate-limit gate for API routes
//
// Returns a 429 NextResponse when the bucket is exhausted, otherwise null.
// Callers attach security headers via withSecurityHeaders() on whichever
// response they ultimately return (pass-through or 429).
// ---------------------------------------------------------------------------

export async function checkApiRateLimit(
  req: NextRequest,
  userId: string,
): Promise<NextResponse | null> {
  if (!isApiRoute(req.nextUrl.pathname)) return null;

  const opts = isAiRoute(req.nextUrl.pathname)
    ? { ai: DEFAULT_AI_LIMIT_PER_MIN }
    : { read: DEFAULT_READ_LIMIT_PER_MIN };

  const result = await rateLimit(userId, opts);
  if (result.ok) return null;

  const res = NextResponse.json(
    { error: 'rate_limited', tier: result.tier, retryAfterSeconds: result.retryAfterSeconds },
    { status: 429 },
  );
  res.headers.set('Retry-After', String(result.retryAfterSeconds));
  res.headers.set('X-RateLimit-Limit', String(result.limit));
  res.headers.set('X-RateLimit-Remaining', String(result.remaining));
  res.headers.set('X-RateLimit-Reset', String(result.reset));
  return res;
}

// ---------------------------------------------------------------------------
// Composed entry point
//
// Foundation's middleware.ts calls this from inside clerkMiddleware, after
// auth.protect() has run, with the resolved userId. Returning a non-null
// response short-circuits the request (rate-limited); a null return means
// the route should continue, with security headers attached by the caller
// to whatever response Next produces.
//
// Integration sketch in Foundation's middleware.ts:
//
//   export default clerkMiddleware(async (auth, req) => {
//     if (!isPublicRoute(req)) await auth.protect();
//     const { userId } = await auth();
//     if (userId) {
//       const limited = await checkApiRateLimit(req, userId);
//       if (limited) return withSecurityHeaders(limited);
//     }
//     return withSecurityHeaders(NextResponse.next());
//   });
// ---------------------------------------------------------------------------

export async function applySecurityMiddleware(
  req: NextRequest,
  userId: string | null,
): Promise<NextResponse> {
  if (userId) {
    const limited = await checkApiRateLimit(req, userId);
    if (limited) return withSecurityHeaders(limited);
  }
  return withSecurityHeaders(NextResponse.next());
}
