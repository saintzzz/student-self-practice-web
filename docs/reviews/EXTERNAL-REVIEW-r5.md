# External Review - Round 5 Triage

Codex Cloud, post-r4 commit `94853ff` + gate infra `bca74f7`.
Verdict: **NOT-CLEAN** - 2 High, ~11 Medium, ~3 Low. All findings
source-confirmed. Each was also assigned a permanent gate in
`scripts/check-ea-classes.mjs` (see DEFECT-CLASSES.md r5 section).

## High

### H1. Migration replay failure - verify tables had no DDL
`0034` enabled RLS on `qb_verify_todo` / `qb_verify_verdicts` /
`qa_tokens` which no migration created -> fresh replay dies.
**Fix:** `create table if not exists` added to `0034` (schemas pulled
from the deployed DB via information_schema). New gate
`migration-replay` flags any bare `alter table practice.X` lacking a
`create table` in the corpus.

### H2. Published credentials in artifacts
`deployments/registry.json` carried the old EA PIN and suite demo
passwords; three proposal binaries (docx + 2 pptx) embedded the same
literals in their XML.
**Fix:** registry strings replaced with "secrets vault" references;
binaries scrubbed in-zip (14 credential strings removed, zips verified
intact, zero hits remain). Only an intentionally-poisoned scanner
fixture still contains a fake PIN.

## Medium

### M1. Authenticated mock-fetch approval parity
`fetch_questions` mocked gate checked `requiresHumanApprovalForCommercialRelease`
but skipped `requiresHumanApprovalForExam` and never required
`commercialReleaseEligible` - public surface was stricter than the
authenticated one.
**Fix (0035):** authenticated fetch applies the same full gate set in
both passes. A leftover pre-r4 overload (`p_mode` in a different
position) carrying **no gates at all** was discovered during
verification and dropped. Gate `fetch-gate-parity`.
Also surfaced by the fix: approved rows still carried
`requiresHumanApprovalForExam: true`, so mock went dark. Backfilled to
`false` on the 100k approved rows (same operator signoff as the r3
commercial backfill); verified practice=5, mock=5, exam=0 (by design -
forms come from qb_form_items).

### M2. Percentage generator arithmetic
`Math.round(base * pct / 100)` produced "25% of 22 = 6".
**Fix:** base drawn as multiple of `100/gcd(pct,100)` - exact by
construction; distractor pool now guaranteed 3 distinct wrongs (the
r4 four-choice guard was otherwise skipping whole sub-pools).
77 bad rows deleted, regenerated clean (83 rows, 0 wrong).

### M3. Money-question quantity mismatch
Quantity was re-drawn inside the answer closure.
**Fix:** `n` drawn once; price constrained to `p1*n < 100`; distractors
deduped against the true change. 211 bad rows deleted, regenerated.

### M4. G5 past-tense grammar
`played our friends`, lowercased `i` subjects.
**Fix:** per-verb complements (visited our friends / played with /
watched TV with / helped with homework); `I` never lowercased;
distractors are same-verb forms. 9 bad rows deleted.

### M5. Direct `push()` bypassed MCQ guard
`read -> read` deduped to 3 choices around line 616.
**Fix:** the 4-distinct-choice invariant moved INTO `push()` itself -
every serialization path now enforced; `did ${v}` keeps read/read at 4.

### M6. Session silently shrank after mapping
`mapped.slice(0, target)` dropped malformed rows unreported.
**Fix:** `droppedCount` + `poolShort` flags on ExamState; a top-up draw
(300) runs before declaring the pool thin; ExamScreen renders a visible
warning banner. Gates `session-shrink` (bank.ts + ExamScreen).

### M7. Two-pass fetch repeated variant groups
`seen` tracked ids; a sibling in the same `variant_group_id` could
return in pass 2.
**Fix (0035):** `seen` now stores `coalesce(variant_group_id, id)` and
pass 2 excludes on the group key. Gate `variant-dedupe`.

### M8. qb_item_stats grant insufficient
security_invoker view needs underlying-table grants the client lacks.
**Fix (0035):** direct view select revoked from authenticated; new
`practice.qb_item_stats_for(p_ids)` - SECURITY DEFINER, `is_admin()`
checked, service_role JWT also allowed. `ReviewQueueCard` calls the RPC
and surfaces stats/question/asset load errors instead of silently
dropping them. Gate `stats-access-path`.

### M9. Review card wrong bool key
`answer.bool` rendered nothing for generated `answer.boolean` rows.
**Fix:** `answer.bool ?? answer.boolean`. Gate `answer-shape-bool`.

### M10. Account deletion blocked by telemetry FKs
**Fix (0035):** `qb_attempt_events` + `qb_adaptive_decisions` cascade
(disposable telemetry); `audit_log.actor_id` + `qb_review_events.actor_id`
made nullable with `ON DELETE SET NULL` (audit history anonymized, not
destroyed). Gate `fk-auth-delete`.

### M11. Concurrent last-admin deletion race
Edge-fn count-then-delete raced.
**Fix (0035):** `practice.guard_last_admin()` trigger on
`practice.accounts` - `pg_advisory_xact_lock` serializes the check in
the deleting transaction itself (accounts cascade from auth.users, so
`auth.admin.deleteUser` hits it too). Gate `last-admin-race`.

### M12. Signed-out progress leaked into guest mode
Failed-sync blob kept its owner marker and was still what guest mode
rendered.
**Fix:** `parkOwnerBlob()` moves the blob to an account-scoped backup
key on guest entry; `restoreParkedBlob()` in `bindEngagement` brings it
back for the owning account's next login - unsynced progress survives,
guests see a clean state. Gate `guest-state-leak`.

## Low

### L1. Push counts confused attempted vs inserted
`|| batch.length` swallowed a real `0`, two scripts lacked
`count=exact`, bulk counted attempts.
**Fix:** all four push scripts request `count=exact`, treat a missing
content-range as failure, and accumulate true inserted counts.
`gen-chatgpt-push.mjs` fixed the same way (its `&&` chain also dropped
zero-insert batches). Gate `push-count-honesty`.

### L2. Parent reports exposed raw skill identifiers
**Fix:** `skillLabel()` used consistently; Vietnamese labels added for
the generator taxonomy (arithmetic, word-problem, concept,
classification, application, living-things, writing). Gate
`skill-label-raw`.

### L3. Same-origin E2E gate vacuous under real backend
Storage/Supabase origins failed the test as "third-party" though they
are the configured backend.
**Fix:** `allowedOrigins()` whitelists `VITE_SUPABASE_URL` when set;
without it the gate stays strict. Gate `e2e-origin-vacuum`.

## Tooling improvements this round

- `parse-verdict.mjs` now recognizes inline severity formats
  (`**High**`, `Severity: High`, `(high)`, `[HIGH]`) - r5's report was
  parsed as 0 findings despite 16 present.
- `check-ea-classes.mjs` gained 12 r5 classes (now 27 total); every
  class has a bad/good fixture and the selftest covers all of them.

## Deferred

- CR-68 result/competitive-score forgery - unchanged; server-side
  rescoring design remains the deferral.
