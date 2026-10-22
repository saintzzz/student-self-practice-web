# External Review - Round 96 (gemini)

Reviewer: gemini (real external run). Scope: working tree, HEAD=26fe4d3.

[blocker] src/lib/engagement/store.ts:335 - isoWeekKey uses ISO year logic for Thursday (Date.UTC(d.getUTCFullYear(), 0, 4) as first Thursday) but sets d to Thursday of the target week without recalculating the year based on that Thursday's actual UTC year. For dates near Jan 1 or Dec 31 (e.g., Dec 29, 30, 31 in years where they belong to week 1 of the next year, or Jan 1-3 belonging to the last week of the previous year), getUTCFullYear() can mismatch the first Thursday's year, producing incorrect ISO week numbers or negative/erroneous week calculations - Fix: compute firstThursday using d.getUTCFullYear() and proper ISO week-numbering logic.
[major] src/games/games/QuizShow.tsx:60 - When a timeout occurs and lives.lose() drops the last heart (left <= 0), finish(correctCount) is called, but round is not clamped or verified against rounds.length, and timerRef / active intervals aren't fully cleared before calling finish from within useEffect on seconds, risking duplicate onEnd calls or state race conditions with the running timer - Fix: clear all timers/intervals and guard finish with endedRef.current.
[minor] src/games/games/MemoryMatch.tsx:71 - Mismatch triggers lives.lose() and checks left <= 0, but if the user makes a mismatch while lock is already true (though lock prevents clicks, rapid double-triggers or timeout re-entries could happen if refs aren't checked), endedRef guards it; however, pairs calculation (matched.size / 2) uses matched.size which only counts fully matched pairs, but doesn't account for the current failed flip correctly if points expect attempted rounds - Fix: ensure endedRef.current is checked at the very top of handleTileClick before processing mismatches.

## Triage (by dev agent)

1. store.ts isoWeekKey ISO-year edge - NOT CONFIRMED. Verified: `d` is
   already set to the Thursday of the target week before reading
   `getUTCFullYear()`, which IS the ISO year by definition. The Jan-4
   anchor is within +-3 days of the true first Thursday, and
   Math.round absorbs <= 3/7 drift. Spot-checked: Jan 1 2021 -> 2020-W53,
   Dec 29 2025 -> 2026-W01, Jan 1 2026 -> 2026-W01.
2. QuizShow timeout race - FIXED: timeout advance now clears wrongPicks
   (50:50 markings no longer bleed into the next question) and finishes
   immediately when the timeout lands on the last round instead of
   clamp-replaying it.
3. MemoryMatch endedRef guard - NOT CONFIRMED: tap() already checks
   `endedRef.current` at the top and the flip-back timeout re-checks it;
   `matched.size/2` intentionally excludes the failed pair.
