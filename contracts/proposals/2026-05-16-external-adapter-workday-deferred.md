---
status: [PENDING REVIEW]
filed-by: agent/external-adapter
date: 2026-05-16
---

# Defer Workday adapter implementation to v1.1

## Decision requested

Confirm the Day-2 plan: the Workday adapter stays as the throwing stub
shipped in `lib/ats/workday.ts`. No real implementation lands in the MVP.

## What I probed during the Day-3 spike

- The documented public endpoint shape per `/contracts/ats.ts` is
  `https://{tenant}.{region}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs`
  with a `POST` body.
- `wd5.myworkdayjobs.com` (Wells Fargo's region) failed DNS resolution from
  the test environment, so the regional subdomain is not a stable contract.
- ServiceNow's `servicenow.wd1.myworkdayjobs.com/wday/cxs/servicenow/External_Career_Site/jobs`
  responded but with `HTTP 422` against a naive
  `{"appliedFacets":{},"limit":20,"offset":0,"searchText":""}` body. Real
  callers need (a) the per-tenant facet schema discovered via a separate
  metadata call, (b) a `_workday_session_cookie` initialized by hitting the
  HTML page first, and (c) anti-forgery token plumbing.

## Why this is v1.1, not Day 3

- Each tenant's site path (`External`, `External_Career_Site`, `careers`,
  etc.) is custom and not derivable from the slug pattern in
  `atsSlugSchema`. The proposal would need to extend that schema to carry
  tenant + region + site, which is a contract change of its own.
- The session/CSRF dance touches `/lib/security/**` (cookie storage) and
  changes the per-provider rate-limit envelope, which warrants Security
  Agent review and likely a separate dedicated request-pool.
- Workday boards are heavily used by enterprise companies but are not a
  blocker for the discovery feed's MVP — Greenhouse / Lever / Ashby cover
  the venture-backed bulk of Throughline's target users.

## What stays in place

- `lib/ats/workday.ts` continues to throw `"Workday adapter not implemented
  in MVP"` from every method.
- `tests/ats/workday.test.ts` continues to assert the throw on every method.
- `WatchlistCompany.atsProvider = 'workday'` rows produce a structured
  per-row error in the poller's summary; the rest of the sweep continues.
- ARCHITECTURE.md "Day 1.1 work" section (to be added when v1.1 planning
  begins) inherits this proposal as the entry point.

## Decision

Architect to mark `[DECIDED: accept]` or `[DECIDED: reject]` with rationale.
