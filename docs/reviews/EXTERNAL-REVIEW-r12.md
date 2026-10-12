# External Review - Round 12 Triage

ChatGPT repo-connected review, commit `43bc252` (post-r11 push).
Verdict: **NOT-CLEAN** - 2 Medium + 1 Low, all three scanner
false-negatives on previously closed classes (no new classes, no
Critical/High). All r11 repairs verified present in source. CR-68
re-listed as deferred.

## M1. mutation-view-context-race bypass - ABA view race

`act()` compared captured `{statusFilter, offset}` VALUES against the
live view. An A->B->A switch (pending -> approved -> pending, same
offset) restores identical values, so a stale mutation passed the guard
and mutated the new view.

**Fix:** the guard is now a monotonic epoch - `genAtStart =
loadGenRef.current` captured before the RPC, compared after it. Every
view change bumps the generation via the load effect, so ABA is
detected. `viewRef`/`viewAtStart` removed.
**Gate #45 (tightened)** - the mutation guard must be an epoch
(`genAtStart`/`viewEpoch`), not a value comparison.
**Regression test:** A->B->A sequence - after the RPC resolves the UI
takes the reload path (`Đang tải`), never the optimistic mutation.

## M2. async-response-staleness bypass - old load overwrites a mutation

A `load()` snapshot captured before an approve could resolve after the
optimistic removal and restore the row - mutations never invalidated
in-flight loads.

**Fix:** a successful mutation bumps `loadGenRef.current` before
applying local changes, so every still-running load is discarded.
**Gate #41 (tightened)** - `loadGenRef.current++` must appear in at
least two sites (effect cleanup + mutation path).

## L1. scanner-selftest-exit-status bypass - safe-fixture exit untested

The reliability selftest's safe-fixture case ran the shared bad+good
fixture dir (always exits nonzero by design) and never asserted the
passing-path exit code.

**Fix:** dedicated `tests/fixtures/reliability-good/` dir (good.ts
only); the safe-fixture test now asserts `code === 0`.
**Gate #47 (tightened)** - every selftest must assert BOTH polarities:
`notEqual(code, 0)` for the bad fixture and `equal(code, 0)` for the
passing path.

## Deferred (unchanged)

| Item | Status |
|------|--------|
| CR-68 `result-forgery` - server-side score attestation | deferred, design written |

## Gates after r12

- **48 defect classes** (3 gates tightened, fixtures updated, selftest
  3/3 + reliability selftest 3/3).
- `ReviewQueueCard.test.tsx` now 5 tests including the ABA epoch case.
