# Changelog

Every agent appends one entry per end-of-day commit per FLOOR.md cadence.

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

## [agent/ai-integration/d2] — 2026-05-16

### Added
- `/lib/ai/` namespace: typed workflow functions for all seven AI surfaces (`alignment`, `resume`, `coverLetter`, `ninetyDay`, `dossier`, `mockInterview`, `skillsIngest`), each with a real Anthropic-SDK implementation and a contract-shaped mock that mirrors `/lib/mock-api.ts` renderers.
- `lib/ai/index.ts` dispatches real-vs-mock at module load via `process.env.AI_MODE` (default `mock`). `scripts/integrate.sh ai` flips this to `live` on Day 5.
- `lib/ai/cache.ts` — Upstash Redis cache keyed by SHA-256 of `(system + user + model)` under the `tl:ai:` prefix with a 24h TTL. Falls back to a no-op cache when the Upstash env vars are absent (test and `AI_MODE=mock` paths). Never persists the plaintext prompt or response — only the validated structured output.
- `lib/ai/retry.ts` — one-retry-on-validation-failure wrapper. Appends a terse correction suffix derived from the Zod issue path/message; surfaces `AIValidationError` on second failure.
- `lib/ai/invoke.ts` — shared one-shot recipe: prompt hash → cache lookup → SDK call → JSON parse → Zod parse → cache write. Multi-turn `mockInterview` deliberately bypasses the cache (each transcript is unique by construction).
- `lib/ai/smoke.ts` — one-call-per-workflow live smoke harness gated on `AI_MODE=live` and `ANTHROPIC_API_KEY`. Wired to `pnpm test:ai:live`.
- `/tests/ai/*` — 35 vitest tests across 10 files. Each workflow asserts: mock returns shape-valid output, real call wraps every user-supplied field with `<UNTRUSTED_INPUT name="...">`, retry fires exactly once on validation failure, validated response lands in the cache, repeat call hits the cache. `cache.test.ts` and `retry.test.ts` pin the canonical key format and retry transitions.
- BYOK key flow: every workflow takes `apiKey` as a function argument forwarded from Backend Core's `x-anthropic-key` header pass-through. No `process.env.ANTHROPIC_API_KEY` reads in production paths — the smoke script is the single exception.
- `vitest.config.ts` for the unit test harness (mirrors the `@/*` path alias from `tsconfig.json`).

### Changed
- `package.json`: added `@anthropic-ai/sdk`, `@upstash/redis` (runtime), `vitest`, `tsx` (dev). New scripts: `test:ai`, `test:ai:live`.
- `ARCHITECTURE.md` Dependencies sub-table updated: `@upstash/redis` moved from Day 3 (Security Agent's table entry) to Day 2 — AI Integration installs it for `cache.ts`; Security Agent still adds `@upstash/ratelimit` on Day 3. New rationale rows for `vitest` and `tsx`.

### Contract notes
- None. `/contracts/*.ts` untouched. No proposals filed.

### Carried over
- Web search tool typing for `dossier` is cast through `unknown` once because the SDK's `Messages.Tool` union currently models client-defined tools only (server tools like `web_search_20250305` carry a different shape). Revisit once `@anthropic-ai/sdk` ships server-tool types.
- Backend Core's Day-2 placeholders at `/lib/ai/*` did not exist at the time of this PR; nothing to supersede.
- `pnpm test:ai:live` requires a real Anthropic key; not run in CI.
