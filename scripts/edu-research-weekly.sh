#!/bin/bash
# Weekly PO research cycle - headless devin run. Scheduled via launchd
# (com.vieschool.edu-research). Logs to logs/edu-research-<date>.log.
set -uo pipefail
cd "$(dirname "$0")/.."
DEVIN="/Applications/Devin.app/Contents/Resources/app/extensions/windsurf/devin/bin/devin"
LOG="logs/edu-research-$(date +%F).log"
mkdir -p logs
{
  echo "=== edu-research-weekly $(date -Iseconds) ==="
  "$DEVIN" --permission-mode dangerous --respect-workspace-trust false \
    -p "Invoke the edu-research-loop skill (.devin/skills/edu-research-loop/SKILL.md) and run this week's full research cycle end-to-end. Follow its method and hard rules exactly."
  echo "=== exit $? $(date -Iseconds) ==="
} >> "$LOG" 2>&1
