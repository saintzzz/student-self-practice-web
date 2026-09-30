# CR-18: Mobile audio - TTS playback + pronunciation recording

## Request (user report)
"Khi chơi trên điện thoại hay tablet, không thể cho phát âm hay
ghi âm được. Đây là lỗi."

## Root causes found
1. `speech.ts` called `synth.cancel()` then `synth.speak(u)` in the
   same tick. iOS Safari (and some Android WebViews) silently drop an
   utterance issued immediately after cancel() - known Web Speech bug.
   Result: tap speaker -> nothing plays, no error surfaced.
2. `usePronunciationRecording` swallowed non-permission errors
   (network, no-speech, service errors) into `finish('')` - the
   question was graded wrong with no explanation and no way to retry.

## Fix
- `speech.ts`: only cancel when speech is actually in flight
  (`speaking || pending`), defer `speak()` one tick after cancel, and
  add a watchdog timer - if the utterance neither starts nor errors
  within ~4s, surface `onerror` so `useAudioPlayback` shows
  AudioPlaybackWarning instead of silent failure.
- `usePronunciationRecording`: new `error` phase for recoverable
  failures (network/no-speech/service) instead of auto-`finish('')`.
- `PronunciationStatusMessage` + `PronunciationRecordingQuestion`:
  render error state in Vietnamese with a "Thử lại" retry action
  (`data-testid` for tests). iOS Safari without SpeechRecognition
  still gets the existing unsupported notice + skip path.

## Files
- `src/lib/speech.ts`
- `src/hooks/usePronunciationRecording.ts`
- `src/components/PronunciationStatusMessage.tsx`
- `src/components/PronunciationRecordingQuestion.tsx`
- `src/hooks/usePronunciationRecording.test.ts` (error -> retry test)

## Verification
- Unit: pronunciation/speech suites 43/43 green; full suite green.
- tsc clean; vite build green.
- Note: real-device audio still depends on the browser's speech stack
  (iOS requires voices downloaded in Settings). The watchdog ensures
  failure is now *visible* with guidance instead of silent.

## Round 2 - user still hit the warning on Android Chrome
Reported on a physical Android device in Chrome: tapping listen showed
the warning immediately. Three additional mobile-Chrome gaps fixed:

- `utterance.onerror` no longer treats `canceled`/`interrupted` as
  failures - those are the expected result of our own `cancel()` and
  were flashing bogus errors.
- `synth.resume()` is now always called before `speak()` - Chrome
  Android leaves the synthesis queue in a stuck-paused state that only
  resume() unsticks.
- First failure now auto-retries once (~120ms) instead of showing the
  warning immediately - Android's TTS engine lazily spins up and often
  drops the very first utterance; the retry lands once it is warm.
  Only a second failure surfaces the warning (genuine gap: device has
  no English TTS voice installed in Settings > Text-to-speech).
- speech.test.ts: onerror test updated for the async retry path +
  new test pinning that canceled/interrupted never reports error.
