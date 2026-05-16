// Clerk session helper for route handlers.
//
// WHY: Every route in /app/api/* runs the same gate — read the Clerk session,
// return a 401 Response when there is no userId, otherwise return the userId
// so the handler can attribute writes. Centralizing the gate prevents drift
// across 19 handlers and gives tests a single seam to mock.

import { auth } from '@clerk/nextjs/server';
import { jsonError } from './response';

// requireUserId returns either a Response (401) the handler should immediately
// return, or the authenticated userId string. The split-return shape lets
// handlers stay flat: `const gate = await requireUserId(); if (gate instanceof
// Response) return gate; const userId = gate;` — no try/catch, no nullable
// userId leaking into downstream Prisma calls.
export async function requireUserId(): Promise<Response | string> {
  const session = await auth();
  if (!session.userId) {
    return jsonError(401, 'unauthorized', 'Authentication required.');
  }
  return session.userId;
}
