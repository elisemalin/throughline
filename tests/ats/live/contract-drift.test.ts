// Live ATS contract-drift test — gated on ATS_LIVE=1.
//
// Hits every supported provider's real public endpoint and asserts:
//   1. fetchPostings returns at least one row
//   2. Every normalized row passes NormalizedPostingSchema.parse()
//
// If a provider changes their JSON shape (renamed field, removed key,
// type change), this test fails loudly and the fixture under
// tests/fixtures/ats/<provider>/ must be re-captured plus normalize()
// updated. The test rate-limits with ATS_REQUEST_DELAY_MS between calls
// to the same provider — only one slug per provider runs to keep the
// real-network cost bounded.
//
// Run locally: `pnpm test:ats:live`
// Run in CI: `.github/workflows/ats-live.yml` (nightly + on push to
// agent/external-adapter/**), no secret needed (read-only public APIs).

import { describe, expect, it } from 'vitest';
import { NormalizedPostingSchema } from '@/contracts/ats';
import { greenhouseAdapter } from '@/lib/ats/greenhouse';
import { leverAdapter } from '@/lib/ats/lever';
import { ashbyAdapter } from '@/lib/ats/ashby';

const RUN = process.env.ATS_LIVE === '1';
const describeGated = RUN ? describe : describe.skip;

describeGated('ATS contract-drift (live)', () => {
  it(
    'greenhouse: anthropic responds with NormalizedPostingSchema-valid rows',
    async () => {
      const raws = await greenhouseAdapter.fetchPostings('anthropic');
      expect(raws.length).toBeGreaterThan(0);
      for (const raw of raws.slice(0, 10)) {
        NormalizedPostingSchema.parse(greenhouseAdapter.normalize(raw));
      }
    },
    60_000,
  );

  it(
    'lever: spotify responds with NormalizedPostingSchema-valid rows',
    async () => {
      const raws = await leverAdapter.fetchPostings('spotify');
      expect(raws.length).toBeGreaterThan(0);
      for (const raw of raws.slice(0, 10)) {
        NormalizedPostingSchema.parse(leverAdapter.normalize(raw));
      }
    },
    60_000,
  );

  it(
    'ashby: linear responds with NormalizedPostingSchema-valid rows',
    async () => {
      const raws = await ashbyAdapter.fetchPostings('linear');
      expect(raws.length).toBeGreaterThan(0);
      for (const raw of raws.slice(0, 10)) {
        NormalizedPostingSchema.parse(ashbyAdapter.normalize(raw));
      }
    },
    60_000,
  );
});
