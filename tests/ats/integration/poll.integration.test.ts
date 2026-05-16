// ATS integration test — gated on ATS_INTEGRATION=1.
//
// Hits the real Greenhouse Job Board API against three known slugs, runs the
// adapter end-to-end, and asserts the dedup invariant by normalizing twice
// and confirming externalIds are stable. The poller's full Prisma path
// (DiscoveredPosting writes against a Postgres test DB) is not exercised in
// this PR — that surface lands when Backend Core wires the test DB on Day 3.
//
// Run with: `pnpm test:ats:integration`. Skipped in CI without the env flag.

import { describe, expect, it } from 'vitest';
import { greenhouseAdapter } from '@/lib/ats/greenhouse';
import { NormalizedPostingSchema } from '@/contracts/ats';
import { ATS_REQUEST_DELAY_MS } from '@/contracts/ats';

const RUN = process.env.ATS_INTEGRATION === '1';
const itGated = RUN ? it : it.skip;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const SLUGS = ['anthropic', 'stripe', 'airbnb'] as const;

describe('greenhouse integration (real network)', () => {
  itGated(
    'fetches and normalizes postings from three live boards with rate-limit delay',
    async () => {
      const allIds = new Set<string>();
      for (let i = 0; i < SLUGS.length; i += 1) {
        if (i > 0) await sleep(ATS_REQUEST_DELAY_MS);
        const slug = SLUGS[i];
        const raws = await greenhouseAdapter.fetchPostings(slug);
        expect(raws.length).toBeGreaterThan(0);

        const beforeSize = allIds.size;
        for (const raw of raws) {
          const normalized = greenhouseAdapter.normalize(raw);
          NormalizedPostingSchema.parse(normalized);
          allIds.add(`${slug}:${normalized.externalId}`);
        }
        expect(allIds.size).toBeGreaterThan(beforeSize);
      }
    },
    120_000,
  );

  itGated(
    'normalizing the same posting twice produces a stable externalId (dedup invariant)',
    async () => {
      const raws = await greenhouseAdapter.fetchPostings('anthropic');
      expect(raws.length).toBeGreaterThan(0);
      const first = greenhouseAdapter.normalize(raws[0]);
      const second = greenhouseAdapter.normalize(raws[0]);
      expect(first.externalId).toBe(second.externalId);
      expect(second.externalId.length).toBeGreaterThan(0);
    },
    60_000,
  );
});
