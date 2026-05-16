// Public landing — minimal by design.
//
// WHY: Signed-in users get bounced to /dashboard (owned by Frontend Agent;
// route exists once they land app/(app)/dashboard/page.tsx). Anonymous
// visitors get redirected to /sign-in. The landing page itself never paints
// product content — the auth boundary is the front door for the MVP.
//
// Carry-over: /dashboard does not exist yet on Day 1 — Frontend Agent ships
// app/(app)/dashboard/page.tsx on Day 2 per its CLAUDE.md. Until then a
// signed-in user hitting this redirect lands on a 404. Foundation Agent
// does not write to /app/(app)/* so the placeholder belongs to Frontend.

import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect('/dashboard');
  }
  redirect('/sign-in');
}
