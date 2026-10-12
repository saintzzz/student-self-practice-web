# External Review - Round 11 Triage

ChatGPT repo-connected review, commit `7b7473a` (post-r10 push).
Verdict: **NOT-CLEAN** - 3 Medium + 2 Low: four NEW defect classes and
one `async-response-staleness` gate bypass. All eight r10 repairs
verified present in source by the reviewer. No Critical/High. CR-68
re-listed as deferred.

## M1. mutation-view-context-race - mutation mutates a different view

`act()` resolved an in-flight `review_question` RPC after the reviewer
switched filter, then still ran `setTotal(t - 1)` and filtered rows on
the *new* view - corrupting its count and pagination.

**Fix:** `viewRef` tracks the live view; `act` captures `viewAtStart`
and, on mismatch, invalidates + reloads via `loadRef` instead of
mutating. The `err`/`stale`/`ok` handlers now only run when the view
still matches.
**Gate #45** - mutation success paths touching list/count must check
view context.
**Regression test:** approve clicked, filter switched, RPC resolved -
approved count and rows untouched.

## L1. async-response-staleness bypass - unmount does not invalidate

`loadGenRef` guarded filter races but `useEffect` had no cleanup - a
load resolving after unmount still passed `alive()`.

**Fix:** effect cleanup increments the generation, invalidating any
in-flight request for that view instance.
**Gate #41 (tightened)** - a `loadGenRef` component must bump the
generation in its effect cleanup.
**Test:** unmount smoke - resolving the pending query post-unmount
writes nothing and throws nothing.

## M2. audit-runtime-portability - dev-home secret path only

`audit-bank.mjs` read credentials only from
`~/.config/devin/secrets/supabase_new_keys.json` - un-runnable in CI or
another workstation.

**Fix:** `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env first, local
file as optional fallback, clear startup error when neither exists.
**Gate #46** - a dev-home secret read requires an env config path.

## L2. scanner-selftest-exit-status - swallowed exit codes

Both scanner selftests' `scan()` returned output on nonzero exit, so a
scanner printing the success marker but failing could pass.

**Fix:** `scan()` returns `{out, code}`; bad fixture asserts nonzero,
good fixture and real repo assert zero (both selftests).
**Gate #47** - selftests must surface and assert the scanner exit code.

## L3. audit-network-timeout - no per-request deadline

`fetchRetry` capped attempts but not per-attempt time - a hung request
blocked the audit indefinitely.

**Fix:** `AbortSignal.timeout(15000)` per request; timeout/network
errors are transient (retried), 408/429/5xx retried, other 4xx break.
**Gate #48** - fetch retry loops must carry a request signal/timeout.

## Deferred (unchanged)

| Item | Status |
|------|--------|
| CR-68 `result-forgery` - server-side score attestation | deferred, design written |

## Gates after r11

- **48 defect classes** in `check-ea-classes.mjs` (+4 new, +1
  tightened), bad/good fixtures + selftest 3/3.
- Regression tests: 4 in `ReviewQueueCard.test.tsx`, 3 in
  `audioRecording.test.ts`.
