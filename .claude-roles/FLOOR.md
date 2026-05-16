# FLOOR.md — non-negotiables every agent inherits

This file is referenced from every agent's CLAUDE.md. It captures the Pastel Dawn studio rules that survive the multi-agent orchestration. See `Pastel Dawn Core/Core Documents/Developer Guide.md` for the source.

These are floors, not ceilings. Your role-specific CLAUDE.md can require more; it cannot relax these.

## Code

1. **No emojis.** Anywhere. Code, commits, copy, docs, comments. None.
2. **Line-by-line explainable.** Never ship code you cannot walk through with the Architect in plain language. If a regex, type, or algorithm is too clever to explain, simplify or comment the WHY.
3. **WHY comments only.** Comments answer why the code exists or what hidden constraint it honors, never what it does. Identifier names cover the what.
4. **No dependency without justification.** Every new package added to `package.json` requires a one-line rationale appended to `ARCHITECTURE.md` in the same commit.
5. **No silent contract divergence.** If a contract in `/contracts/*.ts` cannot express what you need, stop and file `/contracts/proposals/<date>-<role>-<slug>.md`. Do not work around it locally.

## Docs each agent maintains

Every agent owns a slice of these:

- **`REQUIREMENTS.md`** — Architect owns; agents read only.
- **`TECHSPEC.md`** — Architect owns; the project handoff doc + `/contracts/*.ts` serve as this until the Architect formalizes it.
- **`ARCHITECTURE.md`** — Foundation Agent seeds; every agent appends to it when introducing a non-default dependency or making a load-bearing structural choice.
- **`CHANGELOG.md`** — every agent appends one entry per end-of-day commit, format below.
- **`REVIEW_CHECKLIST.md`** — Security Agent owns; QA Agent extends; every other agent reads before opening a daily PR.

### CHANGELOG entry format

```
## [agent/<role>/d<N>] — YYYY-MM-DD
### Added / Changed / Fixed
- <terse bullet, one per landed surface>
### Contract notes
- <any proposal filed, accepted, or rejected today>
### Carried over
- <unfinished item moving to tomorrow, or "none">
```

## Decision-point markers

When a `/contracts/proposals/*.md` is filed, it opens with status `[PENDING REVIEW]`. The Architect closes it as either `[DECIDED: accept]` or `[DECIDED: reject]` with a one-line rationale. No third state. Proposals stay in the repo as history.

## Accessibility & performance floors (QA gates)

- WCAG 2.1 AA compliance on every page (axe-core: zero violations).
- Lighthouse 90+ on Performance, Accessibility, Best Practices, SEO for every public route.

These are studio non-negotiables (Pastel Dawn Core Value #4). QA Agent enforces; if a route can't hit 90, the route is wrong, not the test.

## Two-agent review for high-risk surfaces

The multi-stream orchestration replaces the studio's default two-agent loop, but the adversarial-review principle still applies to high-risk diffs. Before merging anything in these areas, the owning agent posts the diff to the Security Agent for explicit review:

- `/lib/security/**`
- Any namespace that handles secrets, keys, or external-service credentials
- `/middleware*.ts`
- Any code that touches external network egress

Security Agent acts as the adversarial reviewer per `AI-Assisted Development.md`'s pattern. Other surfaces get cross-stream review only at the daily merge boundary (Architect).

## Communication style (when this agent talks back to the Architect)

- Direct. No hedging, no softening.
- No performative enthusiasm. No "great question" / "love that idea."
- Present options with tradeoffs when there's a choice to make; the Architect decides.
- State uncertainty explicitly when you have it.
- Concise. The Architect reads the diff; don't repeat it in prose.

## What "done" means

Done = the runnable definition-of-done in your role CLAUDE.md exits zero AND your CHANGELOG entry is appended AND any `[PENDING REVIEW]` proposals you filed are resolved AND `scripts/integrity.sh --diff` exits zero on your branch.

Anything less is in-progress.
