# CR-86: Game-as-exam / outward composition

Status: phase 1 implemented (practice/batch path live); phase 2 exam-embed
deferred - requires the server exam schema (`fetch_form`) to carry a
section-level `game` field, designed below.
Opened: PO ruling - "dung chinh game lam bai thi cung duoc" and game
activities should feed other EA features (reverse of CR-83's inward
assumption).

## Intent

- A game run IS a valid assessment: GameEnd already reports
  points/maxPoints/correctCount - map it onto exam/practice scoring.
- Exam flow may embed a registered game as one section (e.g. a
  PictureReveal section in a Grade-1 exam) instead of a static round.
- Practice surface may schedule game activities the same way it
  schedules rounds today.
- GAME_MECHANICS remains the contract: kinds a mechanic can host, the
  bare Step field, and the game shell that produces GameEnd.

## Phase 1 - implemented: bonus game Round inside the Batch

A Batch is now **4 question Rounds + 1 seeded bonus game Round** (index
4, `TOTAL_ROUNDS = 5`). The game Round is a reward finish: coverage of
the four learning rounds is untouched.

- `RoundContentDefinition.game?: { gameId, level? }` - when set, no
  `buildQuestions`; `startRound` puts the Batch in the new
  `phase: 'game'` (roundSession null).
- `roundDefinitionAt(roundIndex, seed, gradeId)` resolves indices 0-3
  from the fixed registry and index 4 from `gameRoundDefinition` - the
  pick is a pure function of `(seed, gradeId)`, so the same Batch seed
  always replays the same game. Pool: memory-match, balloon-pop,
  fishing-catch, feed-the-pig, picture-reveal, whack-a-mole (short,
  self-contained, all-grades). Long/variable/grade-gated games stay
  Game Zone-only.
- `GameEnd.attempted?` added: items the run presented (the honest
  denominator - `correctCount` alone would hide misses). 14 games set
  it (`spec.rounds`/`rounds.length`/`tiles`/`totalLetters`); TicTacToe
  omits it (variable count) and falls back to correctCount.
- `completeGameRound(state, end)` maps GameEnd onto `RoundOutcome` on
  the Batch's uniform `POINTS_PER_CORRECT_ANSWER` scale - NOT the game's
  own point table, so the Batch summary stays comparable across rounds.
  `phase: 'game'` -> `'round-summary'`; a no-op elsewhere (a stray
  onEnd can never double-credit).
- `GameSection` (`src/components/GameSection.tsx`): owns the round
  board surface + Suspense (no GameRouteBoundary here) + `endedRef`
  single-completion guard; calls `recordGameResult` with the
  deterministic seed `batch:<batchSeed>:r4` - game stars mint once per
  Batch run, idempotent on remount, same ledger as standalone play.
  `recordCorrectAnswers`/skill stats ride the existing RoundSummary
  effect via the outcome - no second counting path.
- `endBatchEarly` during 'game' drops the unfinished round (no phantom
  outcome); `goToNextRound`/`currentRoundDefinition` route through
  `TOTAL_ROUNDS`/`roundDefinitionAt`.
- Copy: "4 trò/vòng" -> "4 vòng câu hỏi + 1 trò chơi thưởng" /
  "đủ 5 vòng" (StartBatchScreen, GradeSelect, RoundSummary).
- Guest lock unchanged - guests stay on the free Round 1.

## Phase 2 - deferred: exam section embed

Requires `fetch_form` (server) to carry `game?: GameId` on a section.
Design: same GameSection wrapper, seed =
`exam:<examId>:<section>:<attempt>`; the exam score record maps
`correctCount`/`attempted` onto the section's question counts.
Renderers fall back to the classic form when `game` is absent. Deferred
because exam questions stream from the server schema - a client-only
slot would desync the grading contract; needs its own CR scope with the
backend change.
