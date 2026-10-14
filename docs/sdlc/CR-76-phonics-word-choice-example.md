# CR-76 - Phonics word-choice: example scaffold + leak-free example pick

## Field report (2026-10-14)

On the Round-4 "Chon hinh dung" phonics screen the big letter `c` is shown
and "Nghe/Nghe lai" plays `c, as in cat`. Vietnamese early readers cannot
parse the English "X, as in Y" classroom convention - they hear "cat",
scan the four pictures for a cat, find none, and cannot tell what the
audio was for. A parent reviewing the screen could not decode it either.

A second, latent bug surfaced while fixing this: when the question's
answer word IS the canonical example (`cat` is in the bank), the audio
literally names the correct picture - the question tests nothing.

## Decision

1. **Keep the "sound, as in word" audio** (standard phonics convention)
   but decode it visually: a small chip next to the letter reads
   `nhu tu "<example>"` plus the example word's picture - the same
   EmojiVisual/photo the answer options use.
2. **The spoken example never equals the answer word.** `getSoundExample(sound,
   excludeWord)` returns the canonical example unless it IS the answer, in
   which case it advances to the next bank word sharing the initial sound
   (alphabetical). Only candidates `[0]`/`[1]` are ever reachable, so
   gen-audio-texts.ts renders exactly two utterances per sound key (28 new
   files; 'x' has no alternate and falls back to the bare key 'x', which
   is also rendered).
3. **Example candidates are plain lowercase single words** - acronyms are
   excluded ("CD" is letter-named /s-/, not /k-/). `cd` joins
   INITIAL_SOUND_EXCEPTIONS as 's' so it neither answers nor distracts
   c-sound questions.

## Scope

- `src/lib/phonics/initialSounds.ts`: `getSoundExample`, `excludeWord`
  param on `getSoundUtterance`, lowercase-single-word candidate filter,
  `cd -> s` exception.
- `src/components/PhonicsWordChoiceQuestion.tsx`: scaffold chip
  (`data-testid="sound-example"`), utterance computed with
  `question.word` excluded, row wraps on narrow screens.
- `scripts/gen-audio-texts.ts`: emits canonical + first-alternate
  utterance per sound key; tsv regenerated (8,008 texts).
- `audio-out/` re-rendered (8,008 files, 0 fail) and upserted to
  `ea-audio`; new utterances verified via HEAD (200).

## Out of scope

- Bank-wide initial-sound reclassification audit (proper nouns and the
  remaining acronyms were spot-checked: DVD/DNA/Wi-Fi onsets match their
  first-letter keys; only `cd` was wrong). Multi-word canonical examples
  ("ice cream", "x-ray") stay - they are the least-bad anchors for their
  keys.
- Vietnamese-rendered phoneme audio (no vi phoneme assets exist).

## Verification

- vitest: 74/74 phonics+component tests incl. new scaffold/alternate
  specs; tsc clean.
- HEAD checks: `c, as in cactus` (new), bare `x`, `c, as in cat` all 200.
