import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/watchlist/route';
import { DELETE } from '@/app/api/watchlist/[id]/route';
import { WatchlistCompanySchema } from '@/contracts/models';
import {
  fakeWatchlistRow,
  makeRequest,
  mPrisma,
  signedIn,
  signedOut,
} from './_helpers';

const URL = 'http://localhost/api/watchlist';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/watchlist', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns a contract-shape list', async () => {
    signedIn();
    mPrisma.watchlistCompany.findMany.mockResolvedValueOnce([fakeWatchlistRow()]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    WatchlistCompanySchema.parse(body.companies[0]);
  });
});

describe('POST /api/watchlist', () => {
  const validBody = { company: 'Acme', atsProvider: 'greenhouse', atsSlug: 'acme' };

  it('returns 401 without a session', async () => {
    signedOut();
    const res = await POST(makeRequest({ method: 'POST', url: URL, body: validBody }));
    expect(res.status).toBe(401);
  });

  it('returns 400 on a malformed slug (caught by the contract regex)', async () => {
    signedIn();
    const res = await POST(makeRequest({
      method: 'POST',
      url: URL,
      body: { ...validBody, atsSlug: 'has spaces' },
    }));
    expect(res.status).toBe(400);
  });

  it('returns contract-shape company + validation on success', async () => {
    signedIn();
    mPrisma.watchlistCompany.create.mockResolvedValueOnce(fakeWatchlistRow());

    const res = await POST(makeRequest({ method: 'POST', url: URL, body: validBody }));
    expect(res.status).toBe(200);
    const body = await res.json();
    WatchlistCompanySchema.parse(body.company);
    expect(body.validation).toEqual(expect.objectContaining({ valid: expect.any(Boolean) }));
  });
});

describe('DELETE /api/watchlist/:id', () => {
  const id = 'w_test_1';
  const ctx = { params: Promise.resolve({ id }) };

  it('returns 401 without a session', async () => {
    signedOut();
    const res = await DELETE(makeRequest({ method: 'DELETE', url: `${URL}/${id}` }), ctx);
    expect(res.status).toBe(401);
  });

  it('returns 200/{ok:true} on success', async () => {
    signedIn();
    mPrisma.watchlistCompany.deleteMany.mockResolvedValueOnce({ count: 1 });
    const res = await DELETE(makeRequest({ method: 'DELETE', url: `${URL}/${id}` }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
