# External Review - Round 7 Triage

Codex Cloud task `01a12ee9`, post-r6 commit `d727788`.
Verdict: **NOT-CLEAN** - 2 High + 4 Medium. All source-confirmed.
Every finding is a new defect class or a residual of an r6 fix that the
gate could not see (grant semantics live in the catalog, not the file
text - the scanner now checks the corpus the way Postgres checks it).

## H1. grant-shadow-column-revoke - `verified` still client-writable

0005 granted TABLE-level `insert/update/delete/select` on
`parent_contacts` to `authenticated`. 0036 revoked `verified`/
`verify_token` AT COLUMN level - but Postgres privileges are unions:
the table grant still applied, so a student could `update
parent_contacts set verified = true` directly, and `select` still
exposed `verify_token` (self-confirm without ever owning the mailbox).

**Fix (0037):** revoke `insert, update, select` on the table from
`authenticated`; re-grant the exact writable/readable columns
(`insert`: account_id/email/opted_in/updated_at; `update`:
email/opted_in/updated_at; `select`: + verified/last_sent_at so the
report screen still renders state). `verify_token`/
`verify_token_sent_at` now never reach the client.
**Gate #31** - every column-level `revoke` requires the same-privilege
table-level `revoke` somewhere in the migration corpus.
**Live-verify:** `information_schema.column_privileges` shows exactly
the intended set; `verify_token` has no authenticated privilege.
(Delete survives at table level - equivalent to `opted_in=false` under
own-row RLS, harmless.)

## H2. function-return-type-replay - fresh replay dies in 0029

`0029_multi_gemini_key_fallback.sql` does `create or replace function
get_ai_configs()` changing the return type int -> jsonb. Postgres
rejects return-type changes via OR REPLACE; a fresh replay of the
corpus errors.

**Fix:** `drop function if exists` before the replace in 0029 (already
committed). Corpus sweep found `0007_arena_draw.sql` arena_* functions
as false positives (drops already present).
**Gate #35** - scanner tracks `returns` per function across files; a
change without a preceding `drop function` in the same file trips.

## M1. fetch-gate-parity (residual) - commercial gate only in mock branch

0035's authenticated `fetch_questions` applied
`requiresHumanApprovalForCommercialRelease` only inside the `mock` case
arm; `practice`/`exam` modes and pass-2 omitted it. The public RPC
checked it unconditionally - authenticated reads could leak content
cleared for internal use but not commercial release.

**Fix (0037):** the gate moved to the unconditional WHERE in both
passes; per-mode `case` keeps only the mode flag + exam-approval gates.
**Live-verify:** `pg_proc.prosrc` contains the gate outside the case.

## M2. sql-cas-transition - stale review write resurrects a reject

`review_question` updated `qb_review_queue` and `qb_questions` by id
with no prior-status predicate - a reviewer tab holding a stale
"approve" could overwrite a completed rejection. The `cas-transition`
gate only scans TS; SQL RPCs were invisible to it.

**Fix (0037):** queue update predicates `review_status in ('pending',
'flagged')`; 0 rows -> returns `{ok:false, stale:true, current:...}` and
writes nothing else (no question update, no events, no audit).
**Gate #32** - latest `review_question` def must carry an
expected-status predicate.
**Live-verify:** `prosrc` contains `review_status in ('pending',
'flagged')`.

## M3. mic-lifecycle - capture/timer fire after unmount

`usePronunciationRecording`: `await startAudioRecording()` could resolve
after the child left (capture attached + `onAttempt` submitted a stale
transcript); the retry `setTimeout(..., 150)` could relaunch recording
post-unmount; VAD `done` and `transcribePronunciationAudio` had the same
gap.

**Fix:** `unmountedRef` set in cleanup; guards on the
post-permission branch, `controller.done`, post-`transcribe` and
`finish`; retry timer stored in `retryTimerRef` and cleared on unmount.
Regression tests: `usePronunciationRecording.unmount.test.ts` (2 cases:
permission resolves post-unmount -> controller cancelled, never
submits; VAD fires post-unmount -> no transcribe, no submit).
**Gate #33** - hooks awaiting mic capture must carry an unmount guard.

## M4. provider-config-regression - 0036 dropped the provider matrix

0025 built `email_provider`/`email_api_key`/`email_from` vault dispatch
(brevo/sendgrid/mailersend). 0036's rewritten mailers read only
`resend_*` keys - the whole matrix silently dead.

**Fix (0037):** shared `practice.send_email(to, subject, html)` holds
the full provider dispatch (resend default + legacy `resend_*` key
fallback); `send_weekly_reports` and `request_parent_verify` both route
through it. No outbound mail touches `net.http_post` or vault keys
directly.
**Gate #34** - mailer defs containing `net.http_post`/
`decrypted_secrets` while `practice.send_email` exists trip the class.
**Live-verify:** `prosrc` of `send_email` contains brevo/sendgrid/
email_provider; mailers contain no direct post.

## Gates

35 -> 40 documented classes; scanner rules 31-35 with bad/good
fixtures; selftest 3/3. `npm run code:reliability` (reliability +
classes + both selftests) is the CI gate.

## Deferred (unchanged)

- `result-forgery` - client-written `results` rows. CR-68 design
  (server-side score attestation RPC) still next CR scope.
