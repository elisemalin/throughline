// PATCH /api/discovery/:id
//
// Transitions a DiscoveredPosting through the status lifecycle. The
// `drafted` arm carries an applicationId (enforced by the discriminated
// union in DiscoveryUpdateSchema); other arms must not.

import { NextResponse } from 'next/server';
import { DiscoveryUpdateSchema } from '@/contracts/api';
import { prisma } from '@/lib/db/prisma';
import { requireUserId } from '@/lib/server/auth';
import { fromZodError, jsonError, readJson } from '@/lib/server/response';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;
  const { id } = await ctx.params;

  const body = await readJson(req);
  if (body instanceof Response) return body;
  const parsed = DiscoveryUpdateSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await prisma.discoveredPosting.findFirst({
    where: { id, ownerId: userId },
    select: { id: true },
  });
  if (!existing) {
    return jsonError(404, 'posting_not_found', 'Discovered posting not found.');
  }

  // When the transition is `drafted` the FK to the application is set;
  // other transitions intentionally leave applicationId untouched so a user
  // who reverts a drafted posting to `viewed` can resume the same draft.
  const data =
    parsed.data.status === 'drafted'
      ? { status: parsed.data.status, applicationId: parsed.data.applicationId }
      : { status: parsed.data.status };

  await prisma.discoveredPosting.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
