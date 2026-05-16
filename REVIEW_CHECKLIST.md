# Review Checklist

Owner: Security Agent. QA Agent extends with accessibility + Lighthouse gates.
Every agent reads this before opening a daily PR. Read in addition to
`.claude-roles/FLOOR.md`, not instead of it.

The checklist below is the **author's self-review** the PR description must
acknowledge. Reviewers consult the same list. Anything checked here that is
not actually true in the diff is a `BLOCK` finding.

---

## High-risk surfaces (Security Agent must explicitly approve)

A PR touching any path below requires Security Agent sign-off before merge:

- `/lib/security/**`
- `/middleware.ts` (Foundation auth)
- `/middleware.security.ts`
- Any namespace that handles secrets, keys, passphrases, or external-service credentials
- Any new outbound network egress (`fetch`, SDK clients, webhook senders)
- Any new persistence (Prisma model, Redis key prefix, log sink, analytics emitter)
- `/contracts/storage.ts`, `/contracts/ai.ts`, `/contracts/ats.ts`

If the diff does not touch a high-risk surface, the rest of this checklist
still applies and the author self-checks; Security Agent only deep-reviews
on demand.

---

## Self-review checklist

Confirm each item in the PR description before requesting review.

### 1. Contracts and boundaries

- [ ] No file under `/contracts/*.ts` is modified unless the branch is `architect/*` or a `/contracts/proposals/<date>-<role>-<slug>.md` is filed in the same PR.
- [ ] No file under `/lib/mock-api.ts` is modified unless the branch is `agent/frontend/*` or `architect/*`.
- [ ] `scripts/integrity.sh --diff` exits 0 on the branch (CI enforces; author runs locally first).
- [ ] If a new dependency was added to `package.json`, a one-line rationale is appended to `ARCHITECTURE.md` in the same commit (FLOOR rule 4).

### 2. Key handling (BYOK)

If the diff touches anything under `/lib/security/`, `/app/api/`, or any code that reads / writes Anthropic key material:

- [ ] Plaintext API key never reaches `process.env`, a Prisma column, a log line, an analytics event, or a `fetch` body bound for our server.
- [ ] `localStorage` writes use the keys defined in `/contracts/storage.ts` `LOCAL_STORAGE_KEYS` — no ad-hoc string keys.
- [ ] Encryption path uses `encryptKey` / `decryptKey` from `/lib/security/crypto.ts`. The XOR `noPassphraseFallback` is opt-in only and accompanied by the warning UI (Frontend Agent owns).
- [ ] Wrong-passphrase failures throw with a clear message; the UI handles the throw without leaking residue.

### 3. Server-never-stores

If the diff touches `/app/api/**`, `/lib/server/**`, `/lib/db/**`, `/lib/ai/**`, or `/jobs/**`:

- [ ] No log statement, DB write, analytics call, or egress payload references any name in `SERVER_NEVER_STORES_GREP_TOKENS` (`anthropicKey`, `apiKeyPlaintext`, `apiKeyCiphertext`, `resumeText`, `linkedinText`, `passphrase`, `kdfKey`, `apiKeyIv`, `apiKeySalt`).
- [ ] `scripts/integrity.sh --diff` Rule 9 is green.
- [ ] `pnpm test:security` is green (supplemental grep test catches structured loggers Rule 9 misses).
- [ ] Any new logger / metrics / tracing sink is added to the supplemental grep's `SINK_PATTERN` in `tests/security/never-stores-grep.test.ts` so future diffs are also covered.
- [ ] Prompts and Claude responses are referenced server-side only by SHA-256 hash for caching (`REDIS_KEY_PREFIXES.aiCache`) — never by raw content.

### 4. Rate limit

If the diff adds a new route under `/app/api/`:

- [ ] The route is reachable through `middleware.security.ts` (do not bypass via `matcher` exemption).
- [ ] AI generation routes use the `ai` tier (10 req/min default). Read routes use the `read` tier (60 req/min default).
- [ ] If a non-default limit is necessary, the override and its justification are documented in the PR description.

### 5. Validators

- [ ] Every API route entry runs the request body through a Zod schema from `/contracts/api.ts` with `.strict()`.
- [ ] No `z.passthrough()` on any user-controlled object.
- [ ] No `z.record(z.unknown())` on user-controlled fields.
- [ ] Empty-string normalization: `.optional()` fields use `preprocess('' -> undefined)` where the prototype emits `''`.

### 6. Prompt injection

If the diff touches `/lib/ai/`:

- [ ] Every SYSTEM prompt concatenates `SECURITY_PREAMBLE` from `/contracts/ai.ts`.
- [ ] Every user-supplied string flowing into a Claude prompt is wrapped via `wrapUntrusted()` from `/contracts/ai.ts`. No raw concatenation of user fields into the user message.
- [ ] Cached prompt key is SHA-256 of (system + user + model); never the raw text.
- [ ] One retry on validation failure with the validator error appended to system; second failure surfaces `AIValidationError`.

### 7. External egress (ATS)

If the diff touches `/lib/ats/` or `/jobs/`:

- [ ] No import from `/lib/ai/` (`scripts/integrity.sh` Rule 7).
- [ ] No hardcoded provider URL outside `ATS_ENDPOINTS` in `/contracts/ats.ts` (`scripts/integrity.sh` Rule 5).
- [ ] Slug values are validated by `atsSlugSchema` before being interpolated.
- [ ] `fetch` does not follow redirects across schemes.
- [ ] `ATS_REQUEST_DELAY_MS` (2000) is honored between calls to the same provider.

### 8. FLOOR non-negotiables

- [ ] No emojis. Anywhere (code, commits, copy, docs, comments).
- [ ] No AI co-authorship attribution. No `Co-Authored-By: Claude`, no `Generated with Claude Code`, no AI footer on commits / PRs / issues. Ever.
- [ ] Comments answer WHY, never WHAT. Identifiers cover the WHAT.
- [ ] Every regex, type, or algorithm in the diff can be explained in plain language to the Architect.
- [ ] `CHANGELOG.md` entry appended in the format from FLOOR.md.

### 9. Test coverage

- [ ] New `/app/api/` route has an integration test.
- [ ] New contract has a mock-api equivalent updated by Frontend Agent (cross-PR coordination is acceptable; flag it in the PR description).
- [ ] New `/lib/security/` surface has a test under `/tests/security/`.

### 10. Definition of done

- [ ] `pnpm typecheck` — zero errors.
- [ ] `pnpm lint` — zero errors.
- [ ] `pnpm test:security` — green.
- [ ] `bash scripts/integrity.sh` — exits 0.
- [ ] Role-specific `pnpm test:<role>` (when defined) — green.

---

## Severity guide for review findings

Reviewers (and the `/review-pr` skill) map findings to severities so the
Architect can act fast. The same scale appears in `.claude-roles/reviewer.md`.

- `BLOCK` — security violation, irreversible data risk, or FLOOR.md non-negotiable breach. Cannot ship.
- `CRITICAL` — must be fixed before merge. Includes contract drift, mock-vs-real signature drift, missing prompt-injection defense, log statements that violate `SERVER_NEVER_STORES`.
- `MEDIUM` — fix in this PR or queue an immediate follow-up. Validator gaps, missing dependency justification, missing test for a changed surface.
- `LOW` — polish. WHY comments missing, edge cases the contract misses, type-system smell.
