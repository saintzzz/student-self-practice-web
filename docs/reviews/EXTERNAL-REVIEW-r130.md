# External Review - Round 130 (codex)

Reviewer: codex (real external run). Scope: commit 7597850, HEAD=7597850.

1. [severity major] scripts/polish-explanations.mjs:55 - MCQ answers reach the model as `{index: N}`, but choices are omitted. The model cannot resolve the correct answer and may publish a plausible but incorrect explanation. - Include choices and the resolved correct label; validate that the explanation preserves the tested English terms before updating.

2. [severity major] scripts/polish-explanations.mjs:88 - Generated text is written directly to the database after only length/diacritic checks. No migration or before/after artifact records the 1,012 edits, preventing independent review, reproducible deployment, and targeted rollback. - Save proposed edits with original values in a reviewable artifact and apply approved changes through a migration.

3. [severity minor] scripts/qb-content-audit.mjs:194 - `MANUALLY_REVIEWED` permanently exempts IDs across multiple checks, regardless of subsequent content changes or which check was reviewed. Future regressions on these questions disappear from the audit. - Scope dispositions by check and content fingerprint; invalidate them when relevant fields change.

