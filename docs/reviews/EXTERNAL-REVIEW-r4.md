# EXTERNAL REVIEW - Round 4 Triage

Codex Cloud review of commit `bd0ae3a` (public repo clone). Verdict: NOT CLEAN -
15 findings: 3 High, 9 Medium (+deployment notes), 2 Low. All triaged below.

## High

### H1. Published demo admin credentials - FIXED
- `demo_admin`/`demo2026` (full admin) was committed in `docs/demo-accounts.md`
  and generated proposal scripts.
- Rotated `demo_admin` + `demo_hs` PINs via Supabase Auth admin API; new PINs
  live only in ops vault (`~/.config/devin/secrets/ea_demo_creds.json`, 0600).
- Sanitized all literals: `docs/demo-accounts.md`, `docs/sales/03-sales-playbook.md`,
  `scripts/gen-customer-proposal-{doc,deck}.py`, `scripts/gen-sales-deck.py`,
  `scripts/seed-demo-class.mjs` + `scripts/capture-ea-shots.mjs` now require env
  vars (`DEMO_ADMIN_PIN`, `DEMO_STUDENT_PIN`, `EA_PIN`, `EA_ADMIN_PIN`) and fail
  closed when unset. Historical CR docs redacted (`demo2***`).

### H2. Word-order answers scored wrong - FIXED
- `normalizeForCompare` stripped trailing punctuation but left a trailing space
  when "." was its own tile.
- `src/lib/exam/wordOrder.ts` now normalizes punctuation+whitespace together.
- Regression test: `src/lib/exam/wordOrder.test.ts` (6 cases incl. separated
  punctuation tile, glued punctuation, no punctuation, case, wrong order).

### H3. Invalid/ambiguous G5 generator content - FIXED
- Past-tense block now uses only `[visited, played, watched, helped] + our
  friends` (was `cooked/cleaned our friends`).
- Subject-verb block uses a verb->object collocation map (`studies English
  very well`, never `goes English`).
- Place MCQs use foreign-place distractors (`the Eiffel Tower`, `Big Ben`...)
  so the VN-place answer is the only valid one.
- DB cleanup: 78 ambiguous place rows + 39 bad past-tense/`myy` rows deleted;
  `gen-template-g5.mjs` re-pushed (1356 rows).

## Medium

### M1. Three-choice MCQs - FIXED
- `mcq()` in `gen-template-g5.mjs` now requires >=3 distinct distractors and
  skips the item otherwise. `gen-template-math-sci.mjs` already guarded.
- DB: 216 under-specified MCQ rows deleted across all subjects/grades.

### M2. Audit false passes - FIXED
- `scripts/audit-bank.mjs`: scramble/missing-letter/superlative fetches now
  paginate (`fetchAll`, `order=id`), not `limit=1000`.
- Missing-letter check tightened: blank count must equal answer length AND the
  reconstructed string must contain no leftover `_` (`br_thday`+`ir` fails).

### M3. Mock fallback bypassed commercial gate - FIXED
- `fetch_questions_public` gained `p_mode` (default 'practice'); for
  mock/exam it requires `mockEligible` AND cleared approval flags - identical
  semantics to the authenticated RPC.
- `bank.ts` passes the requested `mode` through both the guest path and the
  post-error fallback - a mock request can never be downgraded to practice
  content.
- Applied as migration `external_review_r4_fetch_telemetry` + file
  `0034_external_review_r4.sql`.

### M4. Sampling silently shortened sessions - FIXED
- Both fetch RPCs are now two-pass plpgsql: pass 1 uses the 35% random
  prefilter; if fewer than requested rows return, pass 2 tops up from the
  full eligible pool excluding ids already returned. Small pools always fill.

### M5. Malformed telemetry aborted valid batches - FIXED
- `record_attempt_events` rewritten as a per-element plpgsql loop with
  `begin/exception`: required-field checks (uuid regex, grade 1-5,
  question_id) skip invalid events; per-row cast/insert failures skip only
  that row. Verified: malformed+valid batch returns inserted count without
  erroring (service-role context returns 0 because `auth.uid()` is null -
  expected).

### M6. Accepted alternative text answers discarded - FIXED (prior in round)
- `bank.ts` merges `answer.text` + `answer.accepted` for text inputs.

### M7. Math/Science misrouted to English coach drills - FIXED
- `src/lib/engagement/skills.ts`: full Math/Science taxonomy mapping
  (arithmetic, word-problem, number-sense, measurement, geometry,
  application, concept, classification, science-reading...).
- Generator emits `science-reading` instead of `reading`; existing DB rows
  backfilled (`subject='science' and skill='reading'` -> `science-reading`).

### M8. Review queue hid essential content - FIXED
- `ReviewQueueCard.tsx` selects + renders `passage`, `statement`, reorder
  `tokens`, `answer.text`, `answer.accepted`, `answer.bool`, and linked image
  assets via `qb_question_assets`/`qb_assets`.

### M9. Fresh-deploy grant gaps - FIXED
- Migration 0034 grants `usage on schema practice to anon` and
  `select on practice.qb_item_stats to authenticated` so a clean replay
  works without manual grants.
- RLS enabled on `qb_verify_todo`, `qb_verify_verdicts`, `qa_tokens`
  (service-role pipeline tables; anon/authenticated now denied).

## Deferred with design

### D1. Competitive results forgeable (Medium) -> CR-68
- `practice.results` self-insert accepts caller points; leaderboard sums them.
- Fix requires server-side scoring (new `submit_result` RPC re-scoring from
  `qb_attempt_events` + form snapshots, then tightening `results_self_insert`).
- Design + rationale in `docs/sdlc/CR-68-server-side-score-attestation.md`.

## Low

### L1. Push scripts reported success on failures - FIXED
- `gen-template-g5.mjs`, `gen-template-math-sci.mjs`, `gen-visual-bank.mjs`,
  `gen-bulk-bank.mjs` now exit non-zero on any failed batch and report real
  inserted counts via `Prefer: count=exact` (`content-range`).

### L2. Speech-fallback tests stale after MediaRecorder switch - FIXED
- 9 `addInitScript` sites across 8 e2e specs now delete `window.MediaRecorder`
  alongside SpeechRecognition so the `unsupported` path is actually reached.

## Verification evidence

- `npx vitest run`: 960/960 pass (incl. new `wordOrder.test.ts` 6 tests).
- `npx tsc --noEmit` + `vite build`: clean.
- `node scripts/audit-bank.mjs`: ALL CHECKS PASSED (after deleting 222 strict
  dupes left by the pre-seeding generator runs).
- `fetch_questions_public(2,'english',10)` -> 10 rows; mock mode via public
  RPC enforces mockEligible + approval flags.
- `record_attempt_events` with mixed valid/malformed batch -> no error,
  malformed rows skipped.
