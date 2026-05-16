#!/usr/bin/env tsx
//
// Admin CLI: fire an ats/poll.requested event for a single user.
//
// WHY: Backend Core's Day-3 POST /api/discovery/poll returns a freshness
// snapshot only — it no longer triggers a real sweep. The on-demand Inngest
// function `atsPollRequestedFunction` exists for ops and backfills; this
// script is its sole producer until a future Backend Core route wires
// inngest.send for a per-user trigger.
//
// Usage:
//   pnpm tsx scripts/admin/poll-now.ts <ownerId>
//
// Requires INNGEST_EVENT_KEY in env (dev: pulls from .env; prod: Vercel).
// Output is line-oriented JSON so it can be piped into jq / logs.

import { inngest } from '@/jobs/inngest';
import {
  ATS_POLL_REQUESTED_EVENT,
  AtsPollRequestedDataSchema,
} from '@/contracts/ats';

function fail(message: string): never {
  process.stderr.write(`admin-poll: ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const ownerId = process.argv[2];
  if (!ownerId) fail('usage: tsx scripts/admin/poll-now.ts <ownerId>');

  const parsed = AtsPollRequestedDataSchema.safeParse({ ownerId });
  if (!parsed.success) {
    fail(`invalid ownerId: ${parsed.error.issues[0]?.message ?? 'rejected'}`);
  }

  if (!process.env.INNGEST_EVENT_KEY) {
    fail('INNGEST_EVENT_KEY not set; refusing to send (would no-op).');
  }

  const result = await inngest.send({
    name: ATS_POLL_REQUESTED_EVENT,
    data: parsed.data,
  });

  process.stdout.write(
    `${JSON.stringify({
      event: ATS_POLL_REQUESTED_EVENT,
      ownerId: parsed.data.ownerId,
      ids: result.ids,
    })}\n`,
  );
}

main().catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
});
