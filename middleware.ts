// Clerk auth middleware.
//
// WHY: Every route except the auth pages and the public landing is gated
// behind a Clerk session. The Security Agent owns separate rate-limit
// middleware in middleware.security.ts (when they add it); the two compose
// at Next.js's middleware boundary via the `matcher` config below.

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Matchers list explicit public routes; anything not matched here requires
// a signed-in session.
//
// TODO: When Backend Core adds the Clerk webhook handler
// (`/api/webhooks/clerk` per Clerk docs), append the path to `isPublicRoute`
// so unauthenticated POSTs from Clerk are not blocked. Svix signature
// verification is the real defense for that route.
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
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
