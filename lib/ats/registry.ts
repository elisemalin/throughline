// ATS adapter registry.
//
// Backend Core imports `ATS_ADAPTERS` to dispatch from a WatchlistCompany row
// to the matching adapter. The map is exhaustive over AtsProvider so adding a
// provider in /contracts/models.ts forces a compile error here.
//
// `getAdapter` and `triggerPoll` are the surfaces Backend Core's Day-2
// handlers import (`/api/watchlist`, `/api/discovery/poll`). Day-3 keeps the
// names stable but flips `triggerPoll` from a no-op stub into a real
// `inngest.send` of `ats/poll.requested`, dispatched to
// `atsPollRequestedFunction` in /jobs/poll.ts. The response shape is
// preserved; `newPostings` reads 0 synchronously because the sweep is
// asynchronous — Backend Core's route already counts the live total from DB.

import type { AtsAdapter } from '@/contracts/ats';
import type { AtsProvider } from '@/contracts/models';
import { greenhouseAdapter } from './greenhouse';
import { leverAdapter } from './lever';
import { ashbyAdapter } from './ashby';
import { workdayAdapter } from './workday';
import { inngest } from '@/jobs/inngest';
import { ATS_POLL_REQUESTED_EVENT } from '@/jobs/poll';

export const ATS_ADAPTERS: Record<AtsProvider, AtsAdapter> = {
  greenhouse: greenhouseAdapter as AtsAdapter,
  lever: leverAdapter as AtsAdapter,
  ashby: ashbyAdapter as AtsAdapter,
  workday: workdayAdapter as AtsAdapter,
};

export function getAdapter(provider: AtsProvider): AtsAdapter {
  return ATS_ADAPTERS[provider];
}

export async function triggerPoll(ownerId: string): Promise<{
  newPostings: number;
  totalPostings: number;
  polledAt: string;
}> {
  await inngest.send({
    name: ATS_POLL_REQUESTED_EVENT,
    data: { ownerId },
  });
  return {
    newPostings: 0,
    totalPostings: 0,
    polledAt: new Date().toISOString(),
  };
}
