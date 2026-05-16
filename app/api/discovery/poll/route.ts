// POST /api/discovery/poll
//
// Manually triggers an ATS poll for the caller's watchlist. External Adapter
// owns the actual polling job; Backend Core dispatches via the registry's
// triggerPoll entry point and returns a snapshot of the resulting feed size.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { triggerPoll } from '@/lib/ats/registry';
import { requireUserId } from '@/lib/server/auth';

export async function POST() {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const result = await triggerPoll(userId);
  // totalPostings reflects the live row count even when the trigger itself
  // is async (Inngest) — the Day-2 mock surfaces 0 newPostings but the
  // total comes from the DB so Frontend's "x postings" badge stays accurate.
  const total = await prisma.discoveredPosting.count({
    where: { ownerId: userId },
  });
  return NextResponse.json({
    newPostings: result.newPostings,
    totalPostings: total,
    polledAt: result.polledAt,
  });
}
