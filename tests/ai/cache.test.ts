// Cache + hash unit tests. Verifies:
//   - the canonical key format (REDIS_KEY_PREFIXES.aiCache + SHA-256 hex)
//   - get/set round-trip
//   - TTL is forwarded to the underlying client
//   - missing env vars fall back to a no-op cache (returns null on get,
//     swallows set)

import { afterEach, describe, expect, it } from 'vitest';
import { CACHE_TTL_SECONDS } from '@/contracts/ai';
import { REDIS_KEY_PREFIXES } from '@/contracts/storage';
import { __setCacheClientForTests, cacheGet, cacheSet } from '@/lib/ai/cache';
import { promptHash } from '@/lib/ai/hash';

afterEach(() => {
  __setCacheClientForTests(null);
});

describe('promptHash', () => {
  it('is deterministic across calls', () => {
    expect(promptHash('a', 'b', 'm')).toBe(promptHash('a', 'b', 'm'));
  });

  it('separates inputs with a NUL byte (no boundary collision)', () => {
    expect(promptHash('ab', 'c', 'm')).not.toBe(promptHash('a', 'bc', 'm'));
  });
});

describe('cache helpers', () => {
  it('returns null and swallows set when no client is configured', async () => {
    __setCacheClientForTests(null);
    expect(await cacheGet('hash')).toBeNull();
    await expect(cacheSet('hash', { a: 1 })).resolves.toBeUndefined();
  });

  it('round-trips a JSON-serializable value under the canonical key', async () => {
    const calls: Array<{ method: string; key: string; value?: string; ex?: number }> = [];
    const store = new Map<string, string>();
    __setCacheClientForTests({
      get: async (key) => {
        calls.push({ method: 'get', key });
        return store.get(key) ?? null;
      },
      set: async (key, value, opts) => {
        calls.push({ method: 'set', key, value, ex: opts.ex });
        store.set(key, value);
        return 'OK';
      },
    });
    const hash = 'abc123';
    await cacheSet(hash, { score: 80 });
    const out = await cacheGet<{ score: number }>(hash);
    expect(out).toEqual({ score: 80 });
    expect(calls[0].key).toBe(`${REDIS_KEY_PREFIXES.aiCache}${hash}`);
    expect(calls[0].ex).toBe(CACHE_TTL_SECONDS);
  });
});
