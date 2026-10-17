# CR-90 — Pronunciation scoring quality: measure it, then fix it

## Why

User report: "phần phát âm cho máy nghe chấm điểm vẫn đang rất kém". The
scorer had never been measured against real audio - it graded STT
*transcript text* with Levenshtein + a vowel-blind Soundex-style code,
and the recognizer's alternatives/confidence plumbing existed but was
never wired (`maxAlternatives = 1`, one string all the way down).

## Measurement harness (repeatable)

`_pron_eval/` holds a 48-clip synthetic corpus (edge-tts + ffmpeg):
12 targets (cat, dog, egg, fish, pig, three, school, ship, bed, pen,
elephant, rice) x 4 cases (good_child, good_adult, accent_vi,
wrong_word). `scripts/_pron-eval.mjs` posts each clip to the deployed
`practice-transcribe` edge function; `scripts/_pron-score.ts` runs the
REAL `scorePronunciationAttempt` over the transcripts and prints the
confusion matrix. `_assess-eval.mjs` does the same for assess mode.

### Baseline (before CR-90): 40/48

- False accepts: cat->cut 77, pig->big 77, elephant->elegant 75
- False rejects: cat->Kate 65, ship->sheep 62 (boundary), three->tree 69
- Provider failures: gemini-2.5-flash = 404 (retired for new users) /
  429 quota - the recorder path on iOS was effectively dead

### After CR-90

Transcript path (browser SR): 42/48, wrong_word **12/12**; remaining
misses are provider mishearings (Kate, chip) that no text scorer can
see through - the SR alternatives now piped through are the rescue.

Assess path (server grades audio directly): **43/47** at threshold 85 -
correct speech 95-100, wrong/distorted 40-80. Residual: hen->heard"pen"
provider mishear; Kate@60 synthetic-TTS artifact.

## Changes

**Scorer** (`pronunciationScoring.ts`):

- `phonemeCode`: target resolves via `WORD_IPA` (1,162-word American IPA
  from CMUdict); OOV candidates get a G2P-lite fallback (digraphs
  th/sh/ch/ng/ph, silent-e magic vowels, igh, er/ir/ur rhotics) that
  KEEPS vowels - ship/sheep, bad/bed, cat/cut now distinguishable.
- Hard gate: `phonemeSim < IPA_ACCEPT_MIN (0.8)` caps the score below
  threshold - text similarity can no longer pass a different real word.
- Homophone floor: identical phoneme codes ("eight"->"ate") floor the
  score at 95 x confidenceFactor - recognizer respelling is not a
  pronunciation error.
- `options.serverScore`: an assess verdict short-circuits text scoring;
  pass bar `ASSESS_PASS_MIN = 85` (corpus-calibrated).

**Pipeline**: `maxAlternatives` raised; `onResult` emits
`{transcript, alternatives, confidence}`; the hook forwards them as
`PronunciationScoringOptions` through `onAttempt` -> App ->
`submitPronunciationAnswer` (single scoring entry point unchanged).

**Edge function** (`practice-transcribe` v13): `mode:'assess'` asks
Gemini/OpenRouter to grade the audio vs the target and return
`{heard, accuracy}` (JSON). Whisper cannot grade - assess failure falls
back to the plain transcribe chain unchanged. Same rate limit, size
cap, CORS.

**Engine selection**: recorder+assess is now the primary engine when
the build carries Supabase env (prod does); SR remains the fallback for
no-env/no-MediaRecorder browsers.

## Deferred (honest limits)

- Provider mishearings survive both paths (hen->pen 100). An
  alternatives-bearing assess (top-3 heard guesses) could rescue it.
- Corpus is synthetic TTS - a real human/child recording set would
  sharpen calibration further.
- Vault hygiene: gemini_model updated to a live model, but key quota
  rotation is operational, not code.
