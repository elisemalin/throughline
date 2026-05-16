// POST /api/documents/cover-letter
//
// Generates a tailored cover letter for an Application. applicationId is
// required (the contract enforces it); the resulting Document row is FK'd
// to the application and a `document_generated` event is appended.

import { NextResponse } from 'next/server';
import {
  CoverLetterRequestSchema,
  DocumentResponseSchema,
} from '@/contracts/api';
import type { Application, SkillsDB } from '@/contracts/models';
import { runCoverLetter } from '@/lib/ai';
import { prisma } from '@/lib/db/prisma';
import { projectApplication } from '@/lib/db/serialize';
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

  const body = await readJson(req);
  if (body instanceof Response) return body;
  const parsed = CoverLetterRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const appRow = await prisma.application.findFirst({
    where: { id: parsed.data.applicationId, ownerId: userId },
  });
  if (!appRow) {
    return jsonError(404, 'application_not_found', 'Application not found.');
  }
  const application = projectApplication(appRow) as Application;
  const skillsDB = (await readSkillsDB(userId)) ?? emptySkillsDB(userId);

  const raw = await runCoverLetter({
    skillsDB,
    application,
    customNotes: parsed.data.customNotes,
  });

  const title = `Cover letter for ${application.company || 'draft'}`;
  const created = await prisma.document.create({
    data: {
      ownerId: userId,
      kind: 'cover_letter',
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
      kind: 'cover_letter',
      title,
      body: raw.body,
      createdAt: created.createdAt.toISOString(),
      applicationId: application.id,
    }),
  );
}
