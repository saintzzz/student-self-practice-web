# External Review - Round 8 Triage

Codex Cloud task `01a12f62`, post-r7 commit `75b50cf`.
Verdict: **NOT-CLEAN** - 1 High + 5 Medium + 1 Low, all evidence-backed
and source-confirmed. r7 fixes verified present by the reviewer
(table-level revoke, unconditional commercial gate, CAS predicate,
provider dispatch, 0029 drop). Three findings are residuals of r7-era
changes the gates could not see; four are new classes.

## H1. verify-token-binding - token stamped on a changed email

`request_parent_verify` read `email`, generated the token, then
`UPDATE ... WHERE account_id`. An interleaved `save`/email change left a
token issued for address A stamped on a row holding address B - the
mailbox-A owner clicking the link would verify B, which then receives
child reports.

**Fix (0038):** `perform 1 from parent_contacts where account_id = v_uid
for update` locks the row for the whole read->send->stamp sequence. A
concurrent contact update either lands first (the RPC reads the new
address) or waits and then trips the reset trigger (dead link, no wrong
verify).
**Gate #36** - latest `request_parent_verify` def must contain a row lock.
**Live-verify:** `prosrc` contains `for update`.

## M1. privilege-mutation-compat - upsert payload wider than grants

Client `saveParentContact` upserted `{account_id, email, opted_in,
updated_at}`. PostgREST `ON CONFLICT DO UPDATE` requires UPDATE on every
payload column; r7's tightened grants deliberately excluded
`account_id`, so every save 403'd in production.

**Fix (0038):** `practice.save_parent_contact(p_email, p_opted_in)` RPC
binds `account_id = auth.uid()` and writes only mutable columns (the
email-change trigger still resets verification). Direct authenticated
insert/update column grants revoked - the RPC is the only write path.
**Gate #38** - client may not issue direct `parent_contacts` writes;
`rpc('save_parent_contact')` required.

## M2. mic-lifecycle residual - three real branches remained

- StrictMode: cleanup set `unmountedRef=true`, setup never re-armed ->
  the replayed mount was permanently dead.
- `fallBackToRecorder` / `launch` could still be invoked from SR
  callbacks after unmount -> mic permission requested on a dead page.
- `getUserMedia` ok + `MediaRecorder` ctor throw -> stream tracks never
  released (caller got no controller to cancel).

**Fix:** `unmountedRef.current = false` in effect setup; guards at
`launch`, `launchRecorder` and `fallBackToRecorder`; `audioRecording.ts`
stops tracks on ctor failure.
**Gate #33 tightened** - flag must be re-armed; `audioRecording.ts`
must contain a `catch` that stops tracks after `new MediaRecorder`.

## M3. fetch-mode-parity - public exam used mockEligible

`fetch_questions_public` mapped `p_mode in ('mock','exam') ->
mockEligible`; the authenticated fetch used `examEligible` for exam. A
mockEligible-only row was served in public "exam" but filtered
authenticated - same mode, different row sets by auth path.

**Fix (0038):** public fetch now uses the identical per-mode `case`
(exam -> `examEligible` + exam-approval gate; mock -> `mockEligible` +
exam-approval gate) in both sampling passes.
**Gate #40** - public def must route `p_mode='exam'` to `examEligible`.
**Live-verify:** `prosrc` contains `examEligible`.

## M4. rpc-result-enum - denied CAS write reported as success

`review_question` returns `{ok:false, stale:true, current}` on a CAS
loss over HTTP-200; `ReviewQueueCard.act` only destructured `error`, so
a stale approve closed the dialog and dropped the row as if it worked.

**Fix:** read `data`; on `stale` show the current status + reload the
queue; on `ok:false` surface a denied message. Rows only leave the list
on a business-success.
**Gate #39** - `ReviewQueueCard` must reference `stale` when calling
`review_question`.

## M5. verification-mail-quota - throttle resettable via row edits

The resend clock lived on `parent_contacts`: changing the email fired
the reset trigger, and delete+reinsert recreated the row - both
unlimited-verify-mail bypasses against an arbitrary mailbox. Concurrent
calls also raced (no lock between count and insert).

**Fix (0038):** `verify_send_log(account_id, sent_at)` table - quota
keyed on the account, not the contact row; the count+insert happens
under the same `FOR UPDATE` lock as H1, so concurrent calls serialize.
Table has RLS on + all privileges revoked (definer functions only).
**Gate #37** - def must consult `verify_send_log`; table must be created.
**Live-verify:** `prosrc` contains `verify_send_log`; table exists with
`relrowsecurity = true`.

## L1. verify-failure-ux - failed enqueue looked identical to saved

`handleSaveEmail` only kept `already`; `sent`/`throttled`/`failed` were
indistinguishable, and resend was silent - a misconfigured mailer left
the parent waiting forever.

**Fix:** `verifyState` renders `sent` / `throttled` / `failed` lines
distinct from the saved-contact message, on both save and resend.
**Gate #39** (shared) - screen must handle the throttled branch.

## Gates

40 -> 45 documented classes (+1 residual tightening); scanner rules
36-40 plus a tightened #33 with bad/good fixtures; selftest 3/3.

## Deferred (unchanged)

- `result-forgery` - client-written `results` rows. CR-68 (server-side
  score attestation RPC) remains next CR scope.
