// GET /api/discovery — list discovered postings for the caller.
//
// Ordered by postedAt desc (newest first) to match the prototype's feed
// behavior. Backend Core projects alignmentScore from the row column (it is
// a real column on DiscoveredPosting per contracts/models.ts — distinct from
// Application.alignmentScore which is derived).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { projectDiscoveredPosting } from '@/lib/db/serialize';
import { requireUserId } from '@/lib/server/auth';

export async function GET() {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const rows = await prisma.discoveredPosting.findMany({
    where: { ownerId: userId },
    orderBy: { postedAt: 'desc' },
  });
  return NextResponse.json({
    postings: rows.map((r) => projectDiscoveredPosting(r)),
  });
}
