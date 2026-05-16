import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/discovery/route';
import { POST as POLL } from '@/app/api/discovery/poll/route';
import { PATCH } from '@/app/api/discovery/[id]/route';
import { DiscoveredPostingSchema } from '@/contracts/models';
import {
  fakeDiscoveryRow,
  makeRequest,
  mPrisma,
  signedIn,
  signedOut,
} from './_helpers';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/discovery', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns a contract-shape list ordered by postedAt', async () => {
    signedIn();
    mPrisma.discoveredPosting.findMany.mockResolvedValueOnce([fakeDiscoveryRow()]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    DiscoveredPostingSchema.parse(body.postings[0]);
  });
});

describe('POST /api/discovery/poll', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await POLL();
    expect(res.status).toBe(401);
  });

  it('returns a contract-shape DiscoveryPollResponse', async () => {
    signedIn();
    mPrisma.discoveredPosting.count.mockResolvedValueOnce(0);
    const res = await POLL();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(
      expect.objectContaining({
        newPostings: expect.any(Number),
        totalPostings: expect.any(Number),
        polledAt: expect.any(String),
      }),
    );
  });
});

describe('PATCH /api/discovery/:id', () => {
  const URL = 'http://localhost/api/discovery/disc_test_1';
  const ctx = { params: Promise.resolve({ id: 'disc_test_1' }) };

  it('returns 401 without a session', async () => {
    signedOut();
    const res = await PATCH(makeRequest({ method: 'PATCH', url: URL, body: { status: 'viewed' } }), ctx);
    expect(res.status).toBe(401);
  });

  it('returns 400 when status=drafted but applicationId is missing', async () => {
    signedIn();
    const res = await PATCH(
      makeRequest({ method: 'PATCH', url: URL, body: { status: 'drafted' } }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when the posting is not owned by the caller', async () => {
    signedIn();
    mPrisma.discoveredPosting.findFirst.mockResolvedValueOnce(null);
    const res = await PATCH(
      makeRequest({ method: 'PATCH', url: URL, body: { status: 'viewed' } }),
      ctx,
    );
    expect(res.status).toBe(404);
  });

  it('transitions to viewed without touching applicationId', async () => {
    signedIn();
    mPrisma.discoveredPosting.findFirst.mockResolvedValueOnce(fakeDiscoveryRow());
    mPrisma.discoveredPosting.update.mockResolvedValueOnce(fakeDiscoveryRow({ status: 'viewed' }));

    const res = await PATCH(
      makeRequest({ method: 'PATCH', url: URL, body: { status: 'viewed' } }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(mPrisma.discoveredPosting.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'viewed' } }),
    );
  });

  it('writes applicationId on drafted transition', async () => {
    signedIn();
    mPrisma.discoveredPosting.findFirst.mockResolvedValueOnce(fakeDiscoveryRow());
    mPrisma.discoveredPosting.update.mockResolvedValueOnce(
      fakeDiscoveryRow({ status: 'drafted', applicationId: 'app_test_1' }),
    );

    const res = await PATCH(
      makeRequest({
        method: 'PATCH',
        url: URL,
        body: { status: 'drafted', applicationId: 'app_test_1' },
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(mPrisma.discoveredPosting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'drafted', applicationId: 'app_test_1' },
      }),
    );
  });
});
