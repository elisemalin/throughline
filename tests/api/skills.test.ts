import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PATCH } from '@/app/api/skills/route';
import { SkillsDBSchema } from '@/contracts/models';
import {
  fakeSkillsRow,
  makeRequest,
  mPrisma,
  signedIn,
  signedOut,
} from './_helpers';

const URL = 'http://localhost/api/skills';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/skills', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns { skillsDB: null } when the user has not ingested yet', async () => {
    signedIn();
    mPrisma.skillsDB.findUnique.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ skillsDB: null });
  });

  it('returns a contract-shape SkillsDB when present', async () => {
    signedIn();
    mPrisma.skillsDB.findUnique.mockResolvedValueOnce(fakeSkillsRow());
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    SkillsDBSchema.parse(body.skillsDB);
  });
});

describe('PATCH /api/skills', () => {
  it('returns 401 without a session', async () => {
    signedOut();
    const res = await PATCH(makeRequest({ method: 'PATCH', url: URL, body: { headline: 'x' } }));
    expect(res.status).toBe(401);
  });

  it('returns 400 on unknown keys', async () => {
    signedIn();
    const res = await PATCH(
      makeRequest({ method: 'PATCH', url: URL, body: { id: 'pwn' } }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when no SkillsDB exists yet', async () => {
    signedIn();
    mPrisma.skillsDB.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(
      makeRequest({ method: 'PATCH', url: URL, body: { headline: 'x' } }),
    );
    expect(res.status).toBe(404);
  });

  it('returns a contract-shape SkillsDB on success', async () => {
    signedIn();
    mPrisma.skillsDB.findUnique.mockResolvedValueOnce(fakeSkillsRow());
    mPrisma.skillsDB.update.mockResolvedValueOnce(fakeSkillsRow({ headline: 'Updated' }));
    const res = await PATCH(
      makeRequest({ method: 'PATCH', url: URL, body: { headline: 'Updated' } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    SkillsDBSchema.parse(body.skillsDB);
  });
});
