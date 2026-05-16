import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/interviews/mock/route';
import { MockInterviewResponseSchema } from '@/contracts/api';
import {
  fakeApplicationRow,
  makeRequest,
  mPrisma,
  signedIn,
  signedOut,
} from './_helpers';

const URL = 'http://localhost/api/interviews/mock';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/interviews/mock', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await POST(makeRequest({
      method: 'POST',
      url: URL,
      body: { applicationId: 'app_test_1', transcript: [] },
    }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when x-anthropic-key header is missing', async () => {
    signedIn();
    const res = await POST(makeRequest({
      method: 'POST',
      url: URL,
      body: { applicationId: 'app_test_1', transcript: [] },
      apiKey: null,
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('missing_anthropic_key');
  });

  it('returns 400 when transcript is missing', async () => {
    signedIn();
    const res = await POST(makeRequest({
      method: 'POST',
      url: URL,
      body: { applicationId: 'app_test_1' },
    }));
    expect(res.status).toBe(400);
  });

  it('returns a contract-shape opener on an empty transcript', async () => {
    signedIn();
    mPrisma.application.findFirst.mockResolvedValueOnce(fakeApplicationRow());

    const res = await POST(makeRequest({
      method: 'POST',
      url: URL,
      body: { applicationId: 'app_test_1', transcript: [] },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    MockInterviewResponseSchema.parse(body);
    expect(body.next.role).toBe('interviewer');
    expect(body.done).toBe(false);
  });
});
