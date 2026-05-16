// POST /api/discovery/poll
//
// Returns a freshness snapshot of the caller's watchlist. The actual ATS
// polling happens on a daily Inngest cron in /jobs/poll.ts — there is no
// on-demand trigger today. This route reports:
//   - polledAt: max(WatchlistCompany.lastPolled) across the caller's rows,
//     or the current time when no rows have been polled yet
//   - totalPostings: live count of the caller's DiscoveredPosting rows
//   - newPostings: always 0 (no synchronous poll fired)
// Frontend renders polledAt as the "last refreshed" timestamp.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUserId } from '@/lib/server/auth';

export async function POST() {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const [total, freshness] = await Promise.all([
    prisma.discoveredPosting.count({ where: { ownerId: userId } }),
    prisma.watchlistCompany.aggregate({
      where: { ownerId: userId },
      _max: { lastPolled: true },
    }),
  ]);

  const polledAt = (freshness._max.lastPolled ?? new Date()).toISOString();
  return NextResponse.json({
    newPostings: 0,
    totalPostings: total,
    polledAt,
  });
}
