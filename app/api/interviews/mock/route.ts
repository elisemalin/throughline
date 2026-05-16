// POST /api/interviews/mock
//
// Multi-turn mock interview. The route owns the transcript envelope shape;
// the AI workflow returns the next interviewer message and a `done` flag.

import { NextResponse } from 'next/server';
import {
  MockInterviewRequestSchema,
  MockInterviewResponseSchema,
  wrapMockInterviewResponse,
} from '@/contracts/api';
import type { Application } from '@/contracts/models';
import { runMockInterview } from '@/lib/ai';
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
  const parsed = MockInterviewRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const appRow = await prisma.application.findFirst({
    where: { id: parsed.data.applicationId, ownerId: userId },
  });
  if (!appRow) {
    return jsonError(404, 'application_not_found', 'Application not found.');
  }
  const application = projectApplication(appRow) as Application;

  // Stories are derived from SkillsDB on the AI Integration side. Day-2 mock
  // does not consult them; passing an empty array keeps the input
  // contract-shaped without an extra DB read.
  const raw = await runMockInterview({
    application,
    stories: [],
    transcript: parsed.data.transcript,
  });

  return NextResponse.json(
    MockInterviewResponseSchema.parse(wrapMockInterviewResponse(raw)),
  );
}
