# CR-145 - Art Wiring + Dedupe

**Status:** implemented, review loop pending
**Sources:** `docs/reviews/ART-REVIEW-designer.md` F-04/F-07/F-08 + PO art plan

## Scope

Wire curated art into question kinds that could never reach it, route the
remaining raw-emoji bypasses through `EmojiVisual`, and delete the ~31MB
vocab<->concepts duplicate set.

## Changes

### F-04 art wiring (coverage)
- `public/images/counting/` (100 purpose-built "N objects" webp) now drives
  `CountingImageQuestion` (both directions) and `DescribeAndChooseImageQuestion`
  options via generated manifest `src/lib/content/countingArt.ts`
  (`"<slug>|<count>"` -> path). `count>1` forces svg mode in `EmojiVisual`,
  so art tiles pass `count=1` - the image already contains N objects.
- `PicturePairMatchingQuestion` picture tiles resolve `getWordVisual` art via
  new `PairMatchingTile.wordId`.
- All wiring follows the all-or-nothing law: one missing/failed asset drops
  the whole visible group back to emoji (`onImageError` group state).

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
