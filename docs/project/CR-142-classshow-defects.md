# CR-142: Sân khấu lớp defect batch (wrong answers + display overflow)

## Why
User report: Sân khấu lớp has wrong correct-answer display, content
not fully shown, screen overflow, overlap - "nói chung rất nhiều lỗi".
Reproduced via Playwright + code trace. This is a defect batch on the
shipped CR-114 feature - requirements unchanged.

## Defect register

- **D1 (Critical) - fabricated correct answers.** `normalizeShowQuestion`
  serves pending/unkeyed bank rows (they carry `bankId`): MCQ rows get
  `displayIndex=0` so reveal ALWAYS highlights option A; true-false rows
  fall back to `bool ?? false` so reveal ALWAYS marks SAI; text-answer
  rows get `accept=[]` so the reveal box is an empty green banner.
  A teacher watching the stage sees a "correct answer" that was never
  keyed. Fix: drop rows whose key is absent (bankId marker present, or
  the normalized fields undefined) - they are ungradeable on stage too.

- **D2 - scoreboard overflow.** Every roster name renders a full row;
  a real VN class (30-40 students) pushes the stage past 2200px tall on
  a 1440x900 projector - the question and teacher controls scroll off
  mid-lesson. Fix: scoreboard keeps its own scroll (max-height ~30vh)
  so stage + controls stay in viewport.

- **D3 - long subPrompt overflow.** Reading passages render at text-lg
  unbounded - a multi-paragraph passage blows the stage vertically.
  Fix: cap subPrompt height (~7 lines) with scroll.

- **D4 - long option/prompt overflow.** Option cells and the headline
  prompt can overflow horizontally on narrow projectors (no min-w-0 /
  break rules). Fix: break-words + min-w-0 guards.

- **D5 - podium name overflow.** `w-28` name column overflows for long
  Vietnamese names. Fix: truncate.

- **D6 - option image has no fallback.** Broken/slow image asset renders
  an empty option cell (only the letter badge shows). Fix: onError ->
  show text label.

- **D7 (minor) - spotlight flicker shows excluded names.** During steal
  mode the randomizer still flashes names that already missed; only the
  final pick respects `exclude`. Cosmetic; fix = flicker pool respects
  the same exclusion.

## Scope
- `src/lib/classshow.ts` - normalizeShowQuestion key guards.
- `src/components/ClassShowScreen.tsx` - D2-D7 layout guards.
- Unit tests: pending-row rejection + roster parsing.
- No requirement change, no data/API change.

## Verified (gate)
- `tsc -b` clean; `vite build` green; `vitest` 1847/1847 pass
  (213 files + 1 slow file re-run standalone - worker timeout was a
  vitest infra flake, not an assertion).
- `classshow.test.ts` 20/20 incl. 5 new D1 guard cases (bankId rows,
  missing/out-of-range key index, missing boolean key, empty reveal,
  default-branch pending).
- Playwright `scripts/classshow-verify.mjs`, 30-student roster
  1440x900: docHeight 2242px -> ~1070px, `controlsVisible: true`,
  scoreboard internal scroll 1432->270 clientH, picked row auto-centers
  (Học Sinh 15 shown mid-window, page stays put), steal flow returns to
  question phase. Shots: `_shots/classshow-fix/q-*.png`.
- Answer spot-check on bundled set (D fine, B are, B am, SAI for
  "Tom has a cat"/dog passage): all correct.
- DESIGN_SYSTEM.md: overflow law + key law appended to the CR-114
  Class Show section.
