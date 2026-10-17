# CR-84: Game Zone expansion - 4 new arcade games (catalog 6 -> 10)

Status: APPROVED (PO autonomy per user: "cần phải làm gì thì làm đi")
Type: Feature change on shipped CR-83 work - re-enters at BA, cascades down.

## Intent

User: "càng nhiều trò chơi càng tốt, và cho nó vào phần game" - expand the
Game Zone catalog using the CR-83 architecture (seeded shared-question
sources + reusable step mechanics + GameEnd ledger contract). Every new
game keeps the same rules: real Question union members only, idempotent
`game:<id>:<seed>` star grant, 3 stars = clean play, explicit-tap audio.

## New games (BA)

| id | Title (vi) | Mechanic reuse | Rounds | Scoring |
|----|-----------|----------------|--------|---------|
| whack-a-mole | Đập chuột | EmojiChoiceField 'mole' + listeningImageRounds + ModelSpeaker | 5 | first-try 2 / retry 1 / 0; max 10 |
| feed-the-pig | Cho Heo ăn | EmojiChoiceField 'food' + listeningImageRounds (word text prompt + tap-to-hear) | 6 | same; max 12 |
| picture-reveal | Lật tranh | 9-cover reveal board + imageChoiceRounds + WordChoiceField | 9 | points = reveals; max 9 (flawless for 3*) |
| treasure-chest | Hòm kho báu | 3-lock chest + imageChoiceRounds + WordChoiceField | 5 | first-try 2 / retry 1 / 0; max 10; chest opens at 3 correct |

Design: same materials (cream on navy, gold CTA, land vignette behind
GameScreen). New EmojiChoiceField variants 'mole' (dirt holes, pop-up
bob) and 'food' (plate tiles). Whack/Feed are same-loop siblings of
Balloon/Fishing with different skins; Reveal and Chest are genuinely new
step-mechanics (progressive reveal, lock-state machine).

## Architecture

- `src/games/games/{WhackMole,FeedThePig,PictureReveal,TreasureChest}.tsx`
- `mechanics.tsx`: EmojiChoiceField variant += 'mole' | 'food'.
- `defs.ts` + `GAME_COMPONENTS`: 4 new entries (registry test enforces
  parity automatically).
- No new sources needed: all four reuse imageChoiceRounds /
  listeningImageRounds.
- Timer hygiene: every game clears timeouts on unmount (r1 lesson
  encoded as convention).
- Kind coverage: no new kinds introduced - registry coverage test keeps
  the practice/exam reuse contract green.

## Acceptance criteria

- AC-84.1: 10 cards on the shelf, each opens a playable run, ends with
  GameEnd -> stars through recordGameResult.
- AC-84.2: 3 stars impossible with errors (regression tests per game).
- AC-84.3: all timers cleared on unmount (review r1 lesson).
- AC-84.4: no autoplaying audio; explicit tap only.
- AC-84.5: tsc + suite + build green; Playwright real-flow on 390px.
- AC-84.6: Vietnamese copy hyphen-only; no violet-*; motion-reduce on
  every new animation.

## Tester evidence

- New specs: WhackMole (mount + clean-run GameEnd), FeedThePig (fed-state
  flip + advance), PictureReveal (cover accounting + flawless/miss caps),
  TreasureChest (lock progression + early chest-open end + miss round
  consumption).
- Registry test auto-extended: defs<->components parity now covers all
  10 ids; kind-coverage test still green (no new kinds).
- Gates: tsc clean; suite 195 files / 1,636 tests; build clean -
  GameScreen chunk now ~27 kB lazy.
- Real-flow Playwright: shelf renders 10 cards; each new game mounts
  (whack-a-mole/feed-the-pig/picture-reveal/treasure-chest verified on
  390px + screenshots in tmp).
