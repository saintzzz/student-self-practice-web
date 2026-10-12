# External Review - Round 16 Triage

ChatGPT repo-connected review, commit `5b72630` (post-r15 push; code
equivalent to `ba98c43`, production deploy `CC749djHUVdWW53Vgj29bQHsv2qN`).
Verdict: **NOT-CLEAN** - 1 Medium + 2 Low: one new class, one new class,
one gate bypass. 986 tests, scanners, typecheck and build all verified
green by the reviewer. CR-68 re-listed as deferred.

## R16-01 (M). result-owner-binding - new class

`src/lib/practiceResults.ts` resolved the result owner only inside the
save call via `getSession()`. A run started under account A and finished
after a mid-activity switch to account B (second-tab login) was inserted
with `account_id = B`. The same pattern existed in all three save paths:
batch, exam/drill/mock/arena, and placement.

**Fix:** `bindActivityOwner()` captures `session.user.id` once at
activity start (`handleStartBatch`, `ExamScreen` mount,
`PlacementScreen` mount). Every save function re-reads the live session
and returns without inserting when it differs from the bound owner. A
guest-started run (owner `null`) that acquires a login mid-activity is
also dropped - consistent with the r15 telemetry rule. Call sites that
never bound an owner keep the legacy save-time behavior.
**Gate #56 (new)** - `practiceResults.ts` result inserts must carry an
owner binding + mismatch check.
**Regression tests:** `src/lib/practiceResults.test.ts` - same-owner
save, A->B switch drop, guest->login drop, no-bind legacy path, guest
no-op; exercised across all three save functions (9 tests).

## R16-02 (L). one-shot-effect-replay - new class

The `verify_email` effect in `src/App.tsx` called
`confirmParentEmail(token)` per effect setup. Under StrictMode the
first (cleaned-up) call still consumed the single-use token while its
result was discarded; the replayed call then observed "expired/already
used" and showed the failure notice.

**Fix:** `emailVerifyCache` (module-level `Map<token, Promise<boolean>>`)
shares the first request across effect replays; the entry self-deletes
on settle. The surviving effect applies the shared result - the query
string is still stripped exactly once per token.
**Gate #57 (new)** - any `verify_email`/`confirmParentEmail` consumer
must cache the request per token.
**Regression tests:** `src/App.verifyEmail.test.tsx` - StrictMode render
fires exactly one confirm call and shows the shared ok/fail result
(2 tests).

## R16-03 (L). audit-network-timeout bypass - gate #48 widened

The r11 gate scanned `scripts/audit-bank.mjs` only. Three sibling audit
tools still used unbounded `fetch()` and could block a gate run
indefinitely on a hung connection:

- `scripts/qb-content-audit.mjs` (PostgREST reads)
- `scripts/qb-answer-verify.mjs` (reads, PATCH, LLM calls)
- `scripts/qb-answer-confirm.mjs` (reads, PATCH, LLM calls)

**Fix:** `AbortSignal.timeout(...)` added to every fetch site - 15s for
PostgREST reads/writes, 120s for LLM completions. Retry/status
classification unchanged.
**Gate #48 (extended)** - the timeout check now walks every
`audit-*`/`*-audit`/`qb-*` script, not just audit-bank.
**Fixtures:** `ea-bad` gained `qb-answer-verify.mjs` (unbounded fetch);
`ea-good` gained `qb-content-audit.mjs` (bounded). Selftest asserts the
bad stub trips the class.

## Deferred (unchanged)

- **CR-68 `result-forgery`** - client-written `results` rows can carry
  forged scores; requires the server-side score-attestation RPC. Still
  tracked, not silently dropped.
