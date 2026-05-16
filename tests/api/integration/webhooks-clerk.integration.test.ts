// Real-Neon integration test for POST /api/webhooks/clerk.
//
// Asserts (1) user.created upserts the User row with the primary email,
// (2) a re-delivery of the same event is idempotent (the upsert no-ops),
// (3) user.deleted removes the row AND cascade-deletes owned children per
// the Prisma schema's onDelete: Cascade.
//
// We mock svix to bypass signature verification (we don't hold a real
// signing secret); the verification path itself is covered by the unit
// suite.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const verifyMock = vi.fn();
vi.mock('svix', () => {
  class WebhookVerificationError extends Error {}
  return {
    Webhook: class {
      constructor(_secret: string) {
        void _secret;
      }
      verify(...args: unknown[]) {
        return verifyMock(...args);
      }
    },
    WebhookVerificationError,
  };
});

import type { PrismaClient } from '@prisma/client';
import { POST } from '@/app/api/webhooks/clerk/route';
import {
  makeOwnerId,
  makeTestClient,
  resolveTestDatabaseUrl,
  sweepStaleTestRows,
  teardownOwnedRows,
} from './_helpers';

const READY = !!process.env.API_INTEGRATION_DB_READY;
const OWNER = makeOwnerId('webhook');

let prisma: PrismaClient;

const sigHeaders = {
  'svix-id': 'msg_test',
  'svix-timestamp': '1700000000',
  'svix-signature': 'v1,abc',
  'content-type': 'application/json',
};

function webhookRequest(): Request {
  return new Request('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    headers: sigHeaders,
    body: JSON.stringify({}),
  });
}

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

beforeEach(() => {
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = 'whsec_test';
});

afterEach(() => {
  vi.clearAllMocks();
});

describe.skipIf(!READY)('integration: POST /api/webhooks/clerk', () => {
  it('upserts the User row on user.created', async () => {
    verifyMock.mockReturnValueOnce({
      type: 'user.created',
      data: {
        id: OWNER,
        email_addresses: [{ id: 'e1', email_address: `${OWNER}@example.com` }],
        primary_email_address_id: 'e1',
      },
    });
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);

    const row = await prisma.user.findUnique({ where: { id: OWNER } });
    expect(row?.email).toBe(`${OWNER}@example.com`);
  });

  it('treats a duplicate user.created delivery as idempotent', async () => {
    verifyMock.mockReturnValueOnce({
      type: 'user.created',
      data: {
        id: OWNER,
        email_addresses: [{ id: 'e1', email_address: `${OWNER}@example.com` }],
        primary_email_address_id: 'e1',
      },
    });
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    // No exception means the upsert handled the existing row cleanly.
  });

  it('user.deleted removes the row AND cascade-deletes owned children', async () => {
    // Seed: User + an Application owned by them.
    await prisma.user.upsert({
      where: { id: OWNER },
      create: { id: OWNER, email: `${OWNER}@example.com` },
      update: { email: `${OWNER}@example.com` },
    });
    await prisma.application.create({
      data: { ownerId: OWNER, company: 'Acme', role: 'Eng', status: 'researching' },
    });

    verifyMock.mockReturnValueOnce({
      type: 'user.deleted',
      data: { id: OWNER },
    });
    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);

    expect(await prisma.user.findUnique({ where: { id: OWNER } })).toBeNull();
    expect(
      await prisma.application.findMany({ where: { ownerId: OWNER } }),
    ).toHaveLength(0);
  });
});
