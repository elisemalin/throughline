# Changelog

Every agent appends one entry per end-of-day commit per FLOOR.md cadence.

## [agent/backend-core/d2] — 2026-05-16

### Added
- 19 route handlers under `/app/api/*` covering every entry in `API_ROUTES` from `/contracts/api.ts`: AI generation (`alignment`, `documents/resume`, `documents/cover-letter`, `documents/ninety-day-plan`, `documents/dossier`, `interviews/mock`, `skills/ingest`), Application CRUD + `[id]/events` + `[id]/alignment`, Document list/delete, Skills read/patch, Watchlist list/add/remove, Discovery list/poll/update. Each handler: Clerk session gate (401), Zod parse against the contract schema (400 on invalid shape), Prisma I/O, contract-shape response.
- Server-side helpers at `lib/server/`: `auth.ts` (`requireUserId` short-circuit), `response.ts` (`jsonError` / `fromZodError` / `readJson`), `skills.ts` (`readSkillsDB` projector).
- Day-2 mock AI namespace at `lib/ai/__mock__/{alignment,documents,mock-interview,ingest}.ts` re-exported via `lib/ai/index.ts`. Mock returns contract-shape outputs so Backend Core handlers exercise their full Prisma + projection paths.
- Day-2 mock ATS registry at `lib/ats/__mock__/adapter.ts` + `lib/ats/registry.ts` exposing `getAdapter(provider)` and `triggerPoll(ownerId)`.
- Integration tests under `tests/api/`: 15 files, 68 tests. Each route surface has at least one test for unauthenticated (401), invalid body (400), and contract-shape response.
- `vitest.config.ts` + `pnpm test:api` script. Manual `@/` alias resolves to repo root (no `vite-tsconfig-paths` — that plugin is ESM-only and vitest 2.x loads its config via require()).

### Changed
- `ARCHITECTURE.md`: added the `vitest` Dependencies row; added "Backend Core handler shape", "Day-2 Backend Core handler upserts SkillsDB on ingest", "Day-2 Mock-first" Decisions; appended a "Day 2 deliverables (Backend Core Agent)" section.
- `package.json`: added `test:api` script + `vitest` devDep.

### Contract notes
- None. No proposals filed. `/contracts/*.ts` and `/lib/mock-api.ts` untouched.

### Carried over
- The dossier route's `web_search` integration is pending AI Integration's Day-2 PR (Day-2 mock returns a structured placeholder body).
- Real adapter implementations under `/lib/ats/<provider>.ts` are External Adapter's Day-3 deliverable; Backend Core's `lib/ats/registry.ts` will be overwritten by that PR.
- JIT User row provisioning on first authenticated request is deferred to the Clerk webhook handler (TODO already noted in `middleware.ts`); Day-2 tests mock Prisma, so the FK path is exercised only at integration time.


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
