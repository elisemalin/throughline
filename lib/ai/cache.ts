// Upstash Redis cache for validated Claude responses.
//
// Key shape: `${REDIS_KEY_PREFIXES.aiCache}${promptHash}` — value is the
// JSON-serialized response that already passed its workflow's Zod
// validator. We never store the plaintext prompt or response; only the
// final structured output keyed by the prompt's SHA-256.
//
// Client construction is lazy and one-shot. WHY: Upstash's REST client
// reads `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` from env at
// construction. In test runs and in `AI_MODE=mock` the env vars are absent
// and we must not throw at import time; the helpers fall back to a no-op
// cache when credentials are missing.

import { Redis } from '@upstash/redis';
import { CACHE_TTL_SECONDS } from '@/contracts/ai';
import { REDIS_KEY_PREFIXES } from '@/contracts/storage';

type CacheClient = {
  get: (key: string) => Promise<unknown>;
  set: (
    key: string,
    value: string,
    opts: { ex: number },
  ) => Promise<unknown>;
};

let cached: CacheClient | null | undefined;

// Hit/miss counters. Deliberately content-free: only the prompt hash is
// logged (never the prompt text or response). Read via `getCacheStats()`
// and zeroed via `resetCacheStats()`. The counters drive TTL tuning
// post-launch and pin the cache contract in unit tests.
type CacheStats = { hits: number; misses: number; sets: number };
const stats: CacheStats = { hits: 0, misses: 0, sets: 0 };

export function getCacheStats(): Readonly<CacheStats> {
  return { ...stats };
}

export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.sets = 0;
}

function client(): CacheClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cached = null;
    return null;
  }
  cached = new Redis({ url, token }) as unknown as CacheClient;
  return cached;
}

// Test-only escape hatch: lets unit tests inject a fake client and reset
// between cases. Not exported via the public surface and not callable from
// production code paths.
export function __setCacheClientForTests(c: CacheClient | null): void {
  cached = c;
}

function cacheKey(promptHash: string): string {
  return `${REDIS_KEY_PREFIXES.aiCache}${promptHash}`;
}

export async function cacheGet<T>(promptHash: string): Promise<T | null> {
  const c = client();
  if (!c) {
    stats.misses += 1;
    return null;
  }
  const raw = await c.get(cacheKey(promptHash));
  if (raw == null) {
    stats.misses += 1;
    return null;
  }
  // Upstash's REST client transparently parses JSON when the stored value
  // is JSON; for string values it returns the string. Handle both so the
  // helper is robust regardless of which path the Upstash client took.
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as T;
      stats.hits += 1;
      return parsed;
    } catch {
      // Garbled cache value — count as miss so TTL tuning sees the real
      // hit rate, not a hit on undecodable bytes.
      stats.misses += 1;
      return null;
    }
  }
  stats.hits += 1;
  return raw as T;
}

export async function cacheSet<T>(
  promptHash: string,
  value: T,
  ttlSeconds: number = CACHE_TTL_SECONDS,
): Promise<void> {
  const c = client();
  if (!c) return;
  await c.set(cacheKey(promptHash), JSON.stringify(value), { ex: ttlSeconds });
  stats.sets += 1;
}
