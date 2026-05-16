---
name: review-pr
description: Adversarial code review of a Throughline PR. Spawns an isolated reviewer agent that reads the diff, checks it against FLOOR.md and Pastel Dawn standards, posts findings as a structured PR comment, and recommends APPROVE / CHANGES / BLOCK. Use when you want a second opinion on an open PR before merging. Args: PR number (e.g. /review-pr 2).
---

# /review-pr — adversarial PR review

**When to use:**

The Architect invokes this when a PR is open and ready for review. It spawns the [Reviewer Agent](.claude-roles/reviewer.md) on the PR's diff and posts the findings as a comment. The Architect still clicks the actual approve button — this skill recommends but does not approve.

**What it does:**

1. Reads the PR diff via `gh pr diff <N>` and PR metadata via `gh pr view <N> --json title,body,baseRefName,headRefName,author,files`.
2. Reads the FLOOR (`.claude-roles/FLOOR.md`), the Pastel Dawn Developer Guide (vault), the relevant role CLAUDE.md based on the PR's branch name (`agent/<role>/d<N>` → `.claude-roles/<role>.md`), `ARCHITECTURE.md`, and `/contracts/*.ts` if any are touched.
3. Spawns a fresh Agent (general-purpose subagent_type) with the Reviewer role prompt prepended verbatim, plus the diff and context. The agent has no memory of the implementation conversation — adversarial freshness per AI-Assisted Development.md.
4. Receives the structured review output: findings in CRITICAL / MEDIUM / LOW format with `APPROVE-RECOMMENDED` / `CHANGES-RECOMMENDED` / `BLOCK` at the bottom.
5. Posts the review as a PR comment via `gh pr comment <N> --body "<review>"`.
6. Surfaces the recommendation line and any BLOCK findings to the Architect inline (don't bury them in the agent's tool result).

**Args:** PR number. Required. Example: `/review-pr 2`.

**What to do step by step when invoked:**

Given a PR number `<N>`:

1. Run `gh pr view <N> --json title,body,baseRefName,headRefName,author,additions,deletions,files` and `gh pr diff <N>`. If the diff is huge (>2000 lines), warn and ask whether to proceed.
2. Identify the agent role from the head branch:
   - `architect/...` → use the Architect role's standards
   - `agent/<role>/d<N>` → use the matching `.claude-roles/<role>.md` as the author's stated rules
   - Anything else → fall back to FLOOR.md only
3. Spawn an Agent (use the `general-purpose` subagent_type unless a `code-reviewer` agent type is available). The prompt is the contents of `.claude-roles/reviewer.md` from `{{PROJECT}}` → `Throughline`, followed by:
   - The PR title and body
   - The base and head refs
   - The full diff text
   - The author role's CLAUDE.md content (if identifiable)
   - An explicit instruction: "Review against the rules above. Output exactly per the format in your role file. No preamble. No summary."
4. Take the agent's response verbatim and post it as a PR comment: `gh pr comment <N> --body "$(cat <<'COMMENT_EOF' ... COMMENT_EOF)"`.
5. Print to the user:
   - The PR comment URL
   - The recommendation line (APPROVE-RECOMMENDED / CHANGES-RECOMMENDED / BLOCK)
   - Count of findings by severity
   - The full list of BLOCK findings (if any) — never bury these

**Authorization:**

You do NOT click approve. The Architect decides. If the agent returned `APPROVE-RECOMMENDED` and the Architect wants to merge, they merge manually or use `gh pr merge`. The skill never calls `gh pr review --approve`.

**Cost:**

One agent invocation per PR, typically 50-200k tokens. Reads the PR diff, contract files, and a few role files. No tool loops.

**Failure modes:**

- `gh` not authenticated → tell the user, abort
- PR not found → tell the user, abort
- Diff is enormous → ask before proceeding
- Agent returns malformed output (no `---` recommendation line) → post the comment anyway, flag the format issue inline so the reviewer template can be improved
