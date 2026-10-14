# CR-74 - Sentence audio voice: Andrew -> Ana (kid voice)

## Field report (2026-10-14)

On the Round-2 listening screen the "Nghe"/"Nghe lai" buttons play the
pre-rendered sentence mp3 - `en-US-AndrewNeural` (warm adult male, chosen
in CR-19 r2). At kid pacing Andrew still swallows final syllables:
"I can see a mountain." is heard as "I can see a mouse" - the /tain/
disappears, and the child types the wrong word through no fault of the
content. Meanwhile "Nghe mau" (word-level, `en-US-AnaNeural` child voice)
is clear and well liked.

## Decision

One consistent product voice: **Ana reads sentences too** - the child
voice already used for words, phonics utterances and the model replay.
The adult/kid voice split was a nice-idea variety; field evidence says
young listeners need the clearer timbre everywhere.

## Scope

- `scripts/gen-audio.py`: `VOICE_SENTENCE` -> `en-US-AnaNeural`.
- `audio-texts.tsv` regenerated from the current bank (7,979 texts,
  6,760 sentences - 12 new texts entered since the CR-19 render).
- Re-render all sentence files into `audio-out/` and upsert to the
  `ea-audio` bucket (same sha1 names - overwrite in place, no code or
  manifest change needed at runtime).
- `scripts/upload-audio.py`: keys path now resolves env
  `SUPABASE_KEYS_JSON` first, then the legacy `~/.config/devin/secrets`
  path, then `%APPDATA%/devin/secrets` (where Devin Desktop actually
  stores them on this machine).

## Out of scope

- Vietnamese instruction audio (TTS path, unchanged).
- Playback rates (`NORMAL_FILE_RATE` 0.8 + `-8%` render rate stay; the
  complaint is timbre/enunciation, not raw speed - Ana at the same
  effective rate is the voice the user already approves of).
- Word-level files (already Ana).

## Verification

- HEAD checks confirm target objects exist; bytes change after upsert.
- Spot-check rendered files are non-empty and decode as mp3.
- Playwright smoke: the listen buttons still drive the file path
  (`answer-feedback` + `next-button` flow unchanged - no code change in
  the app itself).
