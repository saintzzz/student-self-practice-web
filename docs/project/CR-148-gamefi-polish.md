# CR-148 - Gamefi polish: skill recording, shelf grouping, rest banner

Nguồn: `docs/reviews/REVIEW-SYNTHESIS.md` + `GAMEFI-DESIGN-po.md` roadmap
(mục P1-4..P1-9, P2-4, P2-6 còn lại sau CR-146/147).

## Phạm vi

| # | Item | Quyết định |
|---|------|-----------|
| P1-4 | Game answers -> `recordSkillAnswers` + game-wrong -> review queue (D6) | Làm |
| P1-5 | Pet stage 4-5 (`PET_STAGE_XP` nối dài) | Làm (art clamp stage-3, debt artgen) |
| P1-6 | Shelf nhóm theo kỹ năng + badge "điểm yếu" | Làm |
| P1-7 | MemoryMatch/TicTacToe scoring | **Không sửa** - triage bên dưới |
| P1-9 | Speed bonus persist-or-remove (D5) | **Bỏ khỏi UI** - clean-play |
| P2-4 | "Đảo bí mật" mở khi trail xong vòng 1 | Làm |
| P2-6 | "Giờ nghỉ" banner + parent toggle | Làm |
| P1-8 | Class co-op weekly goal (rpc) | Defer - cần migration + rpc |
| P2-5 | Seasonal trail variants | Defer - cần artgen |
| P1-10 | 5+3 `artImage` game cards | Defer - cần artgen (không có key) |

## Thiết kế

### P1-4 - D6 fix
- `GameDef.skill?: string` - bucket kỹ năng (`SKILL_LABELS` keys) mỗi game.
- `GameEnd.wrong?: ExamQuestion[]` - game đẩy các câu hỏi trả lời sai
  (round objects VỐN là Question union members thật - image-choice,
  listening-image-choice, word-order).
- `GameScreen.handleEnd`: `recordSkillAnswers(gradeId, def.skill,
  correctCount, attempted)` + `recordWrongExamQuestion` per wrong item.
- `ExamQuestionView` thêm case `listening-image-choice` (tái dùng
  `ListeningImageChoiceQuestion` component + adapter onSelectOption ->
  onAnswer) - scoring đã có sẵn trong `examSession.ts`. Không có case
  này, review item rơi vào default "chưa hỗ trợ" = câu không làm được.
- Wire `wrong` ở 13 game: 5 listening-image (BalloonPop, FishingCatch,
  WhackMole, FeedThePig, MazeChase), 7 image-choice (RacingCars,
  TicTacToe, TreasureChest, CastleGuard, GoldQuest, PictureReveal,
  QuizShow), 1 word-order (SentenceScramble). Dùng `wrongRef` (ref) để
  setTimeout luôn thấy state mới nhất.

### P1-5 - pet arc dài hơn
- `PET_STAGE_XP` [0,50,250,600] -> [0,50,250,600,1500,4000] (mirror
  `PLAYER_LEVEL_XP` như spec).
- Tên stage mới: 4 "Anh hùng", 5 "Huyền thoại".
- `petArtUrl` clamp `Math.min(stage,3)` - art stage 4/5 chưa tồn tại
  (debt artgen, file `pet-{species}-4/5.webp`).
- Emoji per-stage mở rộng thêm 2 mốc (crown + sparkle cho apex).

### P1-6 - skill shelf
- `GameZoneShelf` nhóm `rest` theo `def.skill` thành section có tiêu đề
  (`skillLabel()`), thứ tự cố định `SKILL_SECTIONS`: Nghe, Từ vựng,
  Chính tả, Phonics, Đếm, Sắp câu, Ghép cặp, Nói, Đọc; def không có
  skill rơi vào "Khám phá".
- Badge "Điểm yếu" trên card có `def.skill` khớp một weak key của
  `weakSkillsFor(gradeId)` - trực tiếp HOẶC qua `drillSkillsFor`
  (qb key `vocabulary-recognition` gắn lên game `vocabulary`).

### P1-9 - speed bonus
- Xóa `+N điểm nhanh` khỏi end screen + `timeBonusFor` call (D5: con số
  hiện rồi biến mất không đi đâu = confetti không trung thực). Giữ đồng
  hồ thời gian (thông tin, không phải thưởng). `timeBonusFor` giữ trong
  levels.ts (được test pin) nhưng không còn consumer UI.

### P2-4 - Đảo bí mật
- `LockedCard` -> `MysteryIslandCard`: đọc `trailSnapshot(gradeId)` qua
  `subscribe` (r229 rule - card tự flip khi lap xong); epoch >= 1 thì
  card mở khóa (badge "Đã mở"), tap -> panel đảo + `visitMysteryIsland`
  grant sticker `mystery-island` qua objective `island:<gradeId>`
  (idempotent - `firstVisit` chỉ true lần đầu).
- Sticker mới `mystery-island` trong STICKERS catalog (art webp nợ
  artgen - ArtImg rớt về 🏝️ emoji như trail stickers).
- `OBJECTIVE_RE` + sync sanitize regex thêm prefix `island` - thiếu thì
  `grantObjective` silent-drop (đúng class bug r222 đã vái cho `trail`).

### P2-6 - Giờ nghỉ
- `lib/engagement/restReminder.ts`: `useRestReminder` đếm stretch active
  (tick 5s khi visible; hidden > `BREAK_RESET_MINUTES` = 5 phút là
  nghỉ thật -> reset stretch), bắn banner ở `REST_MINUTES` = 30.
  Pure `tickStretch` cho test.
- `RestBanner` mount global trong App root (cạnh `PwaUi`): toast mềm
  style `StreakMilestoneToast`, 1 nút "Em biết rồi" dismiss + reset
  chu kỳ 30 phút. Không block, không điều hướng.
- Toggle trong `ParentReportScreen` (Góc ba mẹ, sau ParentGate): "Nhắc
  giờ nghỉ sau 30 phút chơi liên tục" - lưu `localStorage`
  `ea-rest-reminder` (pref theo thiết bị, không đi qua engagement
  merge; default ON, parent opt-out).

### Triage P1-7 - không cần sửa
- MemoryMatch ĐÃ tính sao theo số lượt lật (`bonus` theo moveCount,
  MemoryMatch.tsx:45) - claim "luôn 3 sao" của PO đọc từ comment cũ
  `roundDefinitions.ts:48-49` nói về bonus-pool eligibility, không phải
  scoring thật. Run cẩu thả vẫn mất điểm.
- TicTacToe ĐÃ chuẩn hóa `maxPoints: 9` (correct + win/draw bonus) -
  trận ngắn = nhiều bonus + ít câu, đó là thưởng hợp lý cho thắng
  nhanh, không phải lỗi normalize.

## Deferred (ghi nợ, có design)
- **P1-8 class co-op**: cần rpc aggregate `class_week_lanterns`
  (sum batch-completed của members theo tuần) + RLS - migration riêng.
- **P2-5 seasonal**: cần artgen land seasonal variants.
- **artgen queue**: `pet-{species}-4/5.webp` x3 species,
  `sticker-mystery-island.webp` + 10 `sticker-trail-*.webp` (kế thừa
  CR-146), 8 `games/*.webp`
  card art (missing-letter, sentence-scramble, odd-one-out, say-it-loud,
  story-time, counting-shop, rhyme-pond, flag-voyage), `concepts/grape`
  cardinal-safe art.
