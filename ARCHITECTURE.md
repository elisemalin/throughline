# Throughline — Architecture

Maintained by every agent. Append to "Dependencies" when introducing a new package in the same commit as the import. Append to "Decisions" when making a load-bearing structural choice that future agents need to know about.

See `Pastel Dawn Core/Core Documents/Developer Guide.md` (vault) for the non-negotiables every dependency must clear.

---

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind 4 |
| Persistence | Prisma + Neon Postgres |
| Auth | Clerk |
| Hosting | Vercel |
| Background jobs | Inngest |
| Cache + rate limit | Upstash Redis |
| AI | Anthropic SDK (BYOK, browser-side calls) |

Deviates from the Pastel Dawn default stack (React + Vite + Firebase). Rationale below.

---

## Dependencies

| Package | Justification |
|---|---|
| `zod` 3.x | Runtime validation at every API boundary. Imported by all `/contracts/*.ts` schemas and used by Backend Core handlers (Zod `parse()` at request entry), AI Integration (validate every Claude JSON response), and will be used by `/lib/mock-api.ts` once Frontend Agent wires the boundary. Chosen over io-ts and yup because it is the studio default for TS-first inference; the contracts file requires that one Zod schema be both the validator and the source of truth for the derived TS type. |
| `next` 15 | Foundation Agent installs on Day 1. Justification for choosing Next over Vite-only: App Router enables the `/app/api/*` routes and middleware that Backend Core and Security Agent rely on, and Vercel deployment is one-step. |
| `@prisma/client` 5 + `prisma` 5 | Foundation Agent installs on Day 1. Maps `/contracts/models.ts` to Postgres. JSON columns are used for nested SkillsDB shapes per the Decision below. |
| `@clerk/nextjs` | Foundation Agent installs on Day 1. Justification for choosing Clerk over Firebase Auth: BYOK Anthropic flow is browser-side, server only validates session, and Clerk's middleware integrates with Next.js App Router. |
| `@anthropic-ai/sdk` | AI Integration Agent installs on Day 2. Used with `dangerouslyAllowBrowser: true` so the BYOK key flows from the user's browser; server never sees the key. |
| `inngest` 3.27.4 | External Adapter Agent installs on Day 2. Daily ATS poller runs as an Inngest scheduled function (`jobs/poll.ts`); the client lives in `jobs/inngest.ts`. Pinned to 3.27.4 because 3.28+ requires the Next 15 App Router handler shape Backend Core has not yet wired. |
| `@upstash/redis` + `@upstash/ratelimit` | Both installed on Day 2 — `@upstash/redis` lands first via AI Integration's `/lib/ai/cache.ts` (prompt-hash cache), and Security adds `@upstash/ratelimit` for the sliding-window rate limiter at `/lib/security/rate-limit.ts`. `@upstash/redis` 1.34.x is the Edge-compatible REST client; `@upstash/ratelimit` 2.0.x is the sliding-window helper. |
| `vitest` 2.1.9 | Installed on Day 2 by the first agent to need it. Node-environment runner used by `/tests/security/**`, `/tests/ai/**`, `/tests/ats/**`, and `/tests/api/**`. Chosen over Jest because the studio targets a single TS-first runner and Vitest reuses the tsconfig `@/*` alias natively. Pinned to 2.1.9 (last 2.x release on Node 22). |
| `tsx` (dev) | AI Integration Agent installs on Day 2 to run `lib/ai/smoke.ts` (the one-call-per-workflow live smoke) as a plain Node script under `pnpm test:ai:live`. No bundler, no Next runtime needed — `tsx` executes the TS file directly. |

Foundation Agent adds the rest on Day 1 (tailwind, postcss, autoprefixer, eslint, typescript, etc.) and appends a one-line rationale per non-trivial entry.

---

## Decisions

### Stack deviates from Pastel Dawn default (Firebase / Vite)

**Why:** Throughline's Day 5 integration plan depends on a server-rendered Next.js App Router app: `/app/api/*` handlers under Backend Core, middleware under Security, server-only utilities under `/lib/server/`. Firebase Functions could host the API surface but the App Router co-location of pages + route handlers materially simplifies Frontend Agent's swap from `/lib/mock-api.ts` to `/lib/api-client.ts`. Postgres (via Neon) was preferred over Firestore because the schema in `/contracts/models.ts` is relational, and a SQL planner makes the discovery feed's "rank by alignmentScore" trivially indexable.

**Cost:** This is the first Pastel Dawn project on this stack. Onboarding a future agent into the stack costs more than reusing the Firebase playbook would have.

**Mitigation:** The role files in `.claude-roles/` are kit-agnostic; the kit at `Pastel Dawn Core/_Templates/multi-agent-orchestration/` can be reused on Firebase projects in the future.

### Zod schemas live in `/contracts/models.ts`, not `/contracts/api.ts`

**Why:** Some shapes are BOTH persisted on a row AND returned by an API (most importantly `AlignmentAnalysis`, which is embedded on `Application` and returned by `/api/alignment`). Defining the Zod schema once in `models.ts` and re-exporting from `api.ts` prevents drift between the persisted snapshot and the API response.

### SkillsDB nested JSON, not relational

**Why:** `SkillsDB.jobs` and `Job.projects` are always read together and never queried independently. Foundation Agent translates `SkillsDB` to a Prisma row with `jobs Json` rather than three normalized tables. Project and Job IDs follow `P\d+` / `J\d+` patterns validated at the Zod boundary, so a malicious update payload cannot inject arbitrary nested rows.

**Cost:** Cannot query "all candidates with a project at Stripe" without a JSON scan. Acceptable — that query doesn't exist in the product surface.

### `AlignmentAnalysis` is the single source of truth for both persisted snapshot and API response

**Why:** Original Day 0 work had two diverging declarations. The reviewer caught the drift in PR #2.

### `__MOCK_MODE__` sentinel in `lib/mock-api.ts`

**Why:** `scripts/integrate.sh status` greps for the literal token to report sprint vs live mode. Don't remove it from the file even if TS lint flags it as unused.

### `Application.alignmentScore` is a read-side derived field, not a column

**Why:** The Frontend prototype reads `application.alignmentScore` directly; the persisted truth is `application.alignmentAnalysis?.score`. Backend Core projects the score into list responses via a helper (`projectScore()` in `lib/mock-api.ts` mirrors the pattern).

**For Foundation Agent on Day 1:** when translating `ApplicationSchema` to `prisma/schema.prisma`, OMIT the `alignmentScore` column. Persist only `alignmentAnalysis` as a JSON column (or normalized table if you choose). The TS schema includes `alignmentScore` for read-shape convenience; the comment in `models.ts` near the field flags it.

### `Job.endDate` is `string | undefined` (was `string` with empty-default)

**Why:** PR #4 switched `JobSchema.endDate` from `.default('')` to `optionalString`-style preprocessing so all empty-as-undefined normalization is consistent across the codebase.

**For Foundation Agent on Day 1:** the corresponding Prisma column should be nullable (`endDate String?`), not `NOT NULL DEFAULT ''`. Frontend renderers fall back to "Present" on null via `endDate ?? 'Present'`.

### Date/timestamp serialization at the API boundary

**Why:** `/contracts/models.ts` declares every timestamp (`createdAt`, `updatedAt`, `at`, `postedAt`, `lastPolled`) as `z.string()` — an ISO transport shape. Prisma's `schema.prisma` stores those columns as `DateTime` (the right shape for Postgres indexing and storage efficiency). Prisma's client then hydrates each `DateTime` as a JS `Date`. If Backend Core hands a `Date` instance to `res.json()`, contract-typed consumers will receive an ISO string by accident of `Date.prototype.toJSON`, but TypeScript will not catch the divergence: any consumer that does `new Date(row.createdAt)` math against the contract type assumes `string` and the code path silently breaks under unit test mocks that pass real `Date` instances.

**Rule:** Backend Core MUST project `Date -> string` at the API boundary. The canonical helper is `toApiDate` in `lib/db/serialize.ts`:

```ts
toApiDate(value: Date | string | null | undefined): string | undefined
```

Every Prisma row that leaves an `app/api/*` route as part of a response goes through a per-table projector in the same module (`projectApplication`, `projectSkillsDB`, `projectWatchlistCompany`, etc.) that calls `toApiDate` on every Date column and `parseContact` / `parseJobs` / `parseAlignmentAnalysis` on every Json column.

### Reading JSON columns

**Why:** `SkillsDB.contact`, `SkillsDB.jobs`, and `Application.alignmentAnalysis` are Prisma `Json` columns. Prisma generates them as `Prisma.JsonValue` (a wide union effectively equivalent to `unknown`). Without a single read-boundary helper every Backend Core consumer would re-derive an unsafe cast or call `Schema.parse(...)` inline at each call site, and any drift between the persisted JSON and the contract Zod schema would surface as a runtime error inside an arbitrary route instead of at a single defined boundary.

**Rule:** All `prisma.skillsDB.findUnique` / `.findFirst` / `.findMany` reads run their `contact` and `jobs` columns through `parseContact` / `parseJobs` (in `lib/db/serialize.ts`) before returning to API consumers. All `prisma.application.find*` reads run their `alignmentAnalysis` column through `parseAlignmentAnalysis` (same module). The per-table projectors in that module already do both.

### Security middleware composes with Foundation's auth middleware

**Why:** Next.js only honors a single `middleware.ts` at the repo root, and Foundation owns it for Clerk auth (`clerkMiddleware` callback, `isPublicRoute` matcher). Security primitives — rate limit and headers — live in `/middleware.security.ts` as a library, not a competing entry point. Foundation's `middleware.ts` will call into it from inside its `clerkMiddleware` handler once Day 3 wiring lands (integration sketch is in the source comments of `middleware.security.ts`).

**For Backend Core / Frontend / any future agent:** do not add a second `middleware.ts`. Do not `matcher`-exempt API routes to bypass `middleware.security`. New API routes inherit the read tier (60 req/min) automatically; routes that drive a Claude generation are listed in `AI_ROUTE_PATTERNS` inside `middleware.security.ts` and get the AI tier (10 req/min).

### `SERVER_NEVER_STORES` policy is broader than the `integrity.sh` Rule 9 grep

**Why:** The grep token list was narrowed (removed `prompt`, `completion`) to eliminate false-positives on SYSTEM constants. The textual `SERVER_NEVER_STORES` policy still says "raw prompts" and "raw Claude responses" are never persisted — but the integrity script no longer enforces those specific words. The gap is intentional: prompt/completion enforcement moves from grep to Security Agent's PR-level adversarial review.

**For Security Agent:** treat any new code under `/app/api/`, `/lib/server/`, `/lib/db/`, or `/lib/ai/` that touches assembled user-message content or Claude response bodies as a manual review item. Log statements and DB writes that name those values should be flagged regardless of token spelling.

### Backend Core handler shape

**Why:** Day 2 ships 19 route files across `/app/api/*`. Every handler runs the same prelude — gate the Clerk session, parse the request body, run the request through the Zod schema in `/contracts/api.ts`, then talk to Prisma. Drift across that prelude is the single largest review-load risk for the API surface; reviewers cannot diff 19 hand-rolled auth checks. The shape below is what every handler MUST follow.

**Rule:**

```ts
export async function POST(req: Request) {
  const gate = await requireUserId();          // /lib/server/auth.ts
  if (gate instanceof Response) return gate;   // 401 short-circuit
  const userId = gate;

  const body = await readJson(req);            // /lib/server/response.ts
  if (body instanceof Response) return body;   // 400 invalid_json

  const parsed = SomeRequestSchema.safeParse(body);
  if (!parsed.success) return fromZodError(parsed.error);  // 400 invalid_request

  // ... Prisma + AI/ATS calls ...

  return NextResponse.json(SomeResponseSchema.parse(result));
}
```

The split-return shape (helper returns either `Response` or a typed value) keeps handlers flat — no `try/catch`, no nullable `userId` leaking into Prisma calls. `fromZodError` projects the issues array into a structured `{ error: { code, message, details } }` body so the Frontend renders one error shape regardless of which route fired.

### Day-2 Backend Core handler upserts SkillsDB on ingest

**Why:** `prisma.skillsDB` carries `@unique(ownerId)`. A user re-running `/api/skills/ingest` would otherwise hit a P2002 unique-constraint error on the second call. Backend Core uses `upsert` so a repeat ingest replaces the prior structured DB rather than crashing, with the AI workflow's parsed shape as both the `create` and the `update` payload.

### Day-2 Mock-first: `lib/ai/__mock__/*` and `lib/ats/__mock__/*` are placeholders, not abstractions

**Why:** Backend Core's Day-2 PR ships `lib/ai/index.ts` and `lib/ats/registry.ts` as Day-2 placeholders that re-export from sibling `__mock__/` files. AI Integration's Day-2 PR and External Adapter's Day-3 PR overwrite those public surfaces with real implementations and delete the `__mock__/` directories. Backend Core never imports from `__mock__/` directly — only via the public surface — so the swap happens with zero edits to handler code or tests.

**For AI Integration:** when your PR lands, delete `/lib/ai/__mock__/` and overwrite `/lib/ai/index.ts` with your real workflow exports. The handler-side import paths stay identical (`runAlignment`, `runResume`, `runCoverLetter`, `runNinetyDay`, `runDossier`, `runMockInterview`, `runIngest`, `MOCK_INGEST_WARNINGS` — the last one becomes a regular `warnings` return value on the workflow output).

**For External Adapter:** same pattern — delete `/lib/ats/__mock__/`, overwrite `/lib/ats/registry.ts` keeping `getAdapter(provider)` and `triggerPoll(ownerId)` exports.

---

## Day 1 deliverables (Foundation Agent)

Shipped on branch `agent/foundation/d1`:

- Next.js 15 App Router scaffold (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`).
- Clerk auth wired: `middleware.ts`, `app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `app/(auth)/sign-up/[[...sign-up]]/page.tsx`.
- Prisma schema at `prisma/schema.prisma` translating `/contracts/models.ts` line-by-line. `Application.alignmentScore` is intentionally NOT a column (derived read-side per the Decisions section above). `Job.endDate` is nullable inside the `SkillsDB.jobs` JSON. `SkillsDB.jobs` and `Application.alignmentAnalysis` are `Json` columns.
- Prisma client singleton at `lib/db/prisma.ts` with HMR-safe globalThis cache.
- Tailwind 4 with `tailwind.config.ts` loaded via `@config` in `app/globals.css`. Palette: stone-950 surface, amber-200 accent.
- Fonts via `next/font/google`: Instrument Serif (display), JetBrains Mono (data), DM Sans (UI). CSS variables exposed to Tailwind.
- CI at `.github/workflows/ci.yml`: corepack, pnpm install, prisma generate, typecheck, lint, full integrity, diff integrity on PR. No DB-dependent steps on Day 1.
- Playwright smoke at `tests/smoke/auth.spec.ts` + `playwright.config.ts`. Single placeholder asserts sign-in renders.
- `.env.example` enumerates every env var with no values.

### Day 1 Dependencies sub-table

Each entry's one-line justification:

| Package | Why |
|---|---|
| `next` 15.5.18 | App Router scaffold; the framework the whole product runs on. |
| `react` / `react-dom` 19.2.6 | Required peer for Next 15. |
| `typescript` 5.9.3 | Strict TS is studio default; required by the `.ts` contracts. |
| `@prisma/client` + `prisma` 5.22.0 | Persistence layer per ARCHITECTURE.md. |
| `@clerk/nextjs` 6.39.3 | Auth per ARCHITECTURE.md; pairs with Next 15 App Router middleware. |
| `zod` 3.23.8 | Already required by `/contracts/*.ts`; pinned at workspace root. |
| `tailwindcss` 4.2.4 + `@tailwindcss/postcss` 4.2.4 | Styling per ARCHITECTURE.md. JS config loaded via `@config` directive in `app/globals.css` so design tokens stay in a single TS file. Pinned to 4.2.4 because 4.0.0 ships an older oxide scanner API incompatible with the Next 15.5 css-loader (`Missing field 'negated' on ScannerOptions.sources`). |
| `autoprefixer` 10.4.20 + `postcss` 8.4.49 | Postcss pipeline required by Tailwind 4's PostCSS plugin; autoprefixer covers vendor prefixes not yet handled by the engine. |
| `eslint` ^8.x + `eslint-config-next` 15.5.18 | Lint preset that matches the Next major; CI gate. eslint pinned to ^8.x because next-eslint config is still legacy-format; flat-config migration deferred to a separate proposal. |
| `@playwright/test` 1.60.0 | Smoke harness. Day 1 ships one placeholder spec. |
| `@types/node` / `@types/react` / `@types/react-dom` | Type-only deps required by TS strict mode against Next 15 and Node 22. |

---

## Day 2 deliverables (Backend Core Agent)

Shipped on branch `agent/backend-core/d2`:

- 19 route files under `/app/api/*` — one handler per entry in `API_ROUTES` from `/contracts/api.ts`. Every handler uses the prelude shape documented in the Decisions section above (Clerk gate, JSON parse, Zod validation, Prisma I/O, contract-shape response).
- Server-side helpers under `/lib/server/`: `auth.ts` (Clerk `requireUserId`), `response.ts` (`jsonError`, `fromZodError`, `readJson`), `skills.ts` (projected SkillsDB read).
- Day-2 placeholder AI namespace was superseded at merge time by AI Integration's real namespace (PR #9). Backend Core's handlers continue to import `runAlignment` / `runResume` / etc. — those names now resolve to a Day-2 compatibility shim at the bottom of `lib/ai/index.ts` that adapts the real `(input, { apiKey })` signature to Backend Core's single-arg form by passing `apiKey: ''`. **Mock-mode safe.** Day-3 cleanup reads `x-anthropic-key` from request headers, calls AI Integration's real exports directly, and removes the shim.
- Day-2 placeholder ATS registry was superseded at merge time by External Adapter's real registry (PR #7). `ATS_ADAPTERS` is the canonical map; `getAdapter(provider)` and `triggerPoll(ownerId)` survive as shims at the bottom of `lib/ats/registry.ts` so existing handlers compile. Day-3 cleanup replaces `getAdapter` with `ATS_ADAPTERS[p]` and either deletes `triggerPoll` or wires `inngest.send`.
- Vitest integration tests under `/tests/api/`: 15 test files, 68 tests. Every route in `API_ROUTES` has at least one test asserting (a) 401 without a Clerk session, (b) 400 on invalid request shape, and (c) the response body parses against its contract Zod schema. Prisma and Clerk are mocked via `vi.mock` in `tests/api/_setup.ts`.
- `vitest.config.ts` + `pnpm test:api` script.

### Day 2 Dependencies sub-table

| Package | Why |
|---|---|
| `vitest` 2.1.9 | Backend Core's `pnpm test:api` runner. Already in the workspace from Day 2 — added by AI Integration / Security; Backend Core only adds the `tests/api/**` include glob to `vitest.config.ts` and the `pnpm test:api` script. |

### Day 2 Dependencies sub-table (Frontend Agent)

| Package | Why |
|---|---|
| `zustand` 5.x | Three small client-side stores (`useApiKeyStore`, `useNavigationStore`, `useToastStore`). Chosen over Redux Toolkit because the only persisted data is the BYOK key envelope; everything else round-trips through TanStack Query against `/lib/mock-api`. |
| `@tanstack/react-query` 5.x | Single source for every server-state read/write. `QueryProvider` wraps `app/(app)/layout.tsx`; every `/lib/queries/*` hook is a thin wrapper over a `mock-api` function so the Day 5 swap is mechanical. |
| `lucide-react` 1.x | Icon set used by the prototype. Direct port — every NAV icon, every `<Plus />` / `<RefreshCw />` in the views resolves through one library so the visual language stays consistent. Major version jumped to 1.x in May 2026; identifiers in use (`LayoutDashboard`, `Compass`, etc.) remained stable. |
| `@axe-core/playwright` 4.x | Drives `pnpm test:a11y`. Day 2 ships one public-route scan (`/sign-in`); the authenticated-route scan unblocks once QA Agent provisions `CI_LIVE_CLERK=1`. |
| `storybook` 9.x + `@storybook/nextjs` 9.x + `@storybook/addon-a11y` 9.x | (Day 2 pin — superseded on Day 3 by `@storybook/react-vite`. See Day 3 sub-table below.) |

### Day 3 Dependencies sub-table (Frontend Agent)

| Package | Why |
|---|---|
| `@storybook/react-vite` 9.1.x + `vite` ^6 + `@vitejs/plugin-react` ^4 | Replaces `@storybook/nextjs`. Root cause of the Storybook regression: `@storybook/builder-webpack5` (still shipped by 9.x) calls `cache.shutdown` through a `Hook.tap` that Next 15.5's bundled webpack no longer exposes, so a clean install of `@storybook/nextjs` 9 produces `Cannot read properties of undefined (reading 'tap')`. None of our stories import `next/*` primitives, so the Vite builder is a clean swap. `viteFinal` mirrors the tsconfig `@/*` alias. |
| `@lhci/cli` 0.15.x | Drives `pnpm test:lighthouse`. `lighthouserc.json` boots `next dev`, fetches `/sign-in`, asserts 90+ on perf / a11y / best-practices / SEO. Authenticated-route coverage unblocks on `CI_LIVE_CLERK=1`. |

### Decision — Italiana wordmark + Fraunces display

**Why:** Day 2's Instrument Serif + DM Sans pairing read as a default editorial-dev-tool template. Throughline is a Pastel Dawn studio product; the typography needed presence to carry the brand. `Italiana` (single-weight, art-deco) is reserved for the wordmark only via `font-wordmark`. `Fraunces` variable (with `SOFT 80, opsz 144`) replaces Instrument Serif as `font-display` — organic-cut serifs throughout the headings without the crisp neoclassical look. Both are Google Fonts so they load via `next/font/google` with no additional bundle cost beyond their subsets.

**Cost:** Italiana ships only `latin` and only at 400 weight; we do not use it anywhere except the wordmark, so the cost is small.

### Decision — frontend-local `apiKeyMode` until contract proposal lands

**Why:** Security Agent's `noPassphraseFallback` deliberately produces the same on-disk shape as the strong path. The UI must know which mode wrote the saved key (the unlock paths differ). `ApiKeyMeta` in `/contracts/storage.ts` has no `mode` field. Filed `/contracts/proposals/2026-05-16-frontend-apikey-mode.md` (PENDING REVIEW); the interim storage at `throughline:apiKeyMode` folds into `apiKeyMeta` in one commit once accepted.
