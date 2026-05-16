# Throughline

A job-search OS. Skills DB, alignment scoring, document generation, mock interviews, and ATS-watch discovery — all powered by user-provided Anthropic keys.

First reference implementation of the [Multi-Agent Orchestration](https://github.com/elisemalin) pattern from Pastel Dawn Core (vault: `~/Documents/General Vault/Pastel Dawn Core/Core Documents/Multi-Agent Orchestration.md`).

## Status

Pre-Day-0. Scaffolding only. No application code yet.

## Layout (current)

```
.claude-roles/    # Role CLAUDE.md files, one per agent stream. Copied into worktrees on Day 1.
contracts/       # /contracts/*.ts will live here from Day 0. proposals/ is for mid-sprint contract changes.
prototype/       # Throughline.jsx — design spec and shape-of-truth until contracts land.
scripts/
  integrity.sh   # Enforces inter-agent boundaries; runs in CI and pre-merge.
  integrate.sh   # Day 5 mock-swap with staged smoke gates.
throughline-handoff.md   # Multi-agent build plan. Serves as TECHSPEC until formalized.
```

## How to start work

1. Read `throughline-handoff.md` and the vault doc `Multi-Agent Orchestration.md`.
2. Day 0 (Architect): write `/contracts/*.ts`, pre-populate `/lib/mock-api.ts`.
3. Day 1: Foundation Agent only (sequential). Other streams unblock after Foundation merges.
4. Days 2-4: parallel sprint.
5. Day 5: integration. Day 6: QA and polish.

## Standards inherited

- Pastel Dawn Developer Guide non-negotiables — see `.claude-roles/FLOOR.md`
- WCAG 2.1 AA + Lighthouse 90+ on every public route — QA Agent gates merges on both
- Contracts before code, mock-first everywhere, definition of done is testable

## License

TBD.
