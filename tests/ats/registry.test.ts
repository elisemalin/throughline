// Registry exhaustiveness: every AtsProvider must resolve to an adapter and
// each adapter's `provider` field must round-trip.

import { describe, expect, it } from 'vitest';
import { ATS_PROVIDERS } from '@/contracts/models';
import { ATS_ADAPTERS } from '@/lib/ats/registry';

describe('ATS_ADAPTERS', () => {
  it('contains an entry for every AtsProvider', () => {
    for (const provider of ATS_PROVIDERS) {
      expect(ATS_ADAPTERS[provider]).toBeDefined();
      expect(ATS_ADAPTERS[provider].provider).toBe(provider);
    }
  });
});
