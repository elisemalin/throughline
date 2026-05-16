// Workday adapter — v1.1 stub.
//
// Workday postings live behind tenant-specific `myworkdayjobs.com` endpoints
// that require a POST with a session-scoped facet payload. Building this is a
// v1.1 task (see ARCHITECTURE.md). Until then every method throws the same
// canonical error so a misconfigured WatchlistCompany row surfaces clearly.

import type { AtsAdapter } from '@/contracts/ats';

const NOT_IMPLEMENTED = 'Workday adapter not implemented in MVP';

export const workdayAdapter: AtsAdapter<never> = {
  provider: 'workday',

  async validateSlug() {
    throw new Error(NOT_IMPLEMENTED);
  },

  async fetchPostings() {
    throw new Error(NOT_IMPLEMENTED);
  },

  normalize() {
    throw new Error(NOT_IMPLEMENTED);
  },
};
