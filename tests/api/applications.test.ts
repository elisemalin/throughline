import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/applications/route';
import { ApplicationSchema } from '@/contracts/models';
import {
  fakeApplicationRow,
  makeRequest,
  mPrisma,
  signedIn,
  signedOut,
} from './_helpers';

const URL = 'http://localhost/api/applications';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/applications', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns a contract-shape list of applications', async () => {
    signedIn();
    mPrisma.application.findMany.mockResolvedValueOnce([fakeApplicationRow()]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.applications)).toBe(true);
    ApplicationSchema.parse(body.applications[0]);
  });
});

describe('POST /api/applications', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await POST(makeRequest({
      method: 'POST',
      url: URL,
      body: { company: 'Acme', role: 'Eng', status: 'researching' },
    }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    signedIn();
    const res = await POST(makeRequest({
      method: 'POST',
      url: URL,
      body: { company: 'Acme' },
    }));
    expect(res.status).toBe(400);
  });

  it('rejects stripped server-controlled fields (strict schema)', async () => {
    signedIn();
    const res = await POST(makeRequest({
      method: 'POST',
      url: URL,
      body: {
        id: 'pwn',
        ownerId: 'attacker',
        company: 'Acme',
        role: 'Eng',
        status: 'researching',
      },
    }));
    expect(res.status).toBe(400);
  });

  it('creates an application and writes a created event', async () => {
    signedIn();
    mPrisma.application.create.mockResolvedValueOnce(fakeApplicationRow());

    const res = await POST(makeRequest({
      method: 'POST',
      url: URL,
      body: { company: 'Acme', role: 'Engineer', status: 'researching' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    ApplicationSchema.parse(body.application);
    expect(mPrisma.applicationEvent.create).toHaveBeenCalled();
  });
});
