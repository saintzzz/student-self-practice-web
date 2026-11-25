# CR-145 - Art Wiring + Dedupe

**Status:** implemented, review loop pending
**Sources:** `docs/reviews/ART-REVIEW-designer.md` F-04/F-07/F-08 + PO art plan

## Scope

Wire curated art into question kinds that could never reach it, route the
remaining raw-emoji bypasses through `EmojiVisual`, and delete the ~31MB
vocab<->concepts duplicate set.

## Changes

### F-04 art wiring (coverage)
- `public/images/counting/` (100 purpose-built "N objects" webp) plus the
  repeat-concept-art tier now drive `CountingImageQuestion` (both
  directions) and `DescribeAndChooseImageQuestion` options via
  `src/lib/content/countingArt.ts` (bespoke `"<slug>|<count>"` manifest)
  + `countingArtResolve.ts` (two-tier all-or-nothing resolver - see r225
  fixes below).
- `PicturePairMatchingQuestion` picture tiles resolve `getWordVisual` art via
  new `PairMatchingTile.wordId`.
- All wiring follows the all-or-nothing law: one missing/failed asset drops
  the whole visible group back to emoji (`onImageError` group state +
  mode-keyed remount).

### F-07 raw-emoji bypasses -> EmojiVisual
- `PlaySlowButton` extracted into `ListenButtons.tsx` (Twemoji 🐢); the 4
  phonics questions' copy-pasted slow buttons now share it.
- StoryTime story-picker emoji, PetCard image-fail fallback, ClassShow
  program chips + roster avatars + podium medals + header mic, ExamScreen
  🏁 standing, StartBatchScreen 🎤 tile, RoundStub 🚧.

### F-08 vocab<->concepts dedupe
- `scripts/artgen/dedupe-vocab-art.mjs`: 1,145 byte-identical vocab files
  deleted; their approved attribution records repointed at the concepts
  twin (`file` field -> `/images/concepts/...`). 45 vocab files remain:
  3 legit diffs (`apricot-blossom`, `festival`, `jersey` - vocab variants
  win) + 42 without a concepts twin.
- `build-vocab-images.mjs` accepts both prefixes; `check-attribution.mjs`
  verifies record files in whichever declared dir they name.
- `tet.ts` inline `dragon-dance` imageUrl repointed to concepts twin.

### Spec decisions
- `CountingImageQuestion` keeps repeated-emoji fallback as the count
  semantic (N identical objects is clearer to count than a scene); the
  counting art set is also earmarked for the CR-147 counting game.
- `v6/math-vi` SVG schematics stay (real diagrams, not placeholders).

### r225 fixes (external review round 225)
- **Blank-tile bug:** `EmojiVisual` mode is mount-only; a group art
  failure that removed `imageUrl` left mounted 'image' visuals rendering
  nothing. All group-fallback visuals now key on the resolved art mode
  (`CountingImage`, `DescribeAndChooseImage`, `PicturePairMatching`;
  `EmojiChoiceField`/`OddOneOut`/`ListeningImageChoice` already keyed).
- **0% art reachability:** bespoke `slug|count` art covers ~1 count per
  object while distractor rules need several (0/3,130 counting, 0/3,749
  describe questions satisfied `every(COUNTING_ART)`). Added the
  `'repeat'` tier: `CountingImageOption.wordId` (populated by generators,
  resolved by word text for legacy bank rows) + `EmojiVisual` image mode
  at `count>1` renders N copies of the concept art. Coverage measured on
  the real bank: **3,130/3,130 count-to-image, 3,749/3,749 describe,
  3,130/3,130 image-to-count prompts** - pinned by
  `countingArtResolve.test.ts`.

### r226 fixes (external review round 226)
- **Cardinality guard:** repeat tier assumes one counted unit per image.
  Visual audit of the risky subset (61 name-heuristic suspects + generic
  sample) found exactly one breaker: `grape` shows a ~15-grape bunch, so
  "3 grapes" would render 3 bunches. `REPEAT_ART_EXCLUDE` drops it from
  repeat (wordId + word-text match for legacy rows); groups containing it
  fall back to emoji. Words depicting the named unit stay (`team` = one
  team, `forest` = one forest, `nest` = one nest). Coverage post-guard:
  3,114/3,130 count-to-image, 3,729/3,749 describe, 3,125/3,130 prompts.
- **Debt:** regenerate `concept-grape` as a single grape through the
  artgen loop (needs the subscription browser pipeline - no
  `GEMINI_API_KEY` locally), then remove the exclusion entry.

### r227 fixes (external review round 227)
- **Emoji fallback was equally wrong:** 🍇 (and its Twemoji svg) is also
  a bunch - excluding grape from repeat art just swapped one bad
  depiction for another. `COUNTING_UNIT_EXCLUDE` in `imageSemantics.ts`
  now removes bunch/collection words from the count pool entirely via
  `isCountingEligibleWord` (both generators); `REPEAT_ART_EXCLUDE` reuses
  the same set as the render-level guard for legacy/bank content. Pin
  test asserts no generated counting/describe option carries `grape`.
  Post-guard coverage: 3,125/3,125 count-to-image, 3,743/3,743 describe,
  3,125/3,125 prompts (100% of the emitted pool).

## Files

- `src/lib/content/countingArt.ts` (generated manifest, 100 entries)
- `src/components/{CountingImageQuestion,DescribeAndChooseImageQuestion,
  PicturePairMatchingQuestion,ListenButtons,Phonics*4,ClassShowScreen,
  ExamScreen,StartBatchScreen,RoundStub,PetCard}.tsx`
- `src/games/games/StoryTime.tsx`
- `src/types/pairMatching.ts`, `src/lib/generators/picturePairMatching.ts`
- `src/data/vocabImages.ts` (regenerated), `src/data/vocabulary/g5/tet.ts`
- `public/attribution.json`, `public/images/vocab/` (-1,145 files)
- `scripts/artgen/{dedupe-vocab-art,build-vocab-images}.mjs`,
  `scripts/check-attribution.mjs`

## Verification

- `tsc --noEmit` clean; tests incl. new CR-145 pins pass
- `check-attribution` green post-dedupe
- External review loop: pending
