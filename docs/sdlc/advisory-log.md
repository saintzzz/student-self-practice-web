# Advisory Log - visual content upgrade

Format: Objection/Options/Ruling. Mọi quyết định vật liệu ghi ở đây.

## A-01: Animated Fluent Emoji repository

- **Objection:** Repo "Animated Fluent Emoji" trông rất hợp (Microsoft style,
  đẹp, nhiều emoji) nhưng license là **Personal Use Only** - không được bundle
  vào app phát hành.
- **Evidence:** HuggingFace dataset cstr/open-emoji-assets ghi rõ trap này;
  noto-animated là bộ emoji động redistributable duy nhất (CC-BY 4.0).
- **Ruling (2026-09-29, intake):** Dùng Noto Animated Emoji. Fluent static (MIT)
  chỉ cân nhắc nếu cần style khác.

## A-02: Nguồn ảnh thật P2 - Pixabay vs Openverse

- **Options:**
  - A) Pixabay API: 5.8M ảnh, `safesearch=true`, miễn phí nhưng **cần user tạo
    tài khoản lấy key**; Content License riêng, yêu cầu ghi "from Pixabay".
  - B) Openverse API: aggregator CC (Wikimedia/Flickr/Met/Smithsonian), filter
    `license=cc0,by`, **không cần key** cho scripting nhẹ; phải lưu attribution
    từng ảnh.
  - C) Kết hợp: Openverse chính, Pixabay khi có key.
- **Recommendation:** C - Openverse trước (không block user), Pixabay sau nếu
  coverage thấp.
- **Ruling:** accepted tại intake (user chọn P2; không muốn tạo key ngay).

## A-03: Emoji động ở counting/describe options

- **Objection:** `option.emoji.repeat(count)` tạo tới ~8-10 bản sao cùng emoji;
  nếu mỗi bản là 1 Lottie player thì nặng + nhiễu thị giác (domain fault:
  animation phải có chủ đích).
- **Ruling:** EmojiVisual có prop `animated?: boolean`; repeated/grid contexts
  truyền `animated={false}` -> Twemoji SVG tĩnh. Animation chỉ ở prompt đơn,
  mascot, reward.

## A-04: DOM text contract của test hiện có

- **Finding:** Test assert emoji char trong DOM (`getByText('🐱')`,
  `toHaveTextContent('🐱🐱🐱')`). Đổi sang `<img>` thuần sẽ phá hàng loạt test.
- **Options:**
  - A) `<img>` + `alt` emoji -> phá textContent contract, phải sửa nhiều test.
  - B) `<img aria-hidden>` + `<span class="sr-only">{emoji}</span>` -> giữ
    textContent nguyên, screen reader vẫn đọc được, test xanh không sửa.
- **Recommendation:** B - ít churn, a11y tốt hơn (sr đọc "cat face" hợp lý),
  tuân TDD (không phá test cũ khi refactor render).
- **Ruling:** B (ghi tại đây; BA xác nhận trong PRD AC).

## A-05: "Offline sau load" là hứa không kiểm chứng được

- **Objection (từ PM gate review):** constitution bản đầu nói "app chạy không
  cần mạng sau khi load" nhưng assets lazy-fetch từ public/ và PWA ngoài scope -
  promise này không kiểm chứng được.
- **Ruling:** thu hẹp thành "same-origin assets, zero third-party runtime
  dependency" (non-negotiable 4). Check được bằng grep dist output. Service
  worker/offline cache là CR riêng nếu cần sau.

## A-06: Đưa imageUrl tới câu hỏi - registry lookup vs payload change

- **Options:**
  - A) Extend mọi question payload mang `imageUrl?` + sửa 9 generators.
    Blast radius lớn, sửa nhiều test shape.
  - B) Render layer resolve qua registry `(topicId, emoji) -> VocabWord` build
    1 lần từ data hiện có; question types giữ nguyên.
- **Recommendation:** B - question đã có `topicId`, emoji unique per-topic nên
  lookup đủ; không động vào generators/payload (ít rủi ro hơn nhiều).
- **Ruling:** B ban đầu; **AMENDED 2026-09-29** (BA review finding 1): distractor
  của listening-image-choice được rút từ TOÀN bank (không cùng topic), nên
  (topicId, emoji) có thể resolve sai. Mô hình cuối: (a) svg/lottie resolve
  theo emoji key - không cần word identity; (b) photo resolve bằng word id qua
  payload field additive tối thiểu (`wordId` trên image-choice/extra-letter/
  listening-sentence, `optionWordIds` trên listening-image-choice, `wordId`
  trên pair-matching pairs) + module `wordId -> imageUrl` từ ALL_WORDS.
  Generators vẫn giữ field cũ nguyên vẹn.

## A-07: Cấm `src/assets` cho visual asset của feature này

- **Finding (PM gate round 3):** rule cho phép `src/assets` nhưng check C3 chỉ
  inventory `public/` -> asset lạc vào `src/assets` lọt attribution.
- **Ruling:** visual asset của feature này chỉ ở `public/emoji/svg/`,
  `public/emoji/lottie/`, `public/images/vocab/`. Cấm `src/assets`.

## A-09: Cap Lottie player 1 -> 2 trên màn hình

- **Finding (BA gate round 2):** C5 ghi "không >1 player/câu hỏi" xung đột
  FeedbackPanel (picture động + accent ✨ động = 2) sau khi trả lời.
- **Ruling:** cap thực tế là 2 player/màn hình, chỉ tồn tại ở trạng thái đã
  trả lời (reward moment); trong lúc làm bài ≤1 (prompt). Giữ nguyên cấm
  animate trong option grid/repeated context. Khớp PRD AC-2.9.

## A-10: Reviewer fallback ghi nhận (quota)

- **Context:** 2026-09-29, subagent quota cạn (`worker-opus`, `reviewer-gpt`,
  `reviewer-gemini` đều 429). Fallback theo CONVENTIONS: orchestrator
  (SWE-2) review inline.
- **Inline arch review verdict: APPROVE.** Verified: `stratifiedSample`
  signature khớp (zero-config overload cho HasTopicId); `buildRound2Questions`
  pattern khớp ADR-9 1-1 (seed keys `round2-*-{seed}`); npm registry xác nhận
  `@lottiefiles/dotlottie-react@0.19.16 -> dotlottie-web@0.80.0`. WASM-in-package
  + `setWasmUrl` verified qua docs/wiki (package chưa install - implementation
  sẽ confirm file `dist/dotlottie-player.wasm` tồn tại sau `npm i`, contingency
  `public/vendor/` đã documented).
- **Human arch gate: APPROVED** (cả 2 deps duyệt, 2026-09-29).

## DS rulings từ human (design gate, 2026-09-29)

- **DS-4:** ImageChoice prompt text-8xl (96px) -> text-6xl (60px) khi viewport
  height <= 420px (landscape phone) để khỏi scroll sau khi trả lời. Đã patch
  AC-1.8 + NFR-7.
- **DS-2:** Giữ Lottie loop vô hạn theo AC-2.1; objection của Designer về
  distraction được ghi nhận, defer sang CR nếu cần.

## A-08 (từ BA): xác nhận bổ sung các fact ảnh hưởng thiết kế

- F-2 (không round nào render image-choice/counting live) + F-3 (không có
  animated 🐷) + F-5 (dotlottie WASM fetch từ CDN mặc định) + F-6 (Openverse
  200 req/ngày anonymous) đều đã được BA verify bằng code/API docs và đưa vào
  PRD làm ràng buộc - không phải objection mới mà là constraint được chấp
  nhận. D-8 (cơ chế gán imageUrl) delegate cho Tech Lead ADR.

## A-11: Phase 5 gate results (2026-09-29)

- **Unit suite:** toan bo file test green; 1 fail duy nhat la
  `PronunciationRecordingQuestion > mic-permission-denied` - loi mock jsdom
  CO SAN o baseline (truoc feature), da ghi vao debt register.
- **Build/budget:** `npm run build` pass; entry JS 88.07 kB gzip (max 94.5),
  CSS 4.15 kB (max 5.0). WASM 1.2MB + player chunk 171KB lazy-loaded -
  khong tinh vao entry budget per ADR-6.
- **Attribution:** `check-attribution.mjs` OK - 324 svg, 121 lottie, 0 images.
- **E2E:** 40/40 pass (Playwright, chromium, 3 workers).
- **Bugs found & fixed trong run e2e:**
  1. `extraLetter.ts`: multi-word entry "hot dog" (7 chars tinh ca space)
     lot qua length filter -> tile space rong pha invariant. Fix: generator
     chi nhan /^[a-z]+$/i; regression test added.
  2. `FeedbackPanel.tsx`: `<p>` boc EmojiVisual -> validateDOMNesting
     warning vi lottie layer render `<div>`. Doi sang `<div>` (ca headline
     chua Mascot accent lan dong "Tu dung la").
  3. `playwright.config.ts`: 6 workers + WASM 1.2MB tren dev server lam
     click stall > 30s timeout. Cap workers=3, timeout=60s.

## A-12: AC-9.1 seed range amended s1..s20 -> s1..s40 (reviewer finding)

- **Finding (Dev gate, reviewer-claude):** "image-choice at position 1 at
  least once across s1..s20" khong the verify - seededShuffleIndices voi
  'round1-mix-s{i}' khong bao gio dat image-choice o index 0 cho s1..s20
  (s24/s33 trong s1..s40 thi co). Test ban dau da silently dung s24/s33.
- **Resolution:** widen AC-9.1 sang s1..s40 (PRD r3 line amended, intent
  "khong ghim vi tri" giu nguyen); architecture.md claim corrected; test
  gio scan s1..s40 va assert positions.has(0) truc tiep.
- **Human gate:** can xac nhan amendment nay tai PM finalization (low risk,
  chi la testability fix cho AC).

## A-13: AC-10.6 amended - conditional <p>-><div> cho Lottie layer (reviewer finding)

- **Finding (Dev gate, reviewer-claude):** p->div tren ca 2 dong cua
  FeedbackPanel pha "DOM identical to ebd58a5" ngay ca khi khong co
  picture; Ly do (div-in-p invalid) la dung nhung deviation can duoc ghi.
- **Resolution:** conditional tag - giu nguyen <p> baseline khi chi phrasing
  content hien dien; chi dung <div> khi EmojiVisual ben trong co the mount
  lottie layer (headline khi happy accent, word line khi co picture). Voi
  cau tra loi sai + khong picture, DOM byte-identical voi ebd58a5. PRD
  AC-10.6 amended de note exception; design-spec 5.4 da scope truoc
  "Mascot child's inner DOM changes" nen khong con mau thuan.

## A-14: Dev gate re-review round 2 - APPROVE_WITH_CHANGES, 4 minors fixed

- **Verdict (reviewer-claude, round 2):** APPROVE_WITH_CHANGES. Blocker +
  3 majors + 4 minors from round 1 confirmed fixed. 4 new minors, none
  blocking; all fixed in this round:
  1. AC-2.9 e2e never reached a live Lottie state -> reworked to drive a
     correct answer (happy accent sparkle is a guaranteed vendored Lottie)
     and gate on `canvas` attach, not `data-emoji-ready` (which flips early
     via the SVG poster's staticReady).
  2. AC-10.2 e2e used `.last()` on answer-feedback which could match the
     mascot pig -> scoped to the word line via getByText(/Từ đúng là:/).
  3. Word-line class order differed from ebd58a5 (same set, "byte-identical"
     claim false) -> WORD_LINE_BASE_CLASS now exactly reproduces the
     baseline class string; test asserts the full class attribute.
  4. design-spec 5.4 stale -> updated to cite A-13 conditional-tag rule.
- Human-gate notes pending for PM finalization: A-12 (AC-9.1 seed range),
  A-13 (AC-10.6 conditional tag).

## A-15: Phase 7 Deployer - Vercel production live (2026-09-29)

- **Blocker:** Vercel MCP token lacked project:create (403 on all
  create paths incl. create_deployment). Human gate resolution: user
  chose Vercel CLI path; device-flow login succeeded; user created
  project `ioe-leduyminh` via dashboard import of the GitHub repo
  (git-linked, auto-deploy on push).
- **Deployments:** first deploy dpl_EW6dqdgPYn7aMmtBWyDWhQLuGvK9 (commit
  acda200, 13s build) then auto-deploy dpl_HiNefPWBz2L662WZeqhiCT44QA6V
  (commit 0829a52) after registry push. Both Ready, production.
- **Health checks (all 200):** /, entry JS+CSS, /attribution.json,
  /emoji/svg/1f431.svg, /emoji/svg/1f437.svg, /emoji/lottie/2728.json.
  Deployment-specific URLs 302 to Vercel SSO by design - production
  alias is the verified surface.
- **Live URL:** https://ioe-leduyminh.vercel.app
- **Registry:** deployments/registry.json records last health-checked
  deployment + auto-deploy supersession note.
- **Rollback:** no prior deployment exists; rollback = redeploy or git
  revert on main (auto-deploy handles the rest).

## A-16: Phase 8 PM finalization - human gate APPROVED (2026-09-29)

- User approved A-12 (AC-9.1 seed range s1..s40) and A-13 (AC-10.6
  conditional <p>/<div>) at the final gate. Baseline debt
  (mic-permission-denied) and CR-01..05 accepted as deferred.
- Project closed. User then requested backlog processing ("xu ly tiep
  ton dong CR, backlog") - new work stream opened under CR workflow.

## A-17: CR backlog processing - CR-01/02/04 resolved (2026-09-29)

- **CR-01 RESOLVED:** pickBoardWords() dedupes emoji collisions in
  picture-pair-matching boards; deterministic, keeps original
  stratifiedSample output for collision-free boards. Verified on
  ALL_WORDS bank: 0 boards with duplicate picture tiles.
- **CR-02 RESOLVED (with design deviation):** picture buttons announce
  visible content via aria-label (emoji / emoji.repeat(count) / tile
  emoji) instead of the proposed neutral "Hinh N" labels - neutral
  labels give screen-reader users zero information and an unplayable
  task. All options announce equally, so no answer leak; the answer
  word never appears in an accessible name.
- **CR-04 RESOLVED:** commandForIgnoringBuildStep set on ioe-leduyminh
  via Vercel REST API with CLI auth (MCP token lacks project scope).
  Docs/registry-only pushes now skip production builds.
- **CR-05 pending user action:** GitHub branch protection needs gh CLI
  or dashboard access (no auth available in this environment).
- **CR-03 phonics:** held for user decision - new-feature scope.
- Gates: 27/27 touched-file tests pass, tsc clean, build clean
  (entry 90.51kB gzip <= 94.5), attribution OK.
