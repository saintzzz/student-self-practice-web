# CR-147 - Ba game mới (GAMEFI-DESIGN-po §3.4, roadmap P2)

## Scope

Ba game mới vào Game Zone, mỗi game phủ một kỹ năng đang trống, chỉ đọc
content pools đã audit-safe:

| Game | Id | Kỹ năng | Source | Gate |
|---|---|---|---|---|
| Cửa hàng của Heo | `counting-shop` | đếm + từ số | `COUNTING_ART` manifest (100 file g1-g5, F-04 wire) | - |
| Ao vần | `rhyme-pond` | phonics rhyme/initial | `rhymes.ts` + `initialSounds.ts` ONLY - cấm blends/finals (G-6) | - |
| Chuyến tàu cờ | `flag-voyage` | geography listening | `flagPool` riêng, bypass `isFlagEmoji` (G-5) | F6/F7/F8 |

## Flag gate (F6/F7/F8) - data fixes shipped with this CR

- F6: `european-union` already blocked from sentence frames (CR-144);
  flagPool additionally excludes it + non-sovereign territories.
- F7: `britain` explanation distinguishes 'Vương quốc Anh'; `england`
  gloss 'Xứ Anh' (matches existing 'Xứ Wales' convention).
- F8: `taiwan`/`hong-kong`/`macau` glossed '...(vùng)'; flag topics
  containing territories retitled 'Các nước và vùng ...'.
- `flagPool` allow-rule: flag-emoji words minus `FLAG_VOYAGE_EXCLUDE`
  (EU + territories: taiwan/hong-kong/macau/kosovo/aland/guernsey/
  faroe-islands/gibraltar). Game grades: 4-5 only.

## Design

- `counting-shop`: scene image shows K objects (single tray L1; two
  trays L2+ sum <=10). Options = number words one..ten, distractors
  +-1/+-2 (count-off-by-one misconception). WordChoiceField.
- `rhyme-pond`: ModelSpeaker speaks target word -> 4 lily-pad options
  (word + concept art); L1 rhyme match via rhymesWith, L2 same initial
  sound via getInitialSound, L3 alternate. Exactly 1 correct.
- `flag-voyage`: hear "I am from ___" (speakWord) -> 4 flag options via
  EmojiChoiceField grid (Twemoji flag art). Passport-stamp framing.
- No artImage yet -> emoji diorama `art` on shelf card (same as the 5
  existing art-less defs); artgen debt recorded.
- Scoring/mechanics identical to shelf family: specFor(level), lives,
  combo, hint, recordGameResult via GameScreen.

## Review log

- (pending)
