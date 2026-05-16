// ATS adapter registry.
//
// Backend Core imports `ATS_ADAPTERS` to dispatch from a WatchlistCompany row
// to the matching adapter. The map is exhaustive over AtsProvider so adding a
// provider in /contracts/models.ts forces a compile error here.
//
// Backend Core Day-2 compatibility shim (bottom of file): `getAdapter` and
// `triggerPoll` are aliases the Day-2 handlers expected before External
// Adapter shipped its real registry. Day-3 work updates the routes to use
// `ATS_ADAPTERS` and `inngest.send` directly, and these shims disappear.

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

// ---------------------------------------------------------------------------
// Backend Core Day-2 compatibility shim.
// `getAdapter(provider)` was Backend Core's expected accessor before
// External Adapter shipped `ATS_ADAPTERS`. The handler in /api/watchlist uses
// it to validate the slug at add-time. Day-3 replaces with the map directly.
// ---------------------------------------------------------------------------

export function getAdapter(provider: AtsProvider): AtsAdapter {
  return ATS_ADAPTERS[provider];
}

// triggerPoll was the Backend-Core-facing Day-2 stub. Real polling runs on
// the daily Inngest schedule from /jobs/poll.ts. Manual /api/discovery/poll
// has nothing to dispatch synchronously today; the stub returns a zero-
// postings response so the route shape is exercised end-to-end. Day-3 work
// either deletes this or wires inngest.send for an on-demand poll.
export async function triggerPoll(_ownerId: string): Promise<{
  newPostings: number;
  totalPostings: number;
  polledAt: string;
}> {
  void _ownerId;
  return {
    newPostings: 0,
    totalPostings: 0,
    polledAt: new Date().toISOString(),
  };
}
