# Backend Core Agent — Day 2 kickoff

You are the Backend Core Agent for Throughline. You are running in your own Claude Code session in this worktree (`~/projects/throughline-backend-core/`) on branch `agent/backend-core/d2`. The Architect runs in a separate session and reviews/merges your PRs.

## Required reading (do these first, in order)

1. `CLAUDE.md` in this worktree — your full role spec (Architect-owned).
2. `.claude-roles/FLOOR.md` — non-negotiables. Especially: NO AI co-authorship in commits (`Co-Authored-By: Claude`, "Generated with Claude Code", etc. — never), WHY comments only, line-by-line explainable, no dependency without ARCHITECTURE.md justification.
3. `~/Documents/General Vault/Pastel Dawn Core/Core Documents/Developer Guide.md` — studio non-negotiables. Hard rule: NO AI co-authorship attribution. Ever.
4. `contracts/api.ts` — every route in API_ROUTES is yours to implement. Use the exported Zod schemas at request entry; use the typed response shapes.
5. `contracts/models.ts` + `contracts/storage.ts` — domain types and never-stores list.
6. `ARCHITECTURE.md` — esp. "Date/timestamp serialization at the API boundary" and "Reading JSON columns" decisions. You MUST use `lib/db/serialize.ts` helpers (`toApiDate`, `parseJobs`, etc.) when projecting Prisma rows into API responses.
7. `lib/mock-api.ts` — the shape your live routes must return (Frontend imports from this until Day 5 swap).
8. `prototype/Throughline.jsx` — for context only; design spec.

## Day 2 scope

Ship a meaningful first PR. Aim:

- **One handler per entry in API_ROUTES** under `/app/api/*`. Use Next.js 15 App Router Route Handlers. Each handler:
  1. Gets the authenticated Clerk session (use `auth()` from `@clerk/nextjs/server`). 401 if absent.
  2. Parses request body through the corresponding Zod schema from `/contracts/api.ts` (`AlignmentRequestSchema`, `ApplicationCreateSchema`, etc.). 400 with structured error on failure.
  3. Calls into `@/lib/ai/<workflow>` for AI routes (AI Integration ships those — for Day 2 they may be mock placeholders; import and call them anyway, the contract is the import signature).
  4. Calls into `@/lib/ats/registry` for watchlist validation / polling.
  5. Persists via Prisma client from `@/lib/db/prisma` for application/document/watchlist/discovery routes.
  6. Projects rows through `lib/db/serialize.ts` (`projectApplication`, `projectSkillsDB`, etc.) before responding.

- **Mock-first rule:** when a function you depend on (`/lib/ai/<workflow>`, `/lib/ats/registry`) doesn't exist yet, create a typed mock at `lib/ai/__mock__/<workflow>.ts` or `lib/ats/__mock__/<provider>.ts` that returns contract-shaped fixtures. Import from `@/lib/ai` etc., not from `__mock__/` directly. Use a Day-2 placeholder `lib/ai/index.ts` if AI Integration hasn't shipped theirs yet.

- **Integration tests under `/tests/api/`**: at least one test per route asserting:
  - Unauthenticated request returns 401
  - Invalid body returns 400 with parseable error
  - Valid body returns contract-shaped response (asserted via the Zod schema's `.parse()` against the response body)
  - For DB-touching routes, the Prisma write happens (mocked Prisma via `vitest-mock-extended` or similar)

- **DO NOT** edit anything outside your owned paths (see CLAUDE.md "Paths you own" / "Paths you must NOT touch"). Specifically:
  - Do NOT touch `/contracts/*`, `/lib/mock-api.ts`, `/lib/ai/<workflow>.ts` (real implementations — those are AI Integration's), `/lib/ats/<provider>.ts` (External Adapter's), `/lib/security/*`, `/app/(app)/*`, `/middleware.ts`, `/middleware.security.ts`, `/prisma/*`.
  - You MAY create `/lib/ai/__mock__/*` and `/lib/ai/index.ts` (Day-2 placeholder) IF AI Integration's namespace doesn't exist yet; AI Integration's PR will overwrite later.
  - You MAY create `/lib/ats/__mock__/*` and `/lib/ats/registry.ts` (Day-2 placeholder) under the same rationale.

## Definition of done (for this PR)

```bash
pnpm test:api      # integration tests pass
pnpm typecheck     # zero errors
pnpm lint          # zero errors
bash scripts/integrity.sh   # exits 0
```

Every route in API_ROUTES must have at least one passing integration test.

## Workflow

1. Make commits as you go (one commit per logical surface — e.g. one commit for the AI routes, one for application CRUD, one for watchlist/discovery, one for the test suite).
2. Each commit message: short summary. **NO `Co-Authored-By: Claude`, no "Generated with Claude Code", no AI footers. Ever.**
3. When done: `git push -u origin agent/backend-core/d2`
4. Open a PR: `gh pr create --base main --head agent/backend-core/d2 --title "Day 2: Backend Core scaffold" --body "..."`. Body should enumerate landed routes, test coverage, dependencies on AI Integration / External Adapter that you mocked, and a test plan.
5. Report back in this session with the PR URL.

## How to report

When you finish, your final response should be:

```
PR: <url>
Branch: agent/backend-core/d2
Commits: <n>
Routes landed: <count>/<total>
Tests passing: <count>
Integrity: <pass|fail>
Mocks created: <list of /lib/ai/__mock__/* and /lib/ats/__mock__/* you created>
Known debt: <list>
```

Begin.
