// POST /api/alignment
//
// Server-side alignment for a job description against the caller's SkillsDB.
// The response is a contract-shape AlignmentAnalysis; callers persist it on
// an Application via POST /api/applications/:id/alignment if they want it
// attached to a row.

import { NextResponse } from 'next/server';
import {
  AlignmentAnalysisSchema,
  AlignmentRequestSchema,
} from '@/contracts/api';
import type { SkillsDB } from '@/contracts/models';
import { runAlignment } from '@/lib/ai';
import { requireUserId } from '@/lib/server/auth';
import { fromZodError, jsonError, readJson } from '@/lib/server/response';
import { readSkillsDB } from '@/lib/server/skills';

// emptySkillsDB lets the alignment route succeed when the user has not run
// ingest yet; without it the only path forward would be a 400 from the
// handler that the Frontend's "draft application" flow would have to special-
// case. Returning a zero-score AlignmentAnalysis is the more predictable shape.
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
  const parsed = AlignmentRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);

  const skillsDB = (await readSkillsDB(userId)) ?? emptySkillsDB(userId);
  const result = await runAlignment({
    skillsDB,
    jobDescription: parsed.data.jobDescription,
  });

  const validated = AlignmentAnalysisSchema.safeParse(result);
  if (!validated.success) {
    return jsonError(502, 'ai_invalid_response', 'AI workflow returned an unexpected shape.');
  }
  return NextResponse.json(validated.data);
}
