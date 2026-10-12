# External Review - Round 9 Triage

ChatGPT repo-connected review, commit `580156a` (post-r8 push).
Verdict: **NOT-CLEAN** - 2 Medium, both **scanner false-negatives on
previously closed classes** (gate bypasses, not new classes). All r8
fixes verified present in source by the reviewer (0038 row lock,
verify_send_log quota, save_parent_contact RPC, public examEligible
parity, stale handling, verify states, hook re-arm/guards, ctor-fail
stream release). No Critical/High.

Reviewer scope note: whole-repo audit limited to targeted source review
via GitHub connector (container had no GitHub DNS). Findings are
source-confirmed; a clean local build/test/replay could not be
certified by the reviewer - our own gates below cover that.

## M1. mic-lifecycle - `recorder.start()` throw leaks the stream

`src/lib/audioRecording.ts`: r8 wrapped `new MediaRecorder` in a
try/catch releasing tracks, but `recorder.start()` (after VAD init +
cap timer arm) could still throw. No controller is returned, so nothing
released the tracks, VAD AudioContext, or timer.

**Fix:** `start()` wrapped in try/catch calling `clearTimeout(timer)`
+ `release()` (VAD + all tracks) before rethrow.
**Gate #33 (tightened)** - `recorder.start()` must sit inside a try
whose catch calls `release()`/`track.stop()`.
**Regression tests:** `src/lib/audioRecording.test.ts` - both
`start()`-throw and ctor-throw paths assert every captured track is
stopped.

## M2. rpc-result-enum - ambiguous review payload accepted as success

`src/components/ReviewQueueCard.tsx`: after the `stale` check, only
`data && data.ok === false` was rejected - `data === null`, missing
`ok`, or an unexpected shape over HTTP-200 silently applied the success
transition (row removed, count decremented).

**Fix:** success transition now requires `data?.ok === true`; anything
else shows "Khong xac nhan duoc ket qua duyet".
**Gate #39 (tightened)** - callers of `review_question` must contain an
explicit `ok === true` / `ok !== true` assertion.

## Deferred (unchanged)

| Item | Status |
|------|--------|
| CR-68 `result-forgery` - server-side score attestation | deferred, design written; reviewer re-listed it separately, not counted as a new finding |

## Reviewer's "verification outstanding" notes (r9 TOP-10 rows 4-10)

Not defects - areas static review cannot certify. Covered by our own
execution: 967+ vitest incl. mic lifecycle regressions, tsc, build,
preflight (reliability scanner + selftest), EA scanner (bad fixture
trips every class, good fixture/repo clean), migration applied live
with `prosrc`/grants verified via SQL. A full 0001-0038 fresh replay
remains a manual verification option.
