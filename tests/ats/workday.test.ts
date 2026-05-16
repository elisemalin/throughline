// Workday stub: every method must throw the canonical not-implemented error
// so a misconfigured WatchlistCompany row surfaces clearly in the poller's
// per-row error log instead of silently producing zero postings.

import { describe, expect, it } from 'vitest';
import { workdayAdapter } from '@/lib/ats/workday';

const NOT_IMPLEMENTED = /not implemented in MVP/;

describe('workdayAdapter', () => {
  it('throws on validateSlug', async () => {
    await expect(workdayAdapter.validateSlug('tenant.region.site')).rejects.toThrow(NOT_IMPLEMENTED);
  });

  it('throws on fetchPostings', async () => {
    await expect(workdayAdapter.fetchPostings('tenant.region.site')).rejects.toThrow(NOT_IMPLEMENTED);
  });

  it('throws on normalize', () => {
    expect(() => workdayAdapter.normalize({} as never)).toThrow(NOT_IMPLEMENTED);
  });
});
