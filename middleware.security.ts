// Security middleware: nonce-based CSP, rate limit, and security headers.
//
// WHY a standalone module, not a root middleware.ts: Next.js only honors
// one middleware entry point and Foundation owns /middleware.ts (Clerk
// auth). This file exports composable helpers that Foundation's
// clerkMiddleware callback wires in — see the integration example at the
// bottom. Splitting auth from rate-limit / nonce / headers keeps each
// agent's blast radius narrow and the diff reviewable.
//
// Day 4: migrated from `script-src 'self' 'strict-dynamic' <origins>` to
// `script-src 'self' 'nonce-{value}' 'strict-dynamic'`. The Day-3 CSP
// was breaking inline scripts that Next emits (router-state hydration,
// chunk preloads) because strict-dynamic without a nonce only trusts
// explicitly-allowlisted external scripts. The recipe follows
// https://nextjs.org/docs/app/guides/content-security-policy:
//
//   1. Middleware generates a fresh per-request nonce.
//   2. Middleware forwards the nonce as an `x-nonce` request header so
//      server components can read it via `(await headers()).get('x-nonce')`.
//   3. The CSP response header pins script-src + style-src to that nonce.
//   4. Next auto-applies the nonce to framework scripts, page bundles,
//      and inline styles/scripts it emits. ClerkProvider takes a `nonce`
//      prop so its bootstrap script picks the same value up.

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
// Nonce generator
//
// WHY base64 over hex: CSP nonces are documented as base64 in MDN and the
// Next docs example uses Buffer.from(crypto.randomUUID()).toString('base64').
// crypto.randomUUID() yields 16 random bytes (~22 base64 chars) — well above
// the 128-bit guess-resistance the CSP spec recommends.
// ---------------------------------------------------------------------------

export function generateNonce(): string {
  // crypto.randomUUID() is available in Edge runtime (where middleware runs),
  // Node 19+, and modern browsers. Encoding the dash-formatted UUID as base64
  // produces a 48-char string with high entropy and zero allocation cost.
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

// ---------------------------------------------------------------------------
// Security headers
//
// HEADER CHOICES (Day-4 update):
//   CSP: nonce-based. script-src lists 'self' 'nonce-{value}' 'strict-dynamic'
//     plus dev-only 'unsafe-eval' (React uses eval to reconstruct server-side
//     error stacks in dev). style-src lists 'self' 'nonce-{value}' in prod
//     and 'unsafe-inline' in dev (Next HMR injects unhashed inline styles).
//     connect-src keeps the Anthropic + Clerk allowlist for the BYOK fetch.
//     frame-ancestors 'none' + frame-src for Cloudflare Turnstile.
//   HSTS: 31536000s (1y). includeSubDomains; preload omitted because Vercel
//     preview subdomains are not preload-eligible.
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

type CspBuildOpts = {
  nonce: string | null;
  isDev: boolean;
};

function buildCsp({ nonce, isDev }: CspBuildOpts): string {
  // WHY 'strict-dynamic' AND a nonce together: 'strict-dynamic' tells the
  // browser to trust any script that a nonce-trusted (or hash-trusted) script
  // dynamically loads. Without 'strict-dynamic', Next's runtime cannot
  // bootstrap its chunk loader because the chunk URLs are not known at
  // middleware time. Without a nonce, strict-dynamic has nothing to anchor
  // trust to and inline bootstrap scripts get blocked.
  const noncePart = nonce ? ` 'nonce-${nonce}'` : '';

  // Inline-eval is required in dev so React can reconstruct server-side
  // error stacks. Stripped in prod.
  const evalPart = isDev ? " 'unsafe-eval'" : '';

  // Tailwind 4's HMR pipeline injects unhashed <style> tags in dev. In prod
  // styles flow through Next's bundler and get the nonce.
  const styleSrc = isDev
    ? "style-src 'self' 'unsafe-inline'"
    : `style-src 'self'${noncePart}`;

  const directives = [
    "default-src 'self'",
    `script-src 'self'${noncePart} 'strict-dynamic'${evalPart}`,
    styleSrc,
    "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.anthropic.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.com",
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ];
  return directives.join('; ');
}

// Static (non-CSP) headers — these never change per request, so they live as
// a frozen constant and `buildSecurityHeaders` composes them with the CSP.
export const STATIC_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export type SecurityHeaderOpts = {
  nonce?: string | null;
  isDev?: boolean;
};

// Returns the full seven-header map for a request. CSP is built fresh per
// call so the nonce floats through; the other six are constant.
export function buildSecurityHeaders(
  opts: SecurityHeaderOpts = {},
): Record<string, string> {
  const isDev = opts.isDev ?? process.env.NODE_ENV !== 'production';
  return {
    'Content-Security-Policy': buildCsp({ nonce: opts.nonce ?? null, isDev }),
    ...STATIC_SECURITY_HEADERS,
  };
}

export function withSecurityHeaders(
  res: NextResponse,
  opts: SecurityHeaderOpts = {},
): NextResponse {
  for (const [name, value] of Object.entries(buildSecurityHeaders(opts))) {
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
// auth.protect() has run, with the resolved userId and a freshly-generated
// nonce. The function:
//   - applies the rate-limit gate to /api/* and returns 429 if exhausted;
//   - otherwise constructs a NextResponse.next() that forwards the nonce
//     to the downstream handler via the x-nonce request header (Next picks
//     this up at render time and applies the nonce to inline framework
//     scripts);
//   - attaches the full security-header set (CSP includes the nonce) to
//     whichever response is returned.
//
// Integration sketch in Foundation's middleware.ts:
//
//   export default clerkMiddleware(async (auth, req) => {
//     if (!isPublicRoute(req)) await auth.protect();
//     const { userId } = await auth();
//     const nonce = generateNonce();
//     return applySecurityMiddleware(req, userId, { nonce });
//   });
// ---------------------------------------------------------------------------

export type ApplyOpts = {
  nonce?: string | null;
};

export async function applySecurityMiddleware(
  req: NextRequest,
  userId: string | null,
  opts: ApplyOpts = {},
): Promise<NextResponse> {
  const nonce = opts.nonce ?? null;

  if (userId) {
    const limited = await checkApiRateLimit(req, userId);
    if (limited) return withSecurityHeaders(limited, { nonce });
  }

  // WHY forward x-nonce as a REQUEST header: server components read the
  // nonce via `(await headers()).get('x-nonce')` to attach it to <Script>
  // tags or ClerkProvider's nonce prop. NextResponse.next({ request: { ... }})
  // is the Next-documented way to mutate the request headers Next passes to
  // the downstream handler.
  const requestHeaders = new Headers(req.headers);
  if (nonce) requestHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  return withSecurityHeaders(res, { nonce });
}
