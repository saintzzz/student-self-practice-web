# External Review - Round 14 Triage

ChatGPT repo-connected review, commit `bfe2e58` (post-r13 push).
Verdict: **NOT-CLEAN** - 3 Medium + 1 Low: three NEW classes plus one
scanner false negative on `variant-dedupe`. All r13 repairs verified
present in source. CR-68 re-listed as deferred.

## M1. telemetry-owner-binding - events re-attributed on account switch

`createExamTelemetry` buffered attempt events with no owner identity.
`flush()` only checked that SOME session existed, so events recorded
under account A were sent under B after a second-tab login (server
assigns `auth.uid()` at flush time).

**Fix:** `ownerPromise` captures the uid at creation. `flush()` and
`logAdaptive()` compare the live session's `user.id` against it and
drop the buffer on mismatch. Guest-created buffers also drop if a
login lands mid-exam (guest events must not attach to the account).
**Gate #51 (new)** - telemetry must store an owner and compare
`session.user.id` at every egress.
**Regression tests:** owner switch drops buffer; guest buffer stays
dropped after a mid-exam login.

## M2. variant-dedupe bypass - top-up draw repeats a variant group

The server dedupes `coalesce(variant_group_id, id)` within ONE draw
only. The client top-up (r5 session-shrink fix) mapped rows then
excluded by `q.id`, so a second draw could re-serve the same
variant_group_id under a different row id - the probe reproduced
`[a(G), b(G)]` in one session.

**Fix:** `seenVariant` collects `r.variant_group_id ?? r.id` from the
first draw; extra rows whose key already appeared are filtered BEFORE
mapping drops the key.
**Gate #23b (tightened)** - when the client combines separate draws,
the exclusion must use the variant key.
**Regression test:** first draw `[a(G)]`, top-up `[b(G), c(H)]` ->
session `[a, c]`, never `b`.

## M3. pre-start-time-accounting - loading eats exam time

`ExamScreen` passed `Date.now()` to `createExamFromBank` BEFORE
awaiting the fetches; the value landed in `startedAtMs` unchanged. A
30 s RPC meant a mock exam opened with 30 s already gone.

**Fix:** `nowMs` param removed; `startedAtMs: Date.now()` is assigned
inside at return time, after assembly completes.
**Gate #52 (new)** - `createExamFromBank` must not accept a caller
timestamp and no call site may pass `Date.now()` pre-await.
**Regression test:** fake-clock advance during the RPC ->
`startedAtMs` is at/after the advance.

## L1. orphaned-tool-imports - export command crashed

`export-entry.ts` imported the deleted `src/data/ioeRealBank` and
`src/data/vioMathBank`; `export-question-bank.mjs` failed at bundle
time. The production build never exercises this path.

**Fix:** dead imports/usages removed (ioe harvest + vio bank retired);
stale export notes updated. Verified: `node
scripts/export-question-bank.mjs` now runs to completion.
**Gate #53 (new)** - every relative import in `scripts/*.{ts,mjs}`
must resolve (comments and template literals stripped first so
codegen strings are not flagged).

## Deferred (unchanged)

| Item | Status |
|------|--------|
| CR-68 `result-forgery` - server-side score attestation | deferred, design written |

## Gates after r14

- **53 defect classes** (3 new + variant-dedupe tightened client-side,
  fixtures updated, EA selftest 3/3 + reliability selftest 3/3).
- `bank.test.ts` +2 tests (cross-draw variant dedupe, post-assembly
  clock); `telemetry.test.ts` +2 (owner switch, guest-to-login).
