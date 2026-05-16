// POST /api/applications/:id/alignment
//
// Recomputes the AlignmentAnalysis for an existing Application and persists
// the snapshot. Body is empty; jobDescription is read from the row.

import { NextResponse } from 'next/server';
import { ApplicationAlignmentResponseSchema } from '@/contracts/api';
import type { SkillsDB } from '@/contracts/models';
import { runAlignment } from '@/lib/ai';
import { prisma } from '@/lib/db/prisma';
import { projectApplication } from '@/lib/db/serialize';
import { requireUserId } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/response';
import { readSkillsDB } from '@/lib/server/skills';

type Ctx = { params: Promise<{ id: string }> };

function emptySkillsDB(userId: string): SkillsDB {
  return {
    id: 'pending',
    ownerId: userId,
    fullName: '',
    headline: '',
    positioning: '',
    contact: {},
    targetRoles: [],
    awards: [],
    jobs: [],
    coreSkills: [],
    tools: [],
    methods: [],
    domains: [],
    keywords: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;
  const { id } = await ctx.params;

  const row = await prisma.application.findFirst({
    where: { id, ownerId: userId },
  });
  if (!row) {
    return jsonError(404, 'application_not_found', 'Application not found.');
  }

  const skillsDB = (await readSkillsDB(userId)) ?? emptySkillsDB(userId);
  const analysis = await runAlignment({
    skillsDB,
    jobDescription: row.jobDescription ?? '',
  });

  const updated = await prisma.application.update({
    where: { id },
    data: { alignmentAnalysis: analysis },
  });

  const projected = projectApplication(updated);
  const validated = ApplicationAlignmentResponseSchema.safeParse({
    application: projected,
  });
  if (!validated.success) {
    return jsonError(500, 'serialization_failed', 'Persisted row failed contract validation.');
  }
  return NextResponse.json(validated.data);
}
