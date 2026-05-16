// POST /api/skills/ingest
//
// Parses resume + LinkedIn text into a structured SkillsDB and upserts it
// for the authenticated user.

import { NextResponse } from 'next/server';
import { SkillsIngestRequestSchema } from '@/contracts/api';
import { SkillsDBSchema } from '@/contracts/models';
import { MOCK_INGEST_WARNINGS, runIngest } from '@/lib/ai';
import { prisma } from '@/lib/db/prisma';
import { projectSkillsDB } from '@/lib/db/serialize';
import { requireUserId } from '@/lib/server/auth';
import { fromZodError, jsonError, readJson } from '@/lib/server/response';

export async function POST(req: Request) {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const body = await readJson(req);
  if (body instanceof Response) return body;
  const parsed = SkillsIngestRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const raw = await runIngest({
    resumeText: parsed.data.resumeText,
    linkedinText: parsed.data.linkedinText,
  });

  // The AI workflow returns SkillsDB shape minus server-set fields. Upsert so
  // a repeat ingest replaces the prior structured DB rather than failing on
  // the @unique(ownerId) constraint.
  const upserted = await prisma.skillsDB.upsert({
    where: { ownerId: userId },
    create: {
      ownerId: userId,
      fullName: raw.fullName,
      headline: raw.headline,
      positioning: raw.positioning,
      contact: raw.contact,
      targetRoles: raw.targetRoles,
      awards: raw.awards,
      jobs: raw.jobs,
      coreSkills: raw.coreSkills,
      tools: raw.tools,
      methods: raw.methods,
      domains: raw.domains,
      keywords: raw.keywords,
    },
    update: {
      fullName: raw.fullName,
      headline: raw.headline,
      positioning: raw.positioning,
      contact: raw.contact,
      targetRoles: raw.targetRoles,
      awards: raw.awards,
      jobs: raw.jobs,
      coreSkills: raw.coreSkills,
      tools: raw.tools,
      methods: raw.methods,
      domains: raw.domains,
      keywords: raw.keywords,
    },
  });

  const projected = projectSkillsDB(upserted);
  const validated = SkillsDBSchema.safeParse(projected);
  if (!validated.success) {
    return jsonError(500, 'serialization_failed', 'Persisted row failed contract validation.');
  }

  return NextResponse.json({
    skillsDB: validated.data,
    warnings: Array.from(MOCK_INGEST_WARNINGS),
  });
}
