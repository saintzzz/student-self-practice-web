# CR-91 - Visual hierarchy: "màu trùng nhau" separation pass

## Request (user, verbatim)

> "màu mè toàn làm trùng nhau nên không nổi các nút hay hình ảnh lên được.
> tao chưa hiểu design system UIUX kiểu gì mà mày không làm theo"

## Diagnosis (verified on rendered screenshots, dev 390px)

The design system exists (`DESIGN_SYSTEM.md`, navy/gold shell) and is
followed - the failure is a **luminance-hierarchy failure inside the
approved palette**, not a missing system:

1. **Game shelf wall-of-candy.** All 15 cards + the daily hero render on
   `*-300 -> *-500` gradients at the SAME lightness and saturation. Equal
   loudness everywhere = no focal point; the "Tro choi hom nay" hero does
   not lead; Twemoji art is swallowed by the saturated background behind
   it; slate-900 star rows read muddy on rose/orange.
2. **In-game art on saturated surfaces.** `EmojiChoiceField` balloon and
   fish variants put raw emoji/SVG art directly on `rose/sky/amber-400->600`
   fills - art and container share the same value band, so the picture
   (the thing the child must read) is the least legible element.
   The mole variant already does it right (art on a light amber disc
   inside the dark hole).
3. **Instruction banner too quiet.** `QUESTION_BANNER` `bg-white/[0.07]`
   + `ring-white/10` reads as a scratch on the board rather than the
   scroll the mascot "speaks" - fine for chrome, wrong for the ONE piece
   of guidance text on the screen.
4. **Board vs page separation.** `material.board` (navy-800 -> navy-850)
   on the `navy-950 -> navy-700` scene gradient separates mainly via its
   shadow; the fill delta is small. Cheap fix: deepen the page-side
   scrim, keep the board.

Not changing: the hub destination tiles (4 tiles, distinct hues, real
labels - hierarchy exists: gold Choi CTA leads), the cream letter/option
tiles (already pop on navy), the disabled slate "Cau tiep theo" (correct
disabled semantics - enabled state is gold).

## Design decision (concept-consistent)

**Light carries content, color carries identity.** Within the existing
palette:

- Game shelf cards -> **light paper faces** (`material.tileFace` family:
  white -> amber-50/100) with the per-game tone kept as the bottom depth
  edge + a small tone-tinted chip behind the art. Art pops on light bg;
  cards read as a calm uniform shelf; the hero keeps its saturated
  gradient so the daily pick finally leads.
- In-game option surfaces (balloon, fish): emoji/SVG art sits on a
  **light inner disc/chip** (the mole-hole idiom, generalized) - the
  colored shape keeps its role, the picture gains its own light stage.
- `QUESTION_BANNER`: raise to a legible frosted strip (`bg-white/12`,
  `ring-white/20`, brighter ink) - still quiet vs. gold/emerald, no
  longer nearly invisible.

## Scope

- `tokens.ts`: `gameCardClass` light-face variant (tone -> depth edge +
  accent chip), `QUESTION_BANNER` bump.
- `GameZoneShelf.tsx`: card body uses the light variant; hero unchanged
  (saturated + `gameHeroClass`).
- `mechanics.tsx`: balloon + fish variants gain the light art disc.
- `DESIGN_SYSTEM.md` + token comments updated in the same commit.
- Verify script `scripts/_cr91-hierarchy.mjs` (render + pixel checks).

## Acceptance

- Shelf renders light cards; the daily hero is the only saturated card.
- Balloon/fish art sits on a light disc (`EXHIBIT`-family surface).
- Instruction banner luminance measurably raised vs `bg-white/[0.07]`.
- tsc clean, existing game/hub tests green, Playwright screenshots show
  the hierarchy change on 390px.
