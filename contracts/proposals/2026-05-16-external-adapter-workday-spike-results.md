---
status: [PENDING REVIEW]
filed-by: agent/external-adapter
date: 2026-05-16
supersedes: 2026-05-16-external-adapter-workday-deferred.md
---

# Workday spike results: the API works; ship requires contract changes

## TL;DR

The Day-3 deferral was filed before exhaustive probing. The Day-4 spike
found the public Workday API works against at least six real tenants with
a trivial POST body. Real-adapter delivery is blocked by three contract
changes that only the Architect can land. This proposal documents what the
spike found and asks for those changes.

## Spike findings (2026-05-16)

Captured 6/40 working `myworkdayjobs.com` tenants by varying the region
prefix (`wd1`/`wd2`/`wd5`/`wd12`) and POSTing
`{"appliedFacets":{},"limit":20,"offset":0,"searchText":""}`:

| Tenant      | Region | Site                    | Total postings |
| ----------- | ------ | ----------------------- | -------------- |
| salesforce  | wd12   | External_Career_Site    | 1,389          |
| adobe       | wd5    | external_experienced    | 1,177          |
| citi        | wd5    | 2                       | 2,000          |
| amgen       | wd1    | Careers                 | 1,453          |
| intel       | wd1    | External                | 790            |
| stryker     | wd1    | StrykerCareers          | 1,330          |

Two full fixtures captured (Salesforce, Adobe) under
`tests/fixtures/ats/workday/` for the adapter implementation.

### Wire shape

List response:

```jsonc
{
  "total": 1389,
  "jobPostings": [
    {
      "title": "MTS/SMTS/LMTS - Software Engineer",
      "externalPath": "/job/India---Hyderabad/SMTS--..._JR312327",
      "locationsText": "India - Hyderabad",
      "postedOn": "Posted Today",          // relative string, not ISO
      "bulletFields": ["JR312327"]          // requisition ID
    }
  ],
  "facets": [...],
  "userAuthenticated": false
}
```

Detail response (separate call to
`{baseUrl}/wday/cxs/{tenant}/{site}/job{externalPath}`):

```jsonc
{
  "jobPostingInfo": {
    "id": "268d14a0d86f1000de3f3fef68790000",
    "title": "...",
    "jobDescription": "<p>...</p>",          // HTML, includes &#x27; entities
    "location": "...",
    "postedOn": "Posted Today",
    // ... rest
  }
}
```

## Why this is blocked on the contract

Three issues, each in a file External Adapter cannot touch:

### 1. `ATS_ENDPOINTS.workday` (in `/contracts/ats.ts`)

Currently throws. Proposed:

```ts
workday: (slug: string) => {
  // slug is `<tenant>__<region>__<site>` per the proposed
  // workdaySlugSchema below. encodeURIComponent each segment as
  // defense-in-depth.
  const parts = slug.split('__');
  if (parts.length !== 3) {
    throw new Error('workday slug must be tenant__region__site');
  }
  const [tenant, region, site] = parts.map(encodeURIComponent);
  return `https://${tenant}.${region}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
},
```

### 2. New schema in `/contracts/models.ts`

`atsSlugSchema` rejects `__` because it allows only `[a-zA-Z0-9_-]{1,100}`
and the schema doesn't currently allow double-underscore separators.
Proposed:

```ts
// workdaySlugSchema accepts <tenant>__<region>__<site> where each segment
// matches atsSlugSchema's character class. Used only by AtsProvider=workday.
export const workdaySlugSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9_-]{1,40}__[a-zA-Z0-9_-]{1,10}__[a-zA-Z0-9_-]{1,80}$/,
    'workday slug must be tenant__region__site',
  );
```

Backend Core's `POST /api/watchlist` discriminates on `atsProvider` and
applies `workdaySlugSchema` for the `workday` case, `atsSlugSchema` for the
others.

### 3. `postedAt` shape

`NormalizedPostingSchema.postedAt` requires `^\d{4}-\d{2}-\d{2}(T.*)?$`.
Workday's list response returns relative strings like "Posted Today" /
"Posted 5 Days Ago" / "Posted 30+ Days Ago". The detail call also returns
the same relative string. Adapter cannot fill `postedAt` accurately from
the list call alone.

Two options:

**(a) Loose date parsing in the adapter**. Map "Posted Today" → today,
"Posted N Days Ago" → today - N. Edge case "30+" → today - 30 with a
warning in the description. Cheap but imprecise.

**(b) Two-call shape**. Adapter does 1 + N HTTP calls per board: 1 list,
N detail to get the canonical postedAt + jobDescription. 20 postings per
board * 100 boards = 2000 calls per daily sweep, all rate-limited by the
2-second per-provider gap = ~67 minutes for the Workday slice alone.
Architect call.

I recommend (a) with `jobDescription: ''` and a `tags: ['workday-list-only']`
marker; users get the listing in the discovery feed today and Backend Core's
alignment score is skipped for `tags.includes('workday-list-only')` rows
until we have appetite for the 2-call cost.

## Carry-over

- Captured fixtures live at `tests/fixtures/ats/workday/{salesforce,adobe}.json`
  so the adapter is testable on accept.
- The Day-3 `workday-deferred.md` proposal is superseded by this one. On
  decision, mark that one `[SUPERSEDED]` and this one accept/reject.

## Decision

Architect to either:
- Accept the contract changes above and assign Day-5 to External Adapter
  for the real Workday adapter implementation.
- Reject and re-confirm `workday-deferred.md`. External Adapter removes
  the captured fixtures in a follow-up.
