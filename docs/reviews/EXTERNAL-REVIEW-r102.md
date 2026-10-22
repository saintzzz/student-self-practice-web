# External Review - Round 102 (gemini + reviewer-gpt)

Reviewer: gemini (real external run). Scope: working tree, HEAD=48a89ec.

## Round 1 (gemini-web channel - garbled output)

[major] src/games/games/QuizShow.tsx:145 - Truncated JSX / incomplete
render return claim, plus a garbled note about useCombo misuse.

**Triage: NOT CONFIRMED.** The claim was disproven directly:
`npx tsc -b` clean, `QuizShow.test.tsx` green, file tail intact. The
gemini-web output was partially garbled, so a second reviewer pass was
run on the same diff (below) for a trustworthy verdict.

## Round 2 (reviewer-gpt subagent) - APPROVE_WITH_CHANGES

1. **[major - REAL, FIXED]** `src/lib/prng.ts` `seededShuffleIndices`:
   the per-position `hashString(seed-i) % (i+1)` draws are correlated -
   only 12/24 n=4 permutations reachable; original index 0 lands at
   display position 0 ~33.3% instead of 25% (verified over 100k seeds).
   This undermined CR-104's position-leak fix. **Fix:** single
   mulberry32 PRNG stream seeded by `hashString(seed)`; verified
   24/24 permutations, uniform 24.9-25.1% per position. Side effects:
   `BatchScreen.test` Round-4 kind assert relaxed to the documented
   7-kind set (mix order is seed-dependent); `MazeChase.test` adjacency
   assert corrected to the real invariant (at least one neighbor open -
   the generator may legally wall one).
   Distribution test strengthened to cover every original index x
   display position (400 draws each, [75,125] band).

2. **[minor - REAL, FIXED]** `lives.tsx` ComboMeter: white on
   amber-400/orange-500 gradient = 1.67-2.8:1 (< 4.5 AA for text-sm).
   The shelf scan never renders the chip (streak >= 2 only), so the
   a11y spec could not catch it. **Fix:** `text-amber-950` on the
   bright gradient (~6.8-10:1).

3. **[minor - REAL, FIXED]** `QuizShow.tsx` timeout path dropped a
   heart and advanced without breaking the combo - correct -> timeout
   -> correct would display "x2". **Fix:** `combo.miss()` in the
   timeout effect + regression test (correct -> timeout -> correct
   shows no meter).

## Post-fix verification

- `npx vitest run`: 207 files / 1748 tests green.
- `npx tsc -b`: clean.
- `npx playwright test`: 79 pass / 7 env-skips (real-backend specs) /
  2 flakes green on targeted re-run (emoji-visual third-party-request
  timing, exam-paper verdict poll timing).
- Phone-landscape next-button fold fix verified:
  `responsive-layout-phone` 3/3.

## Verdict

**APPROVE** - all three Round-2 findings confirmed-fixed with
regression coverage; Round-1 garble was a false positive.
