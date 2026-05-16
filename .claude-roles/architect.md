# CLAUDE.md — Architect

**Floor:** read `.claude-roles/FLOOR.md` once at session start. The rules there bind every agent including you.

You are the Architect for Throughline. You are the human in this loop — these instructions describe the role, not a Claude Code session. The other CLAUDE.md files in this folder describe the agents you orchestrate.

## What you own

- `/contracts/**` — write access; this is your single source of truth
- `/contracts/proposals/*` — close every proposal within 1 hour of filing
- `MERGE_LOG.md` — append-only record of daily merges and conflict resolutions
- The dependency graph in your head
- The integration plan

## What you do NOT do

- Implement features in any agent's worktree
- Skip the daily merge cadence
- Edit role CLAUDE.md files mid-sprint (file a kit update instead, post-ship)
- Add an eighth agent

## Daily cadence

**Day 0 (4 hours).** Write `/contracts/*.ts`: every type, every API shape, every storage key. Pre-populate `/lib/mock-api.ts` matching the contracts. Stamp the seven agent worktrees with their role CLAUDE.md files via `scaffold-multiagent.py`. No code from agents yet.

**Day 1 (6 hours).** Foundation Agent only. You monitor. No parallelization.

**Days 2-4 (~4 hours/day).** Morning: read commits. Midday: field contract proposals within the hour. End of day: merge in order — Foundation → Security → Backend Core → AI Integration → External Adapter → Frontend → QA. Run `scripts/integrity.sh --diff` between each merge.

**Day 5 (8 hours).** You drive integration. Run `scripts/integrate.sh backend`, smoke, then `ai`, smoke, then `external` (or whatever stages your project has).

**Day 6 (6 hours).** QA agent leads. You fix what breaks. Ship.

## Merge order rationale

Foundation first — it's the substrate. Security second — its policies have to be in place before Backend lands real handlers. Then Backend, then AI/External (in either order; they don't conflict). Frontend last among feature agents because it's the largest surface. QA after everything.

## Contract proposals

Format under `/contracts/proposals/<YYYY-MM-DD>-<role>-<slug>.md`:

```markdown
# [PENDING REVIEW] Proposal: <slug>

**Filed by:** <role>
**Affects:** <which contract file>
**Why:** <one paragraph>
**Proposed change:** <diff or prose>
**Alternatives considered:** <one line each>
**Impact if rejected:** <agent will mock and continue, or work stops>
```

Close by changing `[PENDING REVIEW]` to `[DECIDED: accept]` or `[DECIDED: reject]` and appending a one-line rationale. Proposals stay in the repo as history.

## What goes in your head

Three things at all times: the contracts, the dependency graph, the integration plan. Everything else lives in the agents and their commits.

## When to stop the build

- A contract change is requested mid-sprint that affects more than one stream → stop, decide, propagate, then resume.
- Integrity script fails on a merge → block the merge, fix the boundary violation, then resume.
- Two agents file conflicting proposals → resolve before either resumes.

## When to abort to single-thread

If by end of Day 3 fewer than three streams are actually productive, the orchestration overhead has exceeded the parallelism gain. Collapse to two-agent loop for the remaining work; don't sunk-cost the original plan.
