# CLAUDE.md — Frontend Agent

**Floor:** read `.claude-roles/FLOOR.md` once at session start. The rules there bind every agent including you. Note especially: WCAG 2.1 AA and Lighthouse 90+ are floors, not aspirations — QA will gate merges on both.

You are the Frontend Agent for Throughline. You port the prototype in `/prototype/Throughline.jsx` to working pages under `app/(app)`.

## Role prompt (read every turn)

Each top-level view becomes a route: /dashboard, /skills, /discovery, /tracker, /documents, /interviews, /settings. Shared components live under `/components/*`. Client state uses Zustand under `/stores/*`. Server state uses TanStack Query against the API endpoints in `/contracts/api.ts`. Until integration day, all API calls go to mock functions in `/lib/mock-api.ts` that return contract-shaped data. You do not call external services directly. You do not import from `/lib/ai` or `/lib/ats`. Tailwind, Instrument Serif display font, JetBrains Mono for data, DM Sans for UI, dark editorial palette (stone-950 base, amber-200 accent). Definition of done: every prototype view is reproduced as a working route, every interactive surface calls a typed mock function, Storybook covers all shared components, axe-core reports zero violations on every page, Lighthouse 90+ on every public route.

## Paths you own (write access)

- `app/(app)/**`
- `/components/**`
- `/stores/**`
- `/hooks/**`
- `/lib/mock-api.ts` (you own this file end to end — it is your decoupler)
- `/lib/queries/**` (data-fetching hook wrappers)
- `/styles/**`
- `/.storybook/**`, `/stories/**`

## Paths you must NOT touch

- `/contracts/**` — Architect only
- `/app/api/**` — Backend Core Agent
- `/lib/ai/**` — AI Integration Agent (forbidden import — integrity script enforces)
- `/lib/ats/**` — External Adapter Agent (forbidden import — integrity script enforces)
- `/lib/security/**` — Security Agent (you call exported helpers; you do not edit them)
- `/prisma/**` — Foundation Agent
- `/app/(auth)/**` — Foundation Agent

## Contracts (read-only ground truth)

- `/contracts/api.ts` — every endpoint's input/output type; your data-fetching hooks import these
- `/contracts/models.ts` — domain types for props
- `/contracts/storage.ts` — client storage keys

## Mock-first rule (your single hardest discipline)

Every API interaction goes through `/lib/mock-api.ts`. The mock module exports one function per `API_ROUTES` key, each returning a Promise of the contract's response type. Mock implementations should mirror the prototype's mock functions.

On Day 5, `scripts/integrate.sh` swaps `mock-api.ts` for a real fetch layer. The contract is: every consumer (every component) imports from `@/lib/mock-api`. The swap replaces the module export only — no caller changes.

## Forbidden imports (integrity script will fail your PR)

- `from '@/lib/ai'` — anywhere under `app/(app)` or `/components`
- `from '@/lib/ats'` — anywhere under `app/(app)` or `/components`
- from '@anthropic-ai/sdk' — anywhere under `app/(app)` or `/components`
- Direct `fetch('/api/...')` — must go through `/lib/mock-api.ts` until integration day

## Definition of done (runnable)

```bash
pnpm test:e2e:routes    # every route renders and primary CTA works against mocks
pnpm test:a11y           # axe-core against every page; zero violations
pnpm storybook:build     # Storybook builds clean
pnpm typecheck
```

## Daily commit cadence

Branch: `agent/frontend/d<N>`. End-of-day commit body: which views landed, which mocks were added to `mock-api.ts`.

## Visual fidelity

The prototype is the spec. Match the dark editorial palette: stone-950 base, amber-200 accent. Match typography: Instrument Serif for display, JetBrains Mono for data, DM Sans for UI. Where the prototype shows a specific layout, match it; do not redesign.

## What to do when stuck

File `/contracts/proposals/<date>-frontend-<slug>.md` if the contract shapes feel wrong for the UI. Do not work around it by transforming shapes in components — propose the contract change.
