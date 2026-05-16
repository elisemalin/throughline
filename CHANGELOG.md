# Changelog

Every agent appends one entry per end-of-day commit per FLOOR.md cadence.

## [agent/backend-core/d3] — 2026-05-16

### Added
- `lib/server/anthropic-key.ts` — `requireAnthropicKey(req)` extracts the BYOK key from the `x-anthropic-key` header; 400 `missing_anthropic_key` when absent.
- `/app/api/webhooks/clerk/route.ts` — Svix-signature-verified receiver for Clerk `user.*` events. On `user.created` / `user.updated`, upserts the local `User` row keyed by Clerk user ID. Public route via `middleware.ts` `isPublicRoute` matcher; signature verification is the only defense.
- 16th test file `tests/api/webhooks-clerk.test.ts` (6 tests). Each AI route gained a `400 missing_anthropic_key` test. Total: 16 files, 83 tests.

### Changed
- Removed the Day-2 compatibility shims from `lib/ai/index.ts` (the bottom-of-file `run*` aliases + `MOCK_INGEST_WARNINGS`) and `lib/ats/registry.ts` (`getAdapter` / `triggerPoll`).
- All 8 AI-generation routes (`alignment`, `documents/resume`, `documents/cover-letter`, `documents/ninety-day-plan`, `documents/dossier`, `interviews/mock`, `skills/ingest`, `applications/[id]/alignment`) now read `x-anthropic-key` and call the real namespace exports (`alignment`, `resume`, `coverLetter`, `ninetyDay`, `dossier`, `mockInterview`, `skillsIngest`) with `{ apiKey }`.
- `/api/watchlist` POST swapped `getAdapter(provider)` → `ATS_ADAPTERS[provider]`.
- `/api/discovery/poll` repurposed: returns `polledAt = max(WatchlistCompany.lastPolled)` + live `DiscoveredPosting.count` + `newPostings: 0`. No on-demand trigger (cron in `/jobs/poll.ts` is the only poller).
- AI shape-failure responses: status `502 → 422` (`ai_invalid_response`). Frontend renders a "regenerate" affordance distinct from gateway failures.
- `middleware.ts`: appended `/api/webhooks/clerk` to `isPublicRoute`. Foundation-owned file; coordinated via PR description.
- `.env.example`: added `CLERK_WEBHOOK_SIGNING_SECRET`.
- `vitest.config.ts`: added `setupFiles: ['./tests/api/_setup.ts']` so the Clerk + Prisma vi.mock factories apply across the api suite. Other suites (security/ai/ats) do not import either module so the mocks are inert there.

### Contract notes
- None. No proposals filed. `/contracts/*.ts` and `/lib/mock-api.ts` untouched.

### Coordination handoffs
- **AI Integration Day-3**: when `SkillsIngestRawSchema` gains `warnings: string[]`, surface those in the `/api/skills/ingest` response. Today the handler returns `warnings: []` with a TODO.
- **Foundation**: `middleware.ts` `isPublicRoute` matcher gained `/api/webhooks/clerk`. Noted in the PR description.

### Carried over
- Real-DB integration tests (the webhook + JIT User flow against a Postgres test DB) deferred to QA Day 4 once Neon credentials land.
## [agent/external-adapter/d3] — 2026-05-16

### Added
- `lib/ats/errors.ts` — `AtsProviderError` class carrying `provider`, `slug`, `status`, `attempts`, plus `isAtsProviderError` type guard. The poller catches it specifically and projects it into a structured `errors[]` entry per row.
- `lib/ats/_http.ts` — `fetchWithRetry` helper enforcing the Day-3 retry policy: 5xx and network errors retry once after 5 s; 429 retries once respecting `Retry-After` (else 30 s default); 4xx other than 429 fails immediately. Sleep is overrideable via `__setSleepImplForTests` so the unit suite never waits the real back-off window.
- `jobs/poll.ts` — exports `pollOne` (used by the integration test), `runPollSweep` (shared sweep body), `ATS_POLL_REQUESTED_EVENT`, and a second Inngest function `atsPollRequestedFunction` triggered by `ats/poll.requested` events for on-demand per-user sweeps. Same `ATS_POLLER=disabled` kill-switch honored.
- `tests/ats/_http.test.ts` — 8 tests covering every branch of the retry policy.
- `tests/ats/{greenhouse,lever,ashby}.test.ts` — per-adapter retry-path coverage (4xx immediate fail; 5xx retried then thrown) on top of Day-2 normalize/validateSlug suites. Total ATS tests: 43.
- `tests/ats/integration/poll.integration.test.ts` — Neon-backed integration test. Seeds three `WatchlistCompany` rows under a fixed `TEST_OWNER_ID`, runs `pollOne` per row with the 2 s pacing gap, asserts inserts > 0, `lastPolled` set, then re-runs and asserts second sweep inserts = 0 (dedup). Tears everything down in `afterAll`. Falls back from `DATABASE_URL_TEST` to `DATABASE_URL` with a printed warning.
- `.github/workflows/ats-integration.yml` — separate CI workflow runs `pnpm test:ats:integration` on push to `main` or `agent/external-adapter/**`, gated on `DATABASE_URL_TEST` secret (no-ops cleanly when absent).
- `contracts/proposals/2026-05-16-external-adapter-ats-poll-event.md` — `[PENDING REVIEW]` proposal to land `ATS_POLL_REQUESTED_EVENT` + `AtsPollRequestedDataSchema` in `/contracts/ats.ts`.
- `contracts/proposals/2026-05-16-external-adapter-workday-deferred.md` — `[PENDING REVIEW]` proposal confirming the Workday adapter stays as the throwing stub until v1.1. Documents what the Day-3 spike found.

### Changed
- `lib/ats/greenhouse.ts`, `lib/ats/lever.ts`, `lib/ats/ashby.ts` — `fetchPostings` routes through `fetchWithRetry`; all non-2xx surfaces as `AtsProviderError` with provider/slug context. `validateSlug` keeps raw fetch for its distinct 404 → "board not found" UX semantics.
- `lib/ats/registry.ts` — `triggerPoll(ownerId)` flipped from no-op stub to `inngest.send({ name: 'ats/poll.requested', data: { ownerId } })`. Response shape preserved (`{ newPostings: 0, totalPostings: 0, polledAt }`) since the real sweep is asynchronous; Backend Core's route already counts the live total from DB. `getAdapter` and `ATS_ADAPTERS` unchanged.
- `.env.example` — added `DATABASE_URL_TEST` with a comment pointing to a dedicated Neon test branch.
- `ARCHITECTURE.md` — added two decisions: "ATS adapter retry policy" and "`DATABASE_URL_TEST` convention". Documents the cleanup query for the seeded `TEST_OWNER_ID` rows.

### Contract notes
- Two `[PENDING REVIEW]` proposals filed (see Added). External Adapter respects `/contracts/*.ts` immutability — both describe additions the Architect lands on accept.

### Cross-stream coordination for Frontend
- `/lib/mock-api.ts` `discoverySeed` still references kickoff-era slugs (`retool`, `linear`, `vercel`, `figma`, `airtable`). Frontend Agent should update its seed to match the Day-2 captured-fixture slugs: `stripe`, `airbnb`, `anthropic` (Greenhouse), `mistral`, `spotify` (Lever), `linear`-on-Ashby, `notion` (Ashby). Noted on the Day-3 PR.

### Carried over
- Architect to mark both proposals `[DECIDED: ...]`. On accept of the event-name proposal, the constants in `jobs/poll.ts` move to `/contracts/ats.ts` and the local exports are removed.
- The Neon integration test path is wired but not run from this branch (no local Neon URL); CI workflow runs it on push once `DATABASE_URL_TEST` is set as a repo secret.
## [agent/ai-integration/d3] — 2026-05-16

### Added
- `tests/ai/prompt-regression.test.ts` — 42 tests across an edge-case input corpus (very short JD, very long resume, mixed scripts, special-character names, prompt-injection attempts). Each case asserts (1) the mock returns shape-valid output through the workflow's RawSchema and (2) the real workflow's user-message builder wraps every user-supplied field in `<UNTRUSTED_INPUT>` so the SECURITY_PREAMBLE defense survives pathological inputs.
- Cache hit/miss/set counters in `lib/ai/cache.ts` with `getCacheStats()` / `resetCacheStats()` exports. Counters are content-free (hashes only, never prompts or responses) and drive TTL tuning post-launch.
- `tests/ai/fixtures/live/<workflow>.json` — 7/7 golden fixtures captured via `pnpm test:ai:live` against `claude-sonnet-4-6` (and `claude-opus-4-7` for `skillsIngest` per `MODEL_INGEST_FALLBACK`). All workflows passed validation on first attempt. Total run ~129s; dossier accounts for ~69s due to web_search.
- Output-format hint appended to every `buildXUser`. WHY: the first live-smoke run revealed sonnet wandered on alignment field names — returned `{id, label}` per requirement instead of the schema's `{requirement, strength, type, evidence, recommendation}`. SYSTEM prompts in `/contracts/ai.ts` are Architect-only; the workflow-owned user message is the right place to pin the exact JSON shape. After the hint landed, all seven workflows passed first-try.
- `contracts/proposals/2026-05-16-ai-skills-ingest-warnings.md` — request to add a 20-entry `warnings: z.array(z.string()).max(20).default([])` field on `IngestRawSchema` so the model can surface parsing-time issues (ambiguous dates, collapsed duplicates) into the response shape Backend Core already exposes.

### Changed
- `lib/ai/workflows/dossier.ts` — replaced the `as unknown as Anthropic.Messages.Tool` cast with a locally-declared `WebSearchTool20250305` interface that mirrors the public Anthropic docs. `lib/ai/invoke.ts` now exports a `ToolParam` union (`Messages.Tool | { type; name; ... }`) and casts once at the SDK call site, so workflow code is type-clean.
- `lib/ai/smoke.ts` — every successful workflow call writes a golden fixture to `tests/ai/fixtures/live/<workflow>.json`; prints cache stats on completion.

### Contract notes
- Filed `contracts/proposals/2026-05-16-ai-skills-ingest-warnings.md` ([PENDING REVIEW]). Knock-on changes (mock fixture, SYSTEM prompt, test update) land in a follow-up PR once approved.

### Carried over
- `lib/ai/index.ts` Backend-Core Day-2 compatibility shim (`runAlignment` / `runResume` / ... / `MOCK_INGEST_WARNINGS`) left untouched per the Day-3 kickoff; Backend Core's Day-3 PR removes it.

## [agent/security/d3] — 2026-05-16

### Added
- `tests/security/middleware-composition.test.ts` — exercises `applySecurityMiddleware` across the request shapes the wired-up `middleware.ts` actually sees: API GET (read tier), API GET (ai tier), authenticated page navigation, anonymous public route, exhaustion-to-429 on both tiers with security headers attached, per-user bucket isolation, route-classifier mapping with `it.each` over the four AI routes and four read routes.
- `tests/security/rate-limit.integration.test.ts` — opt-in real-Upstash test gated on `UPSTASH_REDIS_REST_URL_TEST` + `UPSTASH_REDIS_REST_TOKEN_TEST`. Hits the real `@upstash/ratelimit` sliding-window limiter 60/61 times with a per-run unique identifier (`pid + Date.now()`), prefixed `tl:rl-test:` so it cannot poison prod data. Skips cleanly when env vars are absent; `pnpm test:security:integration` is the explicit opt-in.
- `pnpm test:security:integration` script. `pnpm test:security` excludes `*.integration.test.ts` so the unit-test gate stays green without external infrastructure.
- `.env.example`: documented `UPSTASH_REDIS_REST_URL_TEST` / `UPSTASH_REDIS_REST_TOKEN_TEST` conventions.
- `/contracts/proposals/2026-05-16-security-csp-nonce.md` — formal deferral of the CSP nonce migration with the actual trade-off (forces dynamic rendering on every page, breaks ISR / PPR / CDN cache) instead of the Day-2 misstatement that the API was unstable.

### Changed
- `middleware.ts` — wired `applySecurityMiddleware` from `@/middleware.security` into the `clerkMiddleware` callback (after `auth.protect()`, before return). Added `/api/webhooks/clerk` to `isPublicRoute` so Clerk's signed webhook POSTs reach Backend Core's handler when it ships (Svix signature is the real defense). Edit coordinated via PR description; Foundation owns the file; Day-1 TODO comment resolved.
- `docs/threat-model.md` — Boundary 1 (BYOK) gains a row for the composed middleware now being live; Residual-risk paragraph rewritten with the correct CSP-nonce trade-off and a pointer to the formal proposal. New Boundary 4 (Authentication) covers the Clerk session + webhook signature surface that Day-3 wire-up newly exposes. Open items reordered: middleware composition removed (done); CSP nonce reframed; webhook handler tracked as Backend Core's pending item.

### Contract notes
- `/contracts/proposals/2026-05-16-security-csp-nonce.md` filed `[PENDING REVIEW]`. No `/contracts/*.ts` modified.

### Cross-stream reviews
- Zero Day-3 PRs from other agents were open as of this PR opening (`gh pr list --state open` returned `[]`). I will adversarially-review each Backend Core / AI Integration / External Adapter / Frontend Day-3 PR at PR-open time per FLOOR.md "two-agent review for high-risk surfaces"; reviews are posted via `gh pr comment` and do not need commits on this branch.

### Carried over
- Backend Core's `/api/webhooks/clerk` handler: `middleware.ts` is already permissive for the path; Security Agent reviews the Svix signature verification + JIT User row provisioning when the handler ships.
- `security:`-labeled GitHub issues to be filed against any other-agent PR that fails review.
- CSP nonce migration: revisit per the filed proposal once Frontend + Architect sign off on the rendering-mode cost.

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
