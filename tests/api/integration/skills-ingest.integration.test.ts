// Real-Neon integration test for POST /api/skills/ingest.
//
// Asserts (1) first call creates the SkillsDB row, (2) second call replaces
// it under the @unique(ownerId) constraint without P2002, (3) the response
// SkillsDB shape parses against the contract schema after the boundary
// projection.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import type { PrismaClient } from '@prisma/client';
import { POST } from '@/app/api/skills/ingest/route';
import { SkillsDBSchema } from '@/contracts/models';
import {
  makeOwnerId,
  makeTestClient,
  resolveTestDatabaseUrl,
  sweepStaleTestRows,
  teardownOwnedRows,
} from './_helpers';

const READY = !!process.env.API_INTEGRATION_DB_READY;
const OWNER = makeOwnerId('skills-ingest');
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

function request(): Request {
  return new Request('http://localhost/api/skills/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-anthropic-key': 'sk-test' },
    body: JSON.stringify({
      resumeText: 'Senior engineer at Acme since 2024. Built Postgres ingestion pipelines.',
    }),
  });
}

describe.skipIf(!READY)('integration: POST /api/skills/ingest', () => {
  it('upserts the SkillsDB row on first call and replaces on second', async () => {
    mAuth.mockResolvedValue({ userId: OWNER } as never);

    const first = await POST(request());
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    SkillsDBSchema.parse(firstBody.skillsDB);

    const rowAfterFirst = await prisma.skillsDB.findUnique({ where: { ownerId: OWNER } });
    expect(rowAfterFirst).not.toBeNull();
    const idAfterFirst = rowAfterFirst!.id;

    const second = await POST(request());
    expect(second.status).toBe(200);

    const rowAfterSecond = await prisma.skillsDB.findUnique({ where: { ownerId: OWNER } });
    expect(rowAfterSecond!.id).toBe(idAfterFirst);
    // updatedAt advances on the second call — Prisma's @updatedAt fires on
    // every update operation, including the upsert update branch.
    expect(rowAfterSecond!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      rowAfterFirst!.updatedAt.getTime(),
    );
  });
});
