# 3-agent review synthesis - action plan (PM)

Sources: `CONTENT-REVIEW-teacher.md` (12 findings), `ART-REVIEW-designer.md`
(F-01..F-10), `GAMEFI-DESIGN-po.md` (P0-1..P2-6). This file is the single
triage - each finding lands in exactly one action item.

## Cross-cutting insight (the reason this matters)

The three audits compound: teacher-flagged content (liar/villain/crazy/
badges/piñata) flows INTO the game layer (`gameWordPool` ->
SentenceScramble can generate "I want to be a liar"), and designer-
flagged unused art (100 `counting/` files) is exactly what PO's new
counting game needs. Fix order is not optional: content guards BEFORE
new games, or bugs amplify.

## Action plan

### CR-144 "Content + art guards" (P0 - all S-sized, ~1 commit batch)

| # | Item | Sources |
|---|---|---|
| 1 | `GAME_BLOCKED_WORDS` + charset/spellable filter in game word pool (liar/villain/crazy/kiss/badges/piñata/Åland out of every game + SentenceScramble) | teacher C1/C3/M9/M10, PO P0-1 |
| 2 | Phonics exceptions: `BLEND_EXCEPTIONS` (two/sword/science/scissors) + silent-e guard for PE/x-ray/karate | teacher H4/H5 |
| 3 | Generator aspiration-class blocklist (no liar/villain occupation templates) + drop `infinity`/`zero` from count-templates + flag-topic membership fix (EU out, TW/HK/MO relabel "vùng lãnh thổ") | teacher C2/C3/H6/M8 |
| 4 | Quarantine `v6-sci-*`/`v6-math-*` placeholder art from question asset_paths (text > misleading image) | designer F-01 |
| 5 | `PromptLine` onError fallback + alt (ExamScreen:1696) | designer F-02 |
| 6 | All-or-nothing option art (`EmojiChoiceField`, `OddOneOut`) | designer F-03, PO P0-4 |
| 7 | Wrong-object swaps: TreasureChest 🧰 + GoldQuest -> `treasure-chest.webp`; FeedThePig 🐷 -> `be-heo` art | designer F-05/F-09, PO P0-2/P0-3 |
| 8 | Pin tests: no flag-emoji, no blocked words, no unspellable chars in game pools | PO P0-5 |

### CR-145 "Art wiring + dedupe" (P1, M-sized)

- Wire `counting/` art into CountingImage/describe/pair-matching kinds
  (or consciously keep repeated-emoji as count semantic - spec call) - F-04
- Exam `image-choice` resolves `imageUrl` - F-06
- Route ~10 raw emoji literals through `EmojiVisual` (🐢 hoisted into
  ListenButtons once, StoryTime/PetCard/ClassShow/ExamScreen) - F-07
- Dedupe vocab/ vs concepts/ (~31MB, 1,140 byte-identical files) - F-08
- England/Britain gloss split + "He is a Santa Claus" fix - teacher M7/M10

### CR-146 "Lantern Trail core loop" (P1, L - the gamefi backbone)

Per PO doc: 12-node trail inside each grade land, batch completion
lights nodes, every 4th node = chest -> home item (reuses
`grantHomeItem`/`GiftBoxPicker`/`trail:` objectives). Plus:
- Star shop (25★/home item) - first sink for `totalStars`
- Home items rendered onto land scene
- `recordSkillAnswer` for game answers + game-wrong -> review queue
- Pet stages 4-5, shelf grouped by skill, MemoryMatch/TicTacToe scoring,
  speed-bonus persist-or-remove
- Class co-op weekly goal (rpc aggregate)

### CR-147 "New games" (P2, gated)

- "Cửa hàng của Heo" counting game (uses the 100 `counting/` files)
- "Ao vần" rhyme game (rhymes.ts ONLY - blends/finals banned until
  teacher F4/F5 land in CR-144)
- "Chuyến tàu cờ" flag voyage - HARD GATE on the flag-topic fix
- "Đảo bí mật" as the trail-finish destination; seasonal variants;
  screen-time "Giờ nghỉ" banner

## Recommended immediate move
CR-144 first - it is the cheapest batch with the highest correctness
stakes (kids currently CAN be marked wrong on unanswerable items and
can read "I want to be a liar"). Then CR-145 while CR-146 is designed
in detail.
