---
status: [PENDING REVIEW]
filed-by: agent/external-adapter
date: 2026-05-16
---

# Contracts proposal: `ats/poll.requested` Inngest event type

## Motivation

Day 3 ships `atsPollRequestedFunction` in `jobs/poll.ts` so Backend Core's
POST `/api/discovery/poll` can dispatch an on-demand sweep via
`inngest.send({ name: 'ats/poll.requested', data: { ownerId } })` instead of
calling the Day-2 `triggerPoll` stub in `lib/ats/registry.ts`.

The event name and payload shape currently live as a local `const` in
`jobs/poll.ts`. Backend Core's route would then import that const from
`@/jobs/poll`, but cross-stream imports from `/jobs/*` into `/app/api/*`
muddy the role boundary (External Adapter owns `/jobs/**`; Backend Core
should not need to import from there).

The clean shape is for the event name and payload schema to live in
`/contracts/ats.ts` alongside `ATS_ENDPOINTS` and the adapter interface, so
both producers (Backend Core) and consumers (External Adapter) import from
the same authoritative file.

## Proposed change to `/contracts/ats.ts`

Append:

```ts
import { z } from 'zod';

export const ATS_POLL_REQUESTED_EVENT = 'ats/poll.requested' as const;
export type AtsPollRequestedEvent = typeof ATS_POLL_REQUESTED_EVENT;

export const AtsPollRequestedDataSchema = z
  .object({
    ownerId: z.string().min(1).max(200),
  })
  .strict();
export type AtsPollRequestedData = z.infer<typeof AtsPollRequestedDataSchema>;
```

Backend Core then uses:

```ts
import { ATS_POLL_REQUESTED_EVENT } from '@/contracts/ats';
await inngest.send({ name: ATS_POLL_REQUESTED_EVENT, data: { ownerId } });
```

External Adapter validates the payload at function entry:

```ts
import { ATS_POLL_REQUESTED_EVENT, AtsPollRequestedDataSchema } from '@/contracts/ats';
// ...
const { ownerId } = AtsPollRequestedDataSchema.parse(event.data);
```

## What I did in the meantime

Shipped the constants in `jobs/poll.ts` so the on-demand handler works
end-to-end. Once this proposal lands as `[DECIDED: accept]`, External Adapter
deletes the local consts and re-imports from `/contracts/ats.ts`. No
production behavior changes.

## Cost of doing nothing

Backend Core would need to import from `@/jobs/poll` to fire the event,
breaking the rule that handler code only imports from `/lib` and `/contracts`.
The alternative — stringly-typing the event name in two places — risks drift
the moment one side is renamed.

## Cost of accepting

One additional named export and one Zod schema in `/contracts/ats.ts`.
