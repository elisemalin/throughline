import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/applications/[id]/events/route';
import { ApplicationEventSchema } from '@/contracts/api';
import {
  fakeAppEventRow,
  fakeApplicationRow,
  makeRequest,
  mPrisma,
  signedIn,
  signedOut,
} from './_helpers';

const URL = 'http://localhost/api/applications/app_test_1/events';
const ctx = { params: Promise.resolve({ id: 'app_test_1' }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/applications/:id/events', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await GET(makeRequest({ method: 'GET', url: URL }), ctx);
    expect(res.status).toBe(401);
  });

  it('returns 404 when the application is not owned by the caller', async () => {
    signedIn();
    mPrisma.application.findFirst.mockResolvedValueOnce(null);
    const res = await GET(makeRequest({ method: 'GET', url: URL }), ctx);
    expect(res.status).toBe(404);
  });

  it('returns a contract-shape event list', async () => {
    signedIn();
    mPrisma.application.findFirst.mockResolvedValueOnce(fakeApplicationRow());
    mPrisma.applicationEvent.findMany.mockResolvedValueOnce([fakeAppEventRow()]);

    const res = await GET(makeRequest({ method: 'GET', url: URL }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
    ApplicationEventSchema.parse(body.events[0]);
  });
});
