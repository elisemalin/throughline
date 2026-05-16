// ATS adapter registry — Day-2 placeholder owned jointly with External Adapter.
//
// WHY: Backend Core handlers depend on a single import surface
// (`@/lib/ats/registry`) that returns an adapter for a given provider, plus a
// `triggerPoll` entry point the discovery/poll route fans out to. External
// Adapter's Day-3 PR replaces this file with the real registry that
// instantiates per-provider adapters and dispatches the Inngest poll event.

import type { AtsAdapter } from '@/contracts/ats';
import type { AtsProvider } from '@/contracts/models';
import { ATS_PROVIDERS } from '@/contracts/models';
import { makeMockAdapter } from './__mock__/adapter';

const adapters: Record<AtsProvider, AtsAdapter> = Object.fromEntries(
  ATS_PROVIDERS.map((p) => [p, makeMockAdapter(p)]),
) as Record<AtsProvider, AtsAdapter>;

export function getAdapter(provider: AtsProvider): AtsAdapter {
  return adapters[provider];
}

// triggerPoll is the Backend-Core-facing entry into the polling subsystem.
// The Day-2 mock returns the contract-shape DiscoveryPollResponse synchronously
// without dispatching to a job runner. External Adapter's real implementation
// will call `inngest.send` with an `ats/poll.requested` event scoped to the
// owner, and the Inngest function under /jobs/ runs the actual provider polls.
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
