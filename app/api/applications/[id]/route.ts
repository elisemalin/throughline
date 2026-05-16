// PATCH  /api/applications/:id   — partial update; emits status_change event
// DELETE /api/applications/:id   — remove the row (cascades events + docs)
//
// Status transitions emit an ApplicationEvent so the activity timeline is
// reconstructable from the database alone — no client-supplied audit data.

import { NextResponse } from 'next/server';
import { ApplicationUpdateSchema } from '@/contracts/api';
import { ApplicationSchema } from '@/contracts/models';
import { prisma } from '@/lib/db/prisma';
import { projectApplication } from '@/lib/db/serialize';
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
  const parsed = ApplicationUpdateSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await prisma.application.findFirst({
    where: { id, ownerId: userId },
  });
  if (!existing) {
    return jsonError(404, 'application_not_found', 'Application not found.');
  }

  const updated = await prisma.application.update({
    where: { id },
    data: {
      company: parsed.data.company ?? undefined,
      role: parsed.data.role ?? undefined,
      url: parsed.data.url,
      source: parsed.data.source,
      location: parsed.data.location,
      remote: parsed.data.remote ?? undefined,
      salaryRange: parsed.data.salaryRange,
      jobDescription: parsed.data.jobDescription,
      status: parsed.data.status ?? undefined,
      appliedDate: parsed.data.appliedDate,
      followUpDate: parsed.data.followUpDate,
      notes: parsed.data.notes,
    },
  });

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await prisma.applicationEvent.create({
      data: {
        applicationId: id,
        kind: 'status_change',
        fromStatus: existing.status,
        toStatus: parsed.data.status,
      },
    });
  }

  const projected = projectApplication(updated);
  const validated = ApplicationSchema.safeParse(projected);
  if (!validated.success) {
    return jsonError(500, 'serialization_failed', 'Persisted row failed contract validation.');
  }
  return NextResponse.json({ application: validated.data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;
  const { id } = await ctx.params;

  // deleteMany scoped by ownerId so a malicious id from another owner is a
  // no-op rather than a 500 from a unique-key violation; the response is
  // intentionally identical whether the row existed or not, to avoid leaking
  // foreign-row enumeration.
  await prisma.application.deleteMany({ where: { id, ownerId: userId } });
  return NextResponse.json({ ok: true });
}
