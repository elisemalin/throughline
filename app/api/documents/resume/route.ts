// POST /api/documents/resume
//
// Generates a tailored resume from the caller's SkillsDB. When an
// applicationId is supplied, the row is persisted with that linkage and an
// `document_generated` ApplicationEvent is appended; otherwise the row is
// orphan-owned by the user with no application FK.

import { NextResponse } from 'next/server';
import { DocumentResponseSchema, ResumeRequestSchema } from '@/contracts/api';
import type { Application, SkillsDB } from '@/contracts/models';
import { resume } from '@/lib/ai';
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
  const parsed = ResumeRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  let application: Application | undefined;
  if (parsed.data.applicationId) {
    const row = await prisma.application.findFirst({
      where: { id: parsed.data.applicationId, ownerId: userId },
    });
    if (!row) {
      return jsonError(404, 'application_not_found', 'Application not found.');
    }
    application = projectApplication(row) as Application;
  }

  const skillsDB = (await readSkillsDB(userId)) ?? emptySkillsDB(userId);
  const raw = await resume({ skillsDB, application }, { apiKey });

  const title = application
    ? `Resume for ${application.role}${application.company ? ` (${application.company})` : ''}`
    : 'Resume';
  const created = await prisma.document.create({
    data: {
      ownerId: userId,
      kind: 'resume',
      title,
      body: raw.body,
      applicationId: parsed.data.applicationId,
    },
  });

  if (parsed.data.applicationId) {
    await prisma.applicationEvent.create({
      data: {
        applicationId: parsed.data.applicationId,
        kind: 'document_generated',
        documentId: created.id,
      },
    });
  }

  const response = {
    kind: 'resume' as const,
    title,
    body: raw.body,
    createdAt: created.createdAt.toISOString(),
    applicationId: parsed.data.applicationId,
  };
  return NextResponse.json(DocumentResponseSchema.parse(response));
}
