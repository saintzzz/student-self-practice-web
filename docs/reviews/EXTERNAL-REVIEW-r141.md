# External Review - Round 141 (codex)

Reviewer: codex exec (real external run, gpt-6.1-sol channel fallback after
llm-channel retry loop stalled). Scope: commit 47d3753 - content-QA tooling
+ quarantine migrations only (no src/ changes). Diff reviewed:
scripts/{spot-check,repair-template-defects,repair-form-refs,qb-content-audit}.mjs,
scripts/lib/animal-knowledge.mjs, supabase/migrations/0066-0068.

## Findings (codex)

1. **High** - repair-template-defects.mjs:1124 - PATCH filters only by ID; an
   edit between the before-check GET and PATCH is silently overwritten, so
   conditional application is not atomic.
2. **High** - repair-template-defects.mjs:1096 - hash computation uses the old
   `q.passage` even when the patch replaces passage; the reading-item repair
   stores a hash inconsistent with its updated content.
3. **High** - repair-template-defects.mjs:1101 - passage is absent from
   before-match verification, allowing a passage changed since proposal
   generation to receive a stale content hash without detecting drift.
4. **Medium** - repair-template-defects.mjs:1089 - unconditional article
   normalization bypasses the a/an grammar-teaching exemption when another
   repair branch runs.
5. **Medium** - repair-template-defects.mjs:619 - spelling repair keys `k` for
   `mi_k`, producing "mikk"; "milk" requires `l`, absent from choices.
6. **Medium** - repair-form-refs.mjs:298 - apply ignores reported blueprint
   shortfalls and persists undersized forms.
7. **Medium** - spot-check.mjs:139 - random-comparator sort is biased and
   provides no stratification.
8. **Medium** - spot-check.mjs:161 - grader output accepted without checking
   ids, uniqueness, verdict values, or batch completeness.

## Disposition

1. **Accepted limitation (Low in practice)** - the before-check + PATCH window
   is inherent to PostgREST (no CAS). Mitigations already present: drift check
   catches stale proposals, single-operator maintenance script, post-apply
   full-bank audit re-verifies every check. No code change.
2. **FIXED** - `merged`/`before`/`cur` now include `passage`; content_hash uses
   `merged.passage`.
3. **FIXED** - `passage` added to apply-side select + drift + already-applied
   checks.
4. **FIXED** - `teachesAnRow` guard now also skips `fixArticles` in the
   post-patch normalization (previously only skipped the dispatch branch).
5. **FIXED** - prompt changed to `mil_` (answer `k` -> "milk"); live row
   `g1-eng-v4b-spelling-3215b9fc2f19` patched + content_hash recomputed.
6. **FIXED** - apply now ABORTs if any `blueprint shortfall` remains after
   top-up (no silent undersized forms).
7. **FIXED** - Fisher-Yates shuffle replaces random-comparator sort.
8. **FIXED** - verdict coverage validation: warns on unknown/duplicate/bad
   verdicts and reports missing coverage count.

## Verification

- `node --check` green on all edited scripts.
- Live row verified: prompt now `mil_`, answer `k` -> "milk", hash recomputed.
- Re-ran full pipeline post-fix: repair dry-run = 0 proposals / 0 flags /
  8,441 no-ops (fully converged), content audit = 50/50 checks zero.

## Side observation (codex scope-creep, kept + verified)

During the review run, `codex exec` also refactored 14 scripts from offset
pagination (`offset=N` loops) to a shared keyset helper
`scripts/lib/paged.mjs` (`id=gt.<cursor>`). This was outside its review
mandate but addresses the real root cause of the recurring Supabase
statement timeouts/disk-IO pressure (132k-row table, O(n^2) offset scans).
Verified working: the post-fix dry-run and audit ran on the refactored
code and produced converged/clean results.
