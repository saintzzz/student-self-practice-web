# CR-83: Game Zone - Arcade Mini-Games on Shared Question Content

Status: APPROVED (user directive - "bắt đầu làm CR trò chơi mới. càng nhiều trò chơi
càng tốt, và cho nó vào phần game. tuy nhiên các bài trong game cũng có thể sắp xếp
cho phần thi hoặc luyện tập bên ngoài được.")

## Intent (user's words)

- "càng nhiều trò chơi càng tốt" - as many games as possible.
- "cho nó vào phần game" - a dedicated Game section, not folded into existing modes.
- "các bài trong game cũng có thể sắp xếp cho phần thi hoặc luyện tập bên ngoài" -
  game question content must be reusable by exam/practice outside the game zone.

## Driver

The product currently has two play surfaces: the structured Batch (Luyen tap) and the
paper Exam, plus Flashcards and the 1v1 Arena. Every surface is a "session of
questions" - there is no arcade layer where a child plays a game that happens to use
English content. Competitors (Lingokids, Khan Kids, Monkey Junior, Duolingo ABC) all
ship a game shelf: short, replayable, star-earning mini-games that keep kids returning.
This CR adds that layer, and the architecture must let the same question mechanics
feed exam/practice so content engineering is not duplicated.

## Scope - v1

### A. Game Zone surface

- New "Khu tro choi" tile in ModeHub (per grade), opening a `game-zone` screen:
  shelf of game cards with per-game best-stars badge.
- Games are grade-scoped: they draw from the selected grade's vocab/bank pools.
- Star awards feed the existing star-bank engagement ledger (no new currency).
- No instruction voice anywhere (post-CR-83-ship state); explicit content audio only.

### B. Game framework (reusability - the "sap xep cho phan thi" requirement)

- `QuestionSource` adapter: games consume the SAME generator output types the
  Batch/Exam rounds use (`imageChoice`, `listeningImageChoice`, `picturePairMatching`,
  `gapBank`/spelling, `phonics`, MCQ from `qb`). No separate question format.
- New interactive mechanics built for games are registered as renderable question
  kinds so a future round/exam can embed them (mechanics registry, not
  game-only components).
- Game shells own: rounds/stars/timer/game-over state. Question logic stays in
  generators + existing scoring.

### C. v1 game set (6 games)

Two pure wraps (existing mechanics, new shell) + four new mechanics:

| # | Game | Mechanic | Question source |
|---|------|----------|-----------------|
| 1 | Lat the nho (Memory Match) | flip-pair board, move counter, star tiers | `picturePairMatching` |
| 2 | Bong bay (Balloon Pop) | hear word -> pop balloon with right picture | `listeningImageChoice` |
| 3 | Dua xe (Racing) | each correct MCQ answer moves mascot car forward vs rival, first to finish | `qb` MCQ / `imageChoice` |
| 4 | Cau ca (Fishing) | drag the correct word/picture card into the bucket | `imageChoice`/`gapBank` |
| 5 | Duoi hinh bat chu (Letter Catch) | letters float across; tap in order to spell the target word | `gapBank` spelling / vocab words |
| 6 | Caro (Tic-tac-toe) | answer to place a piece vs easy CPU | `qb` MCQ (G3-5) |

### D. Shared-mechanics payoff

- `letterCatch` and `balloonPop` renderers register as question kinds the round
  system can adopt later (e.g. a future "game round" inside Batch).
- Racing/TC3 shells are game-only (they need an opponent loop), but their inner
  question step is the standard MCQ renderer.

## Impact assessment

- **Routes/screens:** new `game-zone` + `game-play` screens off ModeHub; no change to
  batch/exam/arena flows. `App.tsx` gets 2 screen states + a hub tile.
- **Data model:** none - game progress is stars into the existing engagement ledger
  (star-bank). Optional per-game best-score row in existing engagement state
  (localStorage-first, same pattern as quest/streak state).
- **RBAC/security:** none - guest + signed-in both play; no new API.
- **Existing features:** untouched; generators are read-only dependencies.
- **Performance:** games lazy-load like exam/tracing chunks (game shells + art behind
  `retryableLazy`); main bundle budget must not regress materially.
- **In-flight work:** none; CR-82 shipped.

## Estimate (separate from project budget)

- BA + design spec: 1 session-artifact round.
- Framework (source adapter + game shell + zone screen): ~3-4 files new + hub wiring.
- 6 games: ~2 files each (shell + question adapter), G1-2 vs G3-5 content variants.
- Tests: per-game reducer/generator unit tests + zone render + a11y; reuse existing
  fixtures.
- Playwright verify: zone shelf + one full playthrough per game on mobile 390px.
- External review loop per AGENTS.md after deploy.

## Acceptance criteria (draft, BA confirms)

- AC-83.1 ModeHub shows a "Khu tro choi" tile per grade; opening it lands on the
  game shelf with 6 games.
- AC-83.2 Every game completes a full play (start -> play -> win/lose -> stars
  awarded) with question content drawn from the selected grade's pools.
- AC-83.3 Game question renderers for letterCatch/balloonPop are registered in the
  shared mechanics registry and can be rendered outside the game shell (test:
  mount them in a question-card context).
- AC-83.4 Stars earned in games appear in star-bank (HUD chip updates).
- AC-83.5 No instruction autoplay; only explicit content audio.
- AC-83.6 Games lazy-load; main chunk delta bounded (<+150kB min).
- AC-83.7 `tsc`, full vitest, build green; Playwright verify on 390px.

## Out of scope

- Multiplayer games (Arena already owns vs-play).
- New question *content* (no new vocab/bank rows) - games reuse existing pools.
- Audio asset generation for games beyond existing TTS/sfx.

## BA refinement (Phase 2)

- Game runs are arcade sessions: each play gets a fresh seed -> fresh star grant
  (bounded by the existing per-grade star cap + totalStars; farming is capped).
- Star rule: normalized points/maxPoints per game through `starsForScore`
  (>=50% 1*, >=75% 2*, 100% 3*) - 3 stars means clean play, not merely finishing.
- Every correct answer also calls `recordCorrectAnswers` -> feeds daily quest,
  pet XP, effort badges (same as Batch).
- OBJECTIVE_RE extended: `game:<id>:<seed>` objectives are idempotent per run.
- Per-game best: `state.gameBest[gameId]` keeps the best star count -> shelf badge.

## Design direction (Phase 3)

- Hub tile "Khu tro choi" (IconPlay) expands to a 2-col card shelf; each card
  shows emoji art + name + tagline + best-stars badge. Tap -> full game screen.
- GameScreen = LandShell hero vignette of the selected grade + navy-desk board;
  header = back + game name + run progress. End screen = star burst + score +
  "Choi lai" / "Quay lai".
- All six games share materials: cream tiles on navy, gold CTA, audio-bars,
  existing sfx (correct/wrong/fanfare) - the game shell owns scene, the question
  step owns content.

## Architecture (Phase 4)

- `src/games/types.ts` - GameId | GameEnd {points, maxPoints, correctCount} |
  GameProps {grade, seed, onEnd}.
- `src/games/sources.ts` - seeded pickers over `getWordsByGrade` +
  `generateImageChoiceQuestions` / `generateListeningImageChoiceQuestions` /
  `buildSpellTiles` + `seededPickN`/`seededShuffleIndices` (deterministic per seed).
- `src/games/registry.tsx` - GAME_DEFS (id, title, tagline, emoji, Component);
  `GAME_MECHANICS` maps each game's step-renderer to the question kinds it can
  host outside the game shell (the reuse contract for exam/practice).
- `src/games/GameScreen.tsx` - LandShell hero + header + mounted game + award
  end screen (recordRoundResult + recordCorrectAnswers + gameBest).
- `src/games/GameZoneShelf.tsx` - shelf grid rendered inside the hub tile.
- `src/games/games/` - MemoryMatch, BalloonPop, RacingCars, FishingCatch,
  LetterCatch, TicTacToe.
- `src/lib/engagement/store.ts` - OBJECTIVE_RE += game, gameBest field +
  recordGameBest.
- App: Screen += 'game' + activeGame; StartBatchScreen += games tile
  (learn -> games -> arena -> reward, G1-2 variant mirrors).
- Lazy: GameScreen behind retryableLazy; bundle budget check at build.

## Tester evidence (Phase 6)

- `src/games/sources.test.ts` (new): seeded determinism, literal-image-word
  filtering, per-game round slicing across all 5 grades, spellable caps
  (G1-2 <=6 chars, G3-5 <=8, alpha-only >=3).
- `src/games/GameZoneShelf.test.tsx` (new): 6 cards render, onPlay id routed,
  best-stars badge from ledger, `game:<id>:<seed>` idempotent replay grant.
- `src/games/registry.test.ts` (new): defs<->components parity, every round
  kind covered by a mechanic Step, no kind double-mapped (the practice/exam
  reuse contract).
- `src/games/games/BalloonPop.test.tsx` + `TicTacToe.test.tsx` (new): full
  play loops - correct/wrong picks, round advance, GameEnd report, board
  claim + CPU reply.
- Bug found by tests: TicTacToe `finish()` set `endedRef` before the
  board-resolved guard -> game froze after move 1. Fixed (endedRef only set
  when a win/full board is confirmed).
- `paletteGuard` caught `violet-*` balloon outside the closed inventory ->
  swapped to amber-400/600 (palette doctrine preserved).
- Gates: `npx tsc -b` clean; full suite 189 files / 1,618 tests green;
  `vite build` clean - games ship as one lazy chunk `GameScreen-*.js` 20.2 kB
  (bundle budget respected; main bundle untouched).
- Real-flow Playwright (`scripts/_cr83-games-verify.mjs`): hub tile expands ->
  6 cards -> Balloon Pop mounts 4 options + pop works -> exit -> Tic-Tac-Toe
  9 cells + cell pick reveals word options. Verified at 390px viewport.

## Known deferrals

- Instruction autoplay is off app-wide (CR-82 speech work) - games show
  ModelSpeaker "Nghe tu" as an explicit tap control, matching the new
  audio doctrine.
- Letter Catch uses raw spellable words (no question kind) - it maps to the
  letter-order mechanic family for practice reuse via LetterOrderField.

## External review r1 -> fixes applied

- HIGH: all six games scheduled timeouts with no unmount cleanup (state
  updates + onEnd firing after exit). Fixed: useEffect cleanup clears
  timerRef on unmount in all six; LetterCatch got a dedicated
  wrongTimerRef so overlapping timers cannot lose each other.
- MEDIUM: MemoryMatch awarded 10/10 for a 5-move run (one mismatch) and
  LetterCatch allowed one wrong bubble per word at full points - both
  could mint 3-star results with errors. BA rule is "3 stars = clean
  play". Fixed: bonus needs the flawless 4-move run; a wrong bubble
  drops the word to 1 pt. Regression tests added for both.
- MEDIUM: TicTacToe empty cells had no accessible name. Fixed: cells now
  announce "O hang R cot C - trong/X/O/dang chon".
- MEDIUM: ModelSpeaker autoplayed the prompt word on mount, violating
  the post-CR-82 explicit-audio doctrine (app listening questions use
  useAudioPlayback = explicit tap). Fixed: autoplay prop removed; "Nghe
  tu" is a tap-only prompt, same contract as practice listening.
