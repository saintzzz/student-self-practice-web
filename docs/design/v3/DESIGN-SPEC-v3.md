# Design Spec v3 - CR-79 play-pattern uplift + visual depth (rev 3)

Delta spec on top of DESIGN-SPEC-v2 (all v2 invariants stand: navy/gold
identity, semantic tokens, density bands 76/64/48, feedback-zone
contract, reduced-motion, per-band decision budgets). Owner ruling
2026-10-16: **moderate depth, clean**. Rev 2 resolves Design Lead review
findings F1-F7 (rev 3 resolves the three rev-2 leftovers).

## 1. Design concept

"A night-sky playroom made of chunky toy blocks" - soft depth glows
behind content, every tappable element reads as a physical toy block,
and Bé Heo stays beside the child through play.

## 2. Play-pattern mechanics

### 2.1 In-question mascot (A1)

- New `<QuestionMascot>` rendered inside `QuestionCard`, absolutely
  anchored bottom-left of the card body (below the last question body
  row, above the feedback reserve area). `aria-hidden="true"`,
  `pointer-events-none`.
- **Ownership**: `QuestionCard` alone derives visibility+mood from
  `currentAnswer` - no props drilled from above:
  - `currentAnswer === null` → visible, mood `encouraging` (idle bob).
  - `currentAnswer !== null` → **unmounted entirely** (the fixed
    feedback sheet / pronunciation in-flow panel owns the mascot; AC-79.1
    = "never two mascots on screen").
- Size: 56px G1-2 / 44px G3-5 (density prop already available via
  `useViewer()`), positioned `absolute bottom-2 left-2`.

### 2.2 Drag mechanics (A3) - retargeted

Practice has **no reorder kind** - word-order exists only in
`src/lib/exam/wordOrder.ts`/`ExamScreen.tsx` (exam surface, excluded
from re-skin). `ExtraLetterQuestion` is "tap the letter to remove", not
a slot-fill: drag does not map to it (a removal drag needs vertical
movement, which conflicts with `pan-y` page scroll). **Scope ruling:
drag ships on picture-pair-matching only** - the one kind where a
two-column drag-across is natural and pedagogically meaningful.

- `useDragTile` hook (`src/hooks/useDragTile.ts`): pointer-based.
  Arms only when `useViewer()` reports the G1-2 density band - G3-5
  keeps pure tap (scope retained per CR).
  - `onPointerDown`: record start `{x,y,pointerId}`; reset
    `suppressClickRef = false` every pointerdown (so a cancelled drag
    that produced no click can never swallow the next genuine tap or
    keyboard click); no capture yet.
  - `onPointerMove`: once displacement >8px, `setPointerCapture`,
    spawn ghost (fixed-position clone of tile content, `translate3d`,
    `pointer-events-none`, `aria-hidden`, no testid).
  - Hover highlight: `document.elementFromPoint` inside rAF-throttled
    pointermove over `data-pair-index` tiles; valid target gets a ring
    via `data-drag-hover` styling. Highlight is cosmetic only.
  - `onPointerUp`: resolve the drop target **fresh** from pointer-up
    coordinates (`document.elementFromPoint(e.clientX, e.clientY)` -
    never the cached hover), `releasePointerCapture`, remove ghost.
  - `onPointerCancel` / `lostpointercapture`: cleanup ghost + capture,
    no state change.
  - `suppressClickRef = true` is set **only when the gesture crossed
    the >8px drag threshold** (commit or cancel alike - a cancelled
    drag can still emit a trailing click on some browsers). Native
    taps never set it. In `onClick`, suppression applies only to
    gesture-initiated clicks (`event.detail > 0`); keyboard
    activation (`event.detail === 0`) always passes through.
- **Atomic commit** (`dropPairMatchingTile` helper next to the reducer):
  `cleared = {...state, pendingTileIndex: null}` then
  `clickPairMatchingTile(cleared, tiles, source)` then
  `clickPairMatchingTile(result, tiles, dest)` - all inside one
  `setState` updater. Clearing first means a stale pending tap can never
  contaminate the drag pair (F1 fix).
- **Valid drop target**: `dest !== source`, dest tile exists, and
  `!isPairMatchingTileMatched(state, tiles, dest)`. Self-drop and drops
  on matched tiles cancel. Drags never arm on matched tiles or after
  board resolution (guard mirrors the reducer's no-op conditions).
- **Pointer/tap contract**: displacement ≤8px keeps native click
  (existing tap path untouched); a completed drag (>8px + commit or
  cancel) suppresses its trailing synthetic click via
  `suppressClickRef`. Keyboard unaffected (buttons stay real
  `<button>`s). All existing testids (`pair-tile-*`), aria names,
  disabled guards and `data-*` verdict attributes preserved verbatim.
- `touch-action: none` on pair tiles **while drag is armed** (G1-2
  un-resolved board); `pan-y` otherwise. External-review r30 caught that
  `pan-y` lets the browser claim vertical/diagonal gestures and cancel
  the pointer mid-drag - on a 2-column board most drags are diagonal.
  The card still scrolls from non-tile space.
- Reduced motion: drag still works (it is input, not decoration);
  spring-back becomes instant snap (`motion-reduce:transition-none` on
  the ghost); no bob/pulse anywhere.

### 2.3 First-seen micro-demo (A4)

- Per CR wording: **first time a question kind appears in a session**
  → `sessionStorage` key `ea-demo-{kind}` (per-tab session). Storage
  failures (private mode) degrade to show-once-per-mount via a module
  `Set` fallback.
- Owner: `useDemoHint(kind)` hook returns `{ showDemo, containerRef,
  dismiss }`; each question body calls it once, spreads `containerRef`
  on its tile/option row, and `dismiss()` runs on first real
  interaction AND on first demo completion.
- Visual: absolutely-positioned amber "finger dot" inside the row
  wrapper (`relative` + `overflow-visible`). **Neutral gesture demo
  only** - the dot pulses on the *first* tile regardless of
  correctness (tap kinds), or travels a fixed left→right arc
  (pair-matching). Never lands on the answer.
- Loops ≤2x then auto-dismisses. Reduced-motion: static dot, no
  travel/pulse animation.

### 2.4 Celebration (A5)

- The correct-answer burst **reuses the existing `Confetti`** already
  mounted inside `FeedbackPanel` on correct answers (14 particles,
  confetti-burst keyframes, globally hidden under reduced-motion) -
  it fires exactly where the eye lands after judging.
- Streak beat: `Confetti` gains `big` (28 particles) and the sheet's
  mascot switches to `celebrating`.
- Streak beat: `BatchScreen` computes `correctStreak` = count of
  consecutive `isCorrect` answers ending at the current result (tail
  run-length of the results array, current answer included). At
  `correctStreak >= 3`: burst renders 14 particles AND the **feedback
  sheet's** mascot switches to `celebrating` (FeedbackPanel gains a
  `celebrate` prop; the card mascot is already unmounted at this point
  by §2.1 - no contradiction, no duplicate).
- Loading/empty illustration accents (CR §B5 tail): **loading-state
  artwork is explicitly deferred** - no loading surface gains new art
  in this CR; BatchSummary/launchpad empty states already render the
  block-size mascot.

## 3. Visual depth system (concrete tokens, all in `tokens.ts`)

```ts
export const scene = {
  /** layered depth glow behind play surfaces (practice only) */
  glow: 'bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,rgba(56,89,165,0.38),transparent),radial-gradient(ellipse_50%_40%_at_15%_100%,rgba(245,158,11,0.10),transparent)]',
};
export const toy = {
  /** offset solid base - the "toy block" read */
  face: 'border-[#2a3a5e] bg-gradient-to-b from-[#1d3465] to-[#162C55] ' +
        'shadow-[inset_0_2px_0_rgba(255,255,255,0.18),0_5px_0_#0a1730]',
  faceHover: 'hover:border-amber-400/70 hover:-translate-y-0.5 ' +
        'hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.18),0_7px_0_#0a1730] motion-reduce:hover:translate-y-0',
  pressed: 'active:translate-y-[5px] active:shadow-[inset_0_2px_0_rgba(255,255,255,0.18),0_0_0_#0a1730] ' +
        'motion-reduce:transition-none motion-reduce:active:translate-y-0',
  correctGlow: 'shadow-[inset_0_2px_0_rgba(255,255,255,0.18),0_0_0_3px_rgba(52,211,153,0.55),0_0_18px_rgba(52,211,153,0.45)]',
  /** decorative pre-judge frame tints, index % 4 - border-only */
  tints: ['border-sky-400/40','border-rose-300/40','border-violet-400/40','border-emerald-300/40'],
};
```

- **States**: default=`face`; hover=`faceHover`; active=`pressed`;
  focus=`focus:ring-4 focus:ring-amber-400/60` (existing); disabled=
  `opacity-60` + no offset shift; judged branches in
  `optionButtonStyle.ts`/`tileClassName` keep v2 semantics verbatim -
  tints replace ONLY the `border-[#2a3a5e]` + hover-shadow in the
  unanswered branch (never concatenated onto judged classes).
- **B3 display glyph**: hero sound letter =
  `text-7xl font-black text-amber-100 drop-shadow-[0_3px_0_rgba(0,0,0,0.35)]`
  (existing `font-display` Baloo 2 retained).
- **Scope**: `toy`/`scene` tokens apply to practice surfaces
  (BatchScreen, QuestionCard bodies, ModeHub tiles, FeedbackPanel
  restyle). `exam.*`/`ExamScreen`/`ExamResult` untouched.
- Applies to: option tiles, ModeHub tiles, letter tiles, pair tiles
  (pre-judge branch only for tints on option tiles + ModeHub; letter
  tiles stay uniform so the row reads as one word).

## 4. Mobile fit

- **Viewport owner**: `BatchScreen` outer div becomes
  `flex min-h-[100dvh] flex-col`; top chrome strip shrinks to ~48px at
  `max-height:560px`; `QuestionCard` gets `flex min-h-0 flex-1
  flex-col`.
- **Every question-kind root** gets the scroll-safe centering recipe:
  outer `flex min-h-0 flex-1 flex-col overflow-y-auto`, inner content
  wrapper `my-auto` - centers vertically when there is room, scrolls
  when floors exceed available height (no tile ever compresses below
  its 76/64/48 floor; overflow scrolls instead of shrinking).
- `QuestionCard.tsx:295` reserve (`paddingBottom: calc(min(40vh,320px)+5.5rem)`)
  and the fixed sheet at `:328` stay intact - flex-fill applies to the
  in-flow content above the reserve.
- Safe-area bottom padding already on the sheet - unchanged.
- Floors 76/64/48 unchanged; checks run at 390×844 and 844×390.

## 5. Component deltas

| Component | Change |
|---|---|
| `tokens.ts` | + `scene`, `toy`, `starburst` keyframes |
| `QuestionCard` | QuestionMascot + StarBurst + flex-fill; receives `correctStreak` prop |
| `BatchScreen` | `min-h-[100dvh] flex-col` chain; computes `correctStreak` |
| `Mascot` | reuse existing moods; `encouraging` = idle |
| `optionButtonStyle.ts` | toy face in unanswered branch + indexed tints |
| `ExtraLetterQuestion`/`PicturePairMatchingQuestion` tile styles | toy face; pair tiles + drag wiring + `touch-action:none` while armed (r30) |
| `FeedbackPanel` | restyle to toy/depth tokens (layout contract unchanged) |
| ModeHub tiles | toy face + tints |
| each question body | `useDemoHint` on its row wrapper |
| new | `StarBurst`, `useDragTile`, `useDemoHint` |

## 6. ACs

- AC-79.1 mascot visible during play pre-answer; hidden the moment the
  feedback surface mounts (never two mascots).
- AC-79.2 drag commit = atomic pair attempt via the existing reducer;
  tap and keyboard paths unchanged and tested.
- AC-79.3 demo hint shows first-encounter-per-session per kind,
  session-scoped, gesture-neutral.
- AC-79.4 correct answer fires star burst (bigger at streak≥3);
  reduced-motion hides particles; press-sink flattens under RM.
- AC-79.5 question surface fills ≥90% of viewport height at 390×844
  and 844×390 with no target below floors.
- AC-79.6 option tiles show indexed tints pre-judge only; judged
  states keep v2 semantics.
- AC-79.7 all existing testids/aria/verdict attrs preserved; suite green.
