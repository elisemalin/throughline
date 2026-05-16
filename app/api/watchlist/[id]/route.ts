// DELETE /api/watchlist/:id

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUserId } from '@/lib/server/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;
  const { id } = await ctx.params;

  await prisma.watchlistCompany.deleteMany({ where: { id, ownerId: userId } });
  return NextResponse.json({ ok: true });
}
