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

## A-18: CR-03 phonics round implemented (2026-09-29)

- User approved CR-03 as a full feature run; re-entered at BA per CR
  workflow. Human rulings D-Ph1..D-Ph3 (PRD section 14): derived
  initialSound dimension (rule + exceptions), both question directions,
  mixed into Round 4 pool.
- Implementation: phonics/initialSounds.ts (28 sound keys incl. ch/sh/th
  digraphs + exceptions: chef->sh, giraffe->j, circle->s, write->r,
  wh->w), generators/phonics.ts, components PhonicsSoundChoiceQuestion +
  PhonicsWordChoiceQuestion, Round 4 composition 4 describe + 3
  pair-matching + 2 sound-choice + 1 word-choice.
- Gates: phonics/round4 targeted 29/29, touched-component 52/52, full
  unit suite 588/589 (only baseline mic-permission-denied debt), tsc
  clean, build clean, bundle budget OK (JS 91.26kB <= 94.5).
- E2E helpers updated for the two new kinds; full e2e 49/49 pass.
- Attribution gate clean (324 svg / 121 lottie). Awaiting lead review
  before commit.

## A-19: CR-03 lead review round - APPROVE after fixes (2026-09-29)

- Round 1: reviewer-claude APPROVE_WITH_CHANGES. Findings and fixes:
  - M1: 'one' (/wun/) mapped to 'o' - added to exceptions table -> 'w'.
    PRD section 14 amended (one->w listed; vowel-initial words explicitly
    grouped by letter).
  - M2: c and k both /k/ - hard-c words could be distractors under a 'k'
    prompt and 'k' could be a distractor under a 'c' answer. Added
    soundsSharePhoneme()/equivalentSounds() (SAME_PHONEME_GROUPS
    [[c,k]]); both generators now exclude equivalent-phoneme keys.
    Bank-wide tests prove no same-phoneme distractor survives.
  - m1: TTS spoke the bare key ("c" reads "see"). Added
    getSoundUtterance() - speaks "c, as in cat"; test asserts every bank
    sound's example word maps back to its own group.
  - m2: sound-choice returned malformed options on a tiny sound pool -
    now returns null like word-choice and the loop skips it.
  - m3: QuestionCard feedback-picture tests extended to both phonics
    kinds incl. a correctIndex mutation guard.
  - m4: stale e2e assertion message updated for the mixed round.
- Round 2: reviewer-claude APPROVE (equivalence verified both
  directions; reverting the old !== logic would have produced 13 bad
  questions, so the new tests are proven to bite). Two cosmetic
  follow-ups applied immediately: comment wording aligned to "c, as in
  cat" and a speakWord mock test locking the utterance.
- Final gates: targeted vitest 60/60, full unit suite 588/589 (baseline
  mic-permission-denied debt only), e2e 49/49, tsc/build clean, bundle
  budget 89.25kB <= 94.5.

## A-20: Baseline debt mic-permission-denied RESOLVED (2026-09-29)

- Root cause (confirmed by re-running the test): component intentionally
  dropped the getUserMedia pre-flight in commit 66e2a2c (double mic
  requests caused flaky failures on Android Chrome); permission denial
  now surfaces via SpeechRecognition.onerror 'not-allowed' ->
  onPermissionError -> phase 'permission-denied'. The stale test still
  mocked getUserMedia, so the denial path never ran.
- Fix applied per project-plan WBS 10b (test-only): the test now stubs
  window.SpeechRecognition to fire onerror({error:'not-allowed'}) on
  start(); asserts mic-permission-denied-message + working skip.
- Verified: pronunciation/hook/lib suite 25/25 green. Production code
  untouched; requestMicrophonePermission kept (documented API, covered
  by its own unit tests) per the WBS 10b "do not touch production code"
  ruling.

## A-21: Human rulings for CR-06..CR-09 intake (2026-09-29)

- **CR-07 content series:** Global Success (Ket Noi Tri Thuc) is the
  primary skeleton (~60%); Cambridge Starters/Movers/Flyers theme words
  supplement (~30%); other series (Friends Plus, Canh Dieu) referenced
  where they overlap (~10%). Human answer: "60% A, 30% B, 10% C".
- **CR-08 backend:** Supabase (Auth + Postgres + RLS). Constitution #4
  ("same-origin, zero third-party runtime") will be amended at BA to
  allow Supabase API calls - visual assets stay same-origin.
- **CR-08 roles model:** admin + student (admin-issued username + PIN,
  no email) AND guest practice allowed (try-before-login for marketing).
  Teacher role deferred.
- **Sequencing:** CR-06 phonics -> CR-09 UI refresh -> CR-07 grades 1-5
  -> CR-08 accounts. The Designer phase for CR-09 covers the whole
  target state including future login/admin screens so later screens
  inherit the design system.

## A-22: CR-06 phonics nang sau - pipeline rulings (2026-09-29)

- **BA (PRD section 15):** three new derived phonics dimensions
  (final sound, initial blend, rhyme group) + three new question kinds
  + Round 4 re-composition. Data audit run first: 61 blend words / 21
  clusters, 62 spelled-rime families (with false-positives needing a
  corrections table), 59 silent-e words.
- **Final-sound letter-level convention (BA 15.6):** groups key by the
  letter the ending sounds like at Grade 2 level - `-se/-ce` -> `s`,
  `-ge` -> `j`, `ck` -> `k`; voiced/unvoiced nuance (nose/cheese) is an
  accepted residual at this level. Exceptions: eye->e, climb->m,
  laugh->f.
- **Rhyme model:** spelled-rime default + audit-driven overrides.
  Bank-wide script enumerated every family; false-positive pairs split
  (mountain/rain, elephant/ant, two/piano, cow/snow, fly/happy, ...),
  true cross-spelling rhymes merged (plane->ain, square+chair->ear,
  one->un, bread->ed, two/shoe/canoe/blue/kangaroo->u-long,
  cry/fly/butterfly->i-rime). Containment exclusion: "hot dog"/"dog",
  "notebook"/"book", "jellyfish"/"fish" never count as rhyme pairs.
- **Designer (design-spec section 13):** prompt copy "Từ này kết thúc
  bằng âm nào?" / "Từ này bắt đầu bằng cụm âm nào?" / "Từ nào có vần
  giống từ này?"; final+blend share one component (kind-keyed prompt);
  rhyme options are WORD text (not pictures - the rime must stay
  visible); NO per-option TTS anywhere (bare letters mispronounce and
  spoken rhyme options would leak the answer).
- **Tech Lead (architecture section 9):** three derivation modules +
  `generators/phonicsDeep.ts` (same pool-per-word contract as CR-03),
  additive question types, `submitOptionAnswer` reuse (no new submit
  path), `getCorrectWord`/`feedbackPictureWordId` extended (rhyme
  picture = the correct rhyming word, not the prompt).
- **Round 4 mix (ruling 15.3 A applied):** 3 describe + 3 pair + 4
  phonics (sound/word/final + alternating blend-or-rhyme by seed
  parity). Test asserts both alternating kinds appear across 10 seeds.
- **Env note:** `@playwright/test` pinned to `1.55.0` - npm `^1.47.2`
  resolved 1.62.x which ships no Chromium for macOS 12; 1.55.0 requests
  headless-shell-1187 already cached on this machine. Documented for
  the team's mac12 dev boxes; revisit on newer macOS.

### A-22: CR-09 Designer rulings adopted (2026-09-30)

Human ask (2026-09-29): "chua chay designer UIUX nen update lai giao
dien". Rulings recorded in design-spec s14.8 (DS-U1..U4): Baloo 2
self-hosted display font + system body; single play-chrome strip;
numbered-disc grade tiles (custom scene art deferred); status-color
semantics frozen (emerald/rose/amber/sky/indigo keep meaning). CSS
budget re-based with recorded justification (AC-UI6). Implementation
proceeds under CR-09 with the invariant that testids, accessible names,
76px targets, landscape fallbacks and reduced-motion behavior never
change.

## A-24: CR-07 grades 1-5 implemented (2026-09-30)

- **Content model (R-G2 shared.ts):** words taught in earlier grades are
  reused as the SAME VocabWord objects in later-grade topic arrays via
  `pick(words, ...ids)` (throws on typo'd ids). Canonical id/emoji/
  explanation survive; `topicId` keeps pointing at the earliest topic,
  which only feeds stratified topic-spreading. Grade pools and ALL_WORDS
  dedupe by id. Authored: G1 65w/8t (mostly shared + pink/friend/yo-yo),
  G3 147w/15t, G4 135w/15t, G5 123w/13t; bank total 524 words / 79
  topics.
- **PRD 7.3 flag compliance enforced on new words:** party 🥳, birthday
  card 💌, cup/plate/fork/bowl/pot/glass, knife, marshmallow 🍡(dango
  misread), barbecue 🍢(oden misread), cottage/hut 🛖, binoculars,
  tag 🏷️, visit 🤝, trail/boot, pyramid/triangle, sailboat/boat and
  chalkboard/square were all dropped or re-emojied to satisfy "1 hinh
  1 nghia". worker->soldier (builder collision), paint->sewing,
  queen->🫅, dentist->👨‍⚕️, fever->😷, geography->🌏, kitchen-room
  dropped entirely.
- **Sanctioned shared-emoji pairs grew 4 -> 7** (AC-6.3 amendment):
  ⚽ ball/football, 🛝 slide/playground, 🏮 lantern/Mid-Autumn Festival
  - same real-world object, same rationale as the existing book/read
  pair. Image-choice distractor filtering already excludes same-emoji
  options so the pairs cannot co-occur as answers.
- **Sentence classes:** new `country` class ("I am from Vietnam.") for
  the G5 flags topic; TOPIC_CLASSES extended to all new topics;
  WORD_ID_OVERRIDES for verb-noun mixes (wake-up, brush-teeth, cycle,
  meals->mass, seasons->mass, video-game/recorder->countable,
  volunteer->occupation).
- **Pipeline bug fixed in scripts/fetch-emoji-assets.mjs:** collectEmoji
  only read top-level vocabulary files; CR-07 grade subfolders (g*/ )
  were silently skipped (325 vs 520 keys). Now recurses; 520/520
  Twemoji SVGs vendored incl. emoji-14/15 glyphs (🫅, 🩷, 🪈, 🫗).
- **JS bundle re-based (AC-G8):** 84.46 -> 101.07 kB gzip = the five-
  grade word bank (deliberate content data). Per-grade lazy chunking
  evaluated and DEFERRED: getWordsByGrade->async would async-ify
  createBatch across ~50 sync call sites for ~10 kB. Recorded as a
  CR-08+ optimization candidate; max reset to 111.1 keeping ~10 kB
  headroom.
- **Batch seam:** createBatch(seed, gradeId='grade-2'); grade-2 default
  keeps all pre-CR-07 test callers valid. App passes selectedGradeId;
  GradeSelect renders all 5 cards (App.test AC1 updated 1 -> 5 cards).
