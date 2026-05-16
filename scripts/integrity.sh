#!/usr/bin/env bash
# integrity.sh — enforce inter-agent boundaries for Throughline
#
# Runs as a CI step and as a pre-merge check on every agent branch.
# Each rule maps to an "agents calling other agents" anti-pattern.
#
# Exit codes:
#   0 — all boundaries respected
#   1 — at least one violation; details printed to stderr
#
# Usage:
#   ./scripts/integrity.sh            # check the whole repo
#   ./scripts/integrity.sh --diff     # check only files changed vs main

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

MODE="${1:-full}"
VIOLATIONS=0

# ---------------------------------------------------------------------------
# File set under inspection
# ---------------------------------------------------------------------------
FILES=()
if [[ "$MODE" == "--diff" ]]; then
  while IFS= read -r line; do FILES+=("$line"); done < <(git diff --name-only --diff-filter=AM origin/main...HEAD -- '*.ts' '*.tsx' 2>/dev/null || true)
else
  while IFS= read -r line; do FILES+=("$line"); done < <(git ls-files '*.ts' '*.tsx')
fi

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "integrity: no TS/TSX files to check"
  exit 0
fi

fail() {
  echo "integrity: VIOLATION — $1" >&2
  VIOLATIONS=$((VIOLATIONS + 1))
}

grep_within() {
  local path_re="$1"
  local pattern="$2"
  local message="$3"
  local hits
  hits=$(printf '%s\n' "${FILES[@]}" \
    | grep -E "$path_re" \
    | xargs -r grep -lE "$pattern" 2>/dev/null || true)
  if [[ -n "$hits" ]]; then
    fail "$message"
    echo "$hits" | sed 's/^/  - /' >&2
  fi
}

# ---------------------------------------------------------------------------
# Rule 1 — Frontend must not import AI/External namespaces directly
# ---------------------------------------------------------------------------
grep_within \
  '^(app/\(app\)|components/|hooks/|stores/)' \
  "from ['\"]@/lib/(ai|ats)" \
  "Frontend code imports from /lib/ai or /lib/ats (must go through /lib/mock-api or /app/api)"

# ---------------------------------------------------------------------------
# Rule 2 — Frontend must not import the SDK directly
# ---------------------------------------------------------------------------
grep_within \
  '^(app/\(app\)|components/|hooks/|stores/)' \
  "from ['\"]@anthropic-ai/sdk" \
  "Frontend code imports the SDK directly (only /lib/ai may import the SDK)"

# ---------------------------------------------------------------------------
# Rule 3 — Frontend must not call /api/* via raw fetch during the sprint
# ---------------------------------------------------------------------------
if [[ "${ALLOW_RAW_FETCH:-0}" != "1" ]]; then
  grep_within \
    '^(app/\(app\)|components/|hooks/|stores/)' \
    "fetch\(['\"]/api/" \
    "Frontend code calls /api/* via fetch (route through /lib/mock-api; set ALLOW_RAW_FETCH=1 after integration)"
fi

# ---------------------------------------------------------------------------
# Rule 4 — Backend must not import the SDK directly
# ---------------------------------------------------------------------------
grep_within \
  '^app/api/' \
  "from ['\"]@anthropic-ai/sdk" \
  "Backend route imports the SDK directly (use /lib/ai)"

# ---------------------------------------------------------------------------
# Rule 5 — Backend must not hit provider URLs directly
# ---------------------------------------------------------------------------
grep_within \
  '^app/api/' \
  "(boards-api\.greenhouse\.io|api\.lever\.co|api\.ashbyhq\.com|myworkdayjobs\.com)" \
  "Backend route hits an external provider URL directly (use /lib/ats registry)"

# ---------------------------------------------------------------------------
# Rule 6 — AI Integration must not import DB / Prisma
# ---------------------------------------------------------------------------
grep_within \
  '^lib/ai/' \
  "(from ['\"]@/lib/db|from ['\"]@prisma/client|PrismaClient)" \
  "/lib/ai code imports DB layer (AI Integration must be stateless re: domain DB)"

# ---------------------------------------------------------------------------
# Rule 7 — External Adapter must not import AI namespace
# ---------------------------------------------------------------------------
grep_within \
  '^(lib/ats/|jobs/)' \
  "from ['\"]@/lib/ai" \
  "/lib/ats or /jobs imports /lib/ai (downstream processing belongs in Backend Core)"

# ---------------------------------------------------------------------------
# Rule 8 — No agent except Architect edits /contracts/*.ts
# ---------------------------------------------------------------------------
BRANCH="${GITHUB_HEAD_REF:-$(git rev-parse --abbrev-ref HEAD)}"
if [[ "$BRANCH" != "main" && "$BRANCH" != architect/* ]]; then
  if git diff --name-only origin/main...HEAD 2>/dev/null \
    | grep -E '^contracts/[^/]+\.ts$' >/dev/null; then
    fail "Non-Architect branch '$BRANCH' modifies /contracts/*.ts directly (file a proposal under /contracts/proposals/)"
    git diff --name-only origin/main...HEAD \
      | grep -E '^contracts/[^/]+\.ts$' \
      | sed 's/^/  - /' >&2
  fi
fi

# ---------------------------------------------------------------------------
# Rule 9 — Server-never-stores list
# ---------------------------------------------------------------------------
grep_within \
  '^(app/api/|lib/server/|lib/db/|lib/ai/)' \
  "(console\.(log|info|error)\(.*\b(apiKey|anthropicKey|prompt|completion|resumeText|linkedinText|passphrase|kdfKey|apiKeyIv|apiKeySalt)\b|prisma\..*\.create\(.*\b(apiKey|anthropicKey|prompt|completion|resumeText|linkedinText|passphrase|kdfKey|apiKeyIv|apiKeySalt)\b)" \
  "Server code appears to log or persist key/prompt/completion/passphrase material (review SERVER_NEVER_STORES_GREP_TOKENS in /contracts/storage.ts)"

# ---------------------------------------------------------------------------
# Rule 10 — Frontend owns /lib/mock-api.ts
# ---------------------------------------------------------------------------
if [[ "$BRANCH" != "main" && "$BRANCH" != agent/frontend/* && "$BRANCH" != architect/* ]]; then
  if git diff --name-only origin/main...HEAD 2>/dev/null \
    | grep -E '^lib/mock-api\.ts$' >/dev/null; then
    fail "Non-Frontend branch '$BRANCH' modifies /lib/mock-api.ts"
  fi
fi

if [[ "$VIOLATIONS" -gt 0 ]]; then
  echo "integrity: $VIOLATIONS violation(s) found" >&2
  exit 1
fi

echo "integrity: OK (${#FILES[@]} files checked)"
