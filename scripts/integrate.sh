#!/usr/bin/env bash
# integrate.sh — Day 5 mock-swap for Throughline
#
# Mechanically converts the parallel-sprint mock layer into the real
# integration: /lib/mock-api.ts becomes a thin fetch wrapper, AI_MODE
# flips to live, and the smoke suite runs after each layer is swapped.
#
# Designed to be run interactively from the Architect's main checkout,
# one stage at a time. Each stage is reversible via git.
#
# Usage:
#   ./scripts/integrate.sh status         # show what would be swapped
#   ./scripts/integrate.sh backend        # swap /lib/mock-api -> /api fetches
#   ./scripts/integrate.sh ai             # flip AI_MODE=live for AI workflows
#   ./scripts/integrate.sh ats            # enable real provider polling
#   ./scripts/integrate.sh all            # all stages with smoke between
#   ./scripts/integrate.sh rollback       # revert to pre-integration state
#
# Smoke tests after each stage gate the next stage.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

STAGE="${1:-status}"
TAG_PREFIX="integration-checkpoint"

log()  { printf '\033[1;36m[integrate]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[integrate]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[integrate]\033[0m %s\n' "$*" >&2; exit 1; }

require_clean() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    die "working tree not clean; commit or stash first"
  fi
}

checkpoint() {
  local name="$1"
  git tag -f "${TAG_PREFIX}-${name}" >/dev/null
  log "checkpoint: ${TAG_PREFIX}-${name}"
}

smoke() {
  local label="$1"
  log "smoke: $label"
  if ! pnpm test:smoke; then
    warn "smoke failed at: $label"
    warn "rollback: git reset --hard ${TAG_PREFIX}-pre"
    exit 1
  fi
}

if [[ "$STAGE" == "status" ]]; then
  log "current state:"
  if grep -q '__MOCK_MODE__' lib/mock-api.ts 2>/dev/null; then
    echo "  /lib/mock-api.ts → MOCK (sprint mode)"
  else
    echo "  /lib/mock-api.ts → LIVE fetches"
  fi
  echo "  AI_MODE=${AI_MODE:-mock}"
  echo "  ATS_POLLER=${ATS_POLLER:-disabled}"
  log "stages: backend → ai → ats"
  exit 0
fi

if [[ "$STAGE" == "rollback" ]]; then
  if git rev-parse "${TAG_PREFIX}-pre" >/dev/null 2>&1; then
    log "rolling back to ${TAG_PREFIX}-pre"
    git reset --hard "${TAG_PREFIX}-pre"
    exit 0
  fi
  die "no pre-integration checkpoint found; manual rollback required"
fi

require_clean

if ! git rev-parse "${TAG_PREFIX}-pre" >/dev/null 2>&1; then
  log "pinning pre-integration checkpoint"
  git tag "${TAG_PREFIX}-pre"
fi

swap_backend() {
  log "stage: backend (mock-api → real fetches)"
  [[ -f lib/mock-api.ts ]] || die "lib/mock-api.ts not found"
  [[ -f lib/api-client.ts ]] || die "lib/api-client.ts missing — Frontend Agent must produce a fetch-based version of mock-api with identical signatures"
  cp lib/api-client.ts lib/mock-api.ts
  log "  lib/mock-api.ts ← lib/api-client.ts"
  git add lib/mock-api.ts
  git commit -m "integrate: swap mock-api for real fetch layer"
  checkpoint "backend"
  smoke "post-backend swap"
}

swap_ai() {
  log "stage: ai (AI_MODE=mock → live)"
  [[ -f .env.local ]] || die ".env.local missing — populate API key and AI_MODE"
  if grep -q '^AI_MODE=' .env.local; then
    sed -i.bak 's/^AI_MODE=.*/AI_MODE=live/' .env.local && rm .env.local.bak
  else
    printf '\nAI_MODE=live\n' >> .env.local
  fi
  log "  .env.local AI_MODE=live"
  checkpoint "ai"
  smoke "post-ai swap"
}

swap_external() {
  log "stage: ats (poller disabled → enabled)"
  if grep -q '^ATS_POLLER=' .env.local; then
    sed -i.bak "s/^ATS_POLLER=.*/ATS_POLLER=enabled/" .env.local && rm .env.local.bak
  else
    printf 'ATS_POLLER=enabled\n' >> .env.local
  fi
  log "  .env.local ATS_POLLER=enabled"
  log "  triggering one-shot poll for seeding"
  if ! pnpm inngest:invoke daily-poll; then
    warn "manual poll invocation failed — scheduled run will catch up"
  fi
  checkpoint "ats"
  smoke "post-ats swap"
}

case "$STAGE" in
  backend)         swap_backend ;;
  ai)              swap_ai ;;
  ats) swap_external ;;
  all)
    swap_backend
    swap_ai
    swap_external
    log "integration complete — checkpoint tags: $(git tag | grep "^${TAG_PREFIX}-" | tr '\n' ' ')"
    ;;
  *) die "unknown stage: $STAGE (status|backend|ai|ats|all|rollback)" ;;
esac
