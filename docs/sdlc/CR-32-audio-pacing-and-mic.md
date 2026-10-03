# CR-32 - Audio pacing + mic recognition reliability

## Trigger

Field report from the owner: (1) spoken words are too fast for kids to
catch; (2) pronunciation recording reports an error even when the mic
is on and the child spoke.

## Scope

- Slower default speech: TTS utterance rate 0.88 -> 0.7; pre-recorded
  mp3 playbackRate 0.8.
- "Nghe cham" (slow replay) button appears after the first play on
  every audio question kind via a shared ListenButtons component
  (0.49x utterance / 0.56x file).
- SpeechRecognition reliability: interimResults enabled (final-only
  settle), one silent automatic retry for transient codes
  (no-speech/network/audio-capture/aborted) while the child still sees
  "dang ghi am", and per-code error copy (no-speech = speak louder/
  closer, network = check connection, audio-capture = mic issue).
- onOtherError now receives the real browser error code; onend with no
  result reports 'no-speech' (same effective state).

## Impact assessment

| Area | Impact |
|------|--------|
| src/lib/speech.ts | speed param through speak/synthesize/file playback |
| src/lib/speechRecognition.ts | interimResults, isFinal gating, error code passthrough |
| src/hooks/useAudioPlayback.ts | playSlow added; play stays no-arg (onClick-safe) |
| src/hooks/usePronunciationRecording.ts | silent-retry engine, errorReason |
| src/components/ListenButtons.tsx (new) | shared play + slow controls |
| 8 audio question components | ListenButtons or inline slow button |
| PronunciationRecordingQuestion | per-code error copy |
| Tests | interimResults/isFinal in fakes, retry-path test |

Risk: LOW-MEDIUM - behavioral change on two core paths; guarded by
existing + new tests. No schema change.

## AC

- AC-32.1 Default playback is audibly slower (rate 0.7 / file 0.8).
- AC-32.2 After first play, a "Nghe cham" button replays slower.
- AC-32.3 A transient no-speech/network error retries once without
  showing an error; a second failure surfaces the error phase.
- AC-32.4 Error copy reflects the real code (no-speech/network/
  audio-capture/generic).
- AC-32.5 Interim (non-final) transcripts never settle an attempt.
