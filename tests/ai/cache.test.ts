// Cache + hash unit tests. Verifies:
//   - the canonical key format (REDIS_KEY_PREFIXES.aiCache + SHA-256 hex)
//   - get/set round-trip
//   - TTL is forwarded to the underlying client
//   - missing env vars fall back to a no-op cache (returns null on get,
//     swallows set)

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CACHE_TTL_SECONDS } from '@/contracts/ai';
import { REDIS_KEY_PREFIXES } from '@/contracts/storage';
import {
  __setCacheClientForTests,
  cacheGet,
  cacheSet,
  getCacheStats,
  resetCacheStats,
} from '@/lib/ai/cache';
import { promptHash } from '@/lib/ai/hash';

beforeEach(() => {
  resetCacheStats();
});

afterEach(() => {
  __setCacheClientForTests(null);
  resetCacheStats();
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

describe('cache instrumentation (hit/miss counters)', () => {
  it('starts at zero after reset', () => {
    expect(getCacheStats()).toEqual({ hits: 0, misses: 0, sets: 0 });
  });

  it('counts a miss when no client is configured', async () => {
    __setCacheClientForTests(null);
    await cacheGet('absent');
    expect(getCacheStats()).toMatchObject({ hits: 0, misses: 1, sets: 0 });
  });

  it('counts a miss when the key is absent and a hit when present', async () => {
    const store = new Map<string, string>();
    __setCacheClientForTests({
      get: async (key) => store.get(key) ?? null,
      set: async (key, value) => {
        store.set(key, value);
        return 'OK';
      },
    });
    await cacheGet('cold');                    // miss
    await cacheSet('warm', { ok: true });      // set
    await cacheGet('warm');                    // hit
    await cacheGet('still-cold');              // miss
    expect(getCacheStats()).toEqual({ hits: 1, misses: 2, sets: 1 });
  });

  it('counts a miss when the stored value is undecodable JSON', async () => {
    const store = new Map<string, string>();
    store.set(`${REDIS_KEY_PREFIXES.aiCache}garbled`, '{not json');
    __setCacheClientForTests({
      get: async (key) => store.get(key) ?? null,
      set: async () => 'OK',
    });
    const out = await cacheGet('garbled');
    expect(out).toBeNull();
    expect(getCacheStats()).toMatchObject({ hits: 0, misses: 1 });
  });
});
