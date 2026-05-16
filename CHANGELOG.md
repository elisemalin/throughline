# Changelog

Every agent appends one entry per end-of-day commit per FLOOR.md cadence.

## [agent/backend-core/d2] — 2026-05-16

### Added
- 19 route handlers under `/app/api/*` covering every entry in `API_ROUTES` from `/contracts/api.ts`. Each handler: Clerk session gate (401), Zod parse against the contract schema (400 on invalid shape), Prisma I/O, contract-shape response.
- Server-side helpers at `lib/server/`: `auth.ts` (`requireUserId`), `response.ts` (`jsonError` / `fromZodError` / `readJson`), `skills.ts` (`readSkillsDB` projector).
- Integration tests under `tests/api/`: 15 files, 68 tests. Each route surface has at least one test for unauthenticated (401), invalid body (400), and contract-shape response.
- `pnpm test:api` script (vitest already in the workspace from AI Integration / Security).

### Changed
- Day-2 compatibility shim added by Architect at merge time: `lib/ai/index.ts` keeps AI Integration's real exports AND exposes `runAlignment` / `runResume` / etc. as single-arg wrappers passing `apiKey: ''`. `lib/ats/registry.ts` keeps External Adapter's `ATS_ADAPTERS` AND retains `getAdapter(provider)` / `triggerPoll(ownerId)` shims. Both are Day-3 cleanup.

### Contract notes
- None. No proposals filed. `/contracts/*.ts` and `/lib/mock-api.ts` untouched.

### Carried over
- Day-3 cleanup: each `/app/api/*` handler reads `x-anthropic-key` from the request and calls AI Integration's real namespace exports directly; legacy aliases removed.
- Day-3 cleanup: `getAdapter` call sites swap to `ATS_ADAPTERS[p]`; decide on `triggerPoll` (delete or wire `inngest.send`).
- JIT User row provisioning on first authenticated request is deferred to the Clerk webhook handler (TODO already noted in `middleware.ts`).

## [agent/frontend/d2] — 2026-05-16

### Added
- Seven routes under `app/(app)/*`: `/dashboard`, `/skills`, `/discovery`, `/tracker`, `/documents`, `/interviews`, `/settings`. Each is a server-component shell wrapping a `<route>-client.tsx` that holds interactive state and reads/writes via TanStack Query against `/lib/mock-api`.
- `app/(app)/layout.tsx` shell: `QueryProvider`, desktop `Sidebar`, mobile `BottomNav`, global `Toaster`. Stone-950 surface with amber-200 accent.
- Shared components under `/components`: `Pill`, `Card`, `SectionLabel`, `Stat`, `Button`, `Input`, `Textarea`, `Field`, `Modal`, `Markdown`, `Sidebar` / `BottomNav`, `Toaster`. Lifted line-by-line from `prototype/Throughline.jsx` 722-950 with WCAG fixes (focus trap + ESC + restored-focus in `Modal`, label-for on `Field`).
- Zustand stores under `/stores`: `useApiKeyStore` (BYOK key flow, encrypts via `/lib/security/crypto`), `useNavigationStore`, `useToastStore`.
- TanStack Query hooks under `/lib/queries`: one per `API_ROUTES` key plus a shared `QueryProvider`. Every component imports from `@/lib/mock-api` only; integrity script confirms zero forbidden imports.
- Mock API fixtures: `eliseSeed`, `watchlistSeed`, `discoverySeed` lifted from prototype lines 120-650 and reshaped to `/contracts/models.ts`. Document generators now persist their output to `mockState.documents` so the Documents view round-trips end to end.
- Storybook 9 + `addon-a11y` at `.storybook/`. Stories for all primitives at `/stories/*.stories.tsx`. `storybook:build` exits clean.
- Playwright specs at `tests/routes/auth-protection.spec.ts` (anonymous request to every authenticated route redirects to `/sign-in`) and `tests/routes/a11y-public.spec.ts` (axe-core scan over `/sign-in`, zero violations).
- Scripts: `test:e2e:routes`, `test:a11y`, `storybook`, `storybook:build`.

### Changed
- `lib/mock-api.ts` extended: import `DiscoveredPosting` / `WatchlistCompany`, append seed fixtures, hydrate `mockState` with seeds on module load, document-generation routes persist to `mockState.documents`.

### Contract notes
- None. No proposals filed; `/contracts/*.ts` untouched.

### Carried over
- Skills DB inline editing (jobs / projects / clouds) — Day 2 ships the import flow and read-only render; the JobModal / ProjectModal slot lives behind the `/skills` "Import" button as the only mutation entry point.
- Application detail follow-up date editor + notes editor — deferred to Day 3.
- `/lib/security/crypto` is owned by Security Agent and not yet shipped; `useApiKeyStore` resolves the module lazily and surfaces a clear runtime error on save/unlock until it lands. Next build prints a warning to the same effect.
- Full authenticated-route axe-core run (`test:a11y` against the seven `(app)` routes) gated on QA Agent provisioning `CI_LIVE_CLERK=1`. Day 2 a11y test scope is `/sign-in` plus the Storybook bundle's per-story addon-a11y pass.
- `next lint` deprecation warning surfaces on every run; migration to the ESLint CLI is a Foundation-owned change.

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

## [agent/security/d2] — 2026-05-16

### Added
- `lib/security/crypto.ts` — BYOK key encryption: PBKDF2-SHA256 100k iterations, AES-GCM 256, random 16-byte salt + 12-byte IV per write. `encryptKey` / `decryptKey` round-trip; `noPassphraseFallback` XOR-obfuscated path matches the strong-path shape so callers do not branch.
- `lib/security/rate-limit.ts` — Upstash sliding-window limiter with two tiers (`read` 60/min default, `ai` 10/min default), prefixed by `REDIS_KEY_PREFIXES.rateLimit`. Exposes a `__setLimiterFactoryForTests` seam so the integration test runs without a live Redis.
- `middleware.security.ts` — composable rate-limit gate (`checkApiRateLimit`) + seven-header attachment helper (`withSecurityHeaders`): CSP (strict-dynamic + Clerk/Anthropic allowlist), HSTS (1y, includeSubDomains), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera / microphone / geolocation denied), Cross-Origin-Opener-Policy same-origin. Integration sketch documented inline; Foundation wires it from `middleware.ts` in a follow-up.
- `docs/threat-model.md` — three trust boundaries (BYOK browser-direct, prompt injection, ATS egress) with mitigation tables, enforcement pointers, and residual-risk summaries.
- `REVIEW_CHECKLIST.md` — Security Agent populates: high-risk surface list, ten-section self-review for PR authors, severity guide for reviewers.
- `tests/security/crypto.test.ts` — round-trip, randomized IV/salt, wrong-passphrase throw, tampered-ciphertext throw, fallback round-trip, fallback shape parity.
- `tests/security/rate-limit.test.ts` — 60/61 read-tier 429 assertion, 10/11 ai-tier 429 assertion, per-user isolation, per-tier isolation. Uses the injected fake limiter.
- `tests/security/headers.test.ts` — full seven-header presence assertion, CSP allowlist + frame-ancestors checks, HSTS / Permissions-Policy specifics, route classifiers.
- `tests/security/never-stores-grep.test.ts` — supplemental grep over `app/api`, `lib/server`, `lib/db`, `lib/ai`, `jobs` with a broader sink alternation than `scripts/integrity.sh` Rule 9 (covers `audit.`, `tracer.`, `.capture()`, `.write()`, generic `fetch(`).
- `vitest.config.ts` — node environment, `@/*` path alias mirroring tsconfig, `tests/security/**/*.test.ts` include glob.
- `pnpm test:security` script in `package.json` (vitest runner).

### Changed
- `ARCHITECTURE.md` Dependencies table: `@upstash/redis` + `@upstash/ratelimit` flipped from Day 3 to Day 2 with the actual pinned versions; `vitest` added with rationale. New Decisions entry: "Security middleware composes with Foundation's auth middleware" (no second middleware.ts; integration sketch in source).

### Contract notes
- None. `/contracts/*.ts` untouched. No proposals filed; SERVER_NEVER_STORES + REDIS_KEY_PREFIXES + SECURITY_PREAMBLE all already expressed what the implementation needed.

### Cross-stream reviews pending
- None as of EOD 2026-05-16. Backend Core, AI Integration, External Adapter Day-2 PRs not yet open. Will adversarial-review each at PR-open time per FLOOR.md "two-agent review for high-risk surfaces".

### Carried over
- Backend Core / Foundation must wire `applySecurityMiddleware` into Foundation's `middleware.ts` on Day 3; sketch documented in the source comments of `middleware.security.ts`. Until then, the rate-limit gate and headers ship as a library and run only via tests.
- Frontend Agent owns the passphrase-strength UI and the `noPassphraseFallback` warning surface; threat model notes this as an open item.

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
