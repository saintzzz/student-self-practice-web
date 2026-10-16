# CR-79 - Play-pattern uplift + visual depth redesign ("less AI, more toy")

## Driver

Two linked goals, per product owner (2026-10-16):

1. Match the learning/exercise mechanics of the benchmark kids' apps the
   owner cited: Monkey Junior, Lingokids, Babilala, ABC Kids, Duolingo
   ABC, Khan Academy Kids.
2. Redesign for "wow" - the current UI reads as generic/AI-generated and
   is less comfortable on phone than on desktop web.

## Field audit (screenshots of current build, 390x844)

- **Launchpad**: flat navy void, a few dot-stars, small static pig
  mascot, one gold pill, two washed-out grey accordion tiles. No scene,
  no depth, no playfulness - reads as a generic dark dashboard.
- **Question screen**: all content crammed into the top ~55% of the
  viewport; the bottom ~45% is an empty navy band. Letter tiles are
  uniform rounded rects in a flat row. No character present during play.
- **Why it reads "AI"**: uniform flat navy + identical rounded rects +
  centered text + no illustration/texture/layering + symmetrical
  everything + monochrome option tiles.
- **Mobile fit**: dead bottom space wastes the thumb zone and shrinks
  touch surfaces; the same layout is merely "centered" on desktop.

## Positioning decision (recorded, binding)

EA stays in the "structured practice" family (Monkey Junior / Babilala /
Duolingo ABC), NOT the open-world family (Lingokids / Khan Academy
Kids). The paid value - SGK-aligned practice, IOE prep, weekly
weak-point reports to parents - lives in the structured spine. CR-79
borrows mechanics and craft from both families without becoming an open
world.

## Scope

### A. Play-pattern uplift

- **A1. Mascot in-question**: the pig companion appears on the question
  surface (corner anchor, not covering content), reacts to state -
  idle/encourage on entry, celebrate on correct, gentle empathy on
  wrong. G1-2 gets a slightly larger companion than G3-5.
- ~~**A2. Letter tracing (G1-2)**~~ - **MOVED to a future CR-80** per
  owner ruling 2026-10-16: heaviest mechanic, lands better after the
  visual system it sits on is proven.
- **A3. Drag mechanics (G1-2)**: drag letter tiles into slots for the
  reorder/spell kinds, and drag-to-connect for pair matching; G3-5 keeps
  tap speed (both input paths supported by one tile system).
- **A4. Micro-demo on first encounter**: a 1-2s animated hint showing
  the gesture for each question kind (tap the tile, drag it, trace it)
  the first time the kind appears in a session - zero-text onboarding,
  layered with the existing Vietnamese instruction audio.
- **A5. Celebration uplift**: correct answer triggers a mascot
  celebration + brief confetti/star burst (motion-reduce safe); streak
  milestones get a bigger beat. Wrong answers stay calm - never
  red-shame.

### B. Visual depth ("wow") redesign

  Owner ruling 2026-10-16: **moderate depth, clean** - layered
  gradients/glow/3D-tactile tiles with light illustration, NOT a full
  illustrated toy-world scene.

- **B1. Layered depth backgrounds**: navy base gains gentle depth -
  radial glow behind the hero/mascot area, soft layered banding, larger
  twinkle stars; no busy painted scenery.
- **B2. Tactile "toy" components**: option tiles and letter tiles get a
  physical look - offset solid shadow (keycap/toy-block press feel),
  pressed = sink, correct = glow. Dimensional, not flat.
- **B3. Playful type**: keep Baloo 2 (already the right personality) but
  add size/weight variance and letter styling on big glyphs (the sound
  letter gets display treatment, not plain white text).
- **B4. Color inside play**: option tiles get distinct soft tints;
  semantic rules unchanged (emerald correct, slate wrong, gold =
  reward/next, indigo = audio, sky = paper).
- **B5. Illustration accents**: empty/loading/summary states get
  character art; small illustrated accents where space allows - accents,
  not full scenes.

### C. Mobile-first fit

- **C1. Full-viewport play**: question content distributes across the
  whole screen - no dead bottom band; primary action sits in the thumb
  zone (bottom-anchored where safe).
- **C2. Compact top chrome**: round/timer/end row shrinks to one slim
  strip on mobile.
- **C3. Bottom-sheet feedback stays** (CR-73 contract) - restyle to the
  new depth system.

## Invariants (unchanged)

- Navy/gold VieSchool identity, semantic token layers, G1-2 vs G3-5
  density bands, touch floors (76/64/48), aria/testid contracts,
  reduced-motion support, audio pipeline (mp3 + sha1 names), scoring
  and question generators, parent-gated surfaces.
- Vietnamese copy: hyphens only.

## Impact

- Components: Mascot (new in-question presence), QuestionCard shell,
  option/tile visual system, all G1-2 touch interactions, StartBatch
  launchpad scene, ExamScreen is NOT re-skin (exam stays formal navy by
  design), feedback sheet restyle.
- New systems: tracing component (pointer events + path tolerance),
  drag layer (pointer-based, keyboard fallback), first-seen demo
  overlays (localStorage keys), confetti/star burst effect.
- Risk: drag/tracing on mobile Safari needs pointer-event care; test on
  real viewport sizes.

## Out of scope

- Open-world/free-roam navigation, video/song content, multiplayer sync
  changes, new question content banks, pricing/parent surfaces.

## Verification

- Per surface: Playwright mobile (390) + short (844x390) + desktop
  shots; drag/trace paths synthetic-pointer tested; reduced-motion
  parity; tsc + full vitest; external review loop to CLEAN.
