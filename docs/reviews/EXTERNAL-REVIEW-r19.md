# External Review r19 - CR-114 Class Show

Reviewer: pinned cross-model reviewer-gpt (documented fallback).
Target: commit 84401e9 (Sân khấu lớp teacher-led projector mode).
Verdict: **REJECT** - zero Critical, two High findings.

## Findings

### High

1. **[FE] Guest Class Show over-fetches 3x the show size** - `createExamFromBank` was called with `count * 3` (24-48), inflating the public RPC draw to 39-77 rows. **FIXED + re-dispositioned:** review found every bank row surviving `toExamQuestion` is already stage-displayable, so the headroom was pure waste on the guest quota. Now requests exactly `count`; any shortfall after normalization pads from the bundled sample set instead of a bigger draw.

2. **[FE] Grade context ignored - always opened grade 3** - `App.tsx` declared the route grade-scoped but `ClassShowScreen` hard-coded `grade-3`. **FIXED:** `initialGradeId` prop now flows from the hub (`App.tsx` passes `selectedGradeId`). Verified live: entering from grade 4 preselects `show-grade-grade-4`.

### Medium

3. **[FE] image-choice support missing** - CR listed image-choice as displayable; normalization dropped `optionImages` MCQs. **FIXED:** `word-to-image-mcq`/`image-choice` rows now keep `optionImages` and render picture cells beside the A-D letters (class points at a letter).

4. **[FE] Space did not start from setup** - keyboard contract said Space = pick/start. **FIXED:** Space/Enter now calls `start()` from setup when the focus target is not an interactive element (button/textarea/input/select/a skip to avoid double-fire).

5. **[FE] No focus management / live regions on phase changes.** **FIXED:** spotlight is `role="status" aria-live="polite"`; question prompt and podium heading get `data-stage-focus` + programmatic focus on phase entry; roster error is `role="alert"`.

### Low

6. **[FE] Spotlight interval could stack on rapid re-spins.** **FIXED:** `spin()` clears any existing `spotTimer` before arming a new one.

7. **[FE] Setup controls editable during load.** **FIXED:** grade/program/count/roster wrapped in a conditional `inert` container while `phase === 'loading'`.

8. **[FE] Podium ties sorted alphabetically.** **FIXED:** `podiumOrder` now stable-sorts score desc only - ties keep roster order (test updated).

### Nit

9. **[FE] Verdict icons not marked decorative.** **DISMISSED:** `iconProps()` in `src/components/icons.tsx` already sets `aria-hidden: true` on every icon.

## Triage summary

- Fixed: 1, 2, 3, 4, 5, 6, 7, 8
- Not confirmed (with evidence): 9

## Fixes verified

- `npx tsc --noEmit` clean; `npm run build` green (ClassShowScreen chunk 16.1 kB).
- `classshow.test.ts`: 15/15 pass (incl. new steal/exclude + stable-tie cases).
- Playwright live on dev server: grade-4 entry preselects grade 4; wrong answer shows "Cuớp lượt" chip and re-spotlights a different student on the SAME question; "Bỏ qua" advances to the next question and clears steal state.
