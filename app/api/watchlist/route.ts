// GET  /api/watchlist  — list the caller's watched companies
// POST /api/watchlist  — add a company; validates the slug with the provider

import { NextResponse } from 'next/server';
import { WatchlistAddSchema } from '@/contracts/api';
import { WatchlistCompanySchema } from '@/contracts/models';
import { prisma } from '@/lib/db/prisma';
import { projectWatchlistCompany } from '@/lib/db/serialize';
import { getAdapter } from '@/lib/ats/registry';
import { requireUserId } from '@/lib/server/auth';
import { fromZodError, jsonError, readJson } from '@/lib/server/response';

export async function GET() {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const rows = await prisma.watchlistCompany.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({
    companies: rows.map((r) => projectWatchlistCompany(r)),
  });
}

export async function POST(req: Request) {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const body = await readJson(req);
  if (body instanceof Response) return body;
  const parsed = WatchlistAddSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const validation = await getAdapter(parsed.data.atsProvider).validateSlug(
    parsed.data.atsSlug,
  );

  // The row is created regardless of validation result so the user can see
  // their entry and fix the slug without re-typing the company; `active` is
  // set from the validation result so the poller skips invalid entries.
  const created = await prisma.watchlistCompany.create({
    data: {
      ownerId: userId,
      company: parsed.data.company,
      atsProvider: parsed.data.atsProvider,
      atsSlug: parsed.data.atsSlug,
      active: validation.valid,
    },
  });

  const projected = projectWatchlistCompany(created);
  const validated = WatchlistCompanySchema.safeParse(projected);
  if (!validated.success) {
    return jsonError(500, 'serialization_failed', 'Persisted row failed contract validation.');
  }
  return NextResponse.json({
    company: validated.data,
    validation,
  });
}
