# Changelog

Every agent appends one entry per end-of-day commit per FLOOR.md cadence.

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
