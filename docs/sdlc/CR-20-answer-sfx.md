# CR-20: Answer sound effects

## Request (user)
"Khi làm đúng hay sai thì có hiệu ứng âm thanh gì đó cho sinh động."

## Design
- `public/sfx/correct.mp3` - ascending C5-E5-G5-C6 arpeggio, soft sine
  stack + decay envelope, ~0.7s, moderate loudness. Cheerful but not
  loud - kids may play in class.
- `public/sfx/wrong.mp3` - gentle descending two-tone (E4 -> C4),
  rounded sine, ~0.55s. Signals "not right" WITHOUT a harsh buzzer -
  a wrong answer should not feel punishing to a 7-year-old.
- Synthesized in-repo by `scripts/gen-sfx.py` (pure Python WAV +
  ffmpeg -> mp3). Self-hosted, no third-party asset licensing.
- `src/lib/sfx.ts` - playSfx('correct' | 'wrong'), fire-and-forget,
  silently no-ops when Audio is unavailable/autoplay-blocked
  (e.g. guest lands and submits before any tap - rare but safe).
- Wired into FeedbackPanel + PronunciationFeedbackPanel on mount via
  isCorrect - covers every question kind that shows a verdict.

## Acceptance
- Correct answer -> chime; wrong -> soft two-tone, on all feedback paths.
- No crash/error state when audio playback is blocked; tests green.
