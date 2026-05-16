// POST /api/discovery/poll
//
// Returns a freshness snapshot of the caller's watchlist. The actual ATS
// polling happens on a daily Inngest cron in /jobs/poll.ts; there is no
// on-demand trigger from this route today. The response reports:
//   - polledAt: max(WatchlistCompany.lastPolled) across the caller's rows,
//     or the current time when no rows have been polled yet
//   - totalPostings: live count of the caller's DiscoveredPosting rows
//   - newPostings: count of unseen postings (status='new') — the badge value
//     Frontend renders next to the Discovery nav entry
// Day-4 decision: populate newPostings from the unseen-count rather than
// remove or hard-zero it. The field stays informative (the badge stays
// truthful) and the contract shape is preserved.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUserId } from '@/lib/server/auth';

export async function POST() {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const [total, unseen, freshness] = await Promise.all([
    prisma.discoveredPosting.count({ where: { ownerId: userId } }),
    prisma.discoveredPosting.count({
      where: { ownerId: userId, status: 'new' },
    }),
    prisma.watchlistCompany.aggregate({
      where: { ownerId: userId },
      _max: { lastPolled: true },
    }),
  ]);

  const polledAt = (freshness._max.lastPolled ?? new Date()).toISOString();
  return NextResponse.json({
    newPostings: unseen,
    totalPostings: total,
    polledAt,
  });
}
