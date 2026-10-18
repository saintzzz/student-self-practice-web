# External Review - Round 64 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 1abc8cb, HEAD=1abc8cb.

1. [severity major] scripts/_cr95-verify.mjs:19 - Verification succeeds with zero art images or broken images: results are only logged, navigation failures are swallowed, and execution prints “done”. - Assert successful navigation, the expected grade-specific cards, and loaded images; exit nonzero on failure.

2. [severity minor] scripts/qb-ambiguity-classify.mjs:43 - Unioning previous rejects makes rejection permanent: a question later classified as acceptable remains in `reject-ids.json`. - Separate manual rejects from generated rejects and regenerate the latter from current verdicts.

Review limited to supplied diff: local execution was policy-blocked; binary artwork and deployed UI/a11y remain unverified.

