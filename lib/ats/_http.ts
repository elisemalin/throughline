// Shared HTTP helper with retry policy for ATS adapters.
//
// Policy (per Day-3 kickoff):
//   - 5xx: retry once after a 5-second delay
//   - 429: retry once, respecting Retry-After (seconds or HTTP-date) if
//          present, else wait 30 seconds. The poller's 2-second per-provider
//          gap already runs above us, so this longer back-off only kicks in
//          when the provider is explicitly asking for one.
//   - 4xx other than 429: fail immediately (likely a bad slug)
//   - Network/JSON errors: bubble unchanged so the caller wraps them
//
// The sleep impl is module-private but swappable for tests via
// `__setSleepImplForTests` so the suite never waits 5+ seconds.

import type { AtsProvider } from '@/contracts/models';
import { AtsProviderError } from './errors';

type SleepImpl = (ms: number) => Promise<void>;

let sleepImpl: SleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function __setSleepImplForTests(impl: SleepImpl | undefined): void {
  sleepImpl = impl ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
}

export const RETRY_5XX_DELAY_MS = 5_000;
export const RETRY_429_DEFAULT_DELAY_MS = 30_000;

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const asNumber = Number(header);
  if (Number.isFinite(asNumber) && asNumber >= 0) return Math.floor(asNumber * 1000);
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) {
    const diff = asDate - Date.now();
    return diff > 0 ? diff : 0;
  }
  return null;
}

export interface FetchWithRetryContext {
  provider: AtsProvider;
  slug: string;
}

// Returns a Response on 2xx; throws AtsProviderError otherwise. Callers do
// not see the underlying fetch — every failure is wrapped with provider+slug
// context so the poller's per-row error log is self-describing.
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  ctx: FetchWithRetryContext,
): Promise<Response> {
  let attempts = 0;
  let lastStatus: number | undefined;

  for (;;) {
    attempts += 1;
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      // Network-level failure (DNS, TLS, connection reset). Treat as a 5xx
      // for retry purposes: try once more after the 5xx delay.
      if (attempts === 1) {
        await sleepImpl(RETRY_5XX_DELAY_MS);
        continue;
      }
      throw new AtsProviderError({
        provider: ctx.provider,
        slug: ctx.slug,
        attempts,
        message: `network error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    lastStatus = res.status;

    if (res.ok) return res;

    if (res.status >= 500 && res.status <= 599 && attempts === 1) {
      await sleepImpl(RETRY_5XX_DELAY_MS);
      continue;
    }

    if (res.status === 429 && attempts === 1) {
      const wait = parseRetryAfter(res.headers.get('retry-after')) ?? RETRY_429_DEFAULT_DELAY_MS;
      await sleepImpl(wait);
      continue;
    }

    throw new AtsProviderError({
      provider: ctx.provider,
      slug: ctx.slug,
      status: lastStatus,
      attempts,
      message: `HTTP ${lastStatus}`,
    });
  }
}
