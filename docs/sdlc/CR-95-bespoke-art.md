# CR-95: Bespoke Illustrated Art - Game Cards + Tet Vocab

Status: IN PROGRESS (user directive - "sử dụng chatgpt web làm hết đi nhé")

## Scope

1. **Game card art** - 15 bespoke flat-vector illustrations, one per game,
   replacing the emoji triptych diorama on Game Zone shelf cards. Pipeline:
   `GameDef.artImage` -> `GameArt` renders `<img>` with emoji fallback.
   Files: `public/images/games/{id}.webp` (320x320).

2. **Tet vocab art** - the G5 Tet unit's emoji approximations are culturally
   wrong or misleading: `festival` shows Japanese koinobori flags (both the
   🎏 emoji AND `concept-festival-db5864.webp`), `apricot-blossom` shows a
   generic orange flower instead of yellow hoa mai. `dragon-dance` is a
   plain dragon head rather than the mua-lan costume. Three bespoke images
   -> `public/images/vocab/{id}.webp` (256x256), wired via
   `VocabWord.imageUrl` so flashcards, image-choice, listening-image-choice,
   and feedback panels all render the real art (image-mode EmojiVisual with
   emoji fallback).

3. **Concept-bank repair** - the three Tet concept webps are overwritten in
   place (same filenames) so `qb_assets` rows keep working with correct art.

## Generation pipeline

ChatGPT-web (user-authorized, manual login once into
`scripts/artgen/profile/`): `scripts/artgen/run.mjs --login`, then
`--gen` loops `manifest.mjs`, downloads raw PNGs to `artgen-out/`, and
`resize.py` (PIL) center-crops + resizes to webp in `public/images/`.
Proprietary VieSchool assets - recorded in `public/attribution.json`.

## Acceptance

- All 15 game cards render bespoke art; emoji diorama remains as fallback.
- `festival`/`apricot-blossom`/`dragon-dance` show Vietnamese-accurate art
  in flashcards + question surfaces + the concept-bank copies.
- attribution.json records the new originals; no third-party runtime fetch.
- Gates: tsc, targeted tests, build, Playwright shelf + flashcard verify.
