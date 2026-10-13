# External Review - Round 18 (kids-UX redesign, "Một con đường vàng")

Reviewer: pinned cross-model subagent (reviewer-gpt, agent a3665e37) -
Codex Cloud unavailable in this environment, used the documented
fallback. Scope: commit `e49cbcb` + uncommitted fix-diff. Verdict
progression: r1 NOT-CLEAN (5) -> r2 NOT-CLEAN (1) -> r3 NOT-CLEAN (2)
-> r4 **CLEAN**.

## R18-01 (M). report-pass-expiry-bypass - fixed

`ParentReportScreen` email save/resend invoked RPCs with no live-token
check - a pass expiring while the report stayed open still allowed
writes. Fix: `requireLivePass()` re-gates via a mounted `ParentGate`
before `saveParentContact`/`requestParentVerify`.
Regression: `ParentReportScreen.test.tsx` expired-pass re-gate case.

## R18-02 (M). instruction-autoplay-preempts-content - fixed

`speakInstruction` autoplay called `synth.cancel()` while English
content played; mp3 path ignored entirely -> overlapping audio (KUX-1
content-priority violated). Fix chain over r2+r3: `opts.autoplay`,
`contentAudioBusy()` covers TTS + playing mp3 + still-loading mp3
(`pendingAudioRequests` per-invocation Set), `stopContentAudio()`
preempts on deliberate taps with no English-TTS fallback.
Regression: `speech.test.ts` autoplay-yield + tap-preempt cases.

## R18-03 (M). autoplay-ledger-survives-session - fixed

Module-global `playedKeys` persisted across account switches - account
B lost the voice-first intro after account A. Fix:
`__resetInstructionAutoplay()` wired into `handleLoggedIn`,
`handleSignOut`, `handleGuest` (grade change intentionally kept).

## R18-04 (M). gift-items-no-home - fixed

Gift-box decorations persisted (`homeItems`) but had no visible home;
"đã vào nhà của em" pointed nowhere. Fix: new `HomeShelf` component
inside the launchpad home tile (empty + owned states).
Regression: `HomeShelf.test.tsx`.

## R18-05 (L). trend-compares-wrong-point - fixed

"Lần trước" compared latest vs `trend[0]` (oldest fetched) instead of
`trend[len-2]` (previous sitting) - could show a drop as improvement.
Fixed + regression test.

## R3 sub-findings (inside R18-02 fix iteration)

- WeakSet-per-element preemption poisoned cached replays -> per-
  invocation `preempted` flag instead.
- Single `pendingAudio` lost overlapping requests -> Set of all
  in-flight requests.

Both fixed in the final diff; r4 verified replay-after-preemption,
overlapping-request preemption, and cleanup on all settle paths.

## Evidence

1134 unit tests / 138 files green, `tsc -b` clean, `vite build` green,
e2e kids-ux + end-early-confirm 5/5, broader e2e run 20/20. Deployed:
commit `233853d` -> Vercel `ioe-leduyminh-hpf9cz749` (ea.vieschool.com).
Supabase migration `0039_kids_ux_weekly_digest` applied to prod
(rollback: `supabase/rollback/0039_down.sql`).

Not confirmed / deferred: canvas taint suspicion (no external images -
verified safe), real-browser audio timing (mocked events only -
acceptable per KUX-1 watchdog coverage).
