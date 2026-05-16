// ATS adapter registry.
//
// Backend Core imports `ATS_ADAPTERS` to dispatch from a WatchlistCompany row
// to the matching adapter. The map is exhaustive over AtsProvider so adding a
// provider in /contracts/models.ts forces a compile error here.

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
