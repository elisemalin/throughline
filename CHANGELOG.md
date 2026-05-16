# Changelog

Every agent appends one entry per end-of-day commit per FLOOR.md cadence.

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
