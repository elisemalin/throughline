// POST /api/documents/dossier
//
// Generates a research dossier for an Application's company. Uses web search
// in the live AI workflow; the Day-2 mock returns a structured placeholder.

import { NextResponse } from 'next/server';
import {
  DocumentResponseSchema,
  DossierRequestSchema,
} from '@/contracts/api';
import type { Application } from '@/contracts/models';
import { runDossier } from '@/lib/ai';
import { prisma } from '@/lib/db/prisma';
import { projectApplication } from '@/lib/db/serialize';
import { requireUserId } from '@/lib/server/auth';
import { fromZodError, jsonError, readJson } from '@/lib/server/response';

export async function POST(req: Request) {
  const gate = await requireUserId();
  if (gate instanceof Response) return gate;
  const userId = gate;

  const body = await readJson(req);
  if (body instanceof Response) return body;
  const parsed = DossierRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const appRow = await prisma.application.findFirst({
    where: { id: parsed.data.applicationId, ownerId: userId },
  });
  if (!appRow) {
    return jsonError(404, 'application_not_found', 'Application not found.');
  }
  const application = projectApplication(appRow) as Application;

  const raw = await runDossier({ application });

  const title = `Dossier for ${application.company || 'company'}`;
  const created = await prisma.document.create({
    data: {
      ownerId: userId,
      kind: 'dossier',
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
      kind: 'dossier',
      title,
      body: raw.body,
      createdAt: created.createdAt.toISOString(),
      applicationId: application.id,
    }),
  );
}
