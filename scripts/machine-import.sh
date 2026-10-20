#!/usr/bin/env bash
# Restores a machine-transfer bundle on the second machine (macOS/Linux).
# Run from repo root after copying machine-transfer/ next to the repo:
#   bash scripts/machine-import.sh <path-to-machine-transfer>
# Idempotent: merges into existing dirs, never deletes.
set -euo pipefail

SRC="${1:-../machine-transfer}"
[ -d "$SRC" ] || { echo "bundle not found: $SRC"; exit 1; }

copy_dir() { # src dst
  [ -d "$1" ] || { echo "skip (missing): $1"; return; }
  mkdir -p "$2"
  cp -R "$1"/. "$2"/
  echo "restored $1 -> $2"
}
copy_file() { [ -f "$1" ] && { cp "$1" "$2"; echo "restored $1 -> $2"; } || true; }

copy_dir "$SRC/devin-secrets"         "$HOME/.config/devin/secrets"
copy_dir "$SRC/config-devin-secrets"  "$HOME/.config/devin/secrets"
copy_dir "$SRC/codex"                 "$HOME/.codex"
# Devin CLI summaries live under the CLI state dir - on macOS check
# ~/Library/Application Support/devin/cli/summaries first, else ~/.config.
SUM_DST="$HOME/Library/Application Support/devin/cli/summaries"
[ -d "$SUM_DST" ] || SUM_DST="$HOME/.config/devin/cli/summaries"
copy_dir "$SRC/devin-summaries" "$SUM_DST"
copy_file "$SRC/env-local" ".env.local"

chmod 700 "$HOME/.config/devin/secrets" 2>/dev/null || true
echo "Done. Verify: codex login status; node scripts/gen-codex-bank.mjs --dry"
