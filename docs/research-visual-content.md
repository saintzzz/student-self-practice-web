# Deep Research: Bài học + Hình ảnh + Ảnh động cho học sinh lớp 2

Phạm vi: app luyện từ vựng tiếng Anh (React/Vite/Tailwind), đối tượng chính là học
sinh lớp 2 Việt Nam (~7-8 tuổi). Ngày nghiên cứu: 2026-09-29.

---

## 1. Hiện trạng app

- 23 topic từ vựng (`src/data/vocabulary/`), mỗi `VocabWord` có `word`, `plural`,
  `emoji`, `explanation` (tiếng Việt), `countable`.
- "Hình ảnh" hiện tại = **Unicode emoji** render bằng text (`text-8xl`,
  `ImageChoiceQuestion.tsx`). Điểm yếu lớn: emoji render **không nhất quán giữa
  các nền tảng** — Windows dùng Segoe UI Emoji, Android dùng Noto, iOS dùng Apple
  Color Emoji. Cùng 🐱 nhưng trông khác nhau, có emoji nét mờ/không có trên máy
  cũ. Đây là lý do chính cần thay bằng asset hình kiểm soát được.
- 9 loại câu hỏi đã có: image-choice, counting-image, listening-fill-blank,
  listening-sentence-fill-blank, listening-image-choice, describe-and-choose-image,
  extra-letter, pronunciation-recording, picture-pair-matching.
- Đã có TTS (speech.ts), SpeechRecognition (pronunciation), Mascot component.

---

## 2. Chuẩn nội dung bài học chất lượng

### 2.1 Cambridge Pre-A1 Starters (chuẩn quốc tế phù hợp nhất lứa tuổi này)

- Wordlist chính thức **495 từ**, chia ~19 nhóm chủ đề: Animals (32), Clothes (18),
  Colors (12), Family & Friends (24), Food & Drink (41), Numbers (20),
  Places & Directions (13), School (40), Sports & Leisure (48), Body & Face (13),
  The Home (33), Toys (11), Transport, Weather, Time...
- Tài liệu nguồn:
  - Wordlist PDF: cambridgeenglish.org/Images/wordlists-pre-a1-starters-a1-movers-and-a2-flyers.pdf
  - Picture Book (minh họa từ vựng theo chủ đề, đúng format app mình): cambridgeenglish.org/images/starters-word-list-picture-book.pdf
  - Bản tra cứu có audio + ví dụ: flyersenglish.com/wordlist/starters
- Nhận xét: 23 topic hiện có của app **khớp rất tốt** với Starters (animals, body
  parts, clothes, colors, family, food, fruits, furniture, numbers, occupations,
  places, school objects, shapes, sports, toys, transportation, weather...).

### 2.2 SGK Tiếng Anh lớp 2 – chương trình GDPT 2018 (bám sát nhà trường VN)

Cả 3 bộ sách (Kết Nối Tri Thức / Global Success, Family and Friends National
Edition, Cánh Diều "Explore Our World") đều có **16 unit** xoay quanh hoạt động
hằng ngày. Khung unit của bộ NXBGD (tham chiếu chung):

| Unit | Chủ đề | Topic app tương ứng |
|------|--------|---------------------|
| 1 | At my birthday party | food, toys, (thiếu: balloon, candle, cake, gift) |
| 2 | In the backyard | nature, insects |
| 3 | At the seaside | seaCreatures, (thiếu: sand, shell, wave) |
| 4 | In the countryside | nature (rainbow, river, road đã thuộc phonics R) |
| 5 | In the classroom | schoolObjects |
| 6 | On the farm | animals |
| 7 | In the kitchen | furniture, food (thiếu đồ bếp: pot, pan, stove) |
| 8 | In the village | places |
| 9 | In the grocery store | food, vegetables, fruits |
| 10 | At the zoo | animals |
| 11 | In the playground | sports, toys, actions |
| 12 | At the café | food, drinks |
| 13 | In the maths class | numbers, shapes |
| 14 | At home | family, furniture |
| 15 | In the clothes shop | clothes |
| 16 | At the campsite | nature, (thiếu: tent, campfire, backpack) |

Đặc điểm SGK lớp 2 cần học theo:
- Mỗi unit gắn **1 âm phonics** (p → popcorn/pasta/pizza; k → kite/bike/kitten;
  r → rainbow/river/road...). App chưa có dimension phonics — đây là hướng mở
  rộng bài học rất tự nhiên (liên kết với extra-letter round).
- Mỗi unit có **mẫu câu giao tiếp** ("Is she flying a kite? – Yes, she is./No,
  she isn't", "Is there a fox? – Yes, there is."). Các câu này làm nguồn trực
  tiếp cho round listening-sentence-fill-blank và describe-and-choose-image.
- Học qua chant/bài hát/câu chuyện → ứng với TTS + ảnh động trong app.

### 2.3 Gap analysis – từ/chủ đề nên bổ sung

Theo Starters + SGK lớp 2, các nhóm còn thiếu hoặc mỏng:

- **Birthday/party**: balloon, cake, candle, present/gift, party, birthday
- **Seaside**: beach, sand, shell, sea, sun, wave, swim
- **Camping/outdoor**: tent, campfire, backpack, torch/flashlight
- **Kitchen**: cup, plate, bowl, spoon, fork, knife, pot, fridge, stove
- **Playground actions**: swing, slide, climb, run, jump, kick, throw, catch
  (topic `actions` đã có — kiểm tra coverage với Starters verbs)
- **Feelings mở rộng** cho mẫu câu "Are you happy?" (SGK FnF unit 2)
- **Phonics words theo chữ cái mở đầu** — cấu trúc dữ liệu nên có trường
  `initialSound` hoặc map word → phonics letter.

---

## 3. Hình ảnh chất lượng – so sánh nguồn

| Nguồn | License | Dạng | API/Bundle | Đánh giá cho app |
|-------|---------|------|-----------|------------------|
| **Twemoji** (twitter/twemoji) | CC-BY 4.0 | SVG + PNG 72px | npm `svg-emojis`, CDN jsdelivr | ⭐ Fix ngay vấn đề emoji không nhất quán; giữ nguyên data `emoji` hiện có, chỉ đổi render. Cần credit "Twemoji CC-BY 4.0". |
| **OpenMoji** | CC BY-SA 4.0 | SVG + PNG 618px | CDN, npm | Tương tự Twemoji, style phẳng hiện đại; license SA cần lưu ý. |
| **Noto Emoji static** | OFL-1.1 | SVG/PNG | github googlefonts/noto-emoji | License thoáng nhất; style quen thuộc Android. |
| **Pixabay** | Pixabay Content License | Ảnh thật + illustration | REST API miễn phí (cần key), `safesearch=true`, có category | ⭐ Tốt cho ảnh thật (con vật, đồ vật). Phải ghi nguồn Pixabay khi dùng API. Nên **curate + tải về local** thay vì hotlink. |
| **Openverse** | CC (lọc theo cc0/by/...) | Ảnh từ Wikimedia/Flickr/Met/Smithsonian | API miễn phí | Nguồn ảnh thật chất lượng cao; phải check từng license, giữ attribution metadata. |
| **Storyset** (Freepik) | Free + **bắt buộc attribution** (hoặc Flaticon Premium) | Illustration **có thể animate online** rồi export | Web editor | ⭐ Rất hợp minh họa cảnh/mascot: chỉnh màu, animate sẵn. Free tier cần credit. |
| **Freepik/Flaticon** | Attribution required (free) | Icon/illustration | API có | Kho lớn nhất; nếu scale lên nên cân nhắc Premium để khỏi attribution từng ảnh. |
| **Microsoft Fluent Emoji** | MIT (static) — ⚠️ **bản animated là Personal-Use-Only** | SVG | github | Static dùng được; **KHÔNG dùng repo "Animated Fluent Emojis"** (license trap). |
| **Super Simple flashcards** | Free cho giáo viên/lớp học in ấn | PDF flashcard | Download | Chỉ để tham khảo style, **không redistribute asset** trong app. |
| AI-generated (mỗi từ 1 ảnh) | Tùy tool | PNG/WebP | Pipeline script | Khó giữ style nhất quán qua ~500 từ; nếu dùng phải khóa 1 style guide + review tay. |

### Khuyến nghị hình ảnh

1. **Ngắn hạn (đổi ít code nhất)**: giữ field `emoji` trong data, render qua
   **Twemoji/OpenMoji SVG** → nhất quán mọi thiết bị, nét ở mọi size, có thể
   repeat emoji cho counting-image như hiện nay.
2. **Trung hạn**: thêm field `imageUrl?` vào `VocabWord`, xây **curated image
   bank** trong `public/images/vocab/{word}.webp` lấy từ Pixabay/Openverse
   (kèm file `attribution.json` ghi license + author + source URL từng ảnh).
   Ưu tiên illustration cùng 1 style hơn trộn photo + cartoon (trẻ nhỏ nhận diện
   tốt hơn khi style thống nhất — xem mục 5).
3. Kích thước: export ~512px, format WebP/AVIF, lazy-load; mỗi option trong
   image-choice là 1 `<img>` thay vì emoji text.

---

## 4. Ảnh động – nguồn và cách tích hợp

| Nguồn | License | Format | Kích thước | Dùng cho |
|-------|---------|--------|-----------|----------|
| **Google Noto Animated Emoji** | CC-BY 4.0 | **Lottie JSON** | ~36-66 KB/cái (nhẹ hơn GIF ~20x) | ⭐⭐ Upgrade trực tiếp: 714+ emoji động — mèo vẫy tail, sao lấp lánh... map 1-1 với field `emoji` hiện có. Tải từ `fonts.gstatic.com/s/e/notoemoji/latest/{codepoint}/lottie.json` hoặc browse tại googlefonts.github.io/noto-emoji-animation. Đây là **bộ emoji động redistributable duy nhất** hiện nay. |
| **LottieFiles free library** | Lottie Simple License | Lottie/dotLottie | vài chục KB | Mascot animation, celebration/reward (confetti, star, trophy), empty state. |
| **Storyset animations** | Attribution | GIF/MP4/Lottie sau khi animate online | vừa | Min họa cảnh động cho màn hình chọn bài/summary. |
| **GIPHY API** | Platform terms; cần API key, call client-side | GIF | nặng (~200KB-1MB) | Chỉ nên dùng cho reward GIF, luôn set `rating=g`; phụ thuộc network + key → không ưu tiên. |
| **CSS/Tailwind animation** | — | — | 0 KB | Micro-feedback: bounce khi đúng, shake khi sai, pulse nút. Tailwind có sẵn `animate-bounce/pulse/ping`, custom keyframes cho wiggle. |

### Tích hợp kỹ thuật vào codebase hiện tại

- Player React: `@lottiefiles/dotlottie-react` (React ≥16.8, chính chủ
  LottieFiles): `<DotLottieReact src="...lottie" loop autoplay />`.
- Đề xuất kiến trúc data:
  ```ts
  interface VocabWord {
    ...
    emoji: string;             // giữ làm fallback + counting logic
    animatedEmoji?: string;    // path tới /lottie/{codepoint}.json
    imageUrl?: string;         // ảnh tĩnh chất lượng cao nếu có
  }
  ```
- Component mới `AnimatedEmoji` (hoặc `EmojiPicture`): nếu có `animatedEmoji` →
  render dotLottie; nếu không → Twemoji SVG; cuối cùng mới fallback native emoji.
- Asset pipeline: script Node tải Noto animated lottie theo codepoint cho tất cả
  emoji đang dùng trong vocabulary (cách lấy codepoint: `[...emoji].map(c =>
  c.codePointAt(0).toString(16))`, bỏ variation selector FE0F). Lưu vào
  `public/lottie/` để Vite serve tĩnh, preload on-demand.
- **Dùng ảnh động đúng chỗ** (xem mục 5): động cho prompt/mascot/reward; các
  option câu hỏi nên tĩnh hoặc chỉ animate khi hover/chọn để tránh nhiễu.
- Performance: dotLottie hỗ trợ nén; lazy import player (`React.lazy`) vì player
  ~100KB; counting-image lặp 4-8 lần cùng emoji → cache/clone được.

---

## 5. Nguyên tắc thiết kế hình ảnh cho trẻ 7-8 tuổi (tổng hợp nghiên cứu)

Từ các nghiên cứu về interaction design app giáo dục 0-8 tuổi và multimedia
learning:

1. **Đơn giản tối đa**: màn hình chỉ giữ element cần cho nhiệm vụ — app hiện đã
   tốt ở điểm này, giữ nguyên khi thêm ảnh/animation (không thêm decoration).
2. **Nhất quán style**: 1 style duy nhất cho toàn bộ hình từ vựng (toàn
   illustration hoặc toàn emoji set) — trộn photo + cartoon + emoji làm trẻ mất
   focus vào đối tượng cần học.
3. **Contrast & kích thước**: hình lớn (≥96px hiển thị), nền/nét tương phản rõ;
   nút chạm lớn.
4. **Highlight active element**: đáp án/nút đang tương tác cần highlight rõ
   (đã có qua optionButtonStyle — giữ).
5. **Animation có chủ đích**: chuyển động liên tục gây phân tán; dùng cho
   (a) phản hồi đúng/sai, (b) mascot, (c) reward cuối round/batch, (d) hint
   attention vào prompt. Option trong câu hỏi trắc nghiệm nên tĩnh.
6. **Hình phải "đọc được" bằng 1 cái nhìn**: 1 từ = 1 hình không nhập nhằng
   (giữ nguyên ràng buộc "single clear emoji" đang áp cho vocab bank; khi chuyển
   sang ảnh thật cần review tay từng ảnh — tránh ảnh nhiều đối tượng).
7. **Seductive details**: hình đẹp nhưng không liên quan từ vựng làm giảm học —
   mọi asset phải phục vụ đúng từ đang học.

---

## 6. Lộ trình đề xuất (input cho pipeline khi triển khai)

| Phase | Nội dung | Effort | Impact |
|-------|----------|--------|--------|
| P0 | Render emoji qua Twemoji/OpenMoji SVG component `EmojiPicture` | Nhỏ | Fix nhất quán cross-platform ngay |
| P1 | Bundle Noto Animated Emoji (Lottie) cho emoji có trong vocab; component `AnimatedEmoji` + fallback chain | Vừa | "Ảnh động" cho mọi từ vựng, đúng yêu cầu |
| P1 | Bổ sung từ vựng theo gap analysis mục 2.3 (party, seaside, kitchen, camping, playground actions) | Vừa | Bám SGK lớp 2 + Starters |
| P2 | Curated image bank (Pixabay/Openverse) + `imageUrl` + `attribution.json` | Vừa-Lớn | Hình chất lượng thật thay emoji |
| P2 | Lottie mascot + celebration animation (LottieFiles free) cho FeedbackPanel/RoundSummary/BatchSummary | Vừa | Động lực học, reward loop |
| P3 | Phonics dimension (`initialSound`, round mới hoặc mở rộng extra-letter) | Lớn | Bám cấu trúc bài học SGK |
| P3 | GIPHY rating=g reward GIFs (optional, nếu muốn variety) | Nhỏ | Nice-to-have |

Tuân thủ attribution: CC-BY 4.0 (Twemoji, Noto animated) và Storyset đều yêu cầu
ghi credit → thêm màn "About/Credits" hoặc footer link.

---

## 7. Nguồn tham khảo

- Cambridge wordlists: https://www.cambridgeenglish.org/Images/wordlists-pre-a1-starters-a1-movers-and-a2-flyers.pdf
- Starters picture book: https://www.cambridgeenglish.org/images/starters-word-list-picture-book.pdf
- Starters wordlist có audio/ví dụ: https://flyersenglish.com/wordlist/starters
- SGK Tiếng Anh 2 (NXBGD): https://nxbgd.vn/bai-viet/gioi-thieu-sach-giao-khoa-tieng-anh-2
- Khung 16 unit lớp 2: https://tse-tesol.edu.vn/chuong-trinh-day-hoc-tieng-anh-lop-2/
- Pixabay API: https://pixabay.com/api/docs/ (param `safesearch=true`, categories)
- Openverse API: https://api.openverse.org/ (lọc license cc0/by)
- Storyset: https://storyset.com/children, https://storyset.com/elearning (attribution required)
- Noto Animated Emoji: https://googlefonts.github.io/noto-emoji-animation/ (CC-BY 4.0, Lottie)
- Noto emoji static: https://github.com/googlefonts/noto-emoji (OFL-1.1)
- Twemoji: https://github.com/twitter/twemoji (CC-BY 4.0) / OpenMoji: https://openmoji.org (CC BY-SA 4.0)
- svg-emojis CDN: https://www.npmjs.com/package/svg-emojis
- dotLottie React: https://docs.lottiefiles.com/en/runtimes/distributions/react/
- LottieFiles free animations: https://lottiefiles.com/free-animations
- GIPHY API content rating: https://developers.giphy.com/docs/optional-settings/ (`rating=g`)
- License trap cảnh báo: "Animated Fluent Emoji" repo = Personal Use Only (không dùng)
- Nghiên cứu interaction design app 0-8 tuổi: https://www.scipedia.com/wd/images/1/15/Draft_Content_291437569-44290.pdf
