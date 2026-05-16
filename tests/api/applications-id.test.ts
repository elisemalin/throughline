import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, PATCH } from '@/app/api/applications/[id]/route';
import { ApplicationSchema } from '@/contracts/models';
import {
  fakeApplicationRow,
  makeRequest,
  mPrisma,
  signedIn,
  signedOut,
} from './_helpers';

const URL = 'http://localhost/api/applications/app_test_1';
const ctx = { params: Promise.resolve({ id: 'app_test_1' }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/applications/:id', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await PATCH(
      makeRequest({ method: 'PATCH', url: URL, body: { notes: 'x' } }),
      { params: Promise.resolve({ id: 'app_test_1' }) },
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 on unknown keys', async () => {
    signedIn();
    const res = await PATCH(
      makeRequest({ method: 'PATCH', url: URL, body: { id: 'pwn' } }),
      { params: Promise.resolve({ id: 'app_test_1' }) },
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when the application is not owned by the caller', async () => {
    signedIn();
    mPrisma.application.findFirst.mockResolvedValueOnce(null);
    const res = await PATCH(
      makeRequest({ method: 'PATCH', url: URL, body: { notes: 'x' } }),
      { params: Promise.resolve({ id: 'app_test_1' }) },
    );
    expect(res.status).toBe(404);
  });

  it('emits a status_change event on transition', async () => {
    signedIn();
    mPrisma.application.findFirst.mockResolvedValueOnce(
      fakeApplicationRow({ status: 'researching' }),
    );
    mPrisma.application.update.mockResolvedValueOnce(
      fakeApplicationRow({ status: 'applied' }),
    );

    const res = await PATCH(
      makeRequest({ method: 'PATCH', url: URL, body: { status: 'applied' } }),
      { params: Promise.resolve({ id: 'app_test_1' }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    ApplicationSchema.parse(body.application);
    expect(mPrisma.applicationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kind: 'status_change' }) }),
    );
  });
});

describe('DELETE /api/applications/:id', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await DELETE(makeRequest({ method: 'DELETE', url: URL }), ctx);
    expect(res.status).toBe(401);
  });

  it('returns 200/{ok:true} and scopes deletion by ownerId', async () => {
    signedIn();
    mPrisma.application.deleteMany.mockResolvedValueOnce({ count: 1 });
    const res = await DELETE(makeRequest({ method: 'DELETE', url: URL }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mPrisma.application.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ownerId: expect.any(String) }) }),
    );
  });
});
