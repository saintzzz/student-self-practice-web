# External Review - Round 10 Triage

ChatGPT repo-connected review, commit `2c93057` (post-r9 push).
Verdict: **NOT-CLEAN** - 4 Medium + 1 Low: four NEW defect classes and
one `mic-lifecycle` gate bypass. All six r9 repairs verified present in
source by the reviewer. No Critical/High. CR-68 re-listed as deferred,
not counted as a finding.

Reviewer scope note: targeted static review (no local test/migration
execution) - covered by our own gate run below.

## M1. async-response-staleness - superseded load overwrites filter state

`ReviewQueueCard.load()` ran several sequential awaits then wrote state
unconditionally. A slower pending-filter response resolving after a
newer approved-filter request displayed pending rows under the approved
filter.

**Fix:** `loadGenRef` generation counter; `alive()` guard before every
post-await state write (4 sites + final `setRows`).
**Gate #41** - a multi-await paginated loader must carry a
generation/aliveness guard.
**Regression test:** `ReviewQueueCard.test.tsx` resolves the stale
request last and asserts the old rows never render.

## M2. priority-pagination-inversion - page sliced before priority sort

`.range()` paginated by `question_id`; `PRIORITY_ORDER` sorted only the
20 fetched rows. A P0 question on page 3 ranked below P3 items on page 1.

**Fix:** `.order('priority').order('question_id')` in the DB query
before `.range()` (P0<P1<P2<P3 sorts correctly as text); removed the
now-redundant client sort.
**Gate #42** - `qb_review_queue` queries that paginate must order by
priority first.
**Regression test:** asserts `order:priority` precedes `range` in the
query chain.

## M3. gate-orchestration-omission - preflight skipped EA gates

`preflight.sh` ran only `check-reliability.mjs`; the EA class scanner
was enforced only via CI's `npm run code:reliability`.

**Fix:** preflight now invokes `npm run code:reliability` (single entry
point for both scanners + both selftests), keeping the per-script
fallback when the npm script is absent.
**Gate #43** - preflight must reference `code:reliability` or
`check-ea-classes` when the EA scanner exists.

## M4. mic-lifecycle bypass - partial VAD init leaks AudioContext

`new AudioContext()` succeeded, then `createAnalyser()`/`connect()`
threw before `vadStop` was assigned - the catch continued silently and
`release()` could never close the context.

**Fix:** hoisted `vadCtx`; the catch closes a partially-initialized
context (state-guarded, `close().catch()` idempotent).
**Gate #33 (tightened)** - a `new AudioContext` block must close the
context inside its failure catch.
**Regression test:** fake AudioContext whose `createAnalyser` throws -
asserts `close()` called exactly once.

## L1. retry-nontransient-errors - 4xx retried, trailing sleep

`fetchRetry` retried every non-2xx (incl. permanent 400/401/403) and
slept after the final attempt.

**Fix:** retry only 408/429/5xx; break immediately on permanent
failures; no sleep after the last attempt.
**Gate #44** - retry loops must carry a transient-status guard.

## Deferred (unchanged)

| Item | Status |
|------|--------|
| CR-68 `result-forgery` - server-side score attestation | deferred, design written |

## Gates after r10

- **44 defect classes** in `check-ea-classes.mjs` (+4 new, +1 tightened),
  bad/good fixtures + selftest 3/3.
- Reviewer "not executed" rows (replay, grants/RLS, test run) covered by
  our own run: full vitest, tsc, build, preflight, live audit-bank.
