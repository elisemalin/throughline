// Day-2 placeholder mock adapter for every ATS provider.
//
// WHY: External Adapter ships real per-provider adapters on Day 3 under
// /lib/ats/greenhouse.ts, lever.ts, etc. Backend Core's Day-2 routes need
// `validateSlug` (called from /api/watchlist on add) and a poll trigger
// (called from /api/discovery/poll). The shared mock validates slug format
// via the contract regex (without an HTTP call) and yields zero new postings
// so the contract-shape DiscoveryPollResponse is exercised end-to-end.

import type { AtsAdapter, NormalizedPosting } from '@/contracts/ats';
import type { AtsProvider } from '@/contracts/models';

const SLUG_RE = /^[a-zA-Z0-9_-]{1,100}$/;

export function makeMockAdapter(provider: AtsProvider): AtsAdapter<unknown> {
  return {
    provider,
    async validateSlug(slug: string): Promise<{ valid: boolean; error?: string }> {
      if (!SLUG_RE.test(slug)) {
        return { valid: false, error: 'ATS slug must be alphanumeric/_/-' };
      }
      return { valid: true };
    },
    async fetchPostings(): Promise<unknown[]> {
      return [];
    },
    normalize(_raw: unknown): NormalizedPosting & { externalId: string } {
      throw new Error('mock-adapter: normalize() not called during Day-2 sprint');
    },
  };
}
