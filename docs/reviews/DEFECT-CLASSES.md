# Defect-class convergence - English Arena

Defect classes confirmed by external review rounds r1-r4, enumerated
repo-wide, closed structurally, and encoded as permanent gates per
PU_SDLC 1.1.0 (EXTERNAL_REVIEW_LOOP.md > Defect-class convergence).

Gates (run `npm run code:reliability` - wired into CI):

| Gate | File | Coverage |
|------|------|----------|
| Reliability scanner | `scripts/check-reliability.mjs` | unchecked-read, unbounded-read, action-result-loss, cas-transition |
| EA class scanner | `scripts/check-ea-classes.mjs` | 30 project classes below |
| DB semantics audit | `scripts/audit-bank.mjs` | answer correctness, dupes, flag drift, collocation patterns (live DB) |
| Scanner self-tests | `tests/*.selftest.mjs` + `tests/fixtures/` | bad/good fixture cases per rule |

## Closed classes (all at 0 repo-wide)

| # | Class | Shape | Structural close | Gate |
|---|-------|-------|------------------|------|
| 1 | `nondeterministic-generator` | `Math.random()` in `scripts/gen-*.mjs` -> new ids each run, 2192 dupes | seeded PRNG everywhere | check-ea-classes #1 + audit-bank dupe check |
| 2 | `open-cors` | `Access-Control-Allow-Origin: *` on edge fns | allowlist + Vary: Origin | check-ea-classes #2 |
| 3 | `committed-credentials` | demo PIN literal in docs/scripts | rotation + env-only reads | check-ea-classes #3 + preflight secrets scan |
| 4 | `mode-downgrade-fallback` | public fetch fallback dropped `p_mode` -> exam silently became practice | `p_mode` plumbed through public RPC + client | check-ea-classes #4 |
| 5 | `starvation-sampling` | `random()<0.35` prefilter starved small pools | two-pass plpgsql + top-up | check-ea-classes #5 |
| 6 | `telemetry-batch-abort` | one malformed event rolled back 199 valid ones | per-element insert + exception isolation | check-ea-classes #6 |
| 7 | `push-silent-fail` | gen scripts logged HTTP failures but exited 0 | res.ok checks + `process.exit(1)` aggregate | check-ea-classes #7 |
| 8 | `audit-truncation` | audit fetches capped at `limit=1000` | offset pagination with `.order` | check-ea-classes #8 |
| 9 | `e2e-mock-incomplete` | tests deleted `SpeechRecognition` but `MediaRecorder` fallback kept path alive | both APIs deleted in all 9 init scripts | check-ea-classes #9 |
| 10 | `rls-verify-tables` | `qb_verify_todo`/`qb_verify_verdicts`/`qa_tokens` exposed | RLS ON (0034) | check-ea-classes #10 |
| 11 | `scope-fail-open` | `fetchMyAllowedGrades` read the whole `class_grade_scopes` table | scoped via `enrollments -> class_grade_scopes` | check-ea-classes #11 |
| 12 | `review-card-completeness` | review card lacked fields for an informed academic decision | passage/statement/tokens/assets/explanation rendered | check-ea-classes #12 |
| 13 | `service-role-in-client` | service-role key references inside `src/` bundle | none - client uses anon + RPCs only | check-ea-classes #13 |
| 14 | `in-memory-rate-limit` | process-local `Map` rate limiter (shared state lost across isolates) | DB `check_rate_limit` RPC (0033) | check-ea-classes #14 |
| 15 | `migration-grants` | anon schema usage / item_stats select missing on fresh replay | grants in 0034 | check-ea-classes #15 |
| 16 | `unchecked-read` | awaited `.from()/.rpc()` result error channel unused -> fake-empty data | `must()`/error bindings (11811ad) | check-reliability A |
| 17 | `unbounded-read` | SELECT on >1000-row tables without bound -> silent truncation (AdminScreen refresh, allowedGrades) | `fetchAllRows` helper + `bounded-ok` annotations | check-reliability B |
| 18 | `action-result-loss` | awaited mutation result discarded -> success shown on failure | error surfacing (11811ad) | check-reliability C |
| 19 | `cas-transition` | status update without transition predicate | scanner + conditional predicates | check-reliability D |
| 20 | `generator-semantics` | bad collocations, wrong answers, ambiguous MCQs, <4 choices | generator whitelists + self-validation | audit-bank.mjs live checks |
| 21 | `migration-replay` (r5) | `alter table` on relations no migration created (verify tables) | DDL added to 0034 | check-ea-classes #16 |
| 22 | `fetch-gate-parity` (r5) | authenticated fetch skipped exam/commercial gates; stale overload with no gates | full gate set in both passes + overload dropped (0035) | check-ea-classes #17 |
| 23 | `variant-dedupe` (r5) | two-pass seen tracked ids, not variant groups -> sibling could repeat | `seen` stores group key (0035) | check-ea-classes #18 |
| 24 | `stats-access-path` (r5) | security_invoker stats view - grant useless without underlying grant | admin-checked `qb_item_stats_for` RPC + revoke (0035) | check-ea-classes #19 |
| 25 | `answer-shape-bool` (r5) | card read `answer.bool`; rows store `answer.boolean` | `bool ?? boolean` render | check-ea-classes #20 |
| 26 | `last-admin-race` (r5) | count-then-delete across requests -> zero admins possible | `guard_last_admin` trigger + advisory xact lock (0035) | check-ea-classes #21 |
| 27 | `fk-auth-delete` (r5) | telemetry/audit FKs to auth.users blocked account deletion | cascade disposable + SET NULL audit (0035) | check-ea-classes #22 |
| 28 | `guest-state-leak` (r5) | owner-marked blob rendered to guest after failed logout sync | `parkOwnerBlob` / `restoreParkedBlob` | check-ea-classes #23 |
| 29 | `push-count-honesty` (r5) | `|| batch.length` turned real `0` into attempted size; missing `count=exact` | exact counts + missing-range = failure, all 5 push scripts | check-ea-classes #24 |
| 30 | `session-shrink` (r5) | malformed rows silently shortened fixed-form sessions | `droppedCount`/`poolShort` + top-up + UI banner | check-ea-classes #25 |
| 31 | `skill-label-raw` (r5) | raw taxonomy keys rendered to parents | `skillLabel()` + full Vietnamese coverage | check-ea-classes #26 |
| 32 | `e2e-origin-vacuum` (r5) | same-origin gate treated the backend origin as third-party | `VITE_SUPABASE_URL` allowlist | check-ea-classes #27 |
| 33 | `unverified-recipient` (r6) | student could store any email; weekly job mailed child progress to an unconfirmed address | `verified`/`verify_token` columns + confirm RPC + send gated on `pc.verified` + email-change reset trigger + column-write revoke (0036) | check-ea-classes #28 |
| 34 | `email-html-injection` (r6) | `display_name` concatenated raw into outbound email subject/HTML | `practice.email_esc()` on all interpolated text (0036) | check-ea-classes #29 |
| 35 | `xff-spoofable` (r6) | rate-limit bucket keyed on caller-settable first `x-forwarded-for` entry | last XFF entry (ingress-appended) keys the bucket; transcribe v12 | check-ea-classes #30 |
| 36 | `grant-shadow-column-revoke` (r7) | 0036 column revokes could not narrow 0005 table-level grant - `verified` stayed client-writable and `verify_token` client-readable | table-level revoke + column re-grant of the exact writable/readable set (0037) | check-ea-classes #31 |
| 37 | `sql-cas-transition` (r7) | `review_question` overwrote terminal queue statuses - stale approve resurrected a rejection | expected-status predicate `in ('pending','flagged')` + `{stale}` result (0037) | check-ea-classes #32 |
| 38 | `mic-lifecycle` (r7) | `startAudioRecording` await and retry `setTimeout` could fire after unmount - capture attached, stale `onAttempt` submitted | `unmountedRef` + tracked retry timer cleared on unmount + guard in `finish`/`done` (hook + 2 regression tests) | check-ea-classes #33 |
| 39 | `provider-config-regression` (r7) | 0036 mailers read only `resend_*` keys, dropping 0025's `email_provider`/`email_api_key`/`email_from` matrix | shared `practice.send_email()` provider dispatch; both mailers route through it (0037) | check-ea-classes #34 |
| 40 | `function-return-type-replay` (r7) | `create or replace` cannot change return type - 0029 redefined `get_ai_configs` int->jsonb, fresh replay dies | `drop function` first in 0029 + scanner tracks returns across files | check-ea-classes #35 |
| 41 | `verify-token-binding` (r8) | verify token stamped `where account_id` while an interleaved email change let it bind to a different address | `FOR UPDATE` row lock across read->send->stamp (0038) | check-ea-classes #36 |
| 42 | `verification-mail-quota` (r8) | resend throttle on the contact row resettable via email change or delete+reinsert - unlimited mails to arbitrary mailbox | `verify_send_log` quota table keyed on account, consumed atomically under the row lock (0038) | check-ea-classes #37 |
| 43 | `privilege-mutation-compat` (r8) | PostgREST upsert needs UPDATE on every payload column incl `account_id` - saves 403'd under tightened grants | `save_parent_contact` RPC binds ownership, writes only mutable cols; direct insert/update revoked (0038) | check-ea-classes #38 |
| 44 | `rpc-result-enum` (r8) | `{ok:false, stale:true}` / verify `throttled`/`failed` results ignored - denied actions reported as success | ReviewQueueCard surfaces stale + reloads; ParentReportScreen renders sent/throttled/failed | check-ea-classes #39 |
| 45 | `fetch-mode-parity` (r8) | public fetch mapped `exam` to `mockEligible` while auth used `examEligible` - same mode, different rows | same per-mode `case` in both RPCs (0038) | check-ea-classes #40 |
| 46 | `mic-lifecycle` residual (r8) | StrictMode never re-armed the guard; fallback/SR callbacks could launch post-unmount; ctor-fail leaked the stream | re-arm in setup + guard every launch path + `track.stop()` on ctor failure | check-ea-classes #33 (tightened) |
| 47 | `mic-lifecycle` residual (r9) | `recorder.start()` could throw after construction - caller never got a controller, tracks+VAD+timer leaked | `start()` wrapped in try/catch releasing tracks, VAD, and the cap timer | check-ea-classes #33 (tightened) + 2 lib tests |
| 48 | `rpc-result-enum` residual (r9) | null/malformed `review_question` payload passed the `ok === false` guard - ambiguous result treated as success | UI requires explicit `data?.ok === true` before the success transition | check-ea-classes #39 (tightened) |
| 49 | `async-response-staleness` (r10) | filter-driven `load()` never invalidated superseded requests - out-of-order responses overwrote the new filter's rows | request-generation counter + `alive()` guard on every post-await state write; regression test | check-ea-classes #41 |
| 50 | `priority-pagination-inversion` (r10) | `.range()` sliced the page by `question_id` before client-side priority sort - P0 items buried on later pages | `order('priority').order('question_id')` in the DB query before `.range()` | check-ea-classes #42 |
| 51 | `gate-orchestration-omission` (r10) | standalone `preflight.sh` ran only the reliability scanner - EA class gates were unenforced on that path | preflight invokes `npm run code:reliability` (single entry for all scanners + selftests) | check-ea-classes #43 |
| 52 | `retry-nontransient-errors` (r10) | `fetchRetry` retried every non-2xx incl. permanent 4xx, and slept after the final attempt | retry only 408/429/5xx, break on permanent failures, skip the trailing sleep | check-ea-classes #44 |
| 53 | `mic-lifecycle` residual (r10) | VAD init throwing after `new AudioContext()` but before `vadStop` wired left a context release() could not reach | hoisted `vadCtx`; catch closes a partially-initialized context; `close()` guarded by state | check-ea-classes #33 (tightened) + lib test |
| 54 | `mutation-view-context-race` (r11) | `act()` RPC resolving after a filter switch still mutated the new view's rows and count | capture view at action start; on mismatch invalidate + reload via `loadRef` instead of mutating | check-ea-classes #45 + regression test |
| 55 | `async-response-staleness` residual (r11) | generation guard did not cover unmount - an in-flight load could still write after the component left | `loadGenRef.current++` in the effect cleanup | check-ea-classes #41 (tightened) |
| 56 | `audit-runtime-portability` (r11) | audit-bank read secrets only from `~/.config/devin` - un-runnable in CI or other machines | `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` env first, file as optional fallback, fail with a clear message | check-ea-classes #46 |
| 57 | `scanner-selftest-exit-status` (r11) | selftest swallowed the scanner exit code - nonzero exits could pass silently | `scan()` returns `{out, code}`; both selftests assert the code | check-ea-classes #47 |
| 58 | `audit-network-timeout` (r11) | `fetchRetry` bounded attempts but not per-request time - a hung request blocked the audit | `AbortSignal.timeout(15000)` per attempt; timeouts classified transient | check-ea-classes #48 |
| 59 | `mutation-view-context-race` residual (r12) | A->B->A filter switch restored identical values - the value compare let a stale mutation mutate the new view | epoch guard (`genAtStart !== loadGenRef.current`) + successful mutations bump the epoch so pending loads cannot restore pre-mutation rows | check-ea-classes #45 + #41 (tightened) + ABA regression test |
| 60 | `scanner-selftest-exit-status` residual (r12) | safe-fixture scan ran on the shared bad+good dir - its exit code was meaningless | dedicated `reliability-good/` fixture dir; both polarity asserts (`equal(code,0)` + `notEqual(code,0)`) required per selftest | check-ea-classes #47 (tightened) |
| 61 | `auth-signout-error-loss` (r13) | `logout()` awaited `signOut()` but discarded `{error}` - caller treated a failed sign-out as success and cleared local state while the session survived | destructure the result and throw on `error`; caller keeps `finally` local cleanup and logs the failure | check-ea-classes #49 + auth test |
| 62 | `pagination-offset-after-mutation` (r13) | removing the last row of a later page left `offset` out of range - empty page rendered while earlier rows remained | after a successful mutation reconcile the offset to the last valid page; the offset change re-triggers `load()` | check-ea-classes #50 + regression test |
| 63 | `telemetry-owner-binding` (r14) | buffered attempt events carried no owner - a flush after an account switch re-attributed them to the new user | owner uid captured at creation; flush and adaptive logs drop when the live session differs | check-ea-classes #51 + 2 telemetry tests |
| 64 | `variant-dedupe` residual (r14) | server dedupes within one draw only - the client top-up draw could re-serve the same variant_group_id under a new row id | extras filtered by `variant_group_id ?? id` against the first draw before mapping | check-ea-classes #23b (tightened) + bank test |
| 65 | `pre-start-time-accounting` (r14) | `createExamFromBank` took a caller `Date.now()` captured before the fetches - question loading consumed exam time | `nowMs` param removed; `startedAtMs` set inside at return, post-assembly | check-ea-classes #52 + bank test |
| 66 | `orphaned-tool-imports` (r14) | `export-entry.ts` imported the deleted `ioeRealBank`/`vioMathBank` - the export tool crashed on run | dead imports/usages removed; every relative import in scripts/ must resolve | check-ea-classes #53 + export smoke run |

## Deferred

| Class | Finding | Status |
|-------|---------|--------|
| `result-forgery` | client writes `results` rows -> forged scores | CR-68: server-side score attestation RPC (design written, next CR scope) |
