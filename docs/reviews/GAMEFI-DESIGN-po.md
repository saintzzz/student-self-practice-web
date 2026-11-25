# GAMEFI DESIGN - Product Owner audit & "Sân chơi" design for English Arena

> **Báo cáo thiết kế lớp game (PO - ex Duolingo ABC / Lingokids mindset)**
>
> Review type: READ-ONLY design document (không sửa source).
> Scope: `src/games/**`, `src/lib/engagement/**`, `src/lib/rounds/roundDefinitions.ts`,
> `src/lib/batch/batchSession.ts`, `src/components/{DailyQuestCard,StickerAlbum,
> PetCard,HomeShelf,LeaderboardCard,GiftBoxPicker,LevelRing,EngagementBar,
> GradeSelect,StartBatchScreen}.tsx`, `src/data/homeItems.ts`.
> Inputs bắt buộc đã đọc: `docs/reviews/CONTENT-REVIEW-teacher.md` (F1-F12),
> `docs/reviews/ART-REVIEW-designer.md` (F-01..F-15).
> Ngày: review pass trên `main`, đối chiếu line numbers hiện tại.

---

## 0. Executive summary / Tóm tắt điều hành

English Arena đã có **một nền engagement đáng nể**: streak có freeze + server
truth (Duolingo-grade), daily quest, Leitner review queue, pet, album huy
hiệu, journey map giữa các khối, 20 arcade games lấy nội dung từ đúng bank từ
vựng (không phải mock). Vấn đề không nằm ở thiếu hệ thống - vấn đề nằm ở
**ba điểm gãy của vòng lặp dài hạn**:

1. **Sao không có chỗ tiêu.** `totalStars` chỉ tăng (`store.ts:424-425`),
   không một dòng code nào tiêu sao. Trong khi đó "Nhà của em" có 24 món đồ
   (`homeItems.ts`) nhưng chỉ **2 nguồn mở quà duy nhất**
   (`GIFT_STICKER_IDS = ['first-batch','star-hoard']`, `store.ts:520`) -
   một đứa trẻ chơi chăm cả năm cũng chỉ mở được **tối đa 2 món đồ, mãi mãi**.
   Đây là lỗi kinh tế game lớn nhất hiện nay.
2. **Game Zone là "kệ đồ chơi", chưa phải "hành trình".** Journey map chỉ
   tồn tại ở tầng khối (`GradeSelect.tsx` - trail dots + land postcard +
   next-pulse). Bên trong một khối, batch nối batch nhưng không để lại dấu
   vết nhìn thấy - đứa trẻ không thấy mình "đang đi đến đâu".
3. **Hai lỗ hổng nội dung chạy thẳng vào game.** `gameWordPool`
   (`sources.ts:23-25`) lọc `isLiteralImageWord` nên cờ quốc gia đã bị chặn
   đúng - nhưng `liar` 🤥, `villain` 🦹, `crazy` 🤪, `ok-badge` 🆗... đều là
   literal-emoji words nên **lọt pool**. Hệ quả có thể kiểm chứng:
   SentenceScramble gọi `wordOrderRounds -> generateWordOrderQuestions ->
   sentencesForWord` (`wordOrder.ts:41-45`), mà `liar`/`villain` thuộc class
   `occupation` (teacher F3) - **game có thể sinh đúng câu "I want to be a
   liar." mà audit giáo viên vừa gắn cờ Critical.**

| Trục | Điểm /5 | Nhận xét ngắn |
|---|---|---|
| Vào phiên (launchpad, quest, streak chip) | 4.0 | Hub + daily quest + streak làm tốt việc mời vào |
| Trong phiên (4+1 vòng, FX, lives/combo) | 4.0 | Cấu trúc chắc, bonus game round là phần thưởng đúng nghĩa |
| Phần thưởng tức thì (sao, StarRain, ChestReveal, quà) | 3.5 | FX đẹp nhưng quà chỉ nổ 2 lần đời |
| Quay lại (streak+freeze, quest, server goal, leaderboard) | 4.0 | Tảng retention tốt nhất của app |
| Tiến trình dài hạn (map trong khối, collection, sink) | 1.5 | **Điểm gãy chính - phần lớn thiết kế này nhắm vào đây** |
| Game Zone (20 games, 3 màn, skill coverage) | 3.0 | Vui, nhưng 11/20 games là reskin của 2 generator; thiếu phonics/counting |

---

## 1. Current-state audit - chấm điểm từng khâu của loop

### 1.1 Vòng lặp hiện tại (đo theo code, không đoán)

```
Launchpad (hub learn/arena/games/reward + DailyQuestCard + streak)
  -> Batch: 4 vòng câu hỏi + 1 bonus game round (roundDefinitions.ts:56-76)
  -> BatchSummary: StarRain + ChestReveal (+2 sao) + có thể GiftBoxPicker
  -> recordRoundResult/recordGameResult -> sao + sticker + pet XP + player XP
  -> ...về launchpad. Đây là điểm dừng của mọi thứ.
```

| Khâu | /5 | Bằng chứng code | Đánh giá PO |
|---|---|---|---|
| Session entry | 4.0 | `StartBatchScreen.tsx:442-553` hub 4 tile; `DailyQuestCard.tsx` 3 quest + +3 sao | Trẻ thấy ngay "hôm nay làm gì". Trừ: quest card nằm trong tray, game zone chưa nhắc quest |
| Round structure | 4.0 | `roundDefinitions.ts:14-76` - 4 vòng kỹ năng khác nhau + game bonus seeded | Đúng chuẩn "học rồi chơi"; pool bonus 5 games có lý do chọn (comment :47-52 loại memory-match vì không phân biệt được) |
| Reward moment | 3.5 | `StarRain`, `ChestReveal` (SVG deterministic đúng DESIGN_SYSTEM §15), `GiftBoxPicker` 3 hộp chọn 1 | Khoảnh khắc đẹp nhưng tần suất quà quá thấp (xem dead-end #2) |
| Return driver | 4.0 | `touchStreak` + freeze 1 lần/tuần (`store.ts:346-363`); `serverStreak.ts` server truth + amulet cuối tuần; daily quest reset; `LeaderboardCard` weekly | Duolingo-pattern đầy đủ. Trừ: guest không thấy leaderboard |
| Long-term progression | 1.5 | Không có map trong khối; sao không tiêu được; pet max ở 600 XP; album 20 huy hiệu hữu hạn | Xem bảng dead ends dưới |
| Difficulty ladder | 3.5 | `levels.ts:26-42` - 3 màn (nhiều câu hơn, nhanh hơn, ít tim hơn) + par-time | Đơn giản đúng lứa tuổi; nhưng màn chỉ đổi tuning, không đổi nội dung - Màn 3 của BalloonPop vẫn là listening-image-choice |
| Skill coverage | 2.5 | `skills.ts:22-46` có 11 bucket kỹ năng; Game Zone phủ được ~6; **không có game phonics nào**, không có counting, grammar chỉ có SentenceScramble | Mất đúng kỹ năng nền tảng của lứa 6-8 tuổi |

### 1.2 Dead ends - câu hỏi "rồi sao nữa?" không có câu trả lời

| # | Điểm chết | Code | Hệ quả |
|---|---|---|---|
| D1 | **Nhà của em max 2/24 món** | `GIFT_STICKER_IDS` 2 ids (`store.ts:520`); `HOME_ITEMS` 24 món; `grantHomeItem` pick từ unowned pool (`store.ts:534-552`) | Cơ chế collection đẹp nhất app chết ngay sau lần mở thứ 2; `HOME_ITEMS_CAP=64` vô nghĩa |
| D2 | **Sao không có sink** | `totalStars += stars` duy nhất (`store.ts:425`); cap mềm `STARS_PER_ROUND_CAP*40=480`/khối (`:129,:422`) | Sao chỉ là điểm số, không phải tiền - mất toàn bộ đòn bẩy "kiếm - tiết - tiêu" |
| D3 | **Pet trưởng thành xong là hết** | `PET_STAGE_XP=[0,50,250,600]` (`store.ts:1076`) = 60 câu đúng là max; `PetCard.tsx:138-141` "đã trưởng thành - cùng chinh phục tiếp" | ~2-3 tuần chơi đều là xong; không có post-adult care loop |
| D4 | **Replay game = farm sao vô hạn, nhưng không mở gì** | `recordGameResult` objective `game:<id>:L<lv>:<seed>` với seed mới mỗi lần (`store.ts:451` + `GameScreen.tsx:170-171`) | Mỗi run đúng là +sao thật (honest effort), nhưng sau 9/9 sao không còn mốc nào |
| D5 | **Speed bonus là pháo giấy** | `timeBonusFor` tính ra, `setBonus` hiển thị "+điểm nhanh" (`GameScreen.tsx:161,246`) - không lưu, không cộng sao, không đi đâu | Trẻ thấy con số rồi biến mất - hoặc phải persist, hoặc phải bỏ |
| D6 | **Game answers invisible với parent/coach** | `GameScreen.tsx:162-163` chỉ gọi `recordGameResult` + `recordCorrectAnswers` - KHÔNG gọi `recordSkillAnswer` | 20 games luyện cả ngàn câu vẫn không nuôi coach weak-skill (`coach.ts`) hay báo cáo phụ huynh; game sai cũng không vào review queue |
| D7 | **Album hữu hạn 20 sticker** | `STICKERS` (`store.ts:132-159`) | ~3 tháng chơi chăm là full; không có seasonal set |
| D8 | **"Đảo bí mật" hứa hẹn nhưng không hẹn ngày** | `GameZoneShelf.tsx:54-82` LockedCard | Đúng hướng (teaser), nhưng không gắn điều kiện mở - nên gắn vào trail (xem §3) |
| D9 | **Leaderboard thi đua solo, không có co-op** | `weekly_leaderboard` rpc (`leaderboard.ts`) | Lớp học VN rất hợp mục tiêu chung ("cả lớp cùng đạt") - hạ tầng `classes/enrollments` đã có (`classJoin.ts`) |
| D10 | **Journey map chỉ có giữa các khối** | `GradeSelect.tsx:103-130` trail + `nextId` pulse | Trong khối (nơi trẻ ở 95% thời gian) không có "đường đi" |

### 1.3 Games nào mang việc học, games nào là vỏ arcade

**Phát hiện quan trọng về hygiene:** 20 games chỉ đứng trên **5 nguồn câu
hỏi** (`sources.ts`). Đó là kiến trúc tốt (một invariant về pool), nhưng
nghĩa là 11/20 games là reskin của 2 generator MCQ:

| Nguồn | Kỹ năng thật | Games dùng | Đếm |
|---|---|---|---|
| `listeningImageRounds` | Nghe từ -> chọn hình (listening) | BalloonPop, FishingCatch, WhackMole, FeedThePig, MazeChase | 5 |
| `imageChoiceRounds` | Hình -> chọn từ (vocab reading) | RacingCars, TicTacToe, TreasureChest, CastleGuard, GoldQuest, PictureReveal, QuizShow | 7 |
| `spellableWords` | Chính tả | LetterCatch, WordWorm (+ MissingLetter qua `missingLetterRounds`) | 3 |
| `wordOrderRounds` | Ngữ pháp/cú pháp | SentenceScramble | 1 |
| `oddOneOutRounds` | Phân loại ngữ nghĩa | OddOneOut | 1 |
| `pickGameWords` | Nhận diện từ / nói | MemoryMatch, SayItLoud | 2 |
| `storiesForGrade` | Đọc/nghe hiểu | StoryTime | 1 |

=> Không game nào "thuần arcade vô học" (điểm cộng thật), nhưng **từ vựng
MCQ bị dư thừa còn phonics/spelling-nghe/counting bị thiếu** - shelf đang
cho trẻ 12 cách chơi cùng một bài từ vựng.

---

## 2. Game selection hygiene - keep / improve / cut

| Game | Kỹ năng | Nguồn | Verdict | Lý do |
|---|---|---|---|---|
| BalloonPop | Nghe->hình | `listeningImageRounds` | **Giữ** | Đầu vào nhẹ nhàng cho G1-2; trong GAME_ROUND_POOL |
| FishingCatch | Nghe->hình | same | **Giữ** | Variant grid-4 khác nhịp với balloon |
| WhackMole | Nghe->hình + timing | same + `moleUp` | **Giữ** | Duy nhất có cơ chế thời gian thật (CR-115) |
| FeedThePig | Nghe->hình | same | **Giữ + sửa art** | Tie-in mascot Bé Heo; lỗi F-09 (🐷 generic vs mascot art) |
| MazeChase | Nghe->hình + điều hướng | same | **Giữ** | Fun-factor cao nhất nhóm nghe; pac-man idiom |
| LetterCatch | Chính tả theo thứ tự | `spellableWords` | **Giữ** | Phủ skill spelling; pool đã filter `^[a-zA-Z]+$` (an toàn F1) |
| WordWorm | Chính tả + snake | `spellableWords` | **Giữ** | Cùng skill nhưng cơ chế khác hẳn (ăn chữ theo thứ tự) |
| MissingLetter | Chính tả khuyết | `missingLetterRounds` | **Giữ** | IOE-authentic (mask giữa từ); distractor-run dedupe có test |
| SentenceScramble | Cú pháp | `wordOrderRounds` | **Giữ + GUARD P0** | Game duy nhất luyện câu; **đang có thể sinh "I want to be a liar/villain"** (F3 chảy thẳng vào game) - xem G-2/G-4 |
| OddOneOut | Phân loại chủ đề | `oddOneOutRounds` | **Giữ + GUARD P0** | Duy nhất luyện semantic category; flagged words có thể làm đáp án/distractor |
| SayItLoud | Nói (mic) | `pickGameWords` | **Giữ** | Skill speaking duy nhất trong zone; scoring local `>=70` đúng doctrine (`SayItLoud.tsx:190-194`) |
| StoryTime | Đọc/nghe hiểu | `storiesForGrade` | **Giữ + sửa emoji bypass** | Duy nhất long-form; 3 truyện/khối; F-07 raw emoji |
| MemoryMatch | Nhận diện cặp từ-hình | `pickGameWords` | **Cải tiến** | "every run ends perfect" (comment `roundDefinitions.ts:48-49`) - luôn 3 sao = không có tín hiệu học. Thêm flip-budget (max flips = cặp x2.5) hoặc tính sao theo số lượt lật |
| RacingCars | Hình->từ | `imageChoiceRounds` | **Giữ** | Reskin nhưng identity rõ (đua xe), pacing tốt |
| TicTacToe | Hình->từ + chiến thuật | `imageChoiceRounds` | **Cải tiến** | Độ dài trận biến thiên (khó normalize); giới hạn 9 câu cố định thay vì đến khi thắng |
| TreasureChest | Hình->từ | `imageChoiceRounds` | **Sửa hoặc vault** | Identity yếu nhất nhóm + **lỗi vật thể F-05: 🧰 toolbox thay rương** trong khi `games/treasure-chest.webp` có sẵn. Nếu không định vị lại được thì đưa vào xoay vòng seasonal |
| GoldQuest | Hình->từ + "loot" | `imageChoiceRounds` | **Giữ + sửa art** | Blooket idiom trẻ mê; loot display-only đúng doctrine (`GoldQuest.tsx:20-24`); cũng dùng 🧰 ở :187 |
| CastleGuard | Hình->từ + waves | `imageChoiceRounds` | **Giữ** | Tower-defense idiom; mở rộng được theo trail (giữ thành từng vùng) |
| PictureReveal | Hình->từ + mở tranh | `imageChoiceRounds` | **Giữ** | Cơ chế "mở dần bức tranh" là mini-collection tự nhiên - nối được vào trail |
| QuizShow | Hình->từ + ladder | `imageChoiceRounds` | **Giữ** | G3+ only đúng chuẩn; "Ai là triệu phú" là cultural fit VN |

**Tổng kết hygiene:** giữ 18, cải tiến 2 (MemoryMatch scoring, TicTacToe
fixed-length), sửa-art 3 (TreasureChest, GoldQuest, FeedThePig), guard
nội dung 2 (SentenceScramble, OddOneOut). **Không cut game nào ngay** -
thay vào đó (a) nhóm shelf theo kỹ năng để trẻ chọn theo điểm yếu, (b)
đưa 2 reskin yếu nhất vào "xoay vòng tuần" qua `fresh`/featured rotation
sẵn có (`GameZoneShelf.tsx:96-98` daily featured đã deterministic).

---

## 3. Thiết kế gamefi - "Đường đèn lồng" (The Lantern Trail)

### 3.1 Vì sao chọn core loop này (và không chọn cái khác)

Các phương án đã cân nhắc:

- **World map mới toanh** - loại: `GradeSelect` ĐÃ là journey map (lands
  art, trail bezier, next-pulse). Làm map thứ hai song song = hai nơi
  "nhìn tiến trình", khó hiểu cho trẻ 6 tuổi.
- **House-decoration economy thuần** - loại vì đã có sẵn nhưng quá mỏng
  (D1): chỉ mua đồ không đủ kéo daily-return.
- **Pet-centric (Tamagotchi)** - mạnh nhưng pet hiện chỉ là XP bar; để làm
  trục chính phải viết lại care-loop (cho ăn, chơi, ngủ) = M-L effort và
  dễ trượt thành app-khác-trong-app.
- **✅ Lantern Trail = "journey map trong khối"** - mở rộng đúng idiom đã
  có sẵn (`trailDots` bezier + `LandArt` + next-pulse), dùng lại toàn bộ
  art đã duyệt (lands/home/pets/stickers) và toàn bộ machinery đã có
  (`grantedObjectives` idempotent, `grantHomeItem`, `GiftBoxPicker`,
  `ChestReveal`). Đây là phương án "lớn nhất về cảm giác, nhỏ nhất về
  primitive mới" - đúng triết lý codebase: một render path, một ledger,
  không currency song song (`types.ts:5-11`).

### 3.2 Spec core loop

```
Chơi batch -> mỗi batch xong = 1 trạm đèn sáng trên land art của khối
  -> mỗi 4 trạm = Hòm quà trạm (mở home item, chữa D1)
  -> đủ 12 trạm = thắp sáng cả vùng đất (celebration + huy hiệu "Người
     thắp đèn <Land>") -> mở "Vòng mới" (prestige lap)
Pet đứng canh ở trạm hiện tại; đồ chơi trong nhà hiện lên quanh đường đi.
```

| Thành phần | Spec | Tái dùng |
|---|---|---|
| Trail | 12 node/khối trên postcard land của khối đó (launchpad top hoặc tile riêng "Hành trình"), node = 1 `batch:<seed>` hoàn thành. Trạng thái: tối -> next (pulse, copy hệt `GradeSelect` `nextId`) -> sáng | `trailDots` (`GradeSelect.tsx:45`), `LandArt`, `land-*-day.webp` |
| Sao trên trạm | Mỗi node lưu best-stars của batch tương ứng (0-3, từ `starsForScore` tổng batch); trạm 3 sao = đèn vàng, <3 = đèn thường. Replay batch mới (seed mới) chiếm node tiếp theo - không farm được 1 node | `starsForScore` (`store.ts:366`), grade progress |
| Hòm quà trạm | Node 4/8/12 = rương; mở `GiftBoxPicker` cấp 1 home item từ unowned pool, objective id `trail:<grade>:<node>` idempotent như `gift:` | `grantHomeItem` (`store.ts:534`), `OBJECTIVE_RE` mở rộng thêm nhánh `trail:` (`store.ts:393`) |
| Đồ chơi lên cảnh | Home items render làm decoration cố định vị trí trên land scene (deterministic theo `hashSeed(itemId)` -> slot từ 8-10 vị trí ấn định) - "nhà của em" = chính vùng đất | `home-*.webp` (24), `LandShell` |
| Pet canh trạm | Pet art stage hiện tại perch tại node đang tới (same board-perch idiom `boardPerchContext.ts`) | `petArtUrl`, `Mascot` |
| Prestige | Hết 12 node: land "sáng đèn" (filter warm trên `LandArt` + huy hiệu `trail-<land>` sticker mới) -> trail reset lap mới (epoch counter trong `EngagementState.trail`), node tái thắp | `evaluateBadges` + STICKERS mới |
| Class co-op (P1) | "Lớp mình thắp N đèn tuần này": tổng batch-completed của class theo tuần vs mục tiêu (mặc định = 5 x số HS); đạt -> mọi member +1 sticker `class-lantern`. Đọc qua aggregate rpc kiểu `weekly_leaderboard` - KHÔNG lộ dữ liệu cá nhân | `enrollments/classes` (`classJoin.ts`), rpc pattern `leaderboard.ts` |

Vì sao loop này đúng tâm lý 6-10 tuổi (benchmark): Reading Eggs/Lingokids
map = visible path + node reward định kỳ + avatar đi cùng. Trail chuyển
"batch vô danh" thành "bước đi có địa chỉ"; chest mỗi 4 node là fixed-ratio
schedule (đoán trước được phần thưởng = hợp trẻ em, không slot-machine);
replay-to-gold-lantern biến nội dung cũ thành mục tiêu mới mà không cần
content mới.

### 3.3 Economy spec

**Nguyên tắc (khóa cứng, kế thừa doctrine hiện có):**
- Không pay-to-win, không tiền thật, không quảng cáo (app là sản phẩm trường
  học/gia đình).
- Không loot-odds cho phần thưởng thật: giữ ruling R-04 (`GiftBoxPicker`
  chỉ reveal hộp đã chọn). Mọi "chest" trên trail = uniform pick từ
  unowned pool, không rarity tier. GoldQuest-style display-only loot
  (gems trong run, không persist) là chấp nhận được và chỉ được phép ở
  mức đó.
- Sao = thước đo nỗ lực trung thực: không cap kiếm sao, nhưng leaderboard
  phải chống grind (xem dưới).

| Dòng chảy | Hiện tại | Đề xuất |
|---|---|---|
| Sao/round | 0-3 theo ratio 50/75/100 (`store.ts:366-373`) | Giữ nguyên |
| Sao/batch chest | +2 (`BATCH_CHEST_STARS`, `store.ts:130`) | Giữ nguyên |
| Sao/nhiệm vụ ngày | +3 khi đủ 3 quest (`DAILY_QUEST_BONUS`, `:586`) | Giữ nguyên |
| Sao/game run | 0-3 mỗi run, seed mới mỗi lần | Giữ nguyên (honest effort) |
| **Sink mới 1** | - | **Hòm trạm**: mỗi 4 node trail -> 1 home item (effort-gated, miễn phí). Chữa D1: 24 món / 3 món mỗi vòng trail = đúng ~8 vòng trail |
| **Sink mới 2** | - | **Cửa hàng sao** (tile "Đổi quà" trong reward hub): home item chưa sở hữu = **25 sao** (≈1 ngày chơi đều), pet accessory = **40 sao**. Trẻ TỰ CHỌN món - mua đứt, không quay số |
| **Sink mới 3** | - | **Pet accessory**: stage 4/5 mở mũ/khăn/nơ (6 item art mới); gắn `pet:<species>:acc:<n>` objectives |
| Pet XP | +10/câu đúng, stage [0,50,250,600] | Giữ rate; **nối dài `PET_STAGE_XP` -> [0,50,250,600,1500,4000]** mirror `PLAYER_LEVEL_XP` (`store.ts:1037`) - stage 4 "Anh hùng", 5 "Huyền thoại" (tên trùng `PLAYER_LEVEL_NAMES` cho 1 hệ danh) |
| Player XP | +10/câu, 4 rank | Giữ nguyên |
| Sticker sources | 20 badges hiện có | +12 mới: `trail-half-<land>` (6 trạm) x5 land, `trail-full-<land>` x5, `class-lantern` x1, `game-master` (3 sao cả 3 màn của 10 game) x1 |
| **Daily cap - chống grind** | Chưa có | Leaderboard `weekly_points` chỉ tính **50 câu đầu/ngày** (server-side, trong rpc hoặc telemetry filter). Sao cá nhân vẫn đếm thoải mái - cap nhắm vào công bằng thi đua + khuyến nghị screen-time, không phạt nỗ lực |
| Session pacing | Quest xong -> "Hẹn bạn ngày mai" | Giữ; thêm (P2) "Giờ nghỉ" soft banner sau 30 phút play liên tục, parent toggle |

Số liệu sanity-check: 1 batch ≈ 40 câu ≈ 8-10 phút → 12 node ≈ 2 tuần chơi
mỗi ngày 1 batch = đúng nhịp "một vùng đất mỗi nửa tháng", 5 vùng ≈ một
học kỳ - khớp chu trình SGK.

### 3.4 Ba game mới - chỉ chọn content đã an toàn

**G-NEW-1: "Cửa hàng của Heo" (Counting Shop)** - *counting + số*
- Loop: Heo bán hàng - tranh `counting/g<N>/<item>-<K>-*.webp` hiện K vật;
  trẻ đếm rồi chọn từ số (one..twenty) hoặc chọn đúng giá. Level 2-3: hai
  khay hàng, đếm tổng.
- An toàn vì thiết kế: đáp án nằm trong ảnh do pipeline kiểm soát (không
  phụ thuộc tính countability của từ - né hẳn bẫy scissors/pants mà
  generator phải guard). Pool = manifest count-* (100 file, g1-g5 chia
  sẵn) - **chữa luôn designer F-04**: 2.9MB art đang chết.
- Source mới: `countingRounds(gradeId, seed, n)` đọc manifest từ
  `asset_paths`/filename convention; distractor = số ±1, ±2 (misconception
  count-off-by-one). Effort: **M**.
- Kỹ năng phủ mới: number vocabulary - kỹ năng hiện không game nào đụng.

**G-NEW-2: "Ao vần" (Rhyme Pond)** - *phonics, kỹ năng đang trống hoàn toàn*
- Loop: ếch Heo nghe mẫu "cat" (TTS) -> 4 lá sen mang từ+art -> chọn từ
  cùng vần ("hat"). Level 2: cùng âm đầu. Level 3: âm cuối.
- Pool: **chỉ rhyme families trong `rhymes.ts`** (thiết kế `solo:` đã được
  teacher audit khen "elegant and correct") + `initialSounds` exceptions
  (được duy trì tốt: chef->sh, write->r). **Cấm tuyệt đối blend/final
  questions** cho tới khi F4 (`BLEND_EXCEPTIONS` đang rỗng -
  `blends.ts:49`) và F5 (`finalSounds.ts:107-110`, PE->'e') được vá:
  một game phonics sai là tệ hơn không có game phonics.
- Effort: **M** (mới source + EmojiChoiceField reuse + art games/ có sẵn
  hoặc 1 file mới).

**G-NEW-3: "Chuyến tàu cờ" (Flag Voyage)** - *geography listening, G4-5*
- Loop: tàu dừng từng bến - nghe "I am from ___" -> chọn lá cờ đúng
  (flag Twemoji ở size lớn, hoặc stamp art). Thu thập "con dấu hộ chiếu"
  mỗi nước = mini-album.
- **GATE CỨNG - chỉ ship sau khi teacher fixes F6/F7/F8**: `european-union`
  reclass (F6), britain/england gloss tách nghĩa (F7), retitle topic kiểu
  `g5-xp-flags-oceania` "Quốc gia và vùng lãnh thổ" + gloss Taiwan/HK/
  Macau thành "vùng" (F8, nhạy cảm chính trị VN). Flag Voyage là game duy
  nhất được phép vẽ cờ.
- Source: `flagPool(gradeId)` RIÊNG, bypass `isFlagEmoji` (pool hiện tại
  chặn cờ - giữ nguyên cho mọi game khác). Effort: **M-L** (kèm review
  nội dung + danh sách allow quốc gia).

### 3.5 Art plan (bám designer F-xx, không tự ý mở hướng mới)

1. **F-05/F-09 wrong-object (P0):** `TreasureChest.tsx:114` 🧰 ->
   `games/treasure-chest.webp` (file đã tồn tại); `GoldQuest.tsx:187` 🧰
   -> cùng art hoặc `IconChest` (DESIGN_SYSTEM §15: reward chrome = SVG
   deterministic); `defs.ts:95` emoji '🧰' -> '💰'. `FeedThePig.tsx:105`
   🐷 -> `mascot/be-heo-*` pose (idle -> ăn -> mừng).
2. **F-03 all-or-nothing (P0):** hoist option-art resolve lên field level:
   `EmojiChoiceField` (`mechanics.tsx:88-90`) + `OddOneOut.tsx:91` áp rule
   "cả 4 có art hoặc cả 4 emoji" như `ListeningImageChoiceQuestion`.
3. **F-04 counting art (P1 kèm G-NEW-1):** wire `counting/` vào game mới
   + options của `CountingImageQuestion`.
4. **F-07 emoji bypass trong games (P1):** `StoryTime.tsx:251`,
   `PetCard.tsx:29` fallback -> `EmojiVisual`.
5. **5 game thiếu `artImage` (P1):** missing-letter, sentence-scramble,
   odd-one-out, say-it-loud, story-time (`defs.ts:150-194`) - chỉ có emoji
   diorama trong khi 15 game kia có card art. Commission theo đúng
   `games/*.webp` pipeline (kawaii family).
6. **Trail art (P1):** không cần asset mới vòng 1 - reuse land art (đã có
   day variant), node = `IconStar`/lantern SVG (deterministic chrome),
   pet perch = pet webp sẵn có. Vòng 2 (seasonal) mới cần artgen.
7. **Pet accessory (P2):** ~6 item nhỏ (mũ, nơ, khăn) - artgen cùng family
   `pets/*.webp` 256px.

### 3.6 Content-guard rules (bắt buộc, viết dưới dạng enforce được)

| # | Rule | Enforcement |
|---|---|---|
| G-1 | Game source chỉ đọc `getWordsByGrade` (bank TS curated local). **Cấm** mọi `qb_questions` row: `review_status` mặc định `'pending'` (migration `0013:98`) và bank có "pending question" = chưa có key (`bank.ts:275-281`) - câu hỏi không đáp án chuẩn không bao giờ được vào sân chơi | Review checklist + comment block trong `sources.ts`; nếu tương lai cần bank row: bắt buộc `review_status='approved'` AND có key |
| G-2 | **`GAME_BLOCKED_WORDS` mới trong `sources.ts`**, áp ngay trong `gameWordPool`: `['liar','villain','crazy','woozy','kiss','santa-claus','lip','ok-badge','new-badge','free-badge','vs-badge','thumbs-up','tick','good-luck']` (toàn bộ cluster F3/F9/F10 của teacher). Mỗi entry có comment trỏ finding; gỡ dần khi fix upstream | 1 const + filter + vitest: `gameWordPool` không chứa id nào trong list |
| G-3 | Typing-adjacent giữ `^[a-z]+$` | Đã có (`spellableWords` `:72`) - thêm test pinata/aland không vào spelling pool |
| G-4 | Game sinh câu (SentenceScramble) không được phát âm thanh/câu từ word trong G-2 - phủ luôn "I want to be a liar" | Test: `wordOrderRounds` trả về 0 round chứa 'liar'/'villain'/'european-union'/'infinity' |
| G-5 | Flag/country words: giữ exclusion toàn cục (`isFlagEmoji`); Flag Voyage là surface duy nhất đọc `flagPool`, sau gate F6-F8 | `flagPool` riêng + test flags không lọt `gameWordPool` (đã implicitly true, pin lại) |
| G-6 | Phonics game chỉ đụng `rhymes.ts` + `initialSounds` exceptions; blends/finals gated trên việc `BLEND_EXCEPTIONS` (`blends.ts:49`) và fix `pe`/`x-ray`/`karate` (`finalSounds.ts:107-110`) | Ao vần không import `blends.ts`/`finalSounds.ts`; dependency guard test |
| G-7 | Option art all-or-nothing; game def mới bắt buộc `artImage`; cấm emoji-bypass literal trên kid surface | Test registry: mọi `GAME_DEFS` có `artImage`; review checklist F-07 |

---

## 4. Prioritized roadmap

### P0 - chặn lỗi trước đã (content guard + wrong-object art)
| # | Việc | Effort |
|---|---|---|
| P0-1 | `GAME_BLOCKED_WORDS` trong `sources.ts` + test (diệt liar/villain/badges/crazy khỏi mọi game, gồm câu "I want to be a liar" trong SentenceScramble) | **S** |
| P0-2 | TreasureChest 🧰 + GoldQuest 🧰 + `defs.ts:95` -> `games/treasure-chest.webp`/`IconChest` (F-05) | **S** |
| P0-3 | FeedThePig 🐷 -> `be-heo` mascot art (F-09) | **S** |
| P0-4 | All-or-nothing option art cho `EmojiChoiceField` + `OddOneOut` (F-03) | **S** |
| P0-5 | Pin tests: pool không chứa flag-emoji, piñata/Åland không vào spellable pool | **S** |

### P1 - nâng cấp loop (theo thứ tự giá trị)
| # | Việc | Effort |
|---|---|---|
| P1-1 | Lantern Trail v1: state `trail` trong EngagementState + trail UI trên launchpad khối + node states + hòm quà mỗi 4 node (`trail:` objectives + `grantHomeItem`) | **L** |
| P1-2 | Cửa hàng sao: đổi sao lấy home item còn thiếu (25★) - mở sink đầu tiên cho `totalStars` | **M** |
| P1-3 | Home items render lên land scene (deterministic slots) + HomeShelf link | **M** |
| P1-4 | Ghi `recordSkillAnswer` cho game answers (skill key theo game) + game-wrong -> review queue bridge (chữa D6 - parent/coach nhìn thấy luyện game) | **S-M** |
| P1-5 | Pet stage 4-5 (nối `PET_STAGE_XP`) + text/copy stage names | **S** |
| P1-6 | Shelf nhóm theo kỹ năng (Nghe/Chính tả/Từ vựng/Nói/Đọc) + badge "điểm yếu của em" link từ coach | **M** |
| P1-7 | MemoryMatch flip-budget scoring; TicTacToe fixed 9-câu | **S** |
| P1-8 | Class co-op "thắp đèn cả lớp" weekly goal (rpc aggregate) | **L** |
| P1-9 | Speed bonus: persist vào gameBest hoặc bỏ khỏi UI (D5) | **S** |
| P1-10 | 5 `artImage` còn thiếu cho game cards (artgen) + StoryTime/PetCard emoji bypass (F-07) | **M** |

### P2 - game mới + mở rộng
| # | Việc | Effort | Điều kiện |
|---|---|---|---|
| P2-1 | "Cửa hàng của Heo" counting game + wire `counting/` art | **M** | - |
| P2-2 | "Ao vần" rhyme game (rhymes.ts + initialSounds only) | **M** | KHÔNG dùng blends/finals cho tới khi F4/F5 vá |
| P2-3 | "Chuyến tàu cờ" flag game + `flagPool` + danh sách quốc gia allow | **M-L** | Sau teacher fixes F6/F7/F8 |
| P2-4 | "Đảo bí mật" thành đích thật: mở khi trail đầu xong (game mới hoặc land phụ) | **S** | sau P1-1 |
| P2-5 | Seasonal trail variants + prestige lap art | **L** | sau P1-1 |
| P2-6 | "Giờ nghỉ" screen-time banner + parent toggle | **S-M** | - |

---

## 5. Method note / Lưu ý phương pháp

- Mọi claim đối chiếu line number trên `main` tại thời điểm viết.
- Không đề xuất currency mới: sao/XP/sticker/home-item/pet-XP đủ 5 đơn vị;
  Lantern Trail chỉ nối chúng lại thành loop. Đúng hợp đồng `types.ts:10`
  ("games never mint a parallel currency").
- Hai finding nội dung của teacher (F3 liar/villain, F9 badges) được chứng
  minh là **lan sang game layer** - đây là phát hiện mới của review này,
  không trùng audit gốc.
- Thiết kế tôn trọng các doctrine đã có trong repo: clean-play (sao chỉ
  từ độ đúng, speed bonus tách riêng), no loot-box FOMO (R-04), reward
  chrome SVG deterministic (DESIGN_SYSTEM §15), seeded deterministic
  content (mọi pick qua `seededPickN`/`hashString`).
