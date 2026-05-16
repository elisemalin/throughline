// Real-Neon integration test for POST /api/applications/:id/alignment.
//
// Asserts the route reads the persisted jobDescription, runs the alignment
// workflow (mock mode — no Anthropic call), writes the resulting analysis
// to the alignmentAnalysis JSON column, and the response goes through the
// projectApplication boundary so alignmentScore is derived from
// alignmentAnalysis.score.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import type { PrismaClient } from '@prisma/client';
import { POST } from '@/app/api/applications/[id]/alignment/route';
import { ApplicationAlignmentResponseSchema } from '@/contracts/api';
import {
  makeOwnerId,
  makeTestClient,
  resolveTestDatabaseUrl,
  sweepStaleTestRows,
  teardownOwnedRows,
} from './_helpers';

const READY = !!process.env.API_INTEGRATION_DB_READY;
const OWNER = makeOwnerId('apps-alignment');
const mAuth = vi.mocked(auth);

let prisma: PrismaClient;

beforeAll(async () => {
  if (!READY) return;
  prisma = makeTestClient(resolveTestDatabaseUrl()!.url);
  await sweepStaleTestRows(prisma);
});

afterAll(async () => {
  if (!READY) return;
  await teardownOwnedRows(prisma, OWNER);
  await prisma.$disconnect();
});

describe.skipIf(!READY)('integration: POST /api/applications/:id/alignment', () => {
  it('persists alignmentAnalysis and projects alignmentScore in the response', async () => {
    mAuth.mockResolvedValue({ userId: OWNER } as never);

    // Seed: the User row (handler's JIT will catch this anyway, but the
    // application FK needs it first), and an Application with a JD.
    await prisma.user.upsert({
      where: { id: OWNER },
      create: { id: OWNER, email: `${OWNER}@pending.clerk` },
      update: {},
    });
    const app = await prisma.application.create({
      data: {
        ownerId: OWNER,
        company: 'Acme',
        role: 'TS Engineer',
        status: 'researching',
        jobDescription: 'Looking for a TypeScript engineer with Postgres experience.',
      },
    });

    const res = await POST(
      new Request(`http://localhost/api/applications/${app.id}/alignment`, {
        method: 'POST',
        headers: { 'x-anthropic-key': 'sk-test' },
      }),
      { params: Promise.resolve({ id: app.id }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    ApplicationAlignmentResponseSchema.parse(body);
    expect(body.application.alignmentAnalysis).toBeDefined();
    expect(body.application.alignmentScore).toBe(
      body.application.alignmentAnalysis.score,
    );

    const row = await prisma.application.findUnique({ where: { id: app.id } });
    expect(row?.alignmentAnalysis).not.toBeNull();
  });
});
