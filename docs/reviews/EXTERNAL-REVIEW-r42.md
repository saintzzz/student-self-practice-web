# External Review - Round 42 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 0aa3b4c, HEAD=0aa3b4c.

1. [severity minor] scripts/_cr89-flashcard-fix.mjs:61 - Playwright `isVisible()` passes for offscreen elements, so buttons below or outside the viewport still pass verification. - Assert each button’s bounding box fits within the viewport, including vertical bounds.

Review limited to the supplied diff; repository inspection was blocked by execution policy.

