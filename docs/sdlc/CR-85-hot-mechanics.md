# CR-85: Game Zone - port competitor-hot mechanics

Status: implementation
Opened: after PO correction - the point was never "games must not own a
bank"; it is (1) port the HOTTEST game mechanics from competitors, and
(2) let game content flow OUTWARD (game activities reusable by other EA
features; a game can itself be the exam - see CR-86).

## Competitor research (what is actually hot)

- Blooket Gold Quest - correct answer -> pick 1 of 3 chests -> random
  reward (gold, multipliers, steal, dragon tax). The luck loop is why it
  is the most-played mode: every answer stays exciting until the end.
- Blooket Tower Defense - answers earn tokens -> towers auto-fire at
  enemy waves on a path. Most-loved strategy mode.
- Gimkit Fishtopia - answer -> bait -> fish -> sell -> upgrade economy.
  (Our FishingCatch already covers the fish fantasy; skip economy v1.)
- Wordwall Maze Chase - Pac-Man-style run to the correct answer zone
  while dodging a ghost.
- Wordwall Gameshow Quiz / Ai la trieu phu - prize ladder + timer +
  lifeline; culturally iconic in VN.
- Classic snake spelling (eat letters in order) - arcade staple.

## Scope - 5 new games (10 -> 15 cards)

| id | title | mechanic ported | source |
|---|---|---|---|
| gold-quest | Dao vang | pick 1/3 chests after each correct | imageChoice |
| quiz-show | Dau truong trieu phu | ladder + 20s timer + 50/50, sudden death | imageChoice (g3-5) |
| maze-chase | Di me cung | grid walk to correct pad, ghost chases | imageChoice |
| word-worm | Ran danh van | turn-based snake eats letters in order | spellable |
| castle-guard | Giu thanh | waves advance; correct = bolt kills front slime | imageChoice |

## Rules kept

- Stars doctrine: GameEnd points still normalize so 3 stars = clean play
  (luck loot is display-only, never inflates points).
- All timers/intervals cleared on unmount. Tap-triggered audio only.
- No new question kinds -> GAME_MECHANICS coverage stays green.
- quiz-show card filtered to grades 3-5 (reading + time pressure).

## CR-86 (next, separate CR)

Game-as-exam/practice: let a Round/Exam section embed a registered game
component (GameEnd -> section score), and let other EA features draw
from the game activity set - the outward share the PO asked for.
