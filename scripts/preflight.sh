#!/usr/bin/env bash
# preflight.sh - deterministic gate for a project. Runs whatever checks the
# stack actually has; fails loudly. This is the "deterministic layer" behind
# the conventions - skills advise, this enforces.
#
# Install once per project (bootstrap-harness.sh copies it):
#   scripts/preflight.sh             # full check
#   scripts/preflight.sh --staged    # secrets scan limited to staged diff (pre-commit)
#
# Checks (skips cleanly when the tool/script doesn't exist):
#   node:  npm run typecheck | lint | build | test  (whichever exist)
#   py:    pytest / mypy / ruff (whichever installed + configured)
#   go:    go vet + go build
#   secrets: staged diff or src/ scan for key/token patterns
#   sdlc:  if docs/INTENT.md exists, docs/MEMORY.md must also exist

set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
STAGED=0; [ "${1:-}" = "--staged" ] && STAGED=1
fail=0
run() { echo "-- $*"; "$@" >/dev/null 2>&1 && echo "   ok" || { echo "   FAIL"; fail=1; }; }
has_script() { [ -f package.json ] && grep -q "\"$1\"" package.json; }

# --- secrets scan (always) ---
echo "-- secrets scan"
if [ "$STAGED" -eq 1 ]; then
  # exclude preflight.sh itself - the script literally contains the secret
  # patterns, so staging it self-matches (first bootstrap commit always hit
  # this). Pathspec-exclude mirrors the --exclude on the src-scan path.
  DIFF="$(git diff --cached -U0 -- . ':(exclude)scripts/preflight.sh' 2>/dev/null || true)"
else
  DIFF="$(grep -rInE 'sk-[a-zA-Z0-9_-]{20,}|sk-ant-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|github_pat_[0-9A-Za-z_]{20,}|-----BEGIN .*PRIVATE KEY' \
    --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build \
    --exclude=preflight.sh . 2>/dev/null || true)"
fi
if [ -n "$DIFF" ] && echo "$DIFF" | grep -qE 'sk-[a-zA-Z0-9_-]{20,}|sk-ant-|AIza|github_pat_|BEGIN .*PRIVATE KEY'; then
  echo "   FAIL - possible secret in code/diff:"; echo "$DIFF" | grep -oE '^[^:]+' | sort -u | head -5
  fail=1
else
  echo "   ok"
fi

# --- SDLC artifact check ---
if [ -f docs/INTENT.md ] && [ ! -f docs/MEMORY.md ]; then
  echo "-- sdlc: docs/INTENT.md exists but docs/MEMORY.md missing (see templates/MEMORY.md)"; fail=1
fi

# --- node ---
if [ -f package.json ] && [ -d node_modules ]; then
  for s in typecheck lint build test; do
    has_script "$s" && run npm run "$s" --if-present --silent
  done
fi

# --- python ---
if [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  command -v ruff >/dev/null && run ruff check .
  { [ -d tests ] || ls test_*.py >/dev/null 2>&1; } && command -v pytest >/dev/null && run pytest -x -q
fi

# --- go ---
if [ -f go.mod ]; then
  run go vet ./...
  run go build ./...
fi

# --- reliability gate (reliability classes: unchecked-read, unbounded-read,
# action-loss, cas-transition + project EA classes). Neu project co scanner
# thi day la check bat buoc - khong duoc skip. r10: prefer the single
# code:reliability entry point so every scanner + selftest stays in sync.
if has_script code:reliability; then
  run npm run code:reliability --silent
elif [ -f scripts/check-reliability.mjs ]; then
  run node scripts/check-reliability.mjs
  # scanner self-test (fixtures): .selftest.mjs so vitest/jest do not
  # auto-pick it - node --test runs it by explicit path only.
  if [ -f tests/reliability-scanner.selftest.mjs ]; then
    run node --test tests/reliability-scanner.selftest.mjs
  fi
  if [ -f scripts/check-ea-classes.mjs ]; then
    run node scripts/check-ea-classes.mjs
    if [ -f tests/ea-classes-scanner.selftest.mjs ]; then
      run node --test tests/ea-classes-scanner.selftest.mjs
    fi
  fi
fi

echo "== preflight: $([ "$fail" -eq 0 ] && echo PASS || echo FAIL) =="
exit $fail
