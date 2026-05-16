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
  if (!c) return null;
  const raw = await c.get(cacheKey(promptHash));
  if (raw == null) return null;
  // Upstash's REST client transparently parses JSON when the stored value
  // is JSON; for string values it returns the string. Handle both so the
  // helper is robust regardless of which path the Upstash client took.
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
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
}
