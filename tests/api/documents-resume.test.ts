import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/documents/resume/route';
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

const URL = 'http://localhost/api/documents/resume';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/documents/resume', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await POST(makeRequest({ method: 'POST', url: URL, body: {} }));
    expect(res.status).toBe(401);
  });

  it('returns 400 on extra unknown keys (strict schema)', async () => {
    signedIn();
    const res = await POST(
      makeRequest({ method: 'POST', url: URL, body: { unexpected: 'x' } }),
    );
    expect(res.status).toBe(400);
  });

  it('returns contract-shape DocumentResponse without an application', async () => {
    signedIn();
    mPrisma.skillsDB.findUnique.mockResolvedValueOnce(fakeSkillsRow());
    mPrisma.document.create.mockResolvedValueOnce(fakeDocumentRow({ kind: 'resume' }));

    const res = await POST(makeRequest({ method: 'POST', url: URL, body: {} }));
    expect(res.status).toBe(200);
    const body = await res.json();
    DocumentResponseSchema.parse(body);
    expect(body.kind).toBe('resume');
    expect(mPrisma.document.create).toHaveBeenCalled();
  });

  it('writes a document_generated event when applicationId is supplied', async () => {
    signedIn();
    mPrisma.application.findFirst.mockResolvedValueOnce(fakeApplicationRow());
    mPrisma.skillsDB.findUnique.mockResolvedValueOnce(fakeSkillsRow());
    mPrisma.document.create.mockResolvedValueOnce(fakeDocumentRow({ applicationId: 'app_test_1' }));

    const res = await POST(
      makeRequest({ method: 'POST', url: URL, body: { applicationId: 'app_test_1' } }),
    );
    expect(res.status).toBe(200);
    expect(mPrisma.applicationEvent.create).toHaveBeenCalled();
  });
});
