# CR-19: Pre-recorded audio files - uniform voice on every device

## Request (user report, field-verified on Redmi K90 / Android Chrome)
- "Giọng phát âm thực sự khó nghe" (CR-16 improved voice selection but
  quality still depends on each device's installed TTS voices).
- On Android Chrome with ZERO installed TTS voices (`getVoices() === 0`
  - MIUI ships without Google TTS enabled, and installing the app does
  not always register voices into Chrome) speak() reports speaking=true
  but produces silence. No client-side workaround exists.

## Decision
Ship the commercial fix: pre-render every spoken text to mp3 with a
neural TTS voice (Microsoft Edge neural voices via edge-tts), host on
Supabase Storage (public bucket `ea-audio`), play via HTMLAudioElement.
Same studio-quality voice on every device, independent of OS TTS.
Web Speech remains the fallback if an audio file is missing/fails.

## Scope - all spoken texts (enumerated, deterministic)
- 1190 vocab words (`speakWord`)
- listening-sentence-fill-blank sentences (word x class templates)
- describe-and-choose-image count sentences ("There is/are ...") and
  negation sentences ("There isn't ...")
- phonics sound utterances ("c, as in cat")

## Naming
`{VITE_SUPABASE_URL}/storage/v1/object/public/ea-audio/{sha1(text)}.mp3`
- sha1 computed at runtime (crypto.subtle) - no manifest, no bundle cost.
- 404/playback error -> fall back to speechSynthesis.

## Files
- `scripts/gen-audio-texts.ts` - enumerate texts (deterministic, reused
  by tests to assert coverage)
- `scripts/gen-audio.sh` - parallel edge-tts render loop
- `scripts/upload-audio.sh` - Supabase Storage upload via service key
- `src/lib/speech.ts` - audio-first speak(), TTS fallback
- `docs/sdlc/CR-19-prerecorded-audio.md` (this file)

## Acceptance
- Every text the app can speak has an mp3 in the bucket.
- Listen buttons play neural audio on desktop AND the Redmi device.
- Fallback: if file missing -> old TTS path still works (tests pin this).
