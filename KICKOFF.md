# External Adapter Agent — Day 2 kickoff

You are the External Adapter Agent for Throughline. You are running in your own Claude Code session in `~/projects/throughline-external-adapter/` on branch `agent/external-adapter/d2`. The Architect runs separately and reviews/merges your PRs.

## Required reading (in order)

1. `CLAUDE.md` in this worktree — your role spec.
2. `.claude-roles/FLOOR.md` — non-negotiables. NO AI co-authorship in commits. Ever.
3. `~/Documents/General Vault/Pastel Dawn Core/Core Documents/Developer Guide.md` — studio non-negotiables.
4. `contracts/ats.ts` — `AtsAdapter<TRaw>` interface, `ATS_ENDPOINTS` (canonical URLs), `NormalizedPostingSchema`, `ATS_REQUEST_DELAY_MS`, `atsSlugSchema`. The endpoint constructors `encodeURIComponent` slugs as defense-in-depth; the upstream `atsSlugSchema` restricts to `[a-zA-Z0-9_-]{1,100}` so URL injection is doubly blocked.
5. `contracts/models.ts` — `DiscoveredPosting` (the row your poller produces) and `WatchlistCompany` (drives the poll).
6. `prototype/Throughline.jsx` lines 480-650 — seed `discoverySeed` shows the normalized shape consumers expect; mirror its fields.

## Day 2 scope

Ship a meaningful first PR. Aim:

- **`lib/ats/greenhouse.ts`** — implements `AtsAdapter<GreenhouseRawJob>`. `fetchPostings(slug)` GETs `ATS_ENDPOINTS.greenhouse(slug)`, handles pagination if the API returns it, returns the raw list. `normalize(raw)` produces a `NormalizedPosting & { externalId }` validated by `NormalizedPostingSchema`. `validateSlug(slug)` does a HEAD or low-volume GET against the board to confirm it resolves and returns at least one posting.

- **`lib/ats/lever.ts`** — same shape against `ATS_ENDPOINTS.lever(slug)`.

- **`lib/ats/ashby.ts`** — same shape against `ATS_ENDPOINTS.ashby(slug)`.

- **`lib/ats/workday.ts`** — stub that throws `"Workday adapter not implemented in MVP"` from every method. Documented in `ARCHITECTURE.md` as v1.1.

- **`lib/ats/registry.ts`** — exports `ATS_ADAPTERS: Record<AtsProvider, AtsAdapter>`. Backend Core imports from here.

- **`jobs/poll.ts`** — Inngest function. On schedule (daily 06:00 UTC), iterates `WatchlistCompany` rows where `active = true`, fetches via the registry, dedups by `(provider, externalId)`, writes new `DiscoveredPosting` rows via Prisma. Inserts a 2-second delay between calls to the same provider (use `ATS_REQUEST_DELAY_MS` from contracts). Does NOT call AI workflows; scoring happens in Backend Core post-write.

- **`jobs/inngest.ts`** — Inngest client config (event key + signing key from env).

- **Fixtures** under `tests/fixtures/ats/<provider>/`:
  - Capture real public board responses for known boards (Greenhouse: retool, linear, anthropic. Lever: airtable. Ashby: vercel, figma). Save as `<provider>-<slug>.json`. Note in a `README` per provider when you captured it (date).
  - These fixtures back unit tests.

- **Unit tests under `tests/ats/`** — for each provider:
  - `normalize()` against the captured fixture produces a row that passes `NormalizedPostingSchema.parse()`
  - `validateSlug()` returns `{valid: true}` for known boards (mocked HTTP)
  - `validateSlug()` returns `{valid: false, error: ...}` for malformed/404 responses
  - Pagination is exhausted (greenhouse only — others typically return full list)

- **Integration test under `tests/ats/integration/`** — gated on `ATS_INTEGRATION=1`. Hits real Greenhouse against three known slugs (retool/linear/anthropic), runs the full poller against a Postgres test DB, asserts dedup. Not required in CI; runs on demand via `pnpm test:ats:integration`.

## Strict path rules

You own: `/lib/ats/**`, `/jobs/**`, `/tests/fixtures/ats/**`, `/tests/ats/**`.

You must NOT touch: `/contracts/**`, `/app/api/**`, `/lib/ai/**`, `/lib/security/**`, `/lib/mock-api.ts`, `/app/(app)/**`, `/middleware*.ts`, `/prisma/**`.

If Backend Core has shipped a Day-2 placeholder at `/lib/ats/registry.ts` or `/lib/ats/__mock__/*`, OVERWRITE those with your real adapters. Note in your PR description.

## Provider invariants (Security Agent will audit)

- Only the documented public endpoints from `ATS_ENDPOINTS`. No scraping. No private/internal-API endpoints even if you discover them.
- 2-second delay between calls to the same provider.
- No retry storms — failures are surfaced to the poller, which logs and continues; the next daily run picks up.
- Job descriptions returned by providers are UNTRUSTED. They will flow into AI prompts via Backend Core's alignment route, where AI Integration wraps them with `wrapUntrusted` from `/contracts/ai.ts`. You do not need to wrap them at the adapter level — your job is faithful normalization. Just preserve the text.

## Definition of done

```bash
pnpm test:ats         # unit tests with fixtures pass
pnpm typecheck        # zero errors
pnpm lint             # zero errors
bash scripts/integrity.sh    # exits 0
```

`pnpm test:ats:integration` is not required for this PR.

## Workflow

1. Commits per logical surface: one per provider adapter, one for the poller, one for fixtures + tests, one for registry/Inngest config.
2. Each commit message: short summary. **NO AI co-authorship in any form. Ever.**
3. `git push -u origin agent/external-adapter/d2`
4. `gh pr create --base main --head agent/external-adapter/d2 --title "Day 2: External Adapter (ATS)" --body "..."`.
5. Report back.

## How to report

```
PR: <url>
Branch: agent/external-adapter/d2
Commits: <n>
Adapters shipped: greenhouse/lever/ashby (✓/✗) + workday stub
Fixtures captured: <provider/slug pairs>
Tests passing: <count>
Integrity: <pass|fail>
Backend Core placeholders superseded: <yes|no — list files>
Known debt: <list>
```

Begin.
