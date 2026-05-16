// POST /api/documents/ninety-day-plan
//
// Generates a 90-day plan tied to an Application.

import { NextResponse } from 'next/server';
import {
  DocumentResponseSchema,
  NinetyDayRequestSchema,
} from '@/contracts/api';
import type { Application, SkillsDB } from '@/contracts/models';
import { ninetyDay } from '@/lib/ai';
import { prisma } from '@/lib/db/prisma';
import { projectApplication } from '@/lib/db/serialize';
import { requireAnthropicKey } from '@/lib/server/anthropic-key';
import { requireUserId } from '@/lib/server/auth';
import { fromZodError, jsonError, readJson } from '@/lib/server/response';
import { readSkillsDB } from '@/lib/server/skills';

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

export async function POST(req: Request) {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const keyGate = requireAnthropicKey(req);
  if (keyGate instanceof Response) return keyGate;
  const apiKey = keyGate;

  const body = await readJson(req);
  if (body instanceof Response) return body;
  const parsed = NinetyDayRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const appRow = await prisma.application.findFirst({
    where: { id: parsed.data.applicationId, ownerId: userId },
  });
  if (!appRow) {
    return jsonError(404, 'application_not_found', 'Application not found.');
  }
  const application = projectApplication(appRow) as Application;
  const skillsDB = (await readSkillsDB(userId)) ?? emptySkillsDB(userId);

  const raw = await ninetyDay({ skillsDB, application }, { apiKey });

  const title = `90-day plan for ${application.company || 'draft'}`;
  const created = await prisma.document.create({
    data: {
      ownerId: userId,
      kind: 'ninety_day',
      title,
      body: raw.body,
      applicationId: application.id,
    },
  });

  await prisma.applicationEvent.create({
    data: {
      applicationId: application.id,
      kind: 'document_generated',
      documentId: created.id,
    },
  });

  return NextResponse.json(
    DocumentResponseSchema.parse({
      kind: 'ninety_day',
      title,
      body: raw.body,
      createdAt: created.createdAt.toISOString(),
      applicationId: application.id,
    }),
  );
}
