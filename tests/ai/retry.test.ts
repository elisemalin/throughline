// Retry wrapper unit tests. The wrapper is exercised end-to-end by every
// workflow test through invokeOneShot; this file pins the unit-level
// behaviors so a refactor of the wrapper does not regress them silently.

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AIValidationError } from '@/lib/ai/types';
import { withValidationRetry } from '@/lib/ai/retry';

const schema = z.object({ ok: z.literal(true), value: z.string() }).strict();

describe('withValidationRetry', () => {
  it('returns immediately when the first attempt validates', async () => {
    let calls = 0;
    const out = await withValidationRetry('test', schema, async () => {
      calls += 1;
      return { ok: true, value: 'hi' };
    });
    expect(calls).toBe(1);
    expect(out.value).toBe('hi');
  });

  it('retries exactly once on validation failure and returns the corrected value', async () => {
    let calls = 0;
    const out = await withValidationRetry('test', schema, async (extra) => {
      calls += 1;
      if (calls === 1) {
        expect(extra).toBe('');
        return { ok: false };
      }
      expect(extra).toContain('failed schema validation');
      return { ok: true, value: 'corrected' };
    });
    expect(calls).toBe(2);
    expect(out.value).toBe('corrected');
  });

  it('throws AIValidationError when the second attempt also fails', async () => {
    let calls = 0;
    await expect(
      withValidationRetry('test', schema, async () => {
        calls += 1;
        return { ok: false };
      }),
    ).rejects.toBeInstanceOf(AIValidationError);
    expect(calls).toBe(2);
  });
});
