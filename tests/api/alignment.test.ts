import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/alignment/route';
import { AlignmentAnalysisSchema } from '@/contracts/models';
import {
  fakeSkillsRow,
  makeRequest,
  mPrisma,
  signedIn,
  signedOut,
} from './_helpers';

const URL = 'http://localhost/api/alignment';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/alignment', () => {
  it('returns 401 without a Clerk session', async () => {
    signedOut();
    const res = await POST(
      makeRequest({ method: 'POST', url: URL, body: { jobDescription: 'TS engineer' } }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when x-anthropic-key header is missing', async () => {
    signedIn();
    const res = await POST(
      makeRequest({
        method: 'POST',
        url: URL,
        body: { jobDescription: 'TS engineer' },
        apiKey: null,
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('missing_anthropic_key');
  });

  it('returns 400 when jobDescription is missing', async () => {
    signedIn();
    const res = await POST(makeRequest({ method: 'POST', url: URL, body: {} }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_request');
  });

  it('returns a contract-shaped AlignmentAnalysis', async () => {
    signedIn();
    mPrisma.skillsDB.findUnique.mockResolvedValueOnce(fakeSkillsRow());

    const res = await POST(
      makeRequest({
        method: 'POST',
        url: URL,
        body: { jobDescription: 'TypeScript React engineer with Postgres experience' },
      }),
    );
    expect(res.status).toBe(200);
    AlignmentAnalysisSchema.parse(await res.json());
  });
});
