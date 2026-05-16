// ATS adapter registry.
//
// Backend Core imports `ATS_ADAPTERS` to dispatch from a WatchlistCompany row
// to the matching adapter. The map is exhaustive over AtsProvider so adding a
// provider in /contracts/models.ts forces a compile error here.
//
// Day-3 cleanup: the Day-2 `getAdapter(provider)` accessor and `triggerPoll`
// stub are removed. Handlers index `ATS_ADAPTERS[p]` directly.
// `/api/discovery/poll` no longer fires synchronous events — it returns a
// freshness snapshot from `WatchlistCompany.lastPolled` and `DiscoveredPosting.
// count`. The daily Inngest cron in `/jobs/poll.ts` is the only producer
// today; External Adapter's `atsPollRequestedFunction` (the on-demand event
// consumer) exists for future use but has no caller in this PR.

import type { AtsAdapter } from '@/contracts/ats';
import type { AtsProvider } from '@/contracts/models';
import { greenhouseAdapter } from './greenhouse';
import { leverAdapter } from './lever';
import { ashbyAdapter } from './ashby';
import { workdayAdapter } from './workday';

export const ATS_ADAPTERS: Record<AtsProvider, AtsAdapter> = {
  greenhouse: greenhouseAdapter as AtsAdapter,
  lever: leverAdapter as AtsAdapter,
  ashby: ashbyAdapter as AtsAdapter,
  workday: workdayAdapter as AtsAdapter,
};
