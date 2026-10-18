# External Review - Round 77 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 17d21b9, HEAD=17d21b9.

1. [severity minor] scripts/_report-verify.mjs:45 - Pixel verification now requires `python` on PATH plus Pillow, with no setup provided in this change; environments with only the app’s Node/Playwright dependencies will abort before producing a verdict. Fix: use a declared Node PNG decoder or provision and document Python/Pillow.

Review limited to supplied diff; repository inspection was blocked by execution policy.

