---
status: [PENDING REVIEW]
filed-by: agent/external-adapter
date: 2026-05-16
---

# Contracts proposal: `tags?: string[]` on NormalizedPosting + DiscoveredPosting

## Motivation

All three real ATS providers carry classifier metadata that does not fit the
current `NormalizedPosting` shape and is currently dropped on normalize:

- **Lever** — `categories.team`, `categories.department`, `categories.commitment`
  (e.g., "Platform", "Engineering", "Full-time"). `lists[]` and `tags[]` exist
  too on richer boards.
- **Ashby** — `department`, `team`, `employmentType` (e.g., "Product",
  "Engineering", "FullTime").
- **Greenhouse** — `departments[]` and `offices[]` arrays per posting.

Frontend's discovery feed currently shows location and remote-ness; users
have asked for the ability to filter by team / department / employment type.
Backend Core's alignment scoring would also benefit from these signals
(`SkillsDB.targetRoles` overlap, "Full-time" vs "Contract" filter).

The minimal contract change that unblocks all three: a string-array `tags`
field carried through the adapter -> poller -> DB -> API pipeline.

## Proposed change to `/contracts/models.ts`

Add to `DiscoveredPostingSchema`:

```ts
tags: z.array(z.string().max(80)).max(20).default([]),
```

And to `NormalizedPostingSchema` in `/contracts/ats.ts` (mirror the
DiscoveredPosting Omit pattern; tags is filled by the adapter):

```ts
tags: z.array(z.string().max(80)).max(20).default([]),
```

Why `max(20)` and `max(80)`: matches the existing array-bound discipline in
the contract (e.g., `keywords` on SkillsDB is `.max(50)` / 100 chars; tags
are coarser-grained so 20 is enough).

## Proposed change to `/prisma/schema.prisma`

Add to `DiscoveredPosting`:

```prisma
tags  String[] @default([])
```

Postgres `text[]` columns are first-class — no JSON column needed — and we
can index them later with a GIN index for the filter query.

## Per-provider mapping

- **Lever** — concatenate the non-empty values from
  `categories.team`, `categories.department`, `categories.commitment`, plus
  any `lists[]` entries with a `.text` field.
- **Ashby** — push `department`, `team`, `employmentType` (in that order).
- **Greenhouse** — push every `departments[i].name` and `offices[i].name`.

Dedup + trim + cap at 20 per posting. No casing normalization (Lever returns
"Platform" while Ashby returns "FullTime" — preserve provider spelling).

## What I did in the meantime

Nothing — the adapters still drop these fields. On accept of this proposal,
External Adapter ships:

1. `lib/ats/*.ts` normalize() implementations populating `tags`.
2. Fixture-backed tests asserting per-provider tag extraction.
3. Poller stamps `tags` on the `DiscoveredPosting` insert.

Backend Core would then surface `tags` in `/api/discovery` responses (their
projector already iterates DiscoveredPosting fields).

## Cost of doing nothing

Discovery filters stay limited to remote/location. Alignment can't read
employment type. Operator queries like "show me all the 'Engineering' team
postings we've discovered" require a SQL `LIKE %Engineering%` on
`jobDescription` (slow + low precision).

## Cost of accepting

One `text[]` column on `DiscoveredPosting`. Per-adapter normalize gains ~15
lines each. No new dependency. Frontend Day-4/5 work can render `tags` as
chips at its discretion; the field is optional with a safe default.
