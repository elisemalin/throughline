import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/applications/[id]/alignment/route';
import { ApplicationAlignmentResponseSchema } from '@/contracts/api';
import {
  fakeApplicationRow,
  fakeSkillsRow,
  makeRequest,
  mPrisma,
  signedIn,
  signedOut,
} from './_helpers';

const URL = 'http://localhost/api/applications/app_test_1/alignment';
const ctx = { params: Promise.resolve({ id: 'app_test_1' }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/applications/:id/alignment', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await POST(makeRequest({ method: 'POST', url: URL }), ctx);
    expect(res.status).toBe(401);
  });

  it('returns 400 when x-anthropic-key header is missing', async () => {
    signedIn();
    const res = await POST(
      makeRequest({ method: 'POST', url: URL, apiKey: null }),
      ctx,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('missing_anthropic_key');
  });

  it('returns 404 when the application is not owned by the caller', async () => {
    signedIn();
    mPrisma.application.findFirst.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ method: 'POST', url: URL }), ctx);
    expect(res.status).toBe(404);
  });

  it('persists analysis and returns a contract-shape Application wrapper', async () => {
    signedIn();
    mPrisma.application.findFirst.mockResolvedValueOnce(fakeApplicationRow());
    mPrisma.skillsDB.findUnique.mockResolvedValueOnce(fakeSkillsRow());
    mPrisma.application.update.mockResolvedValueOnce(
      fakeApplicationRow({
        alignmentAnalysis: {
          score: 75,
          requirements: [],
          missingKeywords: [],
          recommendation: 'Good potential.',
        },
      }),
    );

    const res = await POST(makeRequest({ method: 'POST', url: URL }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    ApplicationAlignmentResponseSchema.parse(body);
    expect(mPrisma.application.update).toHaveBeenCalled();
  });
});
