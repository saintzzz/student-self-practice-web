# External Review - Round 41 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 9973a8c, HEAD=9973a8c.

1. [severity major] src/lib/ui/tokens.ts:490 - The “Known” button’s white text has roughly 1.9:1 contrast against `emerald-400`, below WCAG AA even for large text (3:1). Hover brightness further reduces contrast. - Use a darker gradient and verify contrast across the label area in default and hover states.

2. [severity minor] scripts/_cr89-flashcard-fix.mjs:35 - Overflow and visibility failures only print to the console; the script still exits successfully and prints `DONE`. - Assert document width, scroll position, card bounds, and button visibility so regressions fail verification.

Review limited to the supplied diff; repository inspection was blocked by execution policy.

