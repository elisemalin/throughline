# Throughline: Multi-Agent Build Plan

A parallelized build plan for Throughline targeting ship-in-a-week with multiple Claude Code sessions running concurrently against pre-defined contracts. The previous single-thread handoff is folded into this one. Sections marked **[KEEP]** are technical decisions inherited from the prior doc.

## 0. Reality check on multi-agent dev

Multi-agent parallelism does not scale linearly. Two streams is roughly 1.6x faster than one. Four is 2.5x. Beyond four, coordination overhead eats the gains for a project this size. The cap for a solo orchestrator running Claude Code sessions is around four to five active streams before merge conflicts and context switching slow you down more than the parallelism speeds you up.

What actually compresses the timeline:

1. Contracts written before any code. Every API shape, every prop interface, every storage schema lives in `/contracts` as TypeScript types before any agent starts work. This is the single highest leverage activity.
2. Mock-first development. Frontend builds against mocked endpoints. Backend builds against mocked AI calls. Mocks live in the contract files and are deleted at integration.
3. One sequential day of foundation work. Trying to parallelize Day 1 always backfires. Auth, schema, deploy pipeline must be in place before parallel work begins.
4. Daily merge cadence. End of each day, all branches merge to main. Conflicts get resolved while the work is fresh.
5. One human orchestrator (you). The agents do not coordinate with each other. They coordinate with you. Every output goes through you before it gets merged.

The honest framing: you are running a distributed build with you as the operating system. Treat it that way.

## 1. Build philosophy

Three rules in order of priority:

**Contracts before code.** No agent writes implementation until the input and output types are committed to `/contracts`. If an agent needs a type that does not exist, work stops, the type gets defined, and then work resumes.

**Mock-first everywhere.** Backend agents return mock data shaped like the contract. Frontend agents call mock functions shaped like the contract. AI agents return structured mock responses. Integration happens at the end, not throughout.

**Definition of done is testable.** Every agent ships with a definition of done that is a runnable command or a checkable artifact, not a vibe. "Frontend Skills view complete" means "all six Playwright assertions in `tests/e2e/skills.spec.ts` pass."

## 2. The roster

Eight roles. Seven agents plus you as architect/orchestrator.

| Role | Scope | Sessions | Active days |
|---|---|---|---|
| Architect | Orchestrate, own contracts, merge, decide | You | All |
| Foundation Agent | Repo, auth, DB schema, deploy pipeline | 1 | Day 1 |
| Backend Core Agent | REST/tRPC endpoints, business logic | 1 | Days 2-5 |
| AI Integration Agent | Anthropic SDK wrapper, prompts, response parsing | 1 | Days 2-4 |
| ATS Adapter Agent | Poller worker, four provider adapters, validation | 1 | Days 3-5 |
| Frontend Agent | All views, state, routing, against mocked API | 1 | Days 2-5 |
| Security Agent | BYOK key handling, encryption, rate limit, audit | 1 | Days 3-5 |
| QA Agent | Integration tests, e2e tests, accessibility, security review | 1 | Days 5-6 |

You can collapse AI Integration and ATS Adapter into Backend Core if you want to reduce stream count to four. Recommended only if you have done this orchestration pattern before.

## 3. Day-by-day timeline

Aggressive but realistic for a focused solo orchestrator running Claude Code.

**Day 0 (4 hours): Contracts**

You write `/contracts/*.ts` files defining every type, every API shape, every storage key. No code yet. This is the document of record for the entire build.

Deliverables: `/contracts/api.ts`, `/contracts/ai.ts`, `/contracts/ats.ts`, `/contracts/storage.ts`, `/contracts/models.ts`.

**Day 1 (6 hours): Foundation, sequential**

Foundation Agent works alone. No other agent starts until Day 1 closes.

Deliverables: Next.js 15 app deployed to Vercel, Clerk auth wired, Prisma migrations applied to Neon, CI green, `pnpm dev` runs, login flow works end to end.

**Days 2 through 4 (3 days, parallel): Build sprint**

Five agents work concurrently against contracts and mocks.

- Backend Core builds CRUD endpoints returning mock data
- AI Integration builds the Anthropic wrapper with mocked Claude responses
- ATS Adapter builds the four provider adapters with fixture-based responses
- Frontend ports the prototype JSX to real Next.js pages, calling mock API
- Security audits as code lands, files issues against PRs

End of Day 4: every layer works in isolation. Nothing is wired together yet.

**Day 5 (8 hours): Integration**

You orchestrate the integration. Mocks get removed one layer at a time. Backend connects to real DB. AI Integration calls real Anthropic. ATS Adapter polls real endpoints. Frontend calls real API. Each integration gets a smoke test before the next one starts.

**Day 6 (6 hours): QA and polish**

QA Agent runs the full suite. Accessibility audit. Security review. Performance check. You fix what breaks. Ship.

**Total: 6 working days of orchestration, roughly 30-40 hours of your time, with the agents doing the bulk of the implementation.**

Compared to single-thread: previous plan was 12.5 engineering days. This compresses to 6 calendar days at the cost of higher orchestration intensity.

## 4. Contracts (the spec layer)

Every contract is a TypeScript file under `/contracts`. Agents read these as ground truth.

### 4.1 `/contracts/models.ts`

Mirrors the Prisma schema. Includes domain models, enums, and inferred relations. **[KEEP]** the schema from the previous handoff: User, SkillsDB, Job, Project, Application, ApplicationEvent, Document, WatchlistCompany, DiscoveredPosting, and all enums.

### 4.2 `/contracts/api.ts`

Every API endpoint with input and output types. Example:

```ts
export type AlignmentRequest = {
  jobDescription: string;
  skillsDBId: string;
};

export type AlignmentResponse = {
  score: number;
  requirements: Array<{
    requirement: string;
    strength: number;
    type: 'strong' | 'partial' | 'missing';
    evidence: string;
    recommendation: string;
  }>;
  missingKeywords: string[];
  recommendation: string;
};

export const API_ROUTES = {
  alignment: '/api/alignment',
  resume: '/api/documents/resume',
  coverLetter: '/api/documents/cover-letter',
  ninetyDayPlan: '/api/documents/ninety-day-plan',
  dossier: '/api/documents/dossier',
  discoveryPoll: '/api/discovery/poll',
  watchlistAdd: '/api/watchlist',
  skillsDbIngest: '/api/skills/ingest',
} as const;
```

Backend implements these. Frontend imports the types and mock-implements the functions. At integration, Frontend swaps mock to fetch.

### 4.3 `/contracts/ai.ts`

System prompts, input shapes, response schemas, retry policy. Each AI workflow gets a named export.

```ts
export const ALIGNMENT_SYSTEM = `You are an internal recruiter and ATS analyst...`;
export const RESUME_SYSTEM = `Generate a tailored resume...`;
// etc

export type AlignmentInput = { skillsDB: SkillsDB; jobDescription: string; };
export type AlignmentRawOutput = { /* JSON shape Claude returns */ };
export const AlignmentSchema = z.object({ /* zod validator */ });
```

AI Integration Agent owns this file. Backend Core imports from it.

### 4.4 `/contracts/ats.ts`

Provider adapter interface. Each of the four providers implements this.

```ts
export interface AtsAdapter {
  provider: 'greenhouse' | 'lever' | 'ashby' | 'workday';
  validateSlug(slug: string): Promise<{ valid: boolean; error?: string }>;
  fetchPostings(slug: string): Promise<RawPosting[]>;
  normalize(raw: RawPosting): DiscoveredPosting;
}

export type RawPosting = unknown; // provider-specific
```

ATS Adapter Agent owns this file. Backend Core imports the registry of adapters.

### 4.5 `/contracts/storage.ts`

Storage keys and shapes for both server (Postgres via Prisma) and client (localStorage for BYOK key only).

```ts
export const LOCAL_STORAGE_KEYS = {
  apiKey: 'throughline:apiKey',           // encrypted at rest
  apiKeyMeta: 'throughline:apiKeyMeta',   // last4, createdAt
} as const;

export const SERVER_NEVER_STORES: readonly string[] = [
  'Anthropic API keys',
  'Raw prompts sent to Claude',
  'Raw Claude responses',
];
```

Security Agent owns this and enforces the never-stores list.

## 5. Agent role definitions

Each role gets a system prompt for the Claude Code session driving it. Initialize each session with the prompt verbatim, plus a pointer to `/contracts`.

### 5.1 Foundation Agent

**Owns:** Repo scaffolding, Clerk auth, Prisma schema, Neon DB, Vercel deploy, CI.

**System prompt:**

> You are the Foundation Agent for Throughline. Your only job is to produce a deployed Next.js 15 application with Clerk authentication, Prisma connected to Neon Postgres, and CI passing on GitHub Actions. You work in `/`, `/prisma`, `/app/(auth)`, and `/.github`. You do not touch `/app/(app)` or `/api`. The Prisma schema is defined in `/contracts/models.ts` as TypeScript; translate it to `schema.prisma` exactly. Definition of done: a fresh clone, `pnpm install`, `pnpm dev` runs; signing up creates a User row; `pnpm test:smoke` passes; main branch deploys green to Vercel.

**Definition of done:** The four bullets above are checkable in one sitting.

**Sequential before:** All other agents.

### 5.2 Backend Core Agent

**Owns:** All `/app/api/*` routes, business logic, DB access via Prisma client.

**System prompt:**

> You are the Backend Core Agent for Throughline. You implement REST handlers under `/app/api/*` matching the contracts in `/contracts/api.ts` exactly. You import AI workflows from the AI Integration Agent's namespace (`@/lib/ai`), and ATS adapters from `@/lib/ats`. You do not make HTTP calls to Anthropic directly. You do not implement provider polling logic. You use Prisma client for all DB access. Every endpoint validates inputs with Zod schemas defined in `/contracts/api.ts`. Every endpoint requires authenticated session via Clerk middleware. Definition of done: all routes in `API_ROUTES` return contract-shaped responses, all integration tests in `tests/api/*` pass against a seeded DB.

**Parallel after:** Foundation done.

**Depends on:** Contracts, AI Integration namespace, ATS Adapter namespace.

### 5.3 AI Integration Agent

**Owns:** `/lib/ai/*`. Anthropic SDK wrapper, prompts, response parsing, retry logic.

**System prompt:**

> You are the AI Integration Agent for Throughline. You produce `/lib/ai/*` exposing typed functions for every AI workflow: alignment, resume, coverLetter, ninetyDayPlan, dossier, mockInterview, skillsDbIngest. Each function takes the input shape defined in `/contracts/ai.ts` and returns a Zod-validated response. You use the Anthropic SDK with `dangerouslyAllowBrowser: true` so the API key flows through from the client request body, never stored server-side. You implement one retry on validation failure with the error appended to the system prompt. You cache by SHA-256 hash of the full prompt in Redis with a 24-hour TTL. Definition of done: every workflow function passes its unit test in `tests/ai/*` with mocked Anthropic responses, plus one live smoke test per workflow with a real key.

**Parallel after:** Foundation done.

**Depends on:** Contracts only.

### 5.4 ATS Adapter Agent

**Owns:** `/lib/ats/*`. Provider adapters and the daily poller.

**System prompt:**

> You are the ATS Adapter Agent for Throughline. You produce `/lib/ats/*` implementing the `AtsAdapter` interface from `/contracts/ats.ts` for four providers: Greenhouse, Lever, Ashby, Workday. Greenhouse, Lever, and Ashby are MVP scope. Workday ships in v1.1; provide a stub that throws "not implemented." You produce `/jobs/poll.ts` as an Inngest function that runs daily, iterates active WatchlistCompany rows, fetches new postings via the adapter, dedups by external ID, and writes new DiscoveredPosting rows. You do not score postings; that is Backend Core's responsibility. You strictly use public APIs at the documented endpoints; you never scrape. You handle rate limits with 2-second delays between provider calls. Definition of done: fixtures for each provider live in `tests/fixtures/ats/`, all adapter unit tests pass, the poller has an integration test that hits real Greenhouse with three known slugs and verifies dedup.

**Parallel after:** Foundation done.

**Depends on:** Contracts only.

### 5.5 Frontend Agent

**Owns:** Everything under `/app/(app)/*`. All views, routing, client state.

**System prompt:**

> You are the Frontend Agent for Throughline. You port the prototype in `/prototype/Throughline.jsx` to Next.js 15 App Router pages under `/app/(app)/*`. Each top-level view becomes a route: `/dashboard`, `/skills`, `/discovery`, `/tracker`, `/documents`, `/interviews`, `/settings`. Shared components live under `/components/*`. Client state uses Zustand stores under `/stores/*`. Server state uses TanStack Query against the API endpoints in `/contracts/api.ts`. Until integration day, all API calls go to mock functions in `/lib/mock-api.ts` that return contract-shaped data. You do not call Anthropic directly. You do not import from `/lib/ai` or `/lib/ats`. The design system is defined: Tailwind, Instrument Serif display font, JetBrains Mono for data, DM Sans for UI, dark editorial palette (stone-950 base, amber-200 accent). Definition of done: every prototype view is reproduced as a working route, every interactive surface calls a typed mock function, Storybook covers all shared components, axe-core reports zero violations on every page.

**Parallel after:** Foundation done.

**Depends on:** Contracts and `/lib/mock-api.ts` (which it owns).

### 5.6 Security Agent

**Owns:** `/lib/security/*`, middleware, security review of all PRs, threat model doc.

**System prompt:**

> You are the Security Agent for Throughline. You enforce three properties of the system. First, BYOK keys are encrypted at rest in browser storage using a derived passphrase, with a no-passphrase fallback that warns the user explicitly. Second, no key, prompt, or Claude response is ever written to server-side storage, logs, or analytics. Third, rate limiting on all API endpoints uses Upstash Redis with conservative defaults. You produce `/lib/security/crypto.ts` for the encryption layer, `/lib/security/rate-limit.ts` for the middleware, and `/docs/threat-model.md` covering the BYOK trust boundary, ATS polling abuse, and prompt injection via job descriptions. You review every PR by other agents and file issues tagged `security:` against any code that touches keys, secrets, or external network calls. Definition of done: encryption round-trip test passes, rate limiting integration test passes, threat model doc reviewed by Architect, all `security:` issues closed before integration.

**Parallel after:** Foundation done.

**Depends on:** Contracts.

### 5.7 QA Agent

**Owns:** `/tests/*`, Playwright e2e, accessibility audit, integration smoke tests.

**System prompt:**

> You are the QA Agent for Throughline. You produce Playwright e2e tests under `/tests/e2e/*` covering the seven core user flows: signup, skills DB import, application add, alignment scoring, document generation, discovery poll, mock interview. You produce an accessibility audit under `/docs/a11y-report.md` running axe-core against every page. You produce a manual security review checklist under `/docs/security-checklist.md` and walk through it. You do not write unit tests; those are owned by the agent producing the unit under test. Definition of done: all seven e2e flows pass against the deployed staging environment, axe-core score 100 on all pages, security checklist signed off.

**Parallel after:** Day 4 close.

**Depends on:** All other agents.

## 6. Dependency graph

```
Day 0:  Architect writes /contracts
Day 1:  Foundation Agent (sequential)
            |
            v
Day 2-4: [Backend Core] [AI Integration] [ATS Adapter] [Frontend] [Security]
            |                |               |             |
            +-------+--------+---------------+-------------+
                    |
Day 5:           Architect integration
                    |
Day 6:           QA Agent
                    |
                  Ship
```

Backend Core has soft dependencies on AI Integration and ATS Adapter namespaces, but those are mocked until integration day. No agent blocks another during Days 2-4.

## 7. Coordination patterns

### 7.1 Daily merge

End of each day, every agent commits to a feature branch named `agent/<role>/<day>`. You merge sequentially in this order: Foundation, Security, Backend, AI Integration, ATS, Frontend, QA. Conflicts get resolved by you, not by the agent that introduced them.

### 7.2 Contract changes

If any agent needs to change a contract, work stops in their stream, they file a contract proposal in `/contracts/proposals/`, you decide within an hour, and either accept it (updating `/contracts/*.ts`) or reject it. No agent edits `/contracts/*.ts` directly.

### 7.3 Cross-agent blockers

If Agent A needs something from Agent B, Agent A writes a mock and files an issue. Agent B sees the issue at their next merge boundary and either implements or pushes back. No direct agent-to-agent dependencies during the parallel sprint.

### 7.4 What goes in your head

You hold three things at all times: the contracts, the dependency graph, and the integration plan. Everything else lives in the agents and their commits. If you find yourself remembering implementation details, you are doing the wrong job.

## 8. Inherited technical decisions [KEEP]

These are unchanged from the prior handoff. Agents implement against them.

### 8.1 Stack

Next.js 15 App Router, React 19, Tailwind, Prisma, Neon Postgres, Clerk auth, Anthropic SDK with BYOK, Inngest for background jobs, Upstash Redis for rate limits and caching, Vercel hosting, Playwright for e2e, axe-core for a11y.

### 8.2 Architecture

Anthropic API calls go direct from browser to Anthropic using the user's key. Server never sees prompts. ATS polling runs server-side as a daily Inngest function. Postgres holds all persistent data except the BYOK key, which lives encrypted in browser storage.

### 8.3 Prisma schema

Defined in full in the prior handoff. Lives in `/contracts/models.ts` as TypeScript and is translated to Prisma by Foundation Agent. Includes: User, SkillsDB, Job, Project, Application, ApplicationEvent, Document, WatchlistCompany, DiscoveredPosting, with enums for ApplicationStatus, DocumentKind, AtsProvider, DiscoveryStatus.

### 8.4 ATS providers

Greenhouse, Lever, Ashby in MVP. Workday stubbed. Public APIs only, no scraping. Endpoint patterns:

- Greenhouse: `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`
- Lever: `https://api.lever.co/v0/postings/{slug}?mode=json`
- Ashby: `https://api.ashbyhq.com/posting-api/job-board/{slug}`
- Workday: `https://{tenant}.{region}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` (POST)

### 8.5 AI workflows

Seven core workflows: skills DB ingestion, alignment analysis, resume generation, cover letter, 90-day plan, mock interview, dossier with web_search. All use `claude-sonnet-4-5` except ingestion which can fall back to Opus on validation failure.

### 8.6 Cost model

Approximately $6 per active user per month, all paid by the user. Hosting on free tiers covers thousands of users.

## 9. Honest timeline

Single-thread baseline from the prior handoff: 12.5 working days.

Multi-agent compressed: 6 calendar days, 30-40 orchestration hours.

The remaining time is consumed by:

- 4 hours: writing contracts on Day 0
- 6 hours: orchestrating Foundation Agent on Day 1
- 4 hours per day x 3: monitoring parallel sprint, merging, unblocking
- 8 hours: integration day
- 6 hours: QA day and ship

If you have done multi-agent orchestration before, the lower end is real. If this is your first time running this many concurrent Claude Code sessions, add a day for orchestration learning curve.

## 10. Anti-patterns that will eat your speedup

These are the failure modes that turn a 6-day build back into a 14-day build.

**Contracts that drift during the sprint.** Once contracts are committed at end of Day 0, they are frozen until integration. Any agent that asks to change one mid-sprint should be redirected to mocks unless the change is unavoidable.

**Agents calling other agents.** Frontend calling AI Integration directly bypasses the Backend Core boundary and makes integration a nightmare. Every layer goes through the layer above it.

**Skipping the mock layer.** "It's faster to just call the real Anthropic API" is the most expensive shortcut available. The whole point of the parallel sprint is that no agent waits for another's real implementation. Honor the mocks.

**Daily standups with the agents.** They are sessions, not employees. Status comes from their commits, not from asking them. If you find yourself prompting "what's the status," you are wasting tokens.

**Letting the QA Agent start early.** QA against incomplete code produces noise. Hold QA to Day 5+ even when other agents finish early.

**Adding an eighth agent.** No.

## 11. First action

Open seven Claude Code sessions. Initialize them with the role prompts in section 5. Initialize an eighth (Architect) for yourself to draft `/contracts/*.ts`. The Architect session is the only one that produces work on Day 0.

You will write contracts for four hours, then sleep, then run Day 1.

Ship Friday.
