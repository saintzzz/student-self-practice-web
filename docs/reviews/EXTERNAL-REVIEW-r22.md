# External Review - Round 22 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: base ecbb1f2, HEAD=554b34f.

1. [major] src/components/QuestionCard.tsx:319 - `sticky bottom-2` keeps feedback in normal document flow; mounting it still increases card height and can push answers off-screen. Only ≤420px layouts get an overlay - reserve a bounded feedback zone or position the complete feedback/Next unit outside answer flow.

2. [minor] src/lib/ui/tokens.ts:203 - `BTN_SECONDARY_NAVY` hardcodes 48px for standalone actions such as ReviewCard “Ôn ngay” and ArenaResult “Quay lại”, below the approved 76/64px band floors - apply `density.primaryMinH` at standalone call sites.

3. [minor] src/lib/ui/tokens.ts:110 - Hub tiles retain `active:scale-[0.99]` under reduced motion; `motion-reduce:transition-none` removes interpolation but still produces the size jump - add `motion-reduce:active:scale-100`, including equivalent new action tokens.

Diff-only review: local inspection was policy-blocked; build and deployed browser behavior were not verified.

## Triage (all confirmed + fixed)

1. FIXED - `QuestionCard.tsx`: the feedback zone is now a `fixed` bottom
   sheet at EVERY viewport height (not only <=420px), so mounting it can
   never push answers off-screen. The card reserves
   `pb-[calc(min(40vh,320px)+5.5rem)]` while the zone is mounted so all
   content stays scrollable behind the sheet. Verified in Playwright at
   390x844 and 844x390: `sheet fixed: true`, Next inside sheet.
2. FIXED - standalone controls now apply `useViewer().density.primaryMinH`
   (76 G1-2 / 64 G3-5) via inline style: ReviewCard "On ngay", ArenaCard
   create/login/accept-more rows, LeaderboardCard login, DailyQuestCard
   claim. ExamScreen arena-exit uses the exam floor `min-h-[64px]`.
   Inline `shrink-0` controls next to text (CoachCard, PetCard,
   arena-accept) keep the 48px non-standalone floor per spec.
3. FIXED - every `active:scale-*`/`active:translate-y-*` in tokens.ts now
   pairs with `motion-reduce:active:scale-100`/`translate-y-0` (13 sites).

Gates: tsc clean, 1182/1182 vitest, vite build green, Playwright-verified
zone behaviour on the production build.

