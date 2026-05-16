# Changelog

Every agent appends one entry per end-of-day commit per FLOOR.md cadence.

## [agent/external-adapter/d2] — 2026-05-16

### Added
- `lib/ats/greenhouse.ts` — `AtsAdapter<GreenhouseRawJob>` against the public Job Board API. Decodes HTML-entity-encoded `content`, strips tags, detects remote from location/offices. Single-fetch (the public API does not paginate).
- `lib/ats/lever.ts` — `AtsAdapter<LeverRawJob>` against `api.lever.co/v0/postings/{slug}?mode=json`. Converts epoch-ms `createdAt` to ISO; recovers company from the `hostedUrl` slug.
- `lib/ats/ashby.ts` — `AtsAdapter<AshbyRawJob>` against `api.ashbyhq.com/posting-api/job-board/{slug}`. Honors `isRemote`/`workplaceType`; recovers company from `jobUrl` slug.
- `lib/ats/workday.ts` — v1.1 stub; every method throws `"Workday adapter not implemented in MVP"`.
- `lib/ats/registry.ts` — `ATS_ADAPTERS: Record<AtsProvider, AtsAdapter>` for Backend Core import.
- `jobs/inngest.ts` — Inngest client (event key from env).
- `jobs/poll.ts` — `ats-poll-daily` scheduled function (cron `0 6 * * *`). Groups WatchlistCompany rows by provider, processes each group serially with `ATS_REQUEST_DELAY_MS` gap, inserts new `DiscoveredPosting` rows via Prisma, dedups on `(watchlistCompanyId, externalId)` (P2002 swallowed), updates `lastPolled`. Honors `ATS_POLLER=disabled` kill-switch. Does not call AI workflows.
- `tests/fixtures/ats/{greenhouse,lever,ashby}/` — captured real responses on 2026-05-16 with per-provider README documenting slugs and capture dates.
- `tests/ats/{greenhouse,lever,ashby,workday,registry}.test.ts` — 32 unit tests covering normalize-against-fixture schema validation, fetchPostings shape, validateSlug success / malformed-slug / 404 / empty-board paths, and registry exhaustiveness over `AtsProvider`.
- `tests/ats/integration/poll.integration.test.ts` — gated on `ATS_INTEGRATION=1`; runs the Greenhouse adapter end-to-end against three real boards with `ATS_REQUEST_DELAY_MS` rate limiting and asserts dedup stability.
- `vitest.config.ts` — minimal Vitest config with the `@/*` alias mirrored from `tsconfig.json`.
- `package.json` scripts `test:ats` and `test:ats:integration`.

### Changed
- `package.json` — added `inngest@3.27.4` (runtime) and `vitest@2.1.9` (dev). Rationales appended to ARCHITECTURE.md Dependencies table.

### Contract notes
- No proposals filed. `/contracts/*.ts` untouched.

### Slug substitutions vs kickoff
- Greenhouse: kickoff specified `retool`, `linear`, `anthropic`. As of capture date `retool` and `linear` 404; substituted `stripe` and `airbnb`. Anthropic retained.
- Lever: kickoff specified `airtable`. As of capture date `airtable` 404s; substituted `mistral` and `spotify`.
- Ashby: kickoff specified `vercel`, `figma`. Both return empty/missing as of capture date; substituted `linear` and `notion`.

### Carried over
- Integration test does not yet hit a Postgres test DB (the full poller path lands when Backend Core wires the test DB on Day 3).
- Backend Core has not shipped Day-2 placeholders to overwrite.

## [agent/foundation/d1] — 2026-05-16

### Added
- Next.js 15 App Router scaffold (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`) with stone-950 / amber-200 palette and self-hosted Instrument Serif / JetBrains Mono / DM Sans via `next/font/google`.
- Clerk auth surface: `middleware.ts`, `app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `app/(auth)/sign-up/[[...sign-up]]/page.tsx`. Root `app/page.tsx` redirects signed-in users to `/dashboard` and anonymous users to `/sign-in`.
- Prisma schema at `prisma/schema.prisma` mirroring `/contracts/models.ts` (User, SkillsDB, Application, ApplicationEvent, Document, WatchlistCompany, DiscoveredPosting; five enums). `SkillsDB.jobs` and `Application.alignmentAnalysis` are `Json` columns. `Application.alignmentScore` is intentionally omitted (derived read-side).
- HMR-safe Prisma singleton at `lib/db/prisma.ts`.
- Tooling config: `package.json` (pnpm, dev/build/start/lint/typecheck/test:smoke/prisma:* scripts), `tsconfig.json` (strict, `@/*` path alias), `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json` (extends `next/core-web-vitals`).
- `.env.example` declaring every required env var with no values (DATABASE_URL, DIRECT_URL, six Clerk vars, two Inngest vars, two Upstash vars, AI_MODE, ATS_POLLER).
- CI workflow at `.github/workflows/ci.yml`: corepack, pnpm install, prisma generate, typecheck, lint, full and diff integrity runs. No DB-dependent jobs on Day 1.
- Playwright smoke harness: `playwright.config.ts` plus `tests/smoke/auth.spec.ts` placeholder asserting sign-in renders.
- Seed entries for `REVIEW_CHECKLIST.md` (Security Agent fills it).

### Changed
- `.gitignore` expanded for Next/Prisma artifacts (`.next/`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `prisma/generated/`).
- `ARCHITECTURE.md` appended with a "Day 1 deliverables (Foundation Agent)" section and a Dependencies sub-table justifying every package installed.

### Contract notes
- None. No proposals filed. `/contracts/*.ts` and `/lib/mock-api.ts` are untouched.

### Carried over
- Live credentials (Clerk, Neon, Upstash, Inngest) are not in the PR; deploy + `pnpm prisma migrate deploy` + smoke test pass are gated on them landing.
- Frontend Agent owns `/dashboard` (`app/(app)/dashboard/page.tsx`); `app/page.tsx` will redirect there once that exists.
