# External Review - Round 17 Triage

ChatGPT Codex Cloud review (`local/01a13181`), commit `432b8be` (empty
verify-commit on top of `fe2c170` - code identical). Published
environment `student-self-practice-web`, no secrets.
Verdict: **NOT-CLEAN** - 4 Medium: two new classes, one
`result-owner-binding` bypass, one new class. Reviewer verified:
production build + tsc pass, 997/997 tests (two subprocess-failures
passed on targeted retry), reliability + attribution gates pass.
Browser/Playwright and live Supabase/RLS checks could not run in the
environment (Chromium download blocked by network policy) - marked
unverified, not failed. CR-68 re-listed as deferred.

## R17-01 (M). cross-tab-stale-session - new class

`src/App.tsx` loads auth once at mount; `onAuthChange` existed in
`practiceAuth.ts` but had no production consumer. If a second tab
switches from student A to B, this tab keeps A's name, grade
permissions, activity, and engagement binding while every new request
authenticates as B - parent-contact operations can target B under a UI
identifying A, and the cached engagement store can overwrite shared
storage with A's progress.

**Fix:** `boundUidRef` records the auth uid the tab loaded state for
(set on session resolve, account load, login; cleared on own
sign-out). An `onAuthChange` subscription compares each event: once a
real uid is bound, a different uid or a dropped session calls
`reloadPage()` - `src/lib/reload.ts` is a mockable seam so the reload
is testable. Unbound states (login screen, guest) ignore events; a
same-uid refresh event is a no-op.
**Gate #58 (new)** - `App.tsx` must subscribe to session changes.
**Regression tests:** `src/App.authChange.test.tsx` - switch, drop, and
same-uid cases (3 tests).

## R17-02 (M). arena-owner-binding - result-owner-binding bypass

`src/lib/arena.ts` resolves the session only inside `arenaCreate`/
`arenaAccept` at submit time. The r16 owner binding covers the result
save paths only - a duel started as A and finished after a switch to B
would create/accept the challenge as B.

**Fix:** `activityOwnerMatches()` exported from `practiceResults.ts`
exposes the same binding check; `ExamScreen`'s arena settle branch
returns early (failure state, no RPC) when the bound owner no longer
holds the session. Unbound callers keep legacy behavior.
**Gate #59 (new)** - every `await arenaCreate(`/`await arenaAccept(`
site must carry `activityOwnerMatches`.
**Regression tests:** `practiceResults.test.ts` (4 cases) +
`ExamScreen.arena.test.tsx` owner-mismatch case - no RPC fires.

## R17-03 (M). sync-merge-lossy - new class

`src/lib/engagement/sync.ts` merged cumulative counters with
`Math.max`: two devices both at 100 answers that independently add 10
and 20 merged to 120 instead of 130; merging correct/total
independently could also inflate accuracy. Separately, the
pull->merge->whole-row `upsert` was not atomic - a concurrent device
push between our pull and upsert was overwritten despite merging.

**Fix:**
- `StatsSlice.devices` - per-device counter buckets keyed by a stable
  `beheo-device-id`; `recordSkillAnswer(s)` mirrors every increment
  into the local bucket. Pre-attribution blobs fold into a shared
  `legacy` bucket, so already-synced history max-dedupes once instead
  of double counting or being dropped.
- `mergeEngagement` now merges each bucket with per-counter max
  (monotonic, idempotent), sums buckets into the aggregate, and
  re-applies the 30-day caps; the device map travels in state so later
  merges stay attributed. Buckets capped at 10 (excess folds into
  `legacy`).
- `fetchRemoteRow` returns the row's `updated_at`; `upsertStateCAS`
  writes conditionally (update `eq(updated_at)`, insert relies on the
  PK). A `conflict` re-pulls + re-merges inside `runCycle` (max 3
  attempts) instead of clobbering.
**Gate #60 (new)** - `mergeEngagement` must run through device buckets;
whole-row writes must be version-checked.
**Regression tests:** 5 merge cases (two-device sum, legacy dedupe,
counter consistency, idempotency, skills/skillDays) + 2 CAS cases
(conflict re-merge, bind conflict) + store attribution tests.

## R17-04 (M). test-flag-in-prod - new class

`src/lib/supabase/client.ts` honored `localStorage['beheo-force-guest']`
in production: `authMode 'off'` skips the `guestLocked` trial cap that
only gates `authMode 'guest'` - any visitor could get unrestricted
bundled practice. (No privilege: RBAC stays server-side; the bypass is
a product/trial violation.)

**Fix:** the flag only takes effect under `import.meta.env.DEV` via the
exported pure `forceGuestEnabled(devMode)`. E2E runs `npm run dev`, so
the hatch keeps working in every spec that needs it; production builds
ignore the flag entirely.
**Gate #61 (new)** - `getItem('beheo-force-guest')` may only appear
behind a dev-build gate (test files excluded).
**Regression tests:** `client.test.ts` - prod-off, dev-on cases.

## Verification

- `tsc --noEmit` green
- Focused: sync.test.ts 28/28, store/practiceResults/client/arena/
  App.authChange suites all pass
- `tests/ea-classes-scanner.selftest.mjs` 3/3 (bad fixture trips all
  61 classes incl. #58-61, good clean, repo clean)
- Full suite + build + preflight: see commit message gates

## Landed

- Commit `9a380f0` on `main` - all gates green in the commit-msg hook
  (preflight: secrets, build, 1016 tests, reliability+EA scanners).
- Vercel: push webhook auto-deploy **recovered** - production
  deployment `Gg6FBCHDio9uXjZ8EMjke4YbrXPv` reported `success` on
  `9a380f0` via GitHub commit status (no manual hook needed).
- Round 18 dispatched on `9a380f0` - Codex task
  `01a132b1-7bb1-774d-b0a2-d55a689dc0bf`, env
  `student-self-practice-web` (published, no secrets).
