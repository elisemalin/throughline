---
status: [DECIDED: accept-migrate]
filed: 2026-05-16
decided: 2026-05-16
author: Security Agent
decided-by: Architect (Day-4 kickoff override)
---

# Proposal: CSP nonce migration — defer until rendering-mode trade-off is settled

## Decision (Day-4 override)

The deferral is revoked. Migration lands in `agent/security/d4`.

**Rationale:** Frontend's Day-3 design refresh added `export const dynamic = 'force-dynamic'` to `app/layout.tsx`, which removes the headline reason to defer (the rendering-mode trade-off — ISR / PPR / CDN-cache loss — is already paid). Worse, the static `script-src 'self' 'strict-dynamic'` CSP started blocking inline scripts Next emits at render time (router-state hydration, chunk preloads), visible as a CSP violation on the `/skills` import button modal. The shipped CSP became actively harmful before the proposal could be revisited deliberately.

**Implementation:** see the d4 PR description. middleware.security.ts gains `generateNonce()` + `buildSecurityHeaders({ nonce, isDev })`; middleware.ts generates the nonce per request and passes it to `applySecurityMiddleware(req, userId, { nonce })`; the helper forwards it as the `x-nonce` request header so `app/layout.tsx` reads it via `(await headers()).get('x-nonce')` and passes it to `<ClerkProvider nonce={nonce}>`. SRI alternative remains rejected (still experimental, doesn't address inline-style policy).

The analysis below remains as historical context for the original deferral.

---

# Original proposal (PENDING REVIEW at filing)

## Question

Should Throughline migrate from `script-src 'self' 'strict-dynamic'` (with an explicit Clerk + Anthropic origin allowlist) to a per-request nonce CSP (`script-src 'self' 'nonce-{value}' 'strict-dynamic'`) on Day 3?

## Findings — Next 15 does support nonces

The Day-2 threat-model.md said "CSP nonce-based script execution is deferred — requires a Next.js middleware → render context handoff that App Router does not surface stably in 15.x." That phrasing is wrong as of Next 13.4.20+. The current recipe is documented at <https://nextjs.org/docs/app/guides/content-security-policy>:

1. Middleware generates a per-request nonce (`Buffer.from(crypto.randomUUID()).toString('base64')`).
2. Middleware sets the nonce on the response's `Content-Security-Policy` header AND forwards a custom `x-nonce` header on the request.
3. Next.js auto-applies the nonce to framework scripts, page-specific JS bundles, inline styles/scripts it emits, and `<Script>` components.
4. Server components read the nonce via `(await headers()).get('x-nonce')` when they need to render their own `<Script nonce={...}>` tags.

We can implement this inside `middleware.security.ts` `withSecurityHeaders` today — the API is stable in the Next version we are on (15.5.18).

## Why defer

The cost is not in the implementation. It is in the rendering-mode coupling.

The Next docs are explicit: **all pages must be dynamically rendered when nonces are used**. Concretely:

- Static optimization and Incremental Static Regeneration (ISR) are disabled.
- Partial Prerendering (PPR) is incompatible.
- Pages cannot be cached by CDNs without additional configuration.
- Pages either need an explicit `await connection()` (or equivalent dynamic-rendering opt-in) or they will build successfully and then fail at runtime when no request context is available.

Throughline's Frontend Day-2 routes — `/dashboard`, `/skills`, `/discovery`, `/tracker`, `/documents`, `/interviews`, `/settings` — are all under Clerk auth, so they are already de-facto dynamic. But:

- The public landing (`/`) is a server-component redirect that could otherwise statically render.
- The Clerk-served sign-in / sign-up routes are dynamic by definition.
- The `next.config.ts` and `app/layout.tsx` currently make no opt-in dynamic call; switching to nonce CSP would require either `export const dynamic = 'force-dynamic'` at the layout level OR an `await connection()` insertion that Frontend Agent owns.

The trade-off is real but small (we are already mostly dynamic). The reason to defer is not "cannot do it" but "should not do it as a single-agent unilateral edit." Per FLOOR.md, this kind of cross-cutting rendering-mode change requires Frontend Agent buy-in (they own `/app/(app)/**`) and the Architect's sign-off on the performance cost (Lighthouse 90+ is a studio floor; serial dynamic renders can erode TTFB).

## Subresource Integrity alternative — also defer

Next 14+ ships experimental SRI (`experimental.sri.algorithm`). SRI generates build-time hashes of JS bundles and emits `integrity=` attributes on `<script>` tags. This preserves static generation and CDN caching while still letting us drop `'unsafe-inline'` from `script-src`. Two reasons to defer this too:

1. Experimental flag — Pastel Dawn Developer Guide bans half-shipped features in production paths.
2. SRI does not address inline-style policy; we still need either nonces or `'unsafe-inline'` for Tailwind 4's runtime style emission.

## Recommended Day-3 outcome

1. Keep the current `script-src 'self' 'strict-dynamic'` with the Clerk + Anthropic origin allowlist that Day 2 shipped. This is the Next-recommended non-nonce path for App Router apps.
2. Update `docs/threat-model.md` residual-risk language to describe the real trade-off (rendering-mode cost), not "Next doesn't expose the API."
3. Re-file this proposal as a follow-up when the team is ready to decide on the rendering-mode trade-off. Frontend Agent confirms which routes are forced-dynamic-safe; Architect signs off on the Lighthouse implications; Security implements the migration in a single coordinated PR.

## Risks of deferring

- A successful XSS that bypasses our origin allowlist could execute attacker-injected script tags. Mitigation today: the allowlist is narrow (Clerk + Anthropic + Cloudflare-Turnstile), `object-src 'none'`, `'strict-dynamic'`. Mitigation after migration: nonces make this strictly harder because attacker scripts would also need a valid nonce.
- We carry the risk for the duration of the deferral. The residual risk is acceptable in the BYOK threat model (the asset XSS would target — the localStorage ciphertext — is also defended by passphrase-derived encryption).

## Decision

[PENDING REVIEW] — Architect resolves with `[DECIDED: accept]` (defer per above) or `[DECIDED: reject]` (migrate now; accept the rendering-mode cost) with one-line rationale.
