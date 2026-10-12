# External Review - Round 13 Triage

ChatGPT repo-connected review, commit `87cf8cc` (post-r12 push).
Verdict: **NOT-CLEAN** - 1 Medium + 1 Low, both NEW classes (no
Critical/High). All r12 repairs verified present in source. CR-68
re-listed as deferred.

## M1. auth-signout-error-loss - signOut error swallowed

`logout()` in `practiceAuth.ts` awaited
`(await getSupabase()).auth.signOut()` and discarded the returned
`{error}`. A failed sign-out (network loss, revoked refresh token)
looked identical to success - `App.tsx` cleared local state and showed
the login screen while the Supabase session survived on the device.

**Fix:** `logout()` destructures the result and `throw`s on
`error`. `handleSignOut` already wrapped the call in `try/finally` that
clears local state; a `catch` now logs the failure so the error is
visible instead of silently dropped.
**Gate #49 (new)** - `auth.signOut()` results must be inspected
(`{ error }` destructured) and propagated.
**Regression test:** `practiceAuth.test.ts` - mock signOut resolving
`{error}` rejects `logout()`; a clean resolve returns normally.

## L1. pagination-offset-after-mutation - last-page offset stranded

`act()` optimistically removed the row and decremented `total` but left
`offset` unchanged. Removing the only row on the final page (e.g. page
2 of 21 rows) left `offset=20 >= total=20` - the view rendered an
empty page while 20 rows remained on page 1.

**Fix:** after a successful mutation, when the current page held its
last row (`rows.length <= 1`) and `offset > 0`, the offset steps back
one page (`max(0, offset - PAGE)`). The offset change re-triggers the
load effect, which fetches the authoritative previous page. The r12
epoch guard is untouched - the generation still bumps on every
successful mutation.
**Gate #50 (new)** - a mutation that removes rows must reconcile
`offset` against the new `total` (or always reload).
**Regression test:** `ReviewQueueCard.test.tsx` - paginate to the last
page, approve its sole row, assert the offset reset triggers a fresh
first-page load.

## Deferred (unchanged)

| Item | Status |
|------|--------|
| CR-68 `result-forgery` - server-side score attestation | deferred, design written |

## Gates after r13

- **50 defect classes** (2 new gates, fixtures updated, EA selftest
  3/3 + reliability selftest 3/3).
- `ReviewQueueCard.test.tsx` now 6 tests including the
  final-page-offset case; `practiceAuth.test.ts` gains the signOut
  error case.
