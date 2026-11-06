# CR-127 - Responsive visual scale-up for question and game art on >= sm viewports

## Why

PO feedback: question/game images feel small ("bé tí") on large screens.
Measured audit (Playwright, rendered sizes):

- Desktop 1440x900: prompt illustration = 96x96 px (text-8xl EmojiVisual) on a
  ~592 px board = 6.7% of viewport width; option illustrations 36-60 px;
  exam option images capped at max-h-20 (80 px); game-card art 56/80 px.
- Mobile 390x844: the same 96 px prompt image on a 375 px board = 26% of
  board width; options 311x76 full-width. Proportions already good.

Root cause: every visual is sized by fixed font-size / h-w classes
(EmojiVisual = 1em box). `useViewer().density` scales by grade band, never
by viewport. Nothing gets bigger on desktop.

## Scope

Add `sm:` (>=640px) size bumps to visuals only - mobile rendering unchanged:

- `ImageChoiceQuestion`: prompt exhibit text-8xl -> sm:text-9xl (96->128px).
- `ListeningImageChoiceQuestion`: option exhibits text-6xl -> sm:text-8xl.
- `CountingImageQuestion`: prompt text-6xl -> sm:text-7xl; counting option
  exhibits get explicit text-4xl sm:text-5xl (previously inherited the
  button's text-2xl = 24 px - too small at every viewport).
- `DescribeAndChooseImageQuestion`: option exhibits text-4xl -> sm:text-6xl.
- `PicturePairMatchingQuestion`: tile text-2xl -> sm:text-4xl.
- `ExamScreen`: prompt image max-h-48 -> sm:max-h-64; option images
  max-h-20 -> sm:max-h-28; letter tiles h-16 w-16 -> sm:h-20 sm:w-20
  (+ text-2xl -> sm:text-3xl).
- `GameArt`: hero artImage h-20 w-20 -> sm:h-24 sm:w-24, card h-14 w-14 ->
  sm:h-16 sm:w-16; emoji diorama hero/side +1 step at sm+.

## Out of scope

- Board max widths (max-w-2xl etc.) - readability columns, unchanged.
- Any layout/interaction change; sizes only.
- Decorative in-game visuals (racing cars, castles) that are not question
  content.

## Impact

Visual polish, no requirement/flow change. EmojiVisual contract untouched
(still 1em box - the font-size classes are external callers).

## Verification

- tsc + lint + build.
- Playwright: image-choice question at 1440x900 (prompt 128px) and
  390x844 (prompt stays 96px); exam + game-card shelf spot checks.
