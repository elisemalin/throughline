// Real-Neon integration test for the Application CRUD surface.
//
// Asserts that POST /api/applications writes an Application row + a `created`
// ApplicationEvent, that GET /api/applications returns the same row with
// `alignmentScore` projected, and that PATCH /api/applications/:id with a
// status change writes a second `status_change` event.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import type { PrismaClient } from '@prisma/client';
import { GET, POST } from '@/app/api/applications/route';
import { PATCH } from '@/app/api/applications/[id]/route';
import {
  makeOwnerId,
  makeTestClient,
  resolveTestDatabaseUrl,
  sweepStaleTestRows,
  teardownOwnedRows,
} from './_helpers';

const READY = !!process.env.API_INTEGRATION_DB_READY;
const OWNER = makeOwnerId('applications');
const mAuth = vi.mocked(auth);

let prisma: PrismaClient;

beforeAll(async () => {
  if (!READY) return;
  const resolved = resolveTestDatabaseUrl();
  prisma = makeTestClient(resolved!.url);
  await sweepStaleTestRows(prisma);
});

afterAll(async () => {
  if (!READY) return;
  await teardownOwnedRows(prisma, OWNER);
  await prisma.$disconnect();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe.skipIf(!READY)('integration: /api/applications', () => {
  it('POST creates a row + created event; GET projects alignmentScore', async () => {
    mAuth.mockResolvedValue({ userId: OWNER } as never);

    const createRes = await POST(
      new Request('http://localhost/api/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          company: 'Acme',
          role: 'Senior Engineer',
          status: 'researching',
        }),
      }),
    );
    expect(createRes.status).toBe(200);
    const { application } = await createRes.json();
    expect(application.company).toBe('Acme');
    expect(application.ownerId).toBe(OWNER);

    const events = await prisma.applicationEvent.findMany({
      where: { applicationId: application.id },
    });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('created');

    const listRes = await GET();
    const { applications } = await listRes.json();
    const seen = applications.find((a: { id: string }) => a.id === application.id);
    expect(seen).toBeDefined();
    // alignmentScore is the derived field; with no alignmentAnalysis stored,
    // the projector leaves it undefined.
    expect(seen.alignmentScore).toBeUndefined();
  });

  it('PATCH with a status change writes a status_change event', async () => {
    mAuth.mockResolvedValue({ userId: OWNER } as never);

    const created = await prisma.application.create({
      data: { ownerId: OWNER, company: 'Beta Co', role: 'Lead', status: 'researching' },
    });

    const patchRes = await PATCH(
      new Request(`http://localhost/api/applications/${created.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'applied' }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(patchRes.status).toBe(200);

    const events = await prisma.applicationEvent.findMany({
      where: { applicationId: created.id, kind: 'status_change' },
    });
    expect(events).toHaveLength(1);
    expect(events[0].fromStatus).toBe('researching');
    expect(events[0].toStatus).toBe('applied');
  });

  it('PATCH without a status change does NOT write a status_change event', async () => {
    mAuth.mockResolvedValue({ userId: OWNER } as never);

    const created = await prisma.application.create({
      data: { ownerId: OWNER, company: 'Gamma', role: 'Eng', status: 'researching' },
    });

    await PATCH(
      new Request(`http://localhost/api/applications/${created.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: 'a note' }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );

    const events = await prisma.applicationEvent.findMany({
      where: { applicationId: created.id, kind: 'status_change' },
    });
    expect(events).toHaveLength(0);
  });
});
