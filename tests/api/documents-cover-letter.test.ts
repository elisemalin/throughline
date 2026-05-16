import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/documents/cover-letter/route';
import { DocumentResponseSchema } from '@/contracts/api';
import {
  fakeApplicationRow,
  fakeDocumentRow,
  fakeSkillsRow,
  makeRequest,
  mPrisma,
  signedIn,
  signedOut,
} from './_helpers';

const URL = 'http://localhost/api/documents/cover-letter';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/documents/cover-letter', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await POST(makeRequest({ method: 'POST', url: URL, body: { applicationId: 'x' } }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when applicationId is missing', async () => {
    signedIn();
    const res = await POST(makeRequest({ method: 'POST', url: URL, body: {} }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when the application is not owned by the caller', async () => {
    signedIn();
    mPrisma.application.findFirst.mockResolvedValueOnce(null);
    const res = await POST(
      makeRequest({ method: 'POST', url: URL, body: { applicationId: 'app_unknown' } }),
    );
    expect(res.status).toBe(404);
  });

  it('returns contract-shape DocumentResponse on success', async () => {
    signedIn();
    mPrisma.application.findFirst.mockResolvedValueOnce(fakeApplicationRow());
    mPrisma.skillsDB.findUnique.mockResolvedValueOnce(fakeSkillsRow());
    mPrisma.document.create.mockResolvedValueOnce(fakeDocumentRow({ kind: 'cover_letter' }));

    const res = await POST(
      makeRequest({ method: 'POST', url: URL, body: { applicationId: 'app_test_1' } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    DocumentResponseSchema.parse(body);
    expect(body.kind).toBe('cover_letter');
  });
});
