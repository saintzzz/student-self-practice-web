# Discovery Baseline (brownfield) - as-is spec

Ngày audit: 2026-09-29. Nguồn: đọc trực tiếp code, không suy đoán.

## Stack & infra

- React 18.3 + Vite 5 + TypeScript 5.5 + Tailwind 3.4; vitest 2 + testing-library
  + Playwright (e2e/). Không backend, không env var, deploy target Vercel static.
- Build: `npm run build` (tsc -b + vite build). Test: `npm test`, `npm run test:e2e`.

## Data model hiện tại (src/types/index.ts)

- `VocabWord`: `{ id, topicId, word, plural?, emoji, explanation, countable }`.
  `emoji` là single Unicode char; ~300 từ / **24 topic** / **chỉ grade-2**
  (`GRADES` = `[{id:'grade-2'}]` - index.ts:28, MVP chỉ 1 khối lớp).
- 9 `QuestionKind` có generator trong `src/lib/generators/`; question mang
  `emoji` (image-choice) hoặc `CountingImageOption{word,plural,emoji,count}`
  (counting, describe) hoặc `tiles[].label` (pair-matching) hoặc
  `options: string[4]` chứa emoji (listening-image-choice).

## Điểm render emoji (DOM contract hiện tại)

| File | Cách render | Test đang assert |
|------|-------------|------------------|
| `ImageChoiceQuestion.tsx:21` | `{question.emoji}` text-8xl | `getByText('🐱')` |
| `ListeningImageChoiceQuestion.tsx:54` | `{emoji}` trong option button | textContent emoji |
| `CountingImageQuestion.tsx:15` | `option.emoji.repeat(count)` | `getByText('🐱🐱🐱')`, `toHaveTextContent` |
| `DescribeAndChooseImageQuestion.tsx:15` | `option.emoji.repeat(count)` | tương tự |
| `PicturePairMatchingQuestion.tsx:87` | `tile.label` (emoji) trong button | tile label = emoji |
| `Mascot.tsx` | 🐷 + accent (✨/🎉) + CSS keyframes | `data-testid="mascot"`, `data-mascot-mood` |
| `FeedbackPanel`, `RoundSummary`, `BatchSummary` | Mascot component + text | xem từng test |

=> Toàn bộ "hình ảnh" là native Unicode emoji glyph - render phụ thuộc font OS
(Windows Segoe UI Emoji vs Noto vs Apple), không nhất quán, không động.

## Debt & risk register

1. **D1 - Emoji cross-platform inconsistency** (đích của feature này).
2. **D2 - plan.md được reference trong comments nhưng không có trong repo** -
   spec sống trong git history; bổ sung docs/sdlc làm nơi chứa artifact.
3. **D3 - Không có attribution/credits** - khi thêm asset CC-BY phải thêm.
4. **D4 - Emoji render trực tiếp rải 6 chỗ** - không có component chung; đây
   là điểm chèn cho EmojiVisual.
5. **D5 - `dist/` trong gitignore ok; không có CI config** - verify local + e2e
   là gate chính trước deploy.

## Strategy ruling

**Ruling: strangler-fig incremental, KHÔNG rewrite.** Bằng chứng: (a) render
layer cô lập khỏi generators - đổi `VocabWord.emoji: string` giữ nguyên, thêm
field mới optional; (b) 6 điểm render gom về 1 component `EmojiVisual`;
(c) mọi test hiện có giữ được nếu giữ text layer - rủi ro thấp, từng bước
verify được. Rewrite sẽ vô ích vì data model đã đúng.

## Data reality audit

- 24 file topic trong `src/data/vocabulary/`, mỗi file export `TOPIC` +
  `WORDS`. index.ts gom + export GRADES (chỉ `grade-2`). Không DB; từ vựng là
  source-of-truth dạng code - "data audit" = index.test.ts assert: emoji
  non-empty, explanation non-empty, word id unique **toàn cục**, emoji unique
  **trong từng topic** (không global), countable => có plural, không em-dash,
  mỗi topic >=4 từ (ngoại lệ có chủ đích: `g2-places` chỉ 3 từ
  house/beach/street - image-choice không generate được cho topic này).
- Baseline test run 2026-09-29 (vitest, jsdom): 1 FAIL có sẵn -
  `PronunciationRecordingQuestion > renders mic-permission-denied-message`
  (mock getUserMedia không reject đúng trong jsdom; component hiển thị trạng
  thái recording thay vì denied). Pre-existing, không liên quan feature này.
  Mọi file test khác pass.
