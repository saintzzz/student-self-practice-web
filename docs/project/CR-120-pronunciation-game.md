# CR-120 - Pronunciation game in the Game Zone ("Đọc to nào")

## Why

Competitor audit (CR-119 intake): ELSA, M.Speak and Monkey Junior all
let kids PRACTICE SPEAKING inside play loops; our pronunciation
pipeline only runs inside batch/exam rounds, where a child never
chooses it. The Game Zone is the engagement surface - a pronunciation
game is the missing piece that turns our strongest differentiator into
a habit loop.

## Scope

- New game `say-it-loud` ("Đọc to nào"):
  - Per round: word + picture art + "Nghe mẫu" speaker (existing
    `speakWord`, auto-suppressed while the mic opens).
  - Mic button drives the existing `usePronunciationRecording` hook
    (idle/recording/processing/error/unsupported phases).
  - Transcript scored by the existing `scorePronunciationAttempt`
    (threshold `PRONUNCIATION_CORRECT_THRESHOLD` = 70). Correct = hit;
    below threshold = miss + lose heart; error 'bỏ qua' advances the
    round with no credit and no life loss (mic failures are not the
    child's fault).
  - Full game contract: rounds, hearts, combo, verdict sfx,
    `onEnd({ points, maxPoints, correctCount, attempted })`.
- `unsupported` browsers get a friendly message state (the GameScreen
  header back button stays available) - the card keeps showing because
  support is runtime-detected, not grade-gated.
- Source: `pickGameWords` seeded pool (same vocabulary + art as every
  other game).
- Registration: `GameId`, `GAME_DEFS` metadata, `GAME_COMPONENTS`,
  `GAME_LAZY`, QuestionKind union if required.

## Impact

- Reuses 100% existing speech infra (`usePronunciationRecording`,
  `scorePronunciationAttempt`, `speakWord`) - no new pipeline.
- New lazy chunk ~2-3kB; no metadata weight added to the shelf.
- Desktop Chrome/Edge + Android Chrome supported; Safari/Firefox show
  the unsupported state (same as the batch pronunciation round).
- No design-system change: play surface stays desk register; the mic
  button copies the batch round's rose gradient idiom.

## Out of scope

- Sentence-level pronunciation (single words only, like the batch
  round).
- Server-side assess mode (`practice-transcribe`) - the hook already
  forwards `serverScore` when present; the game uses local scoring.
