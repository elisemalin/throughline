// Clerk session helper for route handlers.
//
// WHY: Every route in /app/api/* runs the same gate — read the Clerk session,
// return 401 when there is no userId, otherwise return the userId. The Day-3
// Clerk webhook receiver at /api/webhooks/clerk creates the local `User` row
// on `user.created`. That webhook is eventually consistent: a freshly signed-
// up user can issue an authenticated request before Clerk's signed POST
// arrives, in which case downstream Prisma writes that FK on `ownerId` would
// 500 with a P2003 foreign-key violation.
//
// This module adds a JIT provisioning fallback. After the Clerk session is
// confirmed, we check our shadow User row exists; if not, we create one with
// a placeholder email (`<userId>@pending.clerk`). The webhook's later POST
// upserts the real email over the placeholder, so the row stays consistent.
//
// Cost: one indexed primary-key read on every authenticated request. Once
// the row exists (which is true after the first request OR after the
// webhook), there is no write — only the read.

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';
import { jsonError } from './response';

// PENDING_EMAIL_SUFFIX is the placeholder email a JIT-provisioned User row
// carries until the Clerk webhook replaces it with the real address. The
// suffix is a non-routable internal sentinel — the unique-on-email column
// stays unique because the local-part is the Clerk userId.
const PENDING_EMAIL_SUFFIX = '@pending.clerk';

export function pendingEmail(userId: string): string {
  return `${userId}${PENDING_EMAIL_SUFFIX}`;
}

export async function ensureUserRow(userId: string): Promise<void> {
  const exists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (exists) return;
  // Use a create that swallows the unique-collision race: if two requests
  // arrive concurrently for the same brand-new user, only one create wins
  // and the other no-ops. Prisma surfaces the collision as P2002; treating
  // that as success is correct here.
  try {
    await prisma.user.create({
      data: { id: userId, email: pendingEmail(userId) },
    });
  } catch (err) {
    if (!isPrismaUniqueConstraintError(err)) throw err;
  }
}

function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 'P2002'
  );
}

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
  await ensureUserRow(session.userId);
  return session.userId;
}
