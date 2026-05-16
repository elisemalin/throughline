// Real-Neon integration test for POST /api/watchlist.
//
// Asserts (1) a valid slug yields { validation: { valid: true } } and the row
// is created active=true, (2) a structurally-valid slug that the provider
// rejects yields validation.valid=false and the row is created with
// active=false so the poller skips it but the user sees their entry.
//
// We mock the adapter's validateSlug to make the assertion deterministic;
// the real ATS endpoints are exercised by External Adapter's integration
// suite.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Stub each adapter's validateSlug so we don't make outbound HTTP calls
// from this suite. The route only consults validateSlug; fetchPostings is
// unused at the watchlist add boundary.
vi.mock('@/lib/ats/greenhouse', () => ({
  greenhouseAdapter: {
    provider: 'greenhouse',
    validateSlug: vi.fn(),
    fetchPostings: vi.fn(),
    normalize: vi.fn(),
  },
}));

import { auth } from '@clerk/nextjs/server';
import type { PrismaClient } from '@prisma/client';
import { POST } from '@/app/api/watchlist/route';
import { greenhouseAdapter } from '@/lib/ats/greenhouse';
import {
  makeOwnerId,
  makeTestClient,
  resolveTestDatabaseUrl,
  sweepStaleTestRows,
  teardownOwnedRows,
} from './_helpers';

const READY = !!process.env.API_INTEGRATION_DB_READY;
const OWNER = makeOwnerId('watchlist');
const mAuth = vi.mocked(auth);
const mValidate = vi.mocked(greenhouseAdapter.validateSlug);

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

function request(body: object): Request {
  return new Request('http://localhost/api/watchlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!READY)('integration: POST /api/watchlist', () => {
  it('creates an active row when the adapter validates the slug', async () => {
    mAuth.mockResolvedValue({ userId: OWNER } as never);
    mValidate.mockResolvedValueOnce({ valid: true });

    const res = await POST(
      request({ company: 'Acme', atsProvider: 'greenhouse', atsSlug: 'acme' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.validation.valid).toBe(true);

    const row = await prisma.watchlistCompany.findUnique({
      where: { id: body.company.id },
    });
    expect(row?.active).toBe(true);
    expect(row?.ownerId).toBe(OWNER);
  });

  it('creates an inactive row when the adapter rejects the slug', async () => {
    mAuth.mockResolvedValue({ userId: OWNER } as never);
    mValidate.mockResolvedValueOnce({ valid: false, error: 'board not found' });

    const res = await POST(
      request({ company: 'BadCo', atsProvider: 'greenhouse', atsSlug: 'badco' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.validation.valid).toBe(false);
    expect(body.validation.error).toBe('board not found');

    const row = await prisma.watchlistCompany.findUnique({
      where: { id: body.company.id },
    });
    expect(row?.active).toBe(false);
  });
});
