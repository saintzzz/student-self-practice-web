# Performance Audit - English Arena

Ngày đo: 2026-10-04. Môi trường: production build (`vite build` + `vite
preview`), Playwright trên Chromium, Supabase project
`cxjpgfhqchjoernfmcra` qua mạng thật.

## Phương pháp

- Navigation Timing + Paint Timing API cho page load.
- Resource Timing cho từng asset/RPC call.
- JS harness đo wall-time từ click đến câu hỏi đầu render (đường network
  thật tới Supabase, không phải localhost).

## Kết quả đo

### Page load (localhost - số floor, không đại diện mạng thật)

| Metric | Giá trị |
|---|---|
| TTFB | 5ms |
| First Paint | 176ms |
| First Contentful Paint | 260ms |
| DOM Complete / Load | 200ms |

### Bundle (production, gzip)

| Asset | Kích thước | Ghi chú |
|---|---:|---|
| `index-*.js` (main) | 620 kB (196 kB gz) | ⚠ vượt ngưỡng 500kB - chứa bundled banks đã "retire" (`vioMathBank` 157kB src, `ioeRealBank` 119kB src) chỉ còn dùng cho arena/offline |
| `index-*.js` (supabase chunk) | 228 kB (59 kB gz) | lazy chunk - đúng thiết kế |
| `EmojiLottiePlayer` | 171 kB (35 kB gz) | lazy |
| `dotlottie-player.wasm` | 1.24 MB | lazy, nặng cho first mascot render trên mạng chậm |
| CSS | 79 kB (12 kB gz) | |
| 6× woff2 fonts | ~60 kB | preloaded qua CSS |

### Interaction - vào bài luyện (network thật)

| Hành động | Trước fix | Sau fix |
|---|---:|---:|
| Chọn lớp → màn drill | ~50ms | ~50ms |
| Drill → intro | ~50ms | ~50ms |
| **Bắt đầu → câu 1 render (guest)** | ~600-900ms + **~600ms lãng phí** call `fetch_questions` chắc chắn 401 | **~1.0s** (1 RPC duy nhất `fetch_questions_public` ~950ms) |
| Bắt đầu → câu 1 render (logged-in) | - | **~913ms** (1 RPC `fetch_questions` ~332ms + render) |
| Retry "Luyện lại" | ~600ms | ~300-600ms |
| RPC `fetch_questions` (auth) | ~600ms | ~332ms - chỉ gọi khi có session |
| RPC `fetch_questions_public` | 200-950ms | |
| Journey map RPCs (logged-in) | - | `weekly_leaderboard` 459ms, `arena_open` 806ms, `arena_recent` 946ms - song song nhưng nặng ~1s tổng |

### Anomaly quan sát

Một lần đo guest flow cho `first_question ≈ 98s` dù RPC chỉ ~2s tổng -
không tái hiện được trong các lần chạy sau. Khả năng cao là stall ở
`supabase.auth.getSession()` (navigator.locks contention) hoặc cold
start. Ứng dụng đã có fallback/loadError nên không mất dữ liệu. **Watch
item**: nếu tái phát, cân nhắc timeout + retry rõ ràng cho bank fetch.

## Fix đã áp dụng (CR-52b - cùng đợt)

`fetchBankQuestions` check `getSession()` (local, cached) trước: guest
gọi thẳng `fetch_questions_public`, bỏ qua call `fetch_questions` chắc
chắn 401. Mỗi lần guest bắt đầu luyện đề/thi thử tiết kiệm **~600ms +
1 request**. User đã login vẫn đi đúng RPC auth (dedupe theo variant
group phía server).

## Khuyến nghị còn lại (theo impact)

1. **Code-split bundled banks khỏi main chunk** (~-100-150kB gz):
   `vioMathBank`, `ioeRealBank`, `vocabulary` chỉ cần cho arena duels +
   offline fallback. Lazy-import tại call site `createExam`.
2. **Prefetch question bank ở intro screen**: bắt đầu fetch RPC ngay khi
   màn intro hiện (trước khi HS bấm "Bắt đầu") - che ~1s latency.
3. **Preload hint cho dotlottie wasm** hoặc fallback mascot tĩnh trên
   mạng chậm.
4. **Thêm timeout + retry có kiểm soát cho bank fetch** (hiện lỗi chỉ
   hiện loadError; không có deadline).

## Cách đo lại

```
npm run build && npx vite preview --port 4173
# Playwright: guest -> Lớp 3 -> drill-english -> exam-begin
# đo performance.now() giữa click begin và [data-testid=exam-progress]
# + wrap window.fetch để log supabase RPC calls
```
