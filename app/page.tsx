// Public landing — minimal by design.
//
// WHY: Signed-in users get bounced to /dashboard (owned by Frontend Agent;
// route exists once they land app/(app)/dashboard/page.tsx). Anonymous
// visitors get redirected to /sign-in. The landing page itself never paints
// product content — the auth boundary is the front door for the MVP.

import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect('/dashboard');
  }
  redirect('/sign-in');
}
