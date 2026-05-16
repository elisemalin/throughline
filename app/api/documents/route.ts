// GET /api/documents — list every Document owned by the caller.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { projectDocument } from '@/lib/db/serialize';
import { requireUserId } from '@/lib/server/auth';

export async function GET() {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const rows = await prisma.document.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({
    documents: rows.map((r) => projectDocument(r)),
  });
}
