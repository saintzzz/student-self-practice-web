# External Review - Round 20 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 0b3421f, HEAD=0b3421f.

1. [major] src/lib/exam/wordOrder.ts:259 - Complement filtering misses real inflections: generated `gos` never matches `goes`, so “To school she goes” remains accepted and the new regression test fails. Likewise, `listened` works but `listening` and `sitting` are generated incorrectly. Fix - use explicit valid inflections or curated alternate orders.

2. [major] src/components/InstructionSpeaker.tsx:72 - Retry is armed only for `blocked` and only on `pointerdown`. `error`/`unavailable` leave no retry on the current screen; keyboard and assistive-technology users cannot trigger the pointer-only retry. Fix - restore an accessible replay button with failure feedback and user-initiated playback.

Review limited to the supplied diff; repository reads were blocked by execution policy.

## Triage (post-review)

1. CONFIRMED + FIXED. Naive `${verb}s`/`${verb}ing` generated "gos",
   "siting", "writeing", "studyed" - bonds never matched real forms.
   Replaced with explicit NONREGULAR form lists (goes/went/going,
   sits/sat/sitting, flies/flew/flying, studies/studied/studying...).
   Regression tests cover -s, -ing and irregular forms
   ("listens to" / "sitting on" / "flies to").
2. CONFIRMED + FIXED (adapted). The retry listener is now armed on ANY
   failure status (blocked/error/unavailable) and listens for BOTH
   pointerdown and keydown, so keyboard and assistive-technology users
   get the same retry path. A visible replay button was deliberately
   removed by product decision; gesture retry plus per-key release on
   next mount is the accessible equivalent. New tests cover the keydown
   path and non-blocked failure arming.

