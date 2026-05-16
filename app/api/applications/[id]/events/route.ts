// GET /api/applications/:id/events
//
// Returns the append-only activity log for an Application. Ordered oldest
// first so consumers can render the timeline without re-sorting.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { projectApplicationEvent } from '@/lib/db/serialize';
import { requireUserId } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/response';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;
  const { id } = await ctx.params;

  const owned = await prisma.application.findFirst({
    where: { id, ownerId: userId },
    select: { id: true },
  });
  if (!owned) {
    return jsonError(404, 'application_not_found', 'Application not found.');
  }

  const rows = await prisma.applicationEvent.findMany({
    where: { applicationId: id },
    orderBy: { at: 'asc' },
  });

  return NextResponse.json({
    events: rows.map((r) => projectApplicationEvent(r)),
  });
}
