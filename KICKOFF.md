# Frontend Agent — Day 2 kickoff

You are the Frontend Agent for Throughline. You are running in your own Claude Code session in `~/projects/throughline-frontend/` on branch `agent/frontend/d2`. The Architect runs separately and reviews/merges your PRs.

## Required reading (in order)

1. `CLAUDE.md` in this worktree — your role spec. The hardest discipline: **mock-first**. Every API interaction goes through `/lib/mock-api.ts`. NEVER call `fetch('/api/...')` directly. NEVER import from `/lib/ai` or `/lib/ats`. The `scripts/integrity.sh` script will fail your PR if you do.
2. `.claude-roles/FLOOR.md` — non-negotiables. NO AI co-authorship in commits. Ever. WCAG 2.1 AA + Lighthouse 90+ on every public route is the QA gate.
3. `~/Documents/General Vault/Pastel Dawn Core/Core Documents/Developer Guide.md` — studio non-negotiables.
4. `prototype/Throughline.jsx` — your spec. 4177 lines. Read the full file. Every view, every component, every shape is defined there. You port it.
5. `contracts/api.ts` — every endpoint type. Your TanStack Query hooks consume these.
6. `contracts/models.ts` — domain types for props.
7. `contracts/storage.ts` — `LOCAL_STORAGE_KEYS.apiKey` and friends. BYOK key flow: encrypted at rest via `/lib/security/crypto.ts` (Security Agent ships this; you call exported helpers, never edit them).
8. `lib/mock-api.ts` — your decoupler. You own this file end-to-end now; on Day 5 `scripts/integrate.sh backend` overwrites it with a fetch layer.
9. `ARCHITECTURE.md` — esp. design system notes, `force-dynamic` rationale on root layout.

## Day 2 scope

Ship a meaningful first PR. Aim:

- **Seven routes under `/app/(app)/*`** (the route group is auth-gated by Foundation's middleware):
  - `/dashboard` — from prototype's Dashboard view
  - `/skills` — Skills DB view + import modal
  - `/discovery` — DiscoveryView
  - `/tracker` — TrackerView + ApplicationDetail
  - `/documents` — DocumentsView
  - `/interviews` — InterviewPrep
  - `/settings` — SettingsView (API key entry)

Each route is a Server Component shell (`page.tsx`) that wraps a Client Component (`<route>-client.tsx`) holding interactive state. Data flows via TanStack Query hooks.

- **Shared components** under `/components/`:
  - Layout primitives: `Pill`, `Card`, `SectionLabel`, `Stat`, `Button`, `Input`, `Textarea`, `Field`, `Modal`, `Markdown` (lifted from prototype lines 720-900-ish)
  - Top-nav sidebar: `Sidebar.tsx` with the 7-tab navigation (lines 870-910)
  - Each component is a Client Component (`"use client"`) where it holds state; otherwise Server Component for static markup
  - Storybook stories for every shared component under `/stories/<Component>.stories.tsx`

- **Stores** under `/stores/` (Zustand):
  - `useApiKeyStore` — reads/writes encrypted key via `/lib/security/crypto.ts` (call `encryptKey()` / `decryptKey()`; do NOT implement crypto yourself)
  - `useNavigationStore` — current route, modal open state
  - `useToastStore` — global toast notifications

- **TanStack Query hooks** under `/lib/queries/`:
  - One hook per API route. E.g. `useAlignment(req)` calls `postAlignment(req)` from `@/lib/mock-api`.
  - Provider setup in `/app/(app)/layout.tsx` (App Router Client Component) with QueryClient.

- **`/app/(app)/layout.tsx`** — wraps every route in:
  - QueryClient provider
  - Sidebar
  - Dark editorial palette (stone-950 base, amber-200 accent) per the prototype

- **Storybook setup** — `pnpm storybook` runs locally. `pnpm storybook:build` produces a buildable bundle. Configure addon-a11y so every story runs axe-core.

## Strict path rules

You own: `/app/(app)/**`, `/components/**`, `/stores/**`, `/hooks/**`, `/lib/mock-api.ts`, `/lib/queries/**`, `/styles/**`, `/.storybook/**`, `/stories/**`.

You must NOT touch: `/contracts/**`, `/app/api/**`, `/lib/ai/**`, `/lib/ats/**`, `/lib/security/**` (you call exported helpers; you do not edit them), `/prisma/**`, `/app/(auth)/**`, `/middleware*.ts`.

**Forbidden imports (integrity.sh will fail your PR):**
- `from '@/lib/ai'` — anywhere under `/app/(app)` or `/components`
- `from '@/lib/ats'` — anywhere under `/app/(app)` or `/components`
- `from '@anthropic-ai/sdk'` — anywhere under `/app/(app)` or `/components`
- Direct `fetch('/api/...')` — must go through `/lib/mock-api.ts`

## Mock-api: what to add to it on Day 2

You probably need to extend `/lib/mock-api.ts` to support new flows the prototype exercises. Specifically:
- `__seedMockState({ skillsDB, applications, documents, watchlist, discovery })` is already exported — Storybook stories use it to seed state.
- If you need additional helpers (e.g. typed `getDiscoveryFeed` returning fixture postings), add them and document in the file header. Frontend owns this file.
- The discovery seed and elise seed from the prototype belong in `/lib/mock-api.ts` as exported fixtures so Storybook can use them.

## Definition of done

```bash
pnpm test:e2e:routes      # Playwright: every route renders, primary CTA works against mock-api
pnpm test:a11y            # axe-core: ZERO violations on every page
pnpm storybook:build      # Storybook builds clean
pnpm typecheck            # zero errors
pnpm lint                 # zero errors
bash scripts/integrity.sh # exits 0 (CRITICAL — forbidden-import rule is enforced here)
```

If any route can't hit Lighthouse 90+, the route is wrong, not the test. Fix until it does.

## Workflow

1. Commit per route + shared-component slice. Group related work.
2. Each commit message: short summary. **NO AI co-authorship in any form. Ever.**
3. `git push -u origin agent/frontend/d2`
4. `gh pr create --base main --head agent/frontend/d2 --title "Day 2: Frontend routes + components" --body "..."`.
5. Report back.

## Visual fidelity

The prototype is the visual spec. Match the dark editorial palette (stone-950 base, amber-200 accent). Match the typography: Instrument Serif display, JetBrains Mono data, DM Sans UI. Foundation loaded these via `next/font/google` in `app/layout.tsx`. Use the CSS variables Foundation declared.

Where the prototype shows a specific layout, match it. Do NOT redesign.

## How to report

```
PR: <url>
Branch: agent/frontend/d2
Commits: <n>
Routes shipped: dashboard/skills/discovery/tracker/documents/interviews/settings (✓/✗)
Shared components shipped: <list>
Storybook stories: <count>
A11y violations: <count> (must be 0)
Integrity: <pass|fail>
Known debt: <list>
```

Begin.
