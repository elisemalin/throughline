import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/skills/ingest/route';
import { SkillsDBSchema } from '@/contracts/models';
import {
  fakeSkillsRow,
  makeRequest,
  mPrisma,
  signedIn,
  signedOut,
} from './_helpers';

const URL = 'http://localhost/api/skills/ingest';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/skills/ingest', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await POST(makeRequest({
      method: 'POST',
      url: URL,
      body: { resumeText: 'x' },
    }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when resumeText is missing', async () => {
    signedIn();
    const res = await POST(makeRequest({ method: 'POST', url: URL, body: {} }));
    expect(res.status).toBe(400);
  });

  it('returns contract-shape SkillsDB on success', async () => {
    signedIn();
    mPrisma.skillsDB.upsert.mockResolvedValueOnce(fakeSkillsRow());

    const res = await POST(makeRequest({
      method: 'POST',
      url: URL,
      body: { resumeText: 'Senior engineer at Acme since 2024.' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    SkillsDBSchema.parse(body.skillsDB);
    expect(Array.isArray(body.warnings)).toBe(true);
    expect(mPrisma.skillsDB.upsert).toHaveBeenCalled();
  });
});
