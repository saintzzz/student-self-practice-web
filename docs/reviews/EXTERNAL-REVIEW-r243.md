# External Review - Round 243 (codex)

Reviewer: codex (real external run). Scope: commit 8da197e, HEAD=8da197e.

1. [major] [GameScreen.tsx](/Users/kazu.nx/devin_app/student-self-practice-web/src/games/GameScreen.tsx:163) - Skill accuracy uses incorrect denominators: some early-ending games report all configured rounds as attempted, while others omit `attempted` and fall back to `correctCount`, making even runs with wrong answers appear perfect. Track questions actually presented and pass that count on every end path.

2. [minor] [restReminder.ts](/Users/kazu.nx/devin_app/student-self-practice-web/src/lib/engagement/restReminder.ts:60) - If the browser suspends the interval while the page is hidden, returning after a break of five minutes or more accrues another visible tick without resetting the stretch. Check the hidden duration on visibility return before accruing time.

3. [minor] [restReminder.ts](/Users/kazu.nx/devin_app/student-self-practice-web/src/lib/engagement/restReminder.ts:54) - Turning the parent toggle off resets the timer but leaves an already-visible banner on screen. Hide it when the setting is disabled.

