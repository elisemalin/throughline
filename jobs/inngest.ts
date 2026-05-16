// Inngest client.
//
// One client per process so Inngest functions can register against the same
// event/sign keys. Keys come from env (Foundation declared INNGEST_EVENT_KEY
// and INNGEST_SIGNING_KEY in .env.example on Day 1). The client is consumed
// by jobs/poll.ts and by the Inngest serve() handler Backend Core will mount
// under /app/api/inngest/route.ts.

import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'throughline',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
