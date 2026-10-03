# CR-37: Huy hiệu mở rộng - 20 badge theo kỹ năng / streak / arena / quest / pet

## Yêu cầu (PO)
Tier-2 roadmap: album huy hiệu hiện chỉ có 5 sticker - quá ít để tạo mục
tiêu dài hạn. Mở rộng lên 20 badge chia theo nhóm chủ đề, có badge gắn
với Arena và pet của CR-34/CR-36.

## Thiết kế
- Vẫn chạy trên engagement store localStorage - guest xài được, không
  cần migration server.
- `BadgeStats` mới trong state: `totalCorrect`, `reviewMastered`,
  `questPerfectDays`, `arenaPlayed`, `arenaWon`. Backward-compatible:
  state cũ thiếu field -> `badgeStatsFor()` tạo mặc định 0.
- `evaluateBadges(state, newly)` là nơi duy nhất chấm badge theo counter;
  gọi sau mọi hàm record (correct answers, claim bonus, review mastered,
  skill answers, streak check, arena duel).
- `recordArenaDuel(won)` trả về badge vừa mở để ArenaResult hiện banner.
- Album group theo 6 category: Luyện tập / Kỹ năng / Chuỗi ngày /
  Đấu trường / Nhiệm vụ / Bạn đồng hành, kèm đếm đã đạt trên tổng.

## 20 badge
| Nhóm | Badge | Điều kiện |
|---|---|---|
| Luyện tập | first-batch, perfect-round, explorer, star-hoard, correct-100, correct-500, review-10 | có sẵn + 100/500 câu đúng tích lũy + master 10 thẻ ôn lại |
| Kỹ năng | skill-grammar/listening/spelling/reading | >=20 câu của kỹ năng đó và đúng >=80% (cộng dồn mọi khối) |
| Chuỗi ngày | streak-3, streak-7 | streak 3 / 7 ngày |
| Đấu trường | arena-first, arena-win, arena-5 | đấu trận đầu / thắng trận đầu / chơi 5 trận |
| Nhiệm vụ | quest-perfect, quest-3 | 1 ngày và 3 ngày hoàn thành cả 3 nhiệm vụ (claim bonus) |
| Bạn đồng hành | pet-baby, pet-adult | pet đạt stage Bé / Trưởng thành |

## Acceptance criteria
- AC-37.1: correct-100 mở đúng lúc 100 câu đúng; review-10 sau 10 thẻ
  mastered.
- AC-37.2: skill badge cần cả >=20 câu lẫn >=80% - 19 câu hoặc 79% đều
  chưa mở.
- AC-37.3: trận arena đầu (kể cả guest bot) mở arena-first; thắng mở
  arena-win; trận thứ 5 mở arena-5; banner huy hiệu mới hiện trên màn
  kết quả đấu.
- AC-37.4: quest-perfect/quest-3 đếm ngày claim đủ 3 nhiệm vụ.
- AC-37.5: pet-baby ở stage 1, pet-adult ở stage cuối.
- AC-37.6: state cũ thiếu `badgeStats` vẫn load được, counter bắt đầu 0.

## Impact
- `store.ts`: `BadgeStats` + `evaluateBadges` + `recordArenaDuel`; hooks
  vào `recordCorrectAnswers`, `claimDailyBonus`, `recordReviewOutcome`,
  `recordSkillAnswer(s)`, `checkStreakStickers`. Fix kèm: `load()`/
  `resetForTests()` đổi sang `structuredClone(EMPTY_STATE)` - shallow
  copy trước đây làm `stickerIds` của EMPTY_STATE bị mutate chung.
- `StickerAlbum.tsx`: render theo category + counter x/y.
- `ExamScreen.tsx`: `ArenaResult` gọi `recordArenaDuel` cho cả 3 nhánh
  (bot/accept/create) + hiện `arena-new-badges`.
- Tests: `badges.test.ts` (6 ca AC) + cập nhật catalog test.
