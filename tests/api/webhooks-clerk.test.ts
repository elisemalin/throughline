import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/webhooks/clerk/route';
import { mPrisma } from './_helpers';

// Svix's Webhook class is mocked file-locally so we can return verified
// payloads or throw WebhookVerificationError without holding a real signing
// secret. The mock's `verify` returns whatever the test queues up.
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

const SECRET = 'whsec_test';
const SIG_HEADERS = {
  'svix-id': 'msg_test',
  'svix-timestamp': '1700000000',
  'svix-signature': 'v1,abc',
};

function makeWebhookRequest(body: object, headers: Record<string, string> = SIG_HEADERS): Request {
  return new Request('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
});

describe('POST /api/webhooks/clerk', () => {
  it('returns 500 when the signing secret is unset', async () => {
    delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    const res = await POST(makeWebhookRequest({}));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('webhook_misconfigured');
  });

  it('returns 400 when svix headers are missing', async () => {
    const res = await POST(makeWebhookRequest({}, {}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('missing_signature_headers');
  });

  it('returns 400 when Svix signature verification fails', async () => {
    const { WebhookVerificationError } = (await vi.importMock('svix')) as {
      WebhookVerificationError: typeof Error;
    };
    verifyMock.mockImplementationOnce(() => {
      throw new WebhookVerificationError('bad sig');
    });
    const res = await POST(makeWebhookRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('invalid_signature');
  });

  it('upserts the User row on user.created with a primary email', async () => {
    verifyMock.mockReturnValueOnce({
      type: 'user.created',
      data: {
        id: 'user_clerk_1',
        email_addresses: [
          { id: 'email_1', email_address: 'alice@example.com' },
          { id: 'email_2', email_address: 'alice-alt@example.com' },
        ],
        primary_email_address_id: 'email_1',
      },
    });
    mPrisma.user.upsert.mockResolvedValueOnce({
      id: 'user_clerk_1',
      email: 'alice@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(makeWebhookRequest({}));
    expect(res.status).toBe(200);
    expect(mPrisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user_clerk_1' },
        create: { id: 'user_clerk_1', email: 'alice@example.com' },
        update: { email: 'alice@example.com' },
      }),
    );
  });

  it('skips the upsert when no primary email is present', async () => {
    verifyMock.mockReturnValueOnce({
      type: 'user.created',
      data: { id: 'user_clerk_2', email_addresses: [] },
    });
    const res = await POST(makeWebhookRequest({}));
    expect(res.status).toBe(200);
    expect(mPrisma.user.upsert).not.toHaveBeenCalled();
    expect((await res.json()).skipped).toBe('no_primary_email');
  });

  it('deletes the User row on user.deleted (Prisma cascades owned rows)', async () => {
    verifyMock.mockReturnValueOnce({
      type: 'user.deleted',
      data: { id: 'user_clerk_3' },
    });
    mPrisma.user.deleteMany.mockResolvedValueOnce({ count: 1 });

    const res = await POST(makeWebhookRequest({}));
    expect(res.status).toBe(200);
    expect(mPrisma.user.upsert).not.toHaveBeenCalled();
    expect(mPrisma.user.deleteMany).toHaveBeenCalledWith({
      where: { id: 'user_clerk_3' },
    });
  });

  it('treats user.deleted for a row that never existed as idempotent', async () => {
    verifyMock.mockReturnValueOnce({
      type: 'user.deleted',
      data: { id: 'user_clerk_404' },
    });
    mPrisma.user.deleteMany.mockResolvedValueOnce({ count: 0 });

    const res = await POST(makeWebhookRequest({}));
    expect(res.status).toBe(200);
  });

  it('retries once on a transient Prisma error and returns 200', async () => {
    verifyMock.mockReturnValueOnce({
      type: 'user.created',
      data: {
        id: 'user_clerk_retry',
        email_addresses: [{ id: 'e1', email_address: 'r@example.com' }],
        primary_email_address_id: 'e1',
      },
    });
    mPrisma.user.upsert
      .mockRejectedValueOnce(Object.assign(new Error('conn'), { code: 'P1001' }))
      .mockResolvedValueOnce({
        id: 'user_clerk_retry',
        email: 'r@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    const res = await POST(makeWebhookRequest({}));
    expect(res.status).toBe(200);
    expect(mPrisma.user.upsert).toHaveBeenCalledTimes(2);
  });

  it('returns 503 webhook_persist_failed when both attempts fail with a transient error', async () => {
    verifyMock.mockReturnValueOnce({
      type: 'user.created',
      data: {
        id: 'user_clerk_503',
        email_addresses: [{ id: 'e1', email_address: 'x@example.com' }],
        primary_email_address_id: 'e1',
      },
    });
    const transient = Object.assign(new Error('still down'), { code: 'P1017' });
    mPrisma.user.upsert.mockRejectedValueOnce(transient).mockRejectedValueOnce(transient);

    const res = await POST(makeWebhookRequest({}));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('webhook_persist_failed');
  });
});
