// GET   /api/skills  — read the caller's SkillsDB (null if no ingest yet)
// PATCH /api/skills  — partial merge into the caller's SkillsDB

import { NextResponse } from 'next/server';
import { SkillsUpdateSchema } from '@/contracts/api';
import { SkillsDBSchema } from '@/contracts/models';
import { prisma } from '@/lib/db/prisma';
import { projectSkillsDB } from '@/lib/db/serialize';
import { requireUserId } from '@/lib/server/auth';
import { fromZodError, jsonError, readJson } from '@/lib/server/response';
import { readSkillsDB } from '@/lib/server/skills';

export async function GET() {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const skillsDB = await readSkillsDB(userId);
  return NextResponse.json({ skillsDB });
}

export async function PATCH(req: Request) {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const body = await readJson(req);
  if (body instanceof Response) return body;
  const parsed = SkillsUpdateSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await prisma.skillsDB.findUnique({ where: { ownerId: userId } });
  if (!existing) {
    return jsonError(404, 'skills_db_not_found', 'No SkillsDB found; run ingest first.');
  }

  // Contact is a JSON column; merge field-by-field rather than replacing the
  // sub-object so a PATCH carrying only `contact.email` does not blank the
  // other contact fields. Top-level scalars and arrays are replaced wholesale
  // because the PATCH contract treats arrays as authoritative when present.
  const mergedContact =
    parsed.data.contact === undefined
      ? undefined
      : { ...(existing.contact as object), ...parsed.data.contact };

  const updated = await prisma.skillsDB.update({
    where: { ownerId: userId },
    data: {
      fullName: parsed.data.fullName ?? undefined,
      headline: parsed.data.headline ?? undefined,
      positioning: parsed.data.positioning ?? undefined,
      contact: mergedContact,
      targetRoles: parsed.data.targetRoles ?? undefined,
      awards: parsed.data.awards ?? undefined,
      jobs: parsed.data.jobs === undefined ? undefined : parsed.data.jobs,
      coreSkills: parsed.data.coreSkills ?? undefined,
      tools: parsed.data.tools ?? undefined,
      methods: parsed.data.methods ?? undefined,
      domains: parsed.data.domains ?? undefined,
      keywords: parsed.data.keywords ?? undefined,
    },
  });

  const projected = projectSkillsDB(updated);
  const validated = SkillsDBSchema.safeParse(projected);
  if (!validated.success) {
    return jsonError(500, 'serialization_failed', 'Persisted row failed contract validation.');
  }
  return NextResponse.json({ skillsDB: validated.data });
}
