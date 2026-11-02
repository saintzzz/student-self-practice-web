# CR-119: Three skill-gap games

**Status:** in implementation
**Type:** feature CR (new gameplay)
**Trigger:** user direction - "Khu trò chơi => không cần thay đổi game play
hoặc thêm game play mới à? học hỏi thêm đối thủ đi nhé."

## Problem

All 15 existing games exercise recognition (pick the right picture/word)
or ordered letter-tapping. Competitor research (IOE, VioEdu, Spelly,
Monkey Junior, Blooket) shows three tested skills the catalog never
touches: spelling recall, word order/grammar, and semantic
categorization.

## Scope - three new Game Zone entries

1. **`missing-letter` - "Điền chữ khuyết"** (tone sky): word art +
   speaker + masked word (`w _ n d o w`); child picks the missing
   letter run from 4 options. Reuses the CR-24 masking approach
   (contiguous internal run, first/last letters visible) with
   `spellableWords` for the pool.

2. **`sentence-scramble` - "Xếp câu"** (tone emerald): scrambled word
   tiles from the CR-26 word-order sentence bank; child taps tiles to
   rebuild the sentence. Reuses `generateWordOrderQuestions` +
   `isWordOrderCorrect` (accepted-alternates scorer) verbatim - no
   second judgment implementation.

3. **`odd-one-out` - "Chọn từ khác nhóm"** (tone rose): 4 option cards
   (art + word); 3 share a `topicId`, 1 does not; child finds the
   intruder. Semantic categorization with real word comprehension.

## Design decisions

- Replaces the earlier "letter tile-build" idea: that overlapped
  LetterCatch mechanics, while word-order covers a genuinely untested
  grammar skill (IOE "sắp xếp câu" is a scored staple).
- One pick/submit per round (canonical answer-game flow); lives from
  `specFor`; 1 point per round; `attempted` reported.
- New shared mechanic `WordOrderField` registered in `GAME_MECHANICS`
  for the `word-order` kind, so exam/round surfaces can adopt it later
  (the reuse contract, same as EmojiChoiceField).
- Shelf cards use emoji-diorama art for now; bespoke `artImage` follows
  the CR-95 asset pipeline in a later art pass.
- Pronunciation/speech remains out - needs a mic pipeline CR.

## Impact

- `types.ts` GameId union +3; `defs.ts` +3; `registry.tsx`,
  `lazyComponents.ts`, `mechanics.tsx`, `sources.ts` extended.
- No changes to existing games, flows, or scoring ledgers.
- Game Screen/Zone already handle arbitrary defs - shelf picks new
  games up automatically, daily-featured rotation included.

## Acceptance criteria

- All three games playable end-to-end: rounds advance, verdict sfx,
  lives decrement, onEnd reports honest points/attempted.
- Scramble accepts grammatically valid alternates via the shared
  scorer; a scramble that lands in the authored order is never served.
- Odd-one-out always builds 3 same-topic + 1 different-topic options
  per round, seeded deterministically.
- Registry/lazy/defs consistency tests stay green; new mechanics +
  sources tests added.
