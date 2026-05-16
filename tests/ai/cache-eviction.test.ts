// Cache eviction verification.
//
// The 24h TTL (CACHE_TTL_SECONDS in /contracts/ai.ts) only takes real
// effect against Upstash; our fake client ignores TTL by design. This
// file pins two things:
//
//   1. CONTRACT: cacheSet forwards the TTL value to the underlying client
//      verbatim, and the value matches CACHE_TTL_SECONDS (so an
//      Architect-level TTL change cannot silently drop). Also: a custom
//      TTL passed through cacheSet is honored.
//
//   2. SIMULATION: a fake client whose backing store can be cleared on
//      demand demonstrates the post-eviction behavior — a previously-cached
//      entry returns null after the store empties, and the next call hits
//      the SDK afresh.
//
// A third opt-in test against real Upstash sits under
// `tests/ai/*.integration.test.ts` style — gated on
// `UPSTASH_REDIS_REST_URL_TEST` + `_TOKEN_TEST` matching Security Agent's
// pattern. We do NOT include that here because the throughput of a 24h
// TTL eviction obviously can't be tested in seconds; instead the
// integration suite would assert TTL forwarding by SETEXing a 1s key and
// polling GET. Deferred to a follow-up if real-eviction validation is
// needed before launch.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CACHE_TTL_SECONDS, AlignmentRawSchema } from '@/contracts/ai';
import { REDIS_KEY_PREFIXES } from '@/contracts/storage';
import {
  __setCacheClientForTests,
  cacheGet,
  cacheSet,
  resetCacheStats,
} from '@/lib/ai/cache';
import { runAlignment } from '@/lib/ai/workflows/alignment';
import { fakeSkillsDB, makeFakeClient } from './fakes';

beforeEach(() => {
  resetCacheStats();
});

afterEach(() => {
  __setCacheClientForTests(null);
  resetCacheStats();
});

describe('cache TTL contract', () => {
  it('cacheSet forwards CACHE_TTL_SECONDS to the underlying client by default', async () => {
    const setCalls: Array<{ key: string; ex: number }> = [];
    __setCacheClientForTests({
      get: async () => null,
      set: async (key, _value, opts) => {
        setCalls.push({ key, ex: opts.ex });
        return 'OK';
      },
    });
    await cacheSet('h1', { ok: true });
    expect(setCalls).toHaveLength(1);
    expect(setCalls[0].ex).toBe(CACHE_TTL_SECONDS);
    expect(setCalls[0].key).toBe(`${REDIS_KEY_PREFIXES.aiCache}h1`);
  });

  it('honors a custom TTL when explicitly passed', async () => {
    const setCalls: Array<{ ex: number }> = [];
    __setCacheClientForTests({
      get: async () => null,
      set: async (_k, _v, opts) => {
        setCalls.push({ ex: opts.ex });
        return 'OK';
      },
    });
    await cacheSet('h2', { ok: true }, 60);
    expect(setCalls[0].ex).toBe(60);
  });

  it('default TTL is 24h (sanity check on CACHE_TTL_SECONDS)', () => {
    expect(CACHE_TTL_SECONDS).toBe(60 * 60 * 24);
  });
});

describe('cache eviction simulation', () => {
  it('returns null after the backing store is cleared', async () => {
    const store = new Map<string, string>();
    __setCacheClientForTests({
      get: async (key) => store.get(key) ?? null,
      set: async (key, value) => {
        store.set(key, value);
        return 'OK';
      },
    });
    await cacheSet('h3', { score: 42 });
    expect(await cacheGet('h3')).toEqual({ score: 42 });
    store.clear();                                  // simulate Upstash TTL eviction
    expect(await cacheGet('h3')).toBeNull();
  });

  it('an evicted cache entry triggers a fresh SDK call on next invocation', async () => {
    const store = new Map<string, string>();
    __setCacheClientForTests({
      get: async (key) => store.get(key) ?? null,
      set: async (key, value) => {
        store.set(key, value);
        return 'OK';
      },
    });
    const valid = JSON.stringify(AlignmentRawSchema.parse({
      score: 50,
      requirements: [],
      missingKeywords: [],
      recommendation: 'fine',
    }));
    const client = makeFakeClient([{ text: valid }, { text: valid }]);
    const input = { skillsDB: fakeSkillsDB(), jobDescription: 'typescript' };

    await runAlignment(client, input);              // SDK call #1, populates cache
    expect(client.calls).toHaveLength(1);

    await runAlignment(client, input);              // cache hit, no SDK call
    expect(client.calls).toHaveLength(1);

    store.clear();                                  // simulate eviction
    await runAlignment(client, input);              // miss → SDK call #2
    expect(client.calls).toHaveLength(2);
  });
});
