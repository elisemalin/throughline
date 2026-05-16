import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/documents/route';
import { DELETE } from '@/app/api/documents/[id]/route';
import { DocumentSchema } from '@/contracts/models';
import {
  fakeDocumentRow,
  makeRequest,
  mPrisma,
  signedIn,
  signedOut,
} from './_helpers';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/documents', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns a contract-shape list of documents', async () => {
    signedIn();
    mPrisma.document.findMany.mockResolvedValueOnce([fakeDocumentRow()]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    DocumentSchema.parse(body.documents[0]);
  });
});

describe('DELETE /api/documents/:id', () => {
  const URL = 'http://localhost/api/documents/doc_test_1';
  const ctx = { params: Promise.resolve({ id: 'doc_test_1' }) };

  it('returns 401 without a session', async () => {
    signedOut();
    const res = await DELETE(makeRequest({ method: 'DELETE', url: URL }), ctx);
    expect(res.status).toBe(401);
  });

  it('returns 200/{ok:true} and scopes deletion by ownerId', async () => {
    signedIn();
    mPrisma.document.deleteMany.mockResolvedValueOnce({ count: 1 });
    const res = await DELETE(makeRequest({ method: 'DELETE', url: URL }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mPrisma.document.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ownerId: expect.any(String) }) }),
    );
  });
});
