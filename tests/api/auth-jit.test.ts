import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureUserRow, pendingEmail, requireUserId } from '@/lib/server/auth';
import { FAKE_USER_ID, mAuth, mPrisma, signedIn, signedOut } from './_helpers';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireUserId JIT user provisioning', () => {
  it('returns the 401 Response when there is no Clerk session', async () => {
    signedOut();
    const result = await requireUserId();
    expect(result).toBeInstanceOf(Response);
    if (result instanceof Response) expect(result.status).toBe(401);
  });

  it('skips the create call when the User row already exists', async () => {
    signedIn();
    const result = await requireUserId();
    expect(result).toBe(FAKE_USER_ID);
    expect(mPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: FAKE_USER_ID },
      select: { id: true },
    });
    expect(mPrisma.user.create).not.toHaveBeenCalled();
  });

  it('creates a placeholder User row when the row is missing', async () => {
    mAuth.mockResolvedValue({ userId: 'user_new_1' } as never);
    mPrisma.user.findUnique.mockResolvedValueOnce(null);
    mPrisma.user.create.mockResolvedValueOnce({
      id: 'user_new_1',
      email: pendingEmail('user_new_1'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await requireUserId();
    expect(result).toBe('user_new_1');
    expect(mPrisma.user.create).toHaveBeenCalledWith({
      data: { id: 'user_new_1', email: 'user_new_1@pending.clerk' },
    });
  });

  it('swallows a P2002 unique-collision from a concurrent create', async () => {
    mAuth.mockResolvedValue({ userId: 'user_race_1' } as never);
    mPrisma.user.findUnique.mockResolvedValueOnce(null);
    mPrisma.user.create.mockRejectedValueOnce(
      Object.assign(new Error('unique constraint'), { code: 'P2002' }),
    );
    await expect(requireUserId()).resolves.toBe('user_race_1');
  });

  it('re-throws non-unique errors from the create fallback', async () => {
    mAuth.mockResolvedValue({ userId: 'user_err_1' } as never);
    mPrisma.user.findUnique.mockResolvedValueOnce(null);
    mPrisma.user.create.mockRejectedValueOnce(new Error('unexpected'));
    await expect(requireUserId()).rejects.toThrow('unexpected');
  });

  it('ensureUserRow no-ops when the row exists', async () => {
    mPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u' } as never);
    await ensureUserRow('u');
    expect(mPrisma.user.create).not.toHaveBeenCalled();
  });
});
