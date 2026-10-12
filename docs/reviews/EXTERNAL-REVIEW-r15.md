# External Review - Round 15 Triage

ChatGPT repo-connected review, commit `2565897` (post-r14 push).
Verdict: **NOT-CLEAN** - 4 Medium: two NEW classes plus two gate
bypasses of closed classes. All r14 repairs verified present in
source. CR-68 re-listed as deferred.

## M1. telemetry-owner-binding bypass - check only before first chunk

The r14 fix checked the owner ONCE before entering the chunk loop.
A buffer over 200 events flushes in pieces, so an account switch
between chunk 1 and chunk 2 still leaked the rest to the new identity.

**Fix:** `ownerStillActive()` moved INSIDE `while (buffer.length > 0)`
before every splice. A `flushing` flag was also added - `record()`
auto-flushes at 5 buffered events, so without it every later record
spawned a concurrent flush loop that interleaved chunks.
**Gate #51 (tightened)** - the owner check must be inside the chunk
loop before every splice.
**Regression test:** deferred RPC pauses chunk 1; session switches to
u2 mid-send; exactly 1 RPC of 200 events escapes, the rest is dropped.

## M2. generator-answer-consistency - unsolvable reorder shipped

`scripts/gen-adv/items-english.mjs` authored a reorder with tiles
`["sometimes","My","walks","dog","my","to","park","the","."]` for the
answer "My dog sometimes walks to the park." - a stray lowercase `my`
made no permutation correct. The item was already live
(`g3-english-adv-6506c5012a25`, approved, practice+mock eligible) and
neither the generator validation nor audit-bank checked the tile
multiset.

**Fix:** stray `my` removed in source; the live row's `tokens` patched
to the 8-token bank. Generator validation now compares the
tile-vs-answer word multiset under scorer normalization (lowercase +
punctuation stripped, tiles joined before splitting so multiword
tiles stay valid); the same permutation check was added to
audit-bank.mjs and the live scan confirms 0 unsolvable rows.
**Gate #54 (new)** - any gen script emitting reorder items must carry
a multiset/sequence-consistency proof, and the live audit must
re-check published rows.
**Regression coverage:** generator validation fails the old item;
audit check flagged the live row before the patch.

## M3. updater-side-effect - answer submitted inside a state updater

`WordOrderView.pick()` called `onAnswer()` (telemetry-bearing) inside
the `setPicked()` functional updater. Updaters must be pure - React
StrictMode replays them, double-firing the submit.

**Fix:** `pick` reads `picked` from closure, calls `setPicked(next)`,
then invokes `onAnswer` outside the updater when the tile set is
complete.
**Gate #55 (new)** - no side effects (`onAnswer`, rpc, fetch,
telemetry) inside a `setX(prev => {...})` updater.
**Regression tests:** StrictMode render picks all tiles -> `onAnswer`
exactly once with the assembled indices; backtracking and re-picks
rebuild correctly.

## M4. async-response-staleness bypass - AdminScreen refresh unguarded

`AdminScreen.refresh()` awaited four `fetchAllRows` then wrote all
state unconditionally; mutation handlers fire `refresh()` after every
write, so a slow earlier refresh could overwrite the post-mutation
snapshot.

**Fix:** `refreshGenRef` epoch captured per refresh; a superseded
response returns before applying. The mount effect cleanup bumps the
epoch so unmount invalidates in-flight work; the progress-tab results
fetch uses the same guard.
**Gate #41 (extended)** - the staleness rule now covers AdminScreen's
multi-source refresh, not just ReviewQueueCard.
**Regression test:** deferred fetchAllRows; mutation-triggered refresh
B resolves first, stale refresh A last - A's rows never render.

## Deferred (unchanged)

| Item | Status |
|------|--------|
| CR-68 `result-forgery` - server-side score attestation | deferred, design written |

## Gates after r15

- **55 defect classes** (2 new: `generator-answer-consistency`,
  `updater-side-effect`; `telemetry-owner-binding` and
  `async-response-staleness` tightened; fixtures updated, EA selftest
  3/3 + reliability selftest 3/3).
- `telemetry.test.ts` +1 (mid-flush chunk switch);
  `ExamScreen.wordOrder.test.tsx` +3 (StrictMode once-only, pool
  removal, backtracking); `AdminScreen.test.tsx` +1 (deferred-promise
  staleness).
- Live data: bad reorder row patched; audit-bank gained the reorder
  permutation check - 0 unsolvable rows.
