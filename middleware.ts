// Clerk auth middleware composed with the Security Agent's rate-limit +
// security-headers helpers.
//
// WHY: Every route except the auth pages, the public landing, and the
// Clerk webhook endpoint is gated behind a Clerk session. After auth
// resolves, applySecurityMiddleware runs the per-user sliding-window rate
// limit on /api/* (read tier; ai tier for the four AI routes) and attaches
// the seven security headers to every response. Composition is the agreed
// pattern in ARCHITECTURE.md ("Security middleware composes with
// Foundation's auth middleware"); the integration shape is the sketch from
// middleware.security.ts:139-148.
//
// Edit scope (Day 3, Security Agent): wires applySecurityMiddleware in and
// adds /api/webhooks/clerk to isPublicRoute so Clerk's signed webhook POSTs
// (Svix signature is the real defense) reach Backend Core's handler when
// it ships. Foundation owns this file; this edit is coordinated via PR
// description and the prior Day-1 TODO.

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { applySecurityMiddleware } from '@/middleware.security';

// Matchers list explicit public routes; anything not matched here requires
// a signed-in session. The webhook route is verified by Svix signature in
// the handler; bypassing auth here is intentional.
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  // WHY auth() after protect(): protect() short-circuits on unauthenticated
  // private routes; here userId is either resolved (private route, signed
  // in; or public route with an opportunistic session) or null (public
  // route, anonymous). applySecurityMiddleware uses the userId for the
  // per-user rate-limit bucket and attaches security headers regardless.
  const { userId } = await auth();
  return applySecurityMiddleware(req, userId);
});

export const config = {
  // WHY: skip Next.js internals and static assets so middleware doesn't burn
  // CPU on image requests. The trailing pattern keeps API and tRPC routes in
  // scope so Backend Core's handlers stay protected.
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
