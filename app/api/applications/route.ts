// GET  /api/applications     — list the caller's applications
// POST /api/applications     — create a new application
//
// alignmentScore is derived from alignmentAnalysis?.score at read time per
// the ARCHITECTURE.md decision (no separate column). projectApplication
// handles the projection so handlers never re-derive the field.

import { NextResponse } from 'next/server';
import { ApplicationCreateSchema } from '@/contracts/api';
import { ApplicationSchema } from '@/contracts/models';
import { prisma } from '@/lib/db/prisma';
import { projectApplication } from '@/lib/db/serialize';
import { requireUserId } from '@/lib/server/auth';
import { fromZodError, jsonError, readJson } from '@/lib/server/response';

export async function GET() {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const rows = await prisma.application.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({
    applications: rows.map((r) => projectApplication(r)),
  });
}

export async function POST(req: Request) {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const body = await readJson(req);
  if (body instanceof Response) return body;
  const parsed = ApplicationCreateSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const created = await prisma.application.create({
    data: {
      ownerId: userId,
      company: parsed.data.company,
      role: parsed.data.role,
      url: parsed.data.url,
      source: parsed.data.source,
      location: parsed.data.location,
      remote: parsed.data.remote ?? false,
      salaryRange: parsed.data.salaryRange,
      jobDescription: parsed.data.jobDescription,
      status: parsed.data.status,
      appliedDate: parsed.data.appliedDate,
      followUpDate: parsed.data.followUpDate,
      notes: parsed.data.notes,
    },
  });

  await prisma.applicationEvent.create({
    data: {
      applicationId: created.id,
      kind: 'created',
      toStatus: created.status,
    },
  });

  const projected = projectApplication(created);
  const validated = ApplicationSchema.safeParse(projected);
  if (!validated.success) {
    return jsonError(500, 'serialization_failed', 'Persisted row failed contract validation.');
  }
  return NextResponse.json({ application: validated.data });
}
