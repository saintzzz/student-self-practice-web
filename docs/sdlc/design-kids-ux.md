# Design Spec - Kids-UX Redesign + Parent Conversion (WP-7..WP-10)

Status: r1 draft -> Design Lead review -> HUMAN GATE.
Upstream (binding): `prd-kids-ux.md` (R1-R10 + rulings OM-1=B, OM-2=A, OM-3=C,
OM-4=C, OM-5=B), `plan-kids-ux.md`, `research-kids-ux.md`,
`research-parent-funnel.md`, `constitution.md`, `DESIGN_SYSTEM.md`,
`src/lib/ui/tokens.ts`, `src/lib/ui/theme.ts`, `docs/sales/01-pricing.md`,
`docs/sdlc/CR-60-landing-pricing-payment.md`.
Fidelity: token-faithful (extend the navy/gold law, never contradict it).
Audit basis: code-level audit of every listed surface + measured font glyph
audit (fontTools rasterization of the shipped woff2 files) + computed WCAG
contrast for every new text/surface pair (WCAG 2.x relative-luminance formula,
Tailwind 3.4 palette hex values).

Conventions in this file: every spec section carries an `AC coverage:` line
for RTM tracing. Ambiguities resolved here carry `Ruling:` lines (index in
§12). Objections to upstream inputs are in §13. All Vietnamese copy uses the
plain hyphen `-` only.

---

## 1. Design Brief (WP-7)

### 1.1 Product + Design Read

> Reading this as: a **redesign of an App / Product UI** (ui-ux-kit §B3, with a
> small in-app §B1 "Persuade" slice for pricing) for Vietnamese primary
> students G1-5 and their parents, playful-adventure direction on the existing
> VieSchool navy/gold shell, Baloo 2 display + Be Vietnam Pro body, spring
> micro-celebrations on transform/opacity only, built in Vite + React 18 +
> TypeScript + Tailwind 3.4 token constants (no UI library).

Core tasks (from PRD): (1) a kid starts and finishes a practice session with no
reading required (G1-2); (2) a kid gets gentle, teachable feedback and a
meaningful reward; (3) a parent opens a trustworthy report and reaches a
purchase intent in ≤2 steps after the gate.

### 1.2 Audience bands

| Band | Who | Reading | Interaction model | Density | Voice |
|---|---|---|---|---|---|
| **K-A: G1-2** (6-8y) | pre/early reader | slow Vietnamese, decoding English letters | icon + voice first; ONE primary action per screen; ≤2 visible choices outside answer grids | lowest | instruction auto-plays once + persistent speaker (AC-1.3) |
| **K-B: G3-5** (9-11y) | fluent Vietnamese reader | reads prompts | progress + collection + light competition; free-choice area | medium (≤6 primary decisions) | persistent speaker, no autoplay (opt-in by tap) |
| **P: Ba/mẹ** | buyer, mobile-first, arrives via Zalo/FB groups | adult | text, numbers, trends | report-dense | none (adult surface) |
| **Guest kid** | trial | per band | per band, 1 free round/grade (unchanged) | per band | per band |

Band resolution: `bandForGrade(gradeId)` in `theme.ts` -> `'g12'` for
`grade-1|grade-2`, `'g35'` otherwise (no grade -> `'g35'`, the safer
text-capable default for non-grade surfaces).

### 1.3 Modes per surface

| Surface | Mode | Visual register |
|---|---|---|
| GradeSelect (journey map), StartBatchScreen, BatchScreen + question cards, RoundSummary, BatchSummary, Khám phá sheet, gift-box moment, exam results | **Operate-playful** | navy shell, gold treasure, mascot present, voice affordances |
| Exam hall interior (ExamScreen question area) | **Operate-fidelity** (IOE clone) | unchanged `#0d1b26` interior; only header gains brand (AC-7.1) |
| Parent gate, Góc ba mẹ (ParentReportScreen), email capture panel | **Operate-paper** | light paper panel (`bg-sky-50` / `bg-white`) inside navy CARD - the sanctioned "paper" exception of DESIGN_SYSTEM §3/§7; no mascot, no voice, no celebration motion |
| Pricing + payment panel | **Persuade (in-app, honest)** | paper register + one gold primary; no scarcity counters, no fake precision, no preselected plan |
| Share card image (generated PNG) | **Brag artifact** | navy + gold brand frame, mascot celebrate, first name + grade only |

### 1.4 Brand constraints carried forward (do not relax)

- Navy shell 60 / navy cards 30 / gold accent 10 (DESIGN_SYSTEM §3).
- Status semantics fixed: emerald = correct/go, rose = wrong/danger, amber =
  progress/score/star, sky = info, indigo = audio.
- Surface-pairing law: light text on navy only; dark text on light only; every
  new pairing becomes a named token with computed contrast (§4).
- 76px targets for anything touched alone on kid surfaces; 44px floor for
  compact/admin/parent controls.
- Animations transform/opacity only, each with a `motion-reduce:` static pair.
- Same-origin assets only; license recorded in `public/attribution.json`
  (constitution #3, #4).
- ≤1 animated player before answer, ≤2 after (constitution #5, A-09).
- Emoji-as-illustration remains the icon language (aria-hidden + text pair);
  the pig mascot becomes an authored illustration (OM-4=C).
- No em/en dashes in UI copy; sentence case; left-aligned reading text
  (AC-8.3).
- Domain red lines (research §Dark-pattern boundaries): no parasocial guilt,
  no fabricated time pressure, no navigation traps, no purchase lures on kid
  surfaces, parent gate before purchase/external links.

---

## 2. Design Concept (ui-ux-kit §2.7)

> **The concept is: "Một con đường vàng" - the treasure map collapses to ONE lit
> gold trail step at a time, and Bé Heo is the guide who speaks it. Gold means
> exactly two things - "your next step" and "treasure you earned" - and
> indigo means "Bé Heo is talking". Everything else stays quiet navy.**

Expressed through:

| Channel | How the concept shows | Measurable check |
|---|---|---|
| **Layout** | Every kid screen is a single vertical trail: guide (mascot + bubble + speaker) at top -> one gold step (primary CTA) -> quiet off-trail entries (navy glass). The whole old card stack (quests, coach, pet, arena, leaderboard, exams) is folded into the "Khám phá" map-pouch sheet. | DOM count on StartBatchScreen: G1-2 = 4 interactive, G3-5 ≤6 (AC-2.1/2.2) |
| **Color** | **Gold budget rule:** per screen, ≤1 gold-filled interactive element (the next step) + gold fills only on earned treasure (stars, gift box, star pill). Points/XP lose their gold fill and move to secondary/parent display (AC-4.1). Indigo is reserved for the voice affordance; emerald for correct only. | Visual-token check (WP-25): count elements using `CTA_GOLD`/`SCORE_PILL*`/`CHIP_GOLD`/`GIFT_BOX` per route |
| **Motion** | Two motion vocabularies only: **indigo pulse = voice playing** (speaker ring), **gold arrival = reward** (stars pop, gift lid, item flies home). Nothing else loops on kid screens except the mascot idle bob. | Grep: no new keyframes outside the §4.4 list |
| **Imagery** | Bé Heo becomes an explorer guide: navy scarf + gold star pin + rolled map; gift boxes are gold-ribboned treasure; collectibles land in a pet "home" scene that reuses the per-land strip art. | Asset inventory §3.3 |
| **Type** | Baloo 2 is "treasure type" (numbers, stars, headings); Be Vietnam Pro (single-storey a/g, verified §4.3) is "reading type"; Andika is "letter type" only where English letter identity is the learning objective in G1-2. | Token usage per §4.3 |

Falsification test (adversarial review): a screen fails the concept if it has
two gold-filled interactive elements, a gold fill on something that is neither
the next step nor earned treasure, a speaker that is not indigo, or a kid
first-paint with more than one competing primary. Covered by the visual-token
check in WP-25.

Why this is not the category reflex: navy+gold is the existing VieSchool brand
(brief explicitly names it), so the reflex test (ui-ux-kit 1e) is waived by
brief; the distinctive move is the *budgeted* use of gold as a trail, not the
palette itself.

---

## 3. IA + Screen Specs (WP-7, WP-8, WP-10)

### 3.0 Information architecture

```
GradeSelect (journey map)                       [kid, Operate-playful]
 ├─ top-right: Đổi mã PIN / Đăng nhập / Đăng xuất - band-aware per AC-8.2:
 │    G1-2 profile -> NAV_PILL (76px); G3-5 -> NAV_PILL_SM (44px)
 ├─ Mascot + H1 "Hành trình của Bé X" + speaker (instruction "Chọn một vùng đất để bắt đầu nhé!")
 ├─ EngagementBar: ⭐ star bank (gold) | Tuần này: N buổi | Bộ sưu tập
 ├─ "🔒 Góc ba mẹ" pill  ──gate──> Góc ba mẹ (ParentReportScreen enriched)  [Operate-paper]
 │                                    ├─ Báo cáo (sections A-F)
 │                                    ├─ Nhận báo cáo qua email
 │                                    ├─ Chia sẻ thành tích  -> share preview sheet
 │                                    └─ Nâng cấp tài khoản -> Pricing (step 1) -> Payment panel (step 2)
 ├─ land cards (grade-card-*) ──> StartBatchScreen (launchpad)
 │                                 ├─ Chơi -> BatchScreen (4 rounds) -> RoundSummary (fork) -> BatchSummary (fork)
 │                                 ├─ [G3-5] Thi & luyện đề -> Khám phá sheet @exam section
 │                                 ├─ [G3-5, if due] Ôn lại N câu -> review session
 │                                 └─ Khám phá -> sheet: Nhiệm vụ | Ôn câu sai | Ôn kỹ năng yếu |
 │                                                Nhà của bạn đồng hành | Đấu trường | Bảng xếp hạng |
 │                                                Thi & luyện đề | (admin) Đề có sẵn
 └─ footer: Nguồn hình ảnh | "English Arena - sản phẩm của VieSchool" (external link -> gated)
ExamScreen: header (brand + mascot) / IOE interior (unchanged) / results (brand celebration + fork)
```

Gated destinations (AC-5.1, exhaustive list for WP-22): Góc ba mẹ entry; every
pricing/payment surface; every email capture (report email section, "Gửi kết
quả cho ba mẹ" card); Chia sẻ thành tích (privacy matrix: "gated"); every
external link reachable from a kid surface (footer vieschool.com link, Zalo
button). Gate pass is shared across these for 5 minutes (Ruling R-13).

Navigation rule: no new routes. Sheets and the gate are overlays on the
current screen (AC-2.3 "no navigation away"); Góc ba mẹ, pricing and payment
reuse the existing `ParentReportScreen` screen slot with an internal
`view: 'report' | 'pricing' | 'payment'` state.

---

### 3.1 StartBatchScreen restructure

AC coverage: AC-2.1, AC-2.2, AC-2.3, AC-1.1, AC-1.3, AC-8.2, AC-3.1.

**Current audit (code):** first paint renders back pill, start CTA, then
DailyQuestCard, ReviewCard, CoachCard, PetCard (3 pick buttons or XP bar),
LeaderboardCard, ArenaCard (create/accept/bot), and 3 exam programs × 3
buttons (9 buttons, 44px, white text on emerald-600 = 3.77:1 and sky-600 =
4.10:1 at `text-sm` - both fail AA body). Roughly 20+ interactive elements on
a G1 screen. Start CTA: white on emerald-400->600 gradient = 1.92-3.77:1,
fails even large-text 3:1 at the top stop.

#### 3.1.a G1-2 launchpad (band `g12`)

```
┌───────────────────────────────────────────┐  max-w-2xl, CARD, text-center
│ [← Quay lại]                              │  NAV_PILL (76px) top-left
│                                           │
│        ╭──────────────────────────╮       │
│  (Bé   │ Mình cùng chơi 4 trò nhỏ │ [🔊]  │  MascotGuide: hero mascot 160px +
│  Heo)  │ nhé! Bấm Chơi nào!       │       │  bubble (PROMPT_G12) + SPEAKER_BTN 76px
│        ╰──────────────────────────╯       │
│        Lớp 1 - Sân chơi                   │  H2 (non-interactive orientation label)
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │            ▶  Chơi                  │  │  CTA_GOLD_XL: full width, min-h 96px
│  └─────────────────────────────────────┘  │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │   🗺️  Khám phá                       │  │  BTN_TRAIL_SECONDARY (navy glass, 76px)
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

Element list (exact; DOM interactive count = **4**):

| # | Element | testid | Token | Notes |
|---|---|---|---|---|
| 1 | Back pill "← Quay lại" | `back-to-grades` (kept) | `NAV_PILL` | label shortened from "Quay lại chọn lớp" (fits 375px beside nothing; icon + word) |
| 2 | Speaker | `instruction-speaker` | `SPEAKER_BTN` | reads bubble text in vi-VN; autoplays once on mount (§3.2) |
| 3 | "▶ Chơi" | `start-batch-button` (kept) | `CTA_GOLD_XL` | ≤3 words per CTA rule; voice reads "Bấm nút Chơi để bắt đầu nhé!" |
| 4 | "🗺️ Khám phá" | `explore-open` | `BTN_TRAIL_SECONDARY` | `aria-haspopup="dialog"`, `aria-expanded` |

Non-interactive: mascot (state `idle`, entering with wave variant), bubble
text, H2 grade/land label. Ruling R-14: the H2 orientation label is allowed at
first paint on G1-2 (AC-2.1 lists interactive elements; a non-interactive
label serves screen readers and orientation and adds no decision).

Copy (vi): bubble "Mình cùng chơi 4 trò nhỏ nhé! Bấm Chơi nào!"; spoken
instruction (vi-VN) "Mình cùng chơi bốn trò nhỏ nhé. Bấm nút Chơi màu vàng để
bắt đầu!" (spoken form spells numbers; "màu vàng" anchors the colour for a
non-reader).

Removed from G1-2 first paint (moved into sheet): DailyQuestCard, ReviewCard,
CoachCard, PetCard, LeaderboardCard, ArenaCard, exam programs, FormPicker.

#### 3.1.b G3-5 launchpad (band `g35`)

```
[← Quay lại]                                         [🔊]
(Bé Heo 128px) "Sẵn sàng phiêu lưu chưa?"  Lớp 4 - Thành phố
┌──────────────── ▶ Chơi ────────────────┐   CTA_GOLD_XL
│ 4 trò nhỏ - khoảng 10 câu mỗi trò       │   (sub-label inside CTA, text-base)
└─────────────────────────────────────────┘
┌──── 🏆 Thi & luyện đề ────┐ ┌──── 🗺️ Khám phá ────┐   2-col at ≥sm, stacked <sm
└───────────────────────────┘ └─────────────────────┘   BTN_TRAIL_SECONDARY 76px
┌──── 📚 Ôn lại 7 câu ──────┐   (contextual: only when due items > 0)
```

Primary decisions at first paint (DOM count outside sheet, AC-2.2 measure):
back (1), speaker (2), Chơi (3), Thi & luyện đề (4), Khám phá (5), and the
contextual "Ôn lại N câu" (6) only when `getDueReviewItems(grade).length > 0`.
Max = 6. "Thi & luyện đề" opens the same `ExploreSheet` with
`initialSection="exam"`.

Speaker on G3-5: visible, no autoplay (Ruling R-15: R1 says "opt-in G3-5"; the
persistent speaker IS the opt-in, which also satisfies AC-1.1 "any instruction
... persistent speaker").

#### 3.1.c Khám phá sheet (`ExploreSheet`) - both bands

AC coverage: AC-2.1, AC-2.2, AC-2.3.

- Container: `role="dialog"` `aria-modal="true"` `aria-labelledby` -> title.
  Mobile (<640px): bottom sheet, `rounded-t-3xl`, `max-h-[85vh]`, internal
  scroll, slide-up 220ms. ≥640px: centered dialog `max-w-xl`.
  Surface: `SHEET` token (navy CARD gradient, no glass on the panel; backdrop
  `bg-[#0b1224]/70`).
- Header row: title "Khám phá" (H2) + speaker (reads "Chọn một góc để khám
  phá nhé!") + "Đóng" button (`NAV_PILL`, 76px, `data-testid="explore-close"`).
- **Index view** (default): 2-column tile grid (1 column below 360px), each
  tile `TRAIL_TILE` (min-h 96px G1-2 / 76px G3-5): emoji icon (aria-hidden) +
  full-word label + optional status line.

  | Tile | Label | Status line (if any) | Opens |
  |---|---|---|---|
  | 🎯 | Nhiệm vụ hôm nay | "Xong 1/3" | DailyQuestCard |
  | 📚 | Ôn câu sai | "7 câu đang chờ" / hidden when 0 | ReviewCard |
  | 💪 | Ôn kỹ năng yếu | - | CoachCard |
  | 🏡 | Nhà của bạn đồng hành | "3 món đồ" | PetCard + home (§3.5) |
  | ⚔️ | Đấu trường | - | ArenaCard |
  | 🏅 | Bảng xếp hạng | - | LeaderboardCard |
  | 🏆 | Thi & luyện đề | - | exam programs (3 × Luyện đề / Thi thử / Nâng cao, testids `drill-*`, `exam-program-*`, `advanced-*` kept) |
  | 📋 | Đề có sẵn (admin only) | - | FormPicker |

- **Detail view**: the existing card component renders inside the sheet under
  a "← Khám phá" back control (76px). Card components keep their own
  internals and testids (e2e selector updates only for "open sheet first" -
  release-contract change #8), EXCEPT interactive control sizing: inside the
  sheet, compact controls below the band floor are upgraded - G1-2: all
  controls min 76px (CoachCard/PetCard compact buttons get `min-h-[76px]`
  overrides); G3-5: option-level controls ≥76px, administrative controls ≥44px
  per AC-8.2.
- Exam program buttons inside the sheet are re-tokenized for contrast:
  Luyện đề `BTN_DRILL` (white on emerald-700, 5.48:1), Thi thử `BTN_EXAM`
  (white on sky-700, 5.93:1), Nâng cao `BTN_ADVANCED` (white on rose-700,
  6.29:1). Height 76px on G1-2, 44px on G3-5.
- Close paths (AC-2.3): Đóng button, backdrop tap, `Esc`, Android back
  (`popstate` is NOT used - no history entry is pushed, so back leaves the
  screen as today; Ruling R-26). All close paths restore focus to the opener
  and leave the launchpad state untouched.
- States: closed / opening (motion) / index / detail / child-loading (each
  card keeps its own loading state; sheet shows skeleton tiles only if a tile
  status needs async data - status lines are local store reads, so normally
  instant) / empty (a tile whose content is empty still opens and shows the
  card's own empty copy, never a blank).

---

### 3.2 Instruction-audio affordance (`InstructionSpeaker`)

AC coverage: AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-8.2.

**Where:** every kid-surface instruction: StartBatch bubble, GradeSelect
subtitle, each question card's instruction line ("Nghe và chọn hình đúng"),
RoundSummary/BatchSummary headline, Khám phá sheet title, gift-box prompt,
session fork question. Not on parent surfaces, not inside the exam hall
interior (exam questions keep their existing English audio buttons; IOE
fidelity).

**Distinct from content audio:** the existing English word/sentence play
buttons (`useAudioPlayback`, indigo rectangular "Nghe" buttons) stay as they
are. The instruction speaker is always a **round 76px button attached to the
mascot's speech bubble** so a pre-reader learns "Bé Heo's bubble = what to
do; the big Nghe button = the English word".

**Component API (for Tech Lead):**
`<InstructionSpeaker textVi spokenVi? autoPlay={band==='g12'} playKey />`
- `spokenVi` optional (spoken form may differ from displayed text, e.g. numbers).
- `playKey` = screen id + question id; autoplay fires at most once per
  `playKey` per mount.
- Voice: `speech.ts` gains `speakInstruction(text, onStatus)` using
  `lang='vi-VN'` voice selection (AC-1.2). English content keeps en-US.

**State machine:**

| State | Trigger | Visual | Accessible name |
|---|---|---|---|
| `idle` | default | indigo-600 disc, 🔊 glyph, `ring-4 ring-indigo-300/60` | "Nghe hướng dẫn" |
| `playing` | status `started` | + `speaker-pulse` ring (indigo-300, scale 1->1.25, opacity .6->0, 1.2s loop); bubble text gets `ring-2 ring-indigo-300/60` | "Đang đọc hướng dẫn" (`aria-pressed="true"`) |
| `blocked` | G1-2 autoplay attempted but no `started` within 1500ms, or `error` on autoplay | pulsing ring + attached chip "👆 Bấm để nghe" (`CHIP_VOICE`) | "Bấm để nghe hướng dẫn" |
| `unavailable` | no vi-VN voice in `speechSynthesis.getVoices()` after voices load, or `unsupported` | disc dims to indigo-600/60 with 🔇; tap shows bubble pulse + **trail glow on the primary CTA for 2s** (visual pointer to "what to do") | "Máy chưa có giọng đọc - làm theo nút sáng nhé" |
| `focus-visible` | keyboard | `ring-4 ring-amber-300/60` (project focus family) | - |
| `active` | press | `scale-95` | - |

Behaviour rules:
1. Autoplay once (G1-2 only) 400ms after mount, after any screen-enter
   transition; never re-autoplays on re-render; never autoplays while content
   audio is playing (content audio wins; instruction queues and is dropped if
   the kid already interacted).
2. Tap during `playing` restarts from the beginning (simple mental model).
3. Pulse-sync: pulse runs from `started` to end-of-utterance. **Requires an
   end signal** - `SpeechPlaybackStatus` today is
   `'unsupported' | 'error' | 'started'` only; Tech Lead adds `'ended'` (from
   `utterance.onend` / `audio.onended`). Fallback if no end event within
   `textVi.length * 90ms + 1500ms`: stop pulse (no stuck animation).
4. No dead end (AC-1.4): every G1-2 instruction screen must be completable by
   icon + visual state alone - the gold trail CTA is always the only gold
   element (concept rule), answer tiles are pictures, and `unavailable` state
   glows the CTA. WP-21 runs the grade-1 no-reader matrix with
   `speechSynthesis` stubbed absent.
5. Reduced motion: `playing` shows a static thick ring (`ring-8
   ring-indigo-300/70`) + text "Đang đọc" under the disc instead of the pulse;
   `blocked` shows static chip, no pulse.
6. Target: 76px all bands (G3-5 could use 44px per AC-8.2 but the voice
   affordance is a primary tool; keep 76px for consistency - Ruling R-27).

---

### 3.3 Mascot system (`Mascot` v2 + asset module) - WP-10

AC coverage: AC-3.1, AC-3.3, OM-4=C, constitution #3-#6.

#### 3.3.a States (approved list - exactly four)

| State | Pose (illustration brief) | When | Forbidden |
|---|---|---|---|
| `idle` | standing, gentle smile, holding rolled map; enter variant = one wave | default on launchpad, question header before answer, exam header | - |
| `celebrate` | jump, arms up, gold sparkles around (part of art, not an emoji accent) | correct answer, round/batch complete, gift opened, exam result ≥ 80% | - |
| `encourage` | leans in, warm smile, thumbs-up, eyebrows relaxed | wrong answer (practice), batch ended with 0 answers, exam result < 80% | downturned mouth, tears, slumped pose, sweat drop, frown |
| `think` | finger on chin, eyes up-right, small "?" bubble | waiting for STT/processing, 10s idle on a G1-2 question (re-offer cue, speaker pulses once), loading states | confused/frustrated expression |

Mapping from current `MascotMood` (release contract, tests updated
deliberately): `greeting -> idle` (wave enter variant), `happy -> celebrate`
(compact), `celebrating -> celebrate`, `encouraging -> encourage`, new
`think`. DOM: `data-testid="mascot"` kept; `data-mascot-state` replaces
`data-mascot-mood` (Ruling R-19). aria-labels: "Bé Heo đang chờ em", "Bé Heo
ăn mừng", "Bé Heo cổ vũ em", "Bé Heo đang suy nghĩ".

Copy/asset scan (AC-3.1 enforcement, WP-20): forbidden strings in any
mascot-adjacent copy: `buồn`, `khóc`, `thất vọng`, `nhớ em`, `bỏ rơi`, `giận`,
`tiếc quá`; asset review checklist item "no sad/guilt affect" per file in
`attribution.json` (`reviewStatus: approved`).

#### 3.3.b Placement rules

1. ≤1 mascot per screen.
2. Never overlaps the question/answer grid or the primary CTA; sits top or
   left of the speech bubble.
3. Before an answer, the mascot is **static** (SVG) - the prompt may own the
   single pre-answer animated player (constitution #5). Post-answer the mascot
   may animate (2-player budget: feedback picture + mascot).
4. Not shown on Operate-paper surfaces (gate, report, pricing). Shown on the
   share card image.
5. Exam hall: header only, static `idle`, never reacts to answers in Thi thử
   mode (IOE fidelity). In Luyện đề/Ôn lại modes the header mascot switches
   to `celebrate`/`encourage` after each verdict (static pose swap, no loop).

Sizes (`size` prop):

| size | px | Use |
|---|---|---|
| `hero` | 160 (G1-2) / 128 (G3-5) | StartBatch, BatchSummary, GradeSelect |
| `block` | 96 | RoundSummary, exam results, sheet header, gift moment |
| `inline` | 48 (40 at `max-height:420px`) | FeedbackPanel, question header, exam header |

#### 3.3.c Asset spec

- **Character sheet:** Bé Heo - round soft-pink pig (body rose-100..300 hues
  only; never rose-500+ so the body never reads as "wrong"), navy outline
  `#0E1F42`, navy explorer scarf, gold star pin (amber-300/400), small rolled
  map. Pig silhouette vs navy: rose-200 on `#0E1F42` = 11.51:1, always legible.
  Illustration fills are imagery, exempt from UI status semantics, but limited
  to the approved ramps (DESIGN_SYSTEM §12).
- **Tier 1 (required to ship):** one SVG per state:
  `public/mascot/svg/be-heo-{idle|idle-wave|celebrate|encourage|think}.svg`,
  `viewBox="0 0 256 256"`, flat fills, no embedded raster, no text, no
  filters except one drop-shadow, SVGO-optimized, ≤12 KB gzip each. Motion in
  Tier 1 comes from existing CSS keyframes (`mascot-float`, `mascot-pop`,
  `mascot-celebrate`) on the wrapper.
- **Tier 2 (optional, same release or later):** dotLottie per state via the
  already-installed `@lottiefiles/dotlottie-react` lazy boundary:
  `public/mascot/lottie/be-heo-{state}.lottie`, 256×256 artboard, 30 fps,
  ≤60 KB each; `idle` loop 4s; `celebrate` one-shot 1.2s then hold last frame
  -> crossfade to idle SVG; `encourage` one-shot 0.8s then hold; `think` loop
  3s. The Tier 1 SVG is always the poster + reduced-motion + error fallback.
- **Fallback until assets land:** `Mascot` renders today's 🐷 EmojiVisual with
  the same API, so engineering can ship before art.
- **Provenance (constitution #3):** one `attribution.json` record per file:
  `{ file, title, source: "VieSchool-owned", generator: "<tool@version>",
  promptRef: "docs/assets/mascot-prompts.md#<state>", humanEditedBy, date,
  license: "LicenseRef-VieSchool-Owned", toolTermsUrl, reviewStatus:
  "approved", reviewChecklist: ["one clear character", "child-safe",
  "no sad/guilt affect", "palette in approved ramps"] }`.
  `scripts/check-attribution.mjs` inventory must add `public/mascot/svg/` and
  `public/mascot/lottie/` (constitution C3 lists only three dirs - see
  Objection O-4; Ruling R-05).
- Same-origin only; no runtime fetch beyond `/mascot/...`.

---

### 3.4 Feedback sequence (practice/batch only)

AC coverage: AC-3.2, AC-3.1, AC-3.3, AC-1.4. Intentional change #1.

Scope (Ruling R-07): applies to BatchScreen (all rounds) and ExamScreen
`practice` (Luyện đề) and `review` (Ôn lại câu sai) verdict strips. **Thi thử
(`exam`) keeps no-feedback IOE fidelity - no sound, no highlight.**

Timeline for a wrong answer on option-type questions (image choice, text
choice, phonics choice, describe-and-choose):

| t | Event | Visual | Audio |
|---|---|---|---|
| 0 | kid taps wrong tile | tile gets `tile-shake` (existing, 300ms) + `OPTION_PICKED_WRONG`: rose-300 dashed ring-4 + small ✗ badge on tile corner; other tiles lock (`aria-disabled`) | existing soft two-tone `wrong.mp3` (CR-20); Ruling R-28: keep file, Tester verifies ≤600ms and no buzzer-like square wave |
| 600ms | attempt window ends | correct tile gets `OPTION_REVEAL_CORRECT`: emerald-400 ring-4 + ✓ badge + subtle scale 1.04; picked tile drops to opacity 70% (keeps ✗) | - |
| 600ms | feedback panel enters | `FEEDBACK_LEARN` panel (sky tint, see below), mascot `encourage` inline | instruction speaker (G1-2 autoplay) reads "Mình cùng xem lại nhé. Đáp án đúng là..." then the English word plays via `speakWord` (en-US) |
| any | kid choice | three controls: "🔊 Nghe mẫu" (`BTN_TRAIL_SECONDARY`), "↻ Thử lại" (`BTN_TRAIL_SECONDARY`), "Câu tiếp →" (`CTA_GOLD`, existing next-question action/testid) | - |

- **Nghe mẫu** (demo): replays the correct word/sentence (en-US) and pulses
  the correct tile ring in sync (indigo pulse = voice). Available unlimited.
- **Thử lại** (retry): unlocks only the tiles; kid taps again. Tapping the
  correct tile plays `correct.mp3` + mascot `celebrate` (compact) + text
  "Đúng rồi! Em nhớ rồi đó!". **Ungraded** - the first attempt is the scored
  attempt; points, stars, skill stats, Leitner box unchanged (Ruling R-06).
  Retry shows at most once per question (after a second miss the panel keeps
  only Nghe mẫu + Câu tiếp, no loop).
- Câu tiếp is always available - retry/demo are **offered, never forced**
  (kid control; no navigation trap).

Per question kind:

| Kind | Highlight-after-attempt | Retry | Demo |
|---|---|---|---|
| option tiles (all choice kinds) | correct tile ring + ✓ | re-tap tiles | correct word/sentence audio |
| listening-fill-blank / sentence-fill-blank (typed) | correct spelling shown under input, letters in emerald-300 on navy | input clears, re-type (ungraded) | word/sentence audio |
| extra-letter | extra letter tile highlighted emerald + ✓ | re-tap letters | word audio |
| pronunciation | n/a (no option) | existing re-record behaviour unchanged | model audio "Nghe mẫu" |
| pair-matching | existing self-correcting bounce; exempt | - | - |

**`FEEDBACK_LEARN` panel (wrong):** replaces the rose gradient + left accent
bar (side-stripe accents are a ui-ux-kit hard ban) with `CARD_TINT.sky`
(sky-500/15 on navy). Headline white "Mình cùng xem lại nhé!"; line "Đáp án
đúng: **cat** /kæt/ 🐱" (correct word in emerald-300, IPA in sky-300); if
picked shown: "Em chọn: dog" in slate-300 **without strikethrough** (strike is
punitive and hurts readability). Rose appears only in the picked-tile marker
(semantic kept, small dose) - Ruling R-20.

**Correct panel:** keeps emerald tint, confetti (existing), mascot
`celebrate`, process praise copy rotated from a set: "Chính xác! Em nghe rất
kỹ!" (listening), "Đúng rồi! Em đọc giỏi quá!" (reading), "Chuẩn luôn! Em
đánh vần đúng rồi!" (spelling). `aria-live="polite"` on both panels.

Reduced motion: no shake, no scale; ✗/✓ badges and rings appear instantly;
confetti -> static 3-star row (existing Confetti reduced branch).

---

### 3.5 Reward moment - stars primary, gift box, home, forgiving streak

AC coverage: AC-4.1, AC-4.2, AC-4.3, AC-4.4, AC-3.3. Changes #2, #9, #10.

#### 3.5.a Stars primary (AC-4.1)

**RoundSummary (kid):**
```
(Bé Heo block, celebrate)
Vòng 2 - Nghe và chọn                      H2
 ★ ★ ☆                                     STAR_SLOTS: 3 slots, 56px each, earned = gold fill, empty = navy outline ring-white/30
"Em được 2 sao!"                           text-2xl amber-200 (11.x:1 on navy)
"Em đúng 8/10 câu"                          text-lg slate-300 (secondary)
[ Xem chi tiết ▾ ]  -> disclosure: points pill (round-points-summary), completion label
(fork - §3.10)
```
0 stars copy (process praise, never deficit): "Em đã chơi hết vòng này - giỏi
lắm! Vòng sau mình cùng lấy sao nhé."

**BatchSummary (kid):**
```
(Bé Heo hero, celebrate)
Hoàn thành rồi!                            H1
[ +5 ⭐ ]                                    SCORE_PILL_LG reused for stars (treasure = gold, allowed by budget)
Kho sao của em: 128 ⭐                       text-lg sky-300 label + amber-300 number
(gift-box moment if milestone - §3.5.b)
"Em đúng 32/40 câu - 6 phút 12 giây"        text-base slate-300
[ Xem chi tiết ▾ ]   -> points pill (batch-points-summary), per-round list, completion badge
(Gửi kết quả cho ba mẹ card - §3.8.c, logged-in only)
(Chia sẻ thành tích button - §3.8.b)
(fork - §3.10)
```
- Points/XP never gold-filled on kid surfaces. Inside the disclosure the
  points pill uses `CHIP_SKY` (navy-only translucent; sky-200 text).
- "Xem chi tiết" = `DISCLOSURE_BTN` (76px G1-2 / 44px G3-5),
  `aria-expanded`, `aria-controls`. Collapsed by default. Existing testids
  (`batch-points-summary`, `batch-score-summary`, `batch-time-summary`,
  `round-points-summary`) live inside it; e2e opens the disclosure first
  (release contract #2).
- PetCard: the "N XP" violet pill is removed from the kid view; the progress
  line becomes "Còn 3 câu đúng nữa là {pet} lớn lên!" (computed
  `ceil(xpToNext / PET_XP_PER_CORRECT)`); XP stays in the parent report.
- ExamScreen results keep points as headline (IOE convention parents read) -
  AC-4.1 scopes "a batch" (Ruling R-08).

#### 3.5.b Gift box pick-1-of-3 (AC-4.2, AC-4.4)

Trigger: a RoundSummary or BatchSummary mount where the existing award
produced `newStickers.length > 0` (existing once-per-id sticker triggers).
One gift moment per summary even if several stickers unlock. Sticker/badge
grant itself is unchanged; the gift is a **home decoration** placed in the
pet/scene home.

Sequence:

| Step | Visual | Copy (displayed / spoken G1-2) | A11y |
|---|---|---|---|
| 1 Offer | sticker chip(s) "Huy hiệu mới: Siêu sao" (existing `sticker-chip`), then 3 `GIFT_BOX` buttons in a row (112px G1-2 / 96px G3-5, gap-4), gentle `chest-wiggle` staggered 150ms | "Em mở được quà! Chọn một hộp nhé!" | `role="group"` `aria-label="Chọn một hộp quà"`; buttons "Hộp quà 1/2/3" |
| 2 Pick | chosen box: lid pops (`lid-pop` 300ms) + item rises (`item-rise` 300ms, delay 150ms); other two boxes fade to 40% opacity and become `disabled` - **their contents are never revealed** | - | `aria-live="polite"`: "Em nhận được Quả bóng xanh!" |
| 3 Place | item card (paper-free: navy CARD_TINT.amber, item emoji 64px, name amber-100) + mini home preview (PetHome strip) with the item flying in (`item-home` 500ms) | "Quả bóng xanh đã vào nhà của Thỏ con!" | focus moves to the item card heading |
| 4 Continue | gift block collapses to a single line "🏡 +1 món đồ trong nhà" and the fork (§3.10) takes focus | - | - |

Rules (Ruling R-04):
- Items are free cosmetic decorations of equal value; no currency, no
  purchase, no rarity tiers, no "you missed X" reveal (avoids loot-box/FOMO
  patterns, JAMA "attractive lure").
- Deterministic: item = `pool[hash(stickerId + ':' + boxIndex) % pool.length]`
  from the not-yet-owned pool -> replay/refresh shows the same outcome;
  already-granted sticker ids never re-open a gift (AC-4.4). If the pool is
  exhausted, step 1 is skipped (stickers still show).
- **Objective identity for all rewards (AC-4.4 full spec):** a reward grant is
  keyed by `(objectiveId, profile)` where objectiveId = batch definition id /
  sticker id / badge id. `recordBatchResult` records `grantedObjectives` in the
  store; a replayed batch whose objective was already granted shows the summary
  normally but renders reward slots in a "Đã nhận thưởng rồi" state and adds
  no stars/chest/sticker. Store-level guard (Tech Lead WP-11), not UI-only.
- Pool: 24 Twemoji-backed decorations (⚽🎈🪁🧸🌻🌵🍄🏰⛺🎠🛝🪀🎨🎸🥁🚲🛶⭐🌈🌙☀️🌳🐠🦋) - already
  covered by the Twemoji/Noto credit (no new license). Names in Vietnamese in
  a data file.
- Storage: `homeItems: string[]` in the local engagement store, synced inside
  `engagement_state` (CR-45) for logged-in users. Not PII. Tech Lead confirms
  the JSON blob needs no schema change (flag for WP-11).
- Gift box art: Tier 1 = 🎁 EmojiVisual at 1em in a gold-ringed navy tile
  (static); Tier 2 optional authored `public/mascot/svg/gift-{closed|open}.svg`
  under the same provenance rules.
- Reduced motion: no wiggle/lid/fly; pick -> boxes switch instantly to opened
  state, item shown, home preview shows item in place.

#### 3.5.c Collectible home (`PetHome`)

Inside the "Nhà của bạn đồng hành" sheet section (and as the mini preview in
the gift moment): a 16:6 scene panel using the current grade's `LandStrip`
SVG (reused from GradeSelect) as the floor, the pet emoji (or Bé Heo if no
pet chosen) at left, placed items in a row (max 8 visible, then "+N"). Empty:
"Nhà còn trống - hoàn thành bài để nhận quà nhé!". No drag-to-arrange this
run (scope).

#### 3.5.d Forgiving streak (AC-4.3)

Kid-facing streak chip changes from "🔥 N ngày liên tiếp" to a weekly-count
frame computed from the existing 7-day activity snapshot (rolling 7 days -
Ruling R-09; no new data): `CHIP_SKY` "📅 Tuần này: 3 buổi" + 7 small dots
(filled = active day). Consecutive-day count remains in the parent report.

Copy examples (approved):
- Chip tooltip/subline: "Học 3-4 buổi mỗi tuần là tuyệt rồi!"
- Reached 3: "Tuần này em đã học 3 buổi - tuyệt quá!"
- Reached 4+: "4 buổi rồi! Em chăm chỉ ghê!"
- Return after a gap: "Chào em quay lại! Mình học tiếp nhé."
- First session: "Buổi đầu tiên của tuần - bắt đầu thôi!"
- DailyQuestCard streak line: "📅 Tuần này: 3 buổi" (replaces "🔥 N ngày
  liên tiếp").

Forbidden (source scan, WP-20): `mất chuỗi`, `sắp mất`, `đừng để`, `kẻo`,
`chỉ còn .* giờ`, `Heo buồn`, `bỏ lỡ`. Existing sticker names "3 ngày liên
tiếp" / "7 ngày liên tiếp" stay (achievement framing, not threat).

---

### 3.6 Parent gate (`ParentGate`)

AC coverage: AC-5.1, AC-6.1 (gating), AC-9.1 (step counting), AC-9.2
(gated share). Change #3.

#### 3.6.a Options matrix - one pattern per design

| Option | Strengths | Weaknesses | Risk | Domain fit |
|---|---|---|---|---|
| **A. Hold-3s** | zero reading, fast for adults, motor-simple | a 6-year-old passes it by curiosity/patience - it tests persistence, not adulthood; hard to make keyboard-equivalent without making it trivial | high bypass for G1-2, the band we most need to stop | weak (Apple Kids 1.3 expects an adult-level task) |
| **B. Arithmetic in spelled-out Vietnamese words, numeric keypad answer** (e.g. "Bảy nhân tám bằng bao nhiêu?") | G1-2 cannot read the words or multiply 6-9 tables; mirrors Duolingo ABC "type the spelled-out number"; fully keyboard and screen-reader accessible for adults | strong G4-5 kids can pass (acceptable: no in-app purchase exists, payment needs a parent's bank app) | low for G1-2, medium for G4-5 | strong |
| C. Do nothing | - | violates AC-5.1 and Apple Kids/ICO norms | blocking | none |

**Decision: B (arithmetic, word form).** Ruling R-03.

#### 3.6.b Spec

```
┌ backdrop bg-[#0b1224]/80 ─────────────────────────┐
│  ┌ PAPER_PANEL (bg-white, rounded-3xl, p-6) ────┐ │
│  │ 🔒 Dành cho ba mẹ                     [Hủy]   │ │  H2 slate-900; Hủy = BTN_PAPER_GHOST 44px
│  │ Để tiếp tục, ba mẹ giải phép tính:            │ │  body slate-700
│  │  "Bảy nhân tám bằng bao nhiêu?"               │ │  text-2xl font-bold slate-900
│  │  [ 5 ][ 6 ]    (answer boxes, 2 digits)       │ │
│  │  ┌───┬───┬───┐                                │ │
│  │  │ 1 │ 2 │ 3 │   GATE_KEY 56×56 (≥44)         │ │
│  │  │ 4 │ 5 │ 6 │                                │ │
│  │  │ 7 │ 8 │ 9 │                                │ │
│  │  │ ⌫ │ 0 │ OK│   OK = CTA_GOLD (only gold)    │ │
│  │  └───┴───┴───┘                                │ │
│  │  [Đổi câu khác]                               │ │  text button sky-700 underline, 44px
│  └───────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

- Question generator: a, b ∈ {6,7,8,9}, product 36-81, rendered in
  Vietnamese words ("sáu", "bảy", "tám", "chín"; "nhân"). Never digits, never
  spoken (the one intentionally un-voiced kid-reachable surface - documented
  a11y exception, §5.3).
- Input: on-screen keypad or physical keyboard digits; `Backspace`; `Enter`
  submits; OK disabled until 2 digits entered.
- Wrong: boxes clear, message "Chưa đúng - ba mẹ thử câu khác nhé." (slate-700,
  with ⚠ icon, `role="alert"`), new question generated. After 3 consecutive
  wrong: OK disabled 10s with visible countdown text "Thử lại sau 10 giây"
  (no lockout beyond that).
- Pass: panel shows "✓ Đã mở Góc ba mẹ" for 300ms (reduced: instant), then
  the gated destination opens. Gate pass token held **in memory** for 5
  minutes (Ruling R-13) so report -> pricing -> payment stays within AC-9.1's
  ≤2 steps without re-gating; cleared on sign-out, grade change, or reload.
- Dialog semantics: `role="dialog"` `aria-modal`, focus trap, initial focus on
  question text (`tabindex=-1`), `Esc` = Hủy, focus returns to opener.
- States: question / typing / wrong / cooldown / pass / cancelled.
- Analytics step events: `parent_gate_shown`, `parent_gate_passed` with
  `{surface, gradeBand}` only - forbidden identifiers per privacy matrix.

---

### 3.7 Góc ba mẹ - enriched ParentReportScreen

AC coverage: AC-5.2, AC-5.3 (data contract note), AC-6.3 (parity with email),
AC-9.1 entry, AC-9.2 entry, AC-8.3. Change #11.

Entry rename: GradeSelect pill "📊 Báo cáo cho ba mẹ" -> "🔒 Góc ba mẹ"
(`data-testid="open-parent-report"` kept; `NAV_PILL_SM` 44px - parent
control, not a kid primary). Tap -> ParentGate -> report.

Register: Operate-paper. Outer navy `CARD` + inner `PAPER_PANEL`
(`bg-sky-50 ring-1 ring-sky-100 rounded-2xl`) per section - the sanctioned
paper exception (one level, no card-in-card-in-card). Text floor 14px on
parent surfaces (no `text-xs`; existing `text-xs` slate-500 captions on
`#16232e` measure 3.36:1 and fail).

Layout (top -> bottom, `max-w-2xl`; single column; sections ordered by parent
question "is my child learning / where stuck / what next"):

```
[← Quay lại]                         Góc ba mẹ                  (H1 white on navy)
Báo cáo của bé An - Lớp 3            (slate-300 on navy)
┌ A. Tuần này ──────────────────────────────────────────────┐ PAPER_PANEL
│ 42 phút - 5/7 ngày có học                                  │ text-2xl slate-900 + slate-700
│ ▁▃▅▂▇▁▄  minutes/day bars, label "phút" per day (T2..CN)   │ bars sky-600 (3.84:1 vs sky-50)
│ Mục tiêu gợi ý: 15 phút/ngày, 3-4 buổi/tuần                │ slate-600
└────────────────────────────────────────────────────────────┘
┌ B. Thi thử ────────────────────────────────────────────────┐
│ [Tiếng Anh] [Toán tiếng Anh] [Khoa học]   chips (≤4 -> chips)
│ trend: last ≤8 mock results, points %, line + dots        │ line sky-700, dots sky-700, axis slate-600
│ "Lần gần nhất 78% - tăng 6 điểm so với lần trước"          │ emerald-800 for up / slate-700 for flat or down (never rose)
└────────────────────────────────────────────────────────────┘
┌ C. Cần luyện thêm (3 kỹ năng yếu nhất) ────────────────────┐
│ Nghe từ        ███░░░░  42%                                │ bars amber-700 (4.71:1) = progress semantics
│ Đánh vần       ████░░░  55%                                │
│ Ngữ pháp       █████░░  61%                                │
│ Gợi ý buổi tới: 10 phút "Ôn kỹ năng yếu" - Nghe từ.        │ slate-900 bold (≥17:1 on sky-50)
│ Bé chọn "Ôn kỹ năng yếu" trong mục Khám phá nhé.           │ sky-800 plain text, not a link (7.09:1)
└────────────────────────────────────────────────────────────┘
┌ D. Thành tích ─────────────────────────────────────────────┐ (existing: stars, consecutive days, badges, per-grade, due review)
└────────────────────────────────────────────────────────────┘
┌ E. Nhận báo cáo qua email (logged-in) ─────────────────────┐ (existing CR-31 flow, restyled paper)
└────────────────────────────────────────────────────────────┘
┌ F. Tiếp theo ──────────────────────────────────────────────┐
│ [ Chia sẻ thành tích ]   BTN_PAPER_SECONDARY 44px+        │
│ [ Nâng cấp tài khoản ]   CTA_GOLD (the only gold on page)  │
└────────────────────────────────────────────────────────────┘
```

Data contract (for WP-11/WP-22; AC-5.2):

| Section | Source (authenticated) | Guest |
|---|---|---|
| A minutes/day | `results.time_used_sec` summed per local day, last 7 days, own rows only | teaser |
| B mock trend | `results` rows where `program` is set (english/math/science), mode exam, last 8 | teaser |
| C weakest-3 | existing weakest-first skill breakdown capped at 3 (server skill stats for auth; local for guest) + suggestion text | local data allowed (existing guest-safe behaviour) |
| D | `engagement_state` (CR-45) for auth; local for guest | local + "Số liệu lưu trên thiết bị này" note |
| E | parent contact RPCs | hidden (AC-6.2 deferred) |

Suggestion rule (deterministic): weakest skill with ≥10 answers -> "10 phút
'Ôn kỹ năng yếu' - {skill}". Text only; no routing from the parent surface
(Ruling R-21).

States per server section (A, B):
- **loading**: skeleton bars (paper `bg-sky-100` blocks, `animate-pulse`
  -> `motion-reduce:animate-none`), height reserved (no CLS).
- **empty**: A "Chưa có buổi học nào trong 7 ngày qua - bé bắt đầu từ nút
  Chơi nhé."; B "Chưa có bài thi thử nào. Bé có thể làm 'Thi thử' trong mục
  Khám phá."
- **error**: "Chưa tải được dữ liệu - kiểm tra mạng rồi thử lại." + "Thử
  lại" button (`BTN_PAPER_SECONDARY`).
- **guest teaser** (AC-5.2): the section frame renders with a lock icon,
  title, one sentence of value ("Xem bé học bao nhiêu phút mỗi ngày và điểm
  thi thử tiến bộ thế nào") and "Đăng nhập để xem đầy đủ" button (routes to
  existing login). **No fake/blurred sample data** (no fabricated numbers on a
  parent surface).
- Denied (AC-5.3) / other-account: never rendered client-side; server
  returns nothing -> section shows the error state.

Chart a11y: each chart has a visually-hidden data table (`<table
class="sr-only">`) + `aria-describedby` summary sentence (the bold line).
Numbers use `tabular-nums`.

---

### 3.8 Conversion surfaces (Drop-2)

#### 3.8.a Pricing card + payment panel (OM-1=B)

AC coverage: AC-9.1, AC-5.1, R10 (no gateway). Prices ONLY from
`docs/sales/01-pricing.md` (mirrored in one constant `PRICING_FAMILY` with a
source comment; any change edits one place).

Step count after gate: Góc ba mẹ -> tap "Nâng cấp tài khoản" (**step 1**,
screen change to pricing) -> tap a plan (**step 2**, payment panel = purchase
intent reached). ✓ ≤2.

**Pricing view** (paper register, Persuade-honest):

```
[← Góc ba mẹ]
Nâng cấp English Arena                                   H1 white on navy
Một gói cho cả tiếng Anh và Toán tiếng Anh, lớp 1-5.     slate-300
┌ PLAN_TILE ─────────────┐ ┌ PLAN_TILE ─────────────┐ ┌ PLAN_TILE ──────────────────────┐
│ Gói Mùa thi            │ │ Gói Năm học            │ │ Founding Family                 │
│ 249.000đ               │ │ 399.000đ               │ │ 299.000đ/năm                    │
│ 6 tháng / học sinh     │ │ 12 tháng / học sinh    │ │ 300 gia đình đầu tiên hoặc đến  │
│                        │ │                        │ │ 31/12/2026 - khóa giá năm đầu,  │
│ [Chọn gói]             │ │ [Chọn gói]             │ │ đổi lại 1 phiếu góp ý           │
└────────────────────────┘ └────────────────────────┘ │ [Chọn gói]                      │
                                                      └─────────────────────────────────┘
Gói gồm: Luyện tập, Thi thử IOE, Ôn lại câu sai, Đấu trường 1v1, Kiểm tra đầu vào,
sao và huy hiệu, báo cáo cho ba mẹ, đồng bộ nhiều thiết bị.
Anh chị em: giảm 50% từ con thứ 2 (cùng gói).
Giá chưa bao gồm VAT.                                         (caption 14px slate-600)
[💬 Nhắn Zalo tư vấn]   (only if configured - Ruling R-12)
```

- `PLAN_TILE`: `bg-white rounded-3xl p-5 ring-2 ring-slate-200`, hover
  `ring-sky-700`, focus-visible `ring-4 ring-amber-300/60`; price in Baloo 2
  `text-3xl` `text-amber-800` (7.09:1 on white); plan name slate-900; terms
  slate-600 (7.58:1). Tile is one `<button>` (whole tile tappable, min-h
  76px) with `aria-describedby` terms. Layout: 1 col <640px, 3 col ≥768px.
- Order = source-doc order (Mùa thi, Năm học, Founding). **No preselected
  plan, no "best value"/"phổ biến nhất" badge, no remaining-slot counter**
  (no data for it; fake precision ban) - Ruling R-23.
- **No per-day anchor** ("chỉ X đ/ngày"): derived figures are not in the
  source of truth ("KHÔNG bịa số") - Ruling R-10; Sales may add one to
  `01-pricing.md` and the card will show it then.
- Benefit list copied from 01-pricing.md Tier 1 row (wording translated to
  kid-app vocabulary only where the doc's term is internal, e.g.
  "Placement" -> "Kiểm tra đầu vào", "gamification" -> "sao và huy hiệu").

**Payment panel** (after "Chọn gói"):

```
[← Chọn gói khác]
Chuyển khoản - Gói Năm học 399.000đ
┌ PAPER_PANEL ───────────────────────────────────────────────┐
│ [ VietQR image 240×240 ]   Ngân hàng: TPBank               │
│                            Số tài khoản: 0157 9495 001 [Sao chép]
│                            Chủ tài khoản: LE DUY LINH       │
│                            Số tiền: 399.000đ [Sao chép]     │
│                            Nội dung: VS <SĐT ba mẹ> NAMHOC [Sao chép mẫu]
├────────────────────────────────────────────────────────────┤
│ ℹ Đây là chuyển khoản thủ công. Sau khi nhận tiền, VieSchool │
│ đối soát và kích hoạt gói cho tài khoản của bé, rồi báo lại  │
│ ba mẹ qua Zalo trong giờ hành chính. Gói không tự mở ngay   │
│ sau khi chuyển.                                             │
└────────────────────────────────────────────────────────────┘
[💬 Nhắn Zalo sau khi chuyển khoản]   CTA_GOLD (only if configured; else no gold on this view)
```

- Bank details from CR-60 (live on vieschool.com landing). Transfer content
  format `VS <sdt> <goi>` per CR-60 (live reconciliation SOP) with plan codes
  `MUATHI` / `NAMHOC` / `FOUNDING` - Ruling R-11 (ops to confirm codes; the
  pricing doc's "nội dung ghi username" conflicts with CR-60 - Objection O-3).
- VietQR: static, same-origin image `public/payment/vietqr-tpbank.png`
  (reuse the scannable QR already on the landing; `width`/`height` set; alt
  "Mã VietQR tài khoản TPBank 0157 9495 001"). Not amount-encoded, so the
  amount is shown as text + copy. Provenance: "VieSchool-owned" record.
  Requires adding `public/payment/` to the C3 inventory (O-4).
- `COPY_BTN` states: default "Sao chép" -> success "Đã chép ✓" (2s,
  `aria-live`) -> error "Không chép được - ba mẹ chép tay nhé" (clipboard
  denied). 44px.
- Honest activation copy (AC-9.1): no instant-unlock claim, no invented SLA
  (no "trong 24 giờ").
- Analytics: `pricing_opened`, `plan_selected {plan}`,
  `payment_info_viewed {plan}`, `copy_clicked {field}`, `zalo_clicked`.

#### 3.8.b "Chia sẻ thành tích" share card

AC coverage: AC-9.2, privacy matrix row "Achievement share image".

- Entry points: BatchSummary (after ≥1 answered), RoundSummary when a sticker
  unlocked, exam results, Góc ba mẹ section F. On kid surfaces the entry is a
  `BTN_TRAIL_SECONDARY` "🔒 Chia sẻ thành tích" -> ParentGate -> preview sheet.
  **Logged-in only** (guest: hidden - privacy matrix guest = n/a; Ruling
  R-16).
- Image: 1080×1080 PNG generated client-side via Canvas 2D (no new
  dependency); waits `document.fonts.ready`; mascot drawn from the Tier 1 SVG
  (`celebrate`), fallback the Twemoji 🐷 SVG.

```
1080×1080
┌───────────────────────────────────────────┐ navy gradient #0b1224 -> #162C55
│  gold double frame (amber-300 / amber-500) │
│        (Bé Heo celebrate 360px)            │
│   Bé An - Lớp 3                            │ Baloo 2 800, 88px, white (16.24:1)
│   Hoàn thành 4 vòng luyện tập              │ Be Vietnam Pro 700, 52px, amber-100
│   ⭐ 12 sao   🏅 Huy hiệu: Siêu sao          │ Baloo 2 72px amber-300
│   (or) Thi thử Tiếng Anh: 78 điểm          │
│   16/02/2026                               │ 36px slate-300
│   English Arena - ea.vieschool.com         │ 36px amber-200, bottom
└───────────────────────────────────────────┘
```

- PII: first name = last whitespace token of the student display name
  (Vietnamese given name; strips "Bé" prefix like GradeSelect does) + grade.
  No surname, no class, no school, no avatar photo, no user id, no date of
  birth. Achievement text from the event only.
- Share: if `navigator.canShare({ files })` -> native share sheet (Zalo/FB
  appear there on mobile); else "Tải ảnh" (download) + "Sao chép lời chúc"
  (copy text: "Bé An vừa hoàn thành 4 vòng luyện tập trên English Arena!").
  No third-party SDKs or share URLs (constitution #4).
- Preview sheet states: generating (skeleton square + "Đang tạo ảnh..."),
  ready (image `alt` = the achievement sentence), error ("Chưa tạo được ảnh -
  thử lại" + retry), shared/downloaded confirmation.
- Date via shared fixed-timezone formatter (`Asia/Ho_Chi_Minh`, dd/MM/yyyy).

#### 3.8.c0 Weekly digest sections (AC-6.3)

The existing Sunday email worker gains three sections mirroring §3.7 in-app
report (content parity, same Vietnamese register):

1. **Tuần này**: sessions count, minutes total, streak week-days.
2. **Thi thử**: latest mock score + delta vs previous ("78% - tăng 6 điểm").
3. **Nên luyện**: top-3 weakest skills + one suggested session ("Cuối tuần
   này bé nên luyện nghe từ").
Empty states per section: "Chưa có dữ liệu tuần này" line, never blank cells.
Send-failure behavior unchanged (worker logs; no retry loop added this run).

#### 3.8.c "Gửi kết quả cho ba mẹ" gated card

AC coverage: AC-6.1, AC-5.1. Change #5.

- Where: BatchSummary, RoundSummary, and ExamScreen results - **logged-in
  only** (guest unchanged - AC-6.2 deferred), matching PRD "round/exam". Hidden when the parent contact is already
  verified; when saved-but-unverified shows the pending state.
- Card (`CARD_TINT.sky` on navy): "✉️ Gửi kết quả cho ba mẹ" (H3 white),
  "Nhờ ba mẹ nhập email để nhận kết quả mỗi Chủ nhật nhé!" (slate-300),
  button "🔒 Nhờ ba mẹ" (`BTN_TRAIL_SECONDARY`) -> ParentGate -> inline
  `ParentEmailForm` (extracted from ParentReportScreen's CR-31 block, same
  `request_parent_verify` / `confirm_parent_email` RPCs, same testids
  `parent-email-*`), rendered on a `PAPER_PANEL` inside the card.
- States (reused): idle / invalid ("Email chưa đúng định dạng - ba mẹ kiểm
  tra lại nhé.") / saving (button working state "Đang lưu...") / sent ("Đã gửi
  email xác nhận - ba mẹ bấm link trong hộp thư.") / throttled / failed /
  already-verified ("Email đã xác nhận.").

---

### 3.9 Exam hybrid (OM-3=C)

AC coverage: AC-7.1, AC-8.2 (exam interior 44px exception), AC-3.2 scope.
Change #7.

- **Header only** changes: background `#132433` -> brand navy `#101a36`
  (`EXAM_HEADER_BRAND`), bottom border `border-amber-400/70` (gold treasure
  line, replacing amber-800), inline mascot 48px static `idle` left of the
  title. Title text sky-200 on `#101a36` = 12.94:1; timer amber-300 on its
  existing `#0a1520` chip unchanged. NỘP BÀI / KẾT THÚC button: `END_SESSION`
  token (white on sky-700 = 5.93:1; today sky-600 = 4.10:1 fails AA at
  `text-sm`).
- **Interior unchanged**: question layout, option grid, strip navigator,
  `#0d1b26` surface, 44px controls (recorded IOE fidelity exception).
- Mascot behaviour: Thi thử - static idle all session; Luyện đề / Ôn lại -
  pose swap after each verdict (§3.3.b rule 5) and the AC-3.2 sequence in
  the existing verdict strip.
- **Results screen = full brand celebration**: wrapper `CARD` (navy
  gradient, replaces `border-8 border-amber-800/70` wooden frame), `Mascot
  hero` `celebrate` (≥80% correct of answered) or `encourage`; ≥80% fires
  `Confetti` (reduced: static); headline "Kết quả thi thử" H1; points headline
  `SCORE_PILL_LG` (exam keeps points - R-08); three stat tiles (points /
  correct / time) keep testids (`exam-score`); actions: "Xem đáp án (N câu
  sai)" `BTN_TRAIL_SECONDARY`, "Thi lại"/"Luyện lại" `BTN_TRAIL_SECONDARY`,
  then the session fork (§3.10) replacing "Thoát"; Gửi kết quả cho ba mẹ card
  (§3.8.c); Chia sẻ thành tích (§3.8.b). Only the fork's "Chơi tiếp" is gold.
  Target sizes on results: G1-2 76px, G3-5 44px for non-primary.
- Review list unchanged (fidelity of answer review).

---

### 3.10 Session fork "Xong rồi / Chơi tiếp?"

AC coverage: AC-2.4, AC-1.1. Change #14.

```
        Em muốn làm gì tiếp?        [🔊]      H2 + InstructionSpeaker
┌──────────────────┐  ┌──────────────────┐
│ 🏠  Xong rồi      │  │ ▶  Chơi tiếp      │    equal size, 76px+ (96px G1-2), side by side ≥375px
└──────────────────┘  └──────────────────┘
```

| Surface | "Xong rồi" | "Chơi tiếp" |
|---|---|---|
| RoundSummary (not last round) | ends the batch now -> BatchSummary with rewards for answered questions (reuses `onEndBatch`) - `data-testid="round-done"` | next round (`next-round-button`, existing) |
| BatchSummary | back to journey map (`back-to-grades`, existing) | new batch (`practice-again-button`, existing) |
| Exam results | back to StartBatch launchpad | retry same program/mode |
| Guest lock panel | unchanged (login CTA + "Chơi thử lớp khác") | - |

- **No auto-advance**, no countdown, no autoplay of the next round
  (AC-2.4).
- Default emphasis: "Chơi tiếp" = `CTA_GOLD` (next trail step), "Xong rồi" =
  `BTN_TRAIL_SECONDARY` (same size - equal legitimacy, not a hidden exit).
- **Wellbeing swap (should, if data available):** when today's practice time
  ≥15 minutes (research: 15 min/day target), emphasis swaps - "Xong rồi"
  becomes gold, "Chơi tiếp" glass - and the mascot bubble says "Hôm nay em học
  15 phút rồi - giỏi lắm! Nghỉ ngơi chút nhé." (ICO-permitted wellbeing
  nudge). Needs a local "minutes today" accumulator (non-PII) - Tech Lead
  decides in WP-11; if not built, ship without the swap.
- Spoken (G1-2 autoplay): "Em muốn nghỉ hay chơi tiếp nào?"

---

### 3.11 Other kid surfaces touched

- **GradeSelect:** subtitle gets InstructionSpeaker (autoplay G1-2 only when
  the profile's allowed grades are all G1-2; otherwise no autoplay because
  band is unknown before grade pick - Ruling R-29); EngagementBar per §3.5.d;
  parent pill per §3.7; footer external link opens via ParentGate (AC-5.1).
- **BatchScreen chrome:** END_SESSION token (contrast fix); round timer chip
  unchanged (see Objection O-2).
- **AuthScreen:** no redesign (R10 deferral). Only token-level contrast fixes
  if WP-23 finds failures.
- **Question cards:** instruction line + InstructionSpeaker + inline mascot
  (static) in a header row; option tiles G1-2 text `text-2xl`, G3-5
  `text-xl`; all tiles ≥76px (AC-8.2).

---

## 4. Token delta (WP-8)

All new tokens are named exports in `tokens.ts` (or band helpers in
`theme.ts`), documented in DESIGN_SYSTEM.md §3/§6 in the same commit. Ratios
computed with the WCAG formula; translucent fills are alpha-composited onto
the actual navy surface before measuring.

### 4.1 Color / component tokens

| Token | Classes (Tailwind 3.4) | Surface class | Text/UI pair | Ratio | Passes |
|---|---|---|---|---|---|
| `CTA_GOLD` | `min-h-[76px] rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-8 font-display text-2xl font-extrabold text-amber-950 shadow-[inset_0_-5px_0_rgba(0,0,0,0.18),0_8px_20px_-6px_rgba(245,158,11,0.5)] transition hover:-translate-y-0.5 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 motion-reduce:transition-none` (= existing `CONTINUE_BUTTON_CLASSNAME` family) | gold (light) | amber-950 on amber-300 / amber-500 | 10.39 / 6.97 | AAA large, AA body |
| `CTA_GOLD_XL` | `CTA_GOLD` + `min-h-[96px] w-full text-3xl` | gold | same | 10.39 / 6.97 | AAA large |
| `BTN_TRAIL_SECONDARY` | `NAV_PILL` geometry (76px, rounded-full, bg-white/10, ring-white/15) + `text-xl` | navy glass | amber-200 on white/10 over `#162C55` (= `#2d4166`) | 8.19 | AAA |
| `SPEAKER_BTN` | `inline-flex h-[76px] w-[76px] items-center justify-center rounded-full bg-indigo-600 text-3xl text-white ring-4 ring-indigo-300/60 shadow-md transition active:scale-95 focus:outline-none focus-visible:ring-amber-300/60 motion-reduce:transition-none` | indigo disc on navy | white glyph on indigo-600; ring indigo-300 vs `#162C55` (non-text) | 6.29; 6.91 | AA / ≥3:1 UI |
| `CHIP_VOICE` | `CHIP_BASE bg-indigo-500/20 text-indigo-200 ring-indigo-400/40` | navy only | indigo-200 on indigo-500/20 over `#0E1F42` (= `#1f2d65`) | 8.68 | AAA |
| `SHEET` | `CARD` gradient, `rounded-t-3xl sm:rounded-3xl`, backdrop `bg-[#0b1224]/70` | navy | white on `#162C55`; slate-300 on `#162C55` | 13.77; 9.27 | AAA |
| `TRAIL_TILE` | `min-h-[96px] rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/15 hover:bg-white/15 focus-visible:ring-4 focus-visible:ring-amber-300/60` (G3-5: `min-h-[76px]`) | navy glass | white label / slate-300 status on white/10 over `#162C55` (= `#2d4166`) | 10.20 / 6.87 | AAA label / AA status line |
| `STAR_SLOT_ON` / `STAR_SLOT_OFF` | 56px disc, on: `bg-gradient-to-b from-amber-300 to-amber-500 ring-4 ring-amber-200/80`; off: `bg-white/5 ring-2 ring-white/30` + "☆" | earned treasure / empty | ring/glyph only; meaning also in text "Em được 2 sao" | n/a (non-text, text duplicate) | - |
| `GIFT_BOX` | 112px (G1-2) / 96px (G3-5) `rounded-3xl bg-[#162C55] ring-4 ring-amber-300` + 🎁 at `text-6xl`; disabled `opacity-40` | navy + gold ring | amber-300 ring vs `#162C55` | 9.55 | ≥3:1 UI |
| `OPTION_PICKED_WRONG` | `outline-dashed outline-4 outline-offset-2 outline-rose-300` (Tailwind has no dashed ring) + ✗ badge `bg-rose-300 text-rose-950` | navy tile | outline rose-300 vs `#162C55` (UI); badge rose-950 on rose-300 | 7.28; 8.27 | ≥3:1 UI / AAA |
| `OPTION_REVEAL_CORRECT` | `ring-4 ring-emerald-400` + ✓ badge `bg-emerald-300 text-emerald-950` | navy tile | emerald-400 vs `#162C55`; badge emerald-950 on emerald-300 | 7.16; 9.94 | ≥3:1 UI / AAA |
| `FEEDBACK_LEARN` | `CARD_TINT.sky` (existing) | navy translucent | white headline / emerald-300 answer / sky-300 IPA on sky-500/15 over `#162C55` (= `#153e6b`) | 10.86 / 7.13 / 6.52 | AAA / AAA / AA (IPA is supplementary) |
| `DISCLOSURE_BTN` | `NAV_PILL_SM` (G3-5) / `NAV_PILL` (G1-2) + chevron | navy glass | amber-200 on `#2d4166` | 8.19 | AAA |
| `END_SESSION` | existing end-session classes with `bg-sky-700 hover:bg-sky-800` (hover darkens - sky-600 hover measured 4.10:1 < 4.5 at `text-sm`, rejected) | solid sky | white on sky-700 rest / white on sky-800 hover | 5.93 / 8.59 | AA (fixes 4.10 fail) |
| `BTN_DRILL` / `BTN_EXAM` / `BTN_ADVANCED` | `bg-emerald-700` / `bg-sky-700` / `bg-rose-700`, white text | solid | white on each | 5.48 / 5.93 / 6.29 | AA (fixes 3.77 / 4.10) |
| `PAPER_PANEL` | `rounded-2xl bg-sky-50 p-5 ring-1 ring-sky-100` (gate uses `bg-white`) | **light** | slate-700 body / slate-600 caption / slate-900 heading on sky-50 | 9.71 / 7.11 / ≥17 | AAA |
| `PAPER_ACCENT` text | `text-sky-800` | light | on sky-50 | 7.09 | AAA |
| `PAPER_TREND_UP` text | `text-emerald-800` | light | on sky-50 | 7.21 | AAA |
| `PAPER_PROGRESS` text/bar | `text-amber-800` / bar `bg-amber-700` | light | text on sky-50 / bar vs sky-50 | 6.65 / 4.71 | AA / ≥3:1 UI |
| `PAPER_CHART` | bars `bg-sky-600`, line/dots `stroke-sky-700`, axis text `slate-600` (slate-500 measured 4.46:1 < 4.5 text floor, rejected) | light | vs sky-50 | 3.84 UI-bar / 5.57 UI-line / 7.11 axis-text | bars/line ≥3:1 UI; axis text AA |
| `PLAN_TILE` | `rounded-3xl bg-white p-5 ring-2 ring-slate-200 hover:ring-sky-700 focus-visible:ring-4 focus-visible:ring-amber-300/60 min-h-[76px]`; price `font-display text-3xl text-amber-800` | light | amber-800 / slate-900 / slate-600 on white | 7.09 / 17.85 / 7.58 | AAA |
| `GATE_KEY` | `h-14 w-14 rounded-xl bg-white text-2xl font-bold text-slate-900 ring-2 ring-slate-500 active:bg-slate-100 focus-visible:ring-4 focus-visible:ring-amber-300/60` | light | slate-900 on white; ring slate-500 vs white (non-text) | 17.85; 4.76 | AAA / ≥3:1 UI |
| `BTN_PAPER_SECONDARY` | `min-h-[44px] rounded-full bg-white px-5 text-base font-bold text-sky-800 ring-2 ring-sky-700` | light | sky-800 on white; ring sky-700 vs white | 7.56; 5.93 | AAA |
| `COPY_BTN` | `BTN_PAPER_SECONDARY` small (`text-sm px-3`) | light | as above | 7.56 | AAA |
| `EXAM_HEADER_BRAND` | `bg-[#101a36] border-b-4 border-amber-400/70` | navy | white / amber-300 / sky-200 on `#101a36` | 17.17 / 11.91 / 12.94 | AAA |

Palette check: every value above is from the approved navy hexes or Tailwind
amber/sky/emerald/rose/indigo/slate ramps (DESIGN_SYSTEM §12). `#101a36` is
already in the approved navy list.

Pre-existing failures found during audit (fixed by tokens above, listed for
WP-23 traceability): start CTA white on emerald-400->600 (1.92-3.77); exam
program buttons white on emerald-600 (3.77) / sky-600 (4.10) at `text-sm`;
end-session white on sky-600 (4.10) at `text-sm`; report captions slate-500
on `#16232e` (3.36).

Ruling R-02 (start CTA colour): "Chơi" moves from emerald to `CTA_GOLD_XL`.
Rationale: (1) concept - gold is "your next step" across the whole trail
(CONTINUE is already gold), (2) for pre-readers emerald must mean only
"correct" so the verdict signal stays unambiguous, (3) contrast - the
emerald gradient with white text fails; a passing emerald variant would need
dark text, which then looks like a different button family. Status semantics
are not remapped (emerald still = correct/go wherever it appears).

### 4.2 Motion tokens (new keyframes in `index.css`, all with `motion-reduce` pairs)

| Name | Property | Duration / easing | Use | Reduced-motion fallback |
|---|---|---|---|---|
| `speaker-pulse` | ring element `transform: scale(1→1.25)`, `opacity .6→0` | 1.2s ease-out infinite while playing | InstructionSpeaker `playing`/`blocked` | static `ring-8 ring-indigo-300/70` + "Đang đọc" label |
| `sheet-up` | `translateY(100%→0)` + opacity | 220ms cubic-bezier(.2,.8,.2,1) | ExploreSheet, share sheet (mobile) | instant |
| `trail-glow` | pseudo-element over CTA, `opacity 0→.5→0` | 2 × 900ms | `unavailable` speaker pointer | static `ring-4 ring-amber-200` for 2s |
| `lid-pop` | `translateY(0→-24px) rotate(0→-12deg)` | 300ms spring (cubic-bezier(.34,1.56,.64,1)) | gift open | opened state instant |
| `item-rise` | `translateY(16px→0)` + opacity | 300ms ease-out, 150ms delay | gift item | instant |
| `item-home` | `translate` toward home strip + `scale(1→.6)` | 500ms ease-in-out | gift place | item shown in home |
| reuse `chest-wiggle`, `stars-pop`, `sticker-chip-in`, `tile-shake`, `mascot-float`, `confetti-burst` | existing | existing | existing | existing `motion-reduce` |

Duration scale (documented): fast 150ms (press), base 220-300ms
(sheet/lid/rise), emphasis 500-1200ms (reward/voice). Only transform/opacity.

### 4.3 Typography tokens + glyph audit

**Glyph audit (measured, not assumed).** Method: fontTools decoded the
shipped woff2 files in `public/fonts/` and rasterized `a`, `g`, `ạ`, `I`,
`l`, `1` outlines (even-odd fill, 24×28 grid); GSUB feature list inspected for
stylistic alternates.

| Font (file) | `a` | `g` | `I` vs `l` | alternates (GSUB) | Verdict |
|---|---|---|---|---|---|
| Baloo 2 700 (`baloo-2-latin-700-normal.woff2`) | **double-storey** | single-storey | n/a (display) | none (`dnom frac liga locl numr tnum`) | fails infant-`a` -> display only (numbers, headings, scores), never reading text or English answer words |
| Be Vietnam Pro 400 (latin + vietnamese subsets) | **single-storey** (incl. `ạ`) | single-storey | **identical bars** (no tail on `l`, no serifs on `I`) | none (`ccmp dnom frac liga locl numr`) | passes AC-8.1 single-storey a/g trigger; has an `I`/`l` homoglyph risk |

AC-8.1's literal trigger (single-storey a/g missing in the *reading* font) is
**not met** - Be Vietnam Pro already has infant a/g, so Vietnamese reading
text stays on Be Vietnam Pro. However the audit found an `I`/`l` homoglyph
that matters exactly where a G1-2 learner decodes English letters ("I like",
"lion", extra-letter and spelling rounds).

Options matrix (Andika):

| Option | Strengths | Weaknesses | Risk |
|---|---|---|---|
| A. No Andika | zero bytes, no change | `I`/`l` identical in English letter tasks for pre-readers | comprehension errors in spelling/extra-letter rounds |
| **B. Andika (OFL, SIL) for English letter-level content on G1-2 only** (option tiles with English words, spelling/extra-letter letter tiles, English prompt words) | purpose-built literacy forms (tailed `l`, serifed `I`, single-storey a/g), full Vietnamese coverage, OFL fits constitution #3 | +1 font file (latin subset, Regular + Bold, `font-display: swap`, lazy-applied via class), font-switch inside one screen | low; perf within budget |
| C. Andika for all reading text | maximal consistency | contradicts AC-8.1 trigger (not met), loses shared VieSchool body face, bigger download | brand drift |

**Ruling R-01: B**, recorded as the "glyph audit rationale" required by
AC-8.1 and change #12 - flagged for human confirmation at the Design gate
because it goes beyond the literal trigger. Asset: `public/fonts/andika/`
(woff2 latin + vietnamese subsets, 400/700, `OFL.txt`), attribution record.

Type tokens:

| Token | Classes | Use | Pair / ratio |
|---|---|---|---|
| `PROMPT_G12` | `text-2xl leading-relaxed text-amber-100` (24px) | G1-2 instruction/prompt text on navy | amber-100 on `#0E1F42` 14.58 / on `#162C55` 12.36 (AAA) |
| `PROMPT` (existing) | `text-xl text-amber-100` (20px) | G3-5 prompts | same ratios |
| `OPTION_TEXT_G12` | `text-2xl font-bold` (24px) | G1-2 option tiles | per tile surface (existing tiles) |
| `OPTION_TEXT_G35` | `text-xl font-bold` (20px) | G3-5 option tiles | - |
| `READ_LETTERS_G12` | `font-reading text-2xl` | English letter-level content on G1-2 (R-01) | - |
| `PARENT_BODY` | `text-base text-slate-700` | parent paper body | 9.71 on sky-50 |
| `PARENT_CAPTION` | `text-sm text-slate-600` (14px floor) | parent captions | 7.11 on sky-50 |
| Tailwind `fontFamily.reading` | `['Andika', '"Be Vietnam Pro"', 'ui-sans-serif', 'sans-serif']` | - | - |

Sizes step from 24px (G1-2) to 20px (G3-5) to 16px body floor, matching the
research guidance (~18-24px G1-2 -> ~16px G5). Sentence case everywhere;
left-aligned reading text (bubble text left-aligned inside the bubble even
when the card is centered); no justified text. Existing uppercase "KẾT THÚC"
/ "NỘP BÀI" labels are 2-word action labels (CR-55 contract), not passages -
kept (Ruling R-24).

### 4.4 Band helpers (`theme.ts`)

```
bandForGrade(gradeId?: string | null): 'g12' | 'g35'
BAND = {
  g12: { prompt: PROMPT_G12, optionText: OPTION_TEXT_G12, ctrlMin: 'min-h-[76px]', autoPlay: true,  mascotHero: 160 },
  g35: { prompt: PROMPT,     optionText: OPTION_TEXT_G35, ctrlMin: 'min-h-[44px]', autoPlay: false, mascotHero: 128 },
}
```

---

## 5. Accessibility spec

AC coverage: AC-1.4, AC-3.3, AC-8.1, AC-8.2, AC-8.3, AC-5.1.

### 5.1 Targets per band

| Band / surface | WCAG target | Contrast target | Touch targets | Notes |
|---|---|---|---|---|
| K-A G1-2 kid surfaces | 2.2 AA + AAA 1.4.6 on reading text | ≥7:1 prompts, options, CTA labels; ≥4.5 everything else; ≥3:1 UI boundaries | **all interactive ≥76px** (AC-8.2, DOM box e2e) | voice for every instruction; one primary per screen |
| K-B G3-5 kid surfaces | 2.2 AA + AAA on prompts | ≥7:1 prompts; ≥4.5 rest | option tiles ≥76px; other controls ≥44px | - |
| Exam hall interior | 2.2 AA | ≥4.5 | ≥44px (recorded IOE fidelity exception) | header follows kid rules except mascot static |
| Parent (gate, report, pricing, payment) | 2.2 AA | ≥4.5 body (achieved ≥6.65), ≥3:1 charts/UI | ≥44px | text ≥14px; charts have sr-only tables |

### 5.2 Keyboard + screen reader

- Tab order follows the trail: back -> speaker -> primary CTA -> secondary.
- `:focus-visible` rings only (`focus-visible:ring-4 ring-amber-300/60`); no
  focus ring on mouse click.
- Dialogs (ExploreSheet, ParentGate, share preview): `role="dialog"`,
  `aria-modal`, labelled, focus trap, `Esc` closes, focus returns to opener.
- ExploreSheet tiles: native buttons in a list; Arrow keys optional (≤8
  tiles, Tab is sufficient - Ruling R-30).
- Gift boxes: three native buttons in a labelled group; after pick, the other
  two are `disabled`; result announced via `aria-live="polite"`.
- Feedback panels: `aria-live="polite"`; option verdict also exposed as text
  ("Đáp án đúng: cat") - never colour alone (✓/✗ badge + ring + text).
- InstructionSpeaker: accessible name per state (§3.2), `aria-pressed` while
  playing. For screen-reader users the instruction text is real DOM text, so
  voice is additive, not the only channel.
- Mascot: `role="img"` + state label; decorative accents `aria-hidden`.
- Charts: sr-only data table + summary sentence.
- Live regions limited to one polite region per screen to avoid chatter.

### 5.3 Parent-gate accessibility

- Arithmetic is presented as real text (screen-reader readable for adult SR
  users); numeric keypad + physical keyboard both work; no time limit to
  answer; "Đổi câu khác" for a fresh question; 10s cooldown only after 3
  consecutive misses, with visible countdown text.
- Intentionally not voiced and not icon-solvable: this is the documented
  exception to "every instruction voiced" (AC-1.1 scopes kid instructions;
  the gate is an adult instruction).
- WCAG 3.3.8 (Accessible Authentication) does not apply (not an
  authentication step), but the design still avoids memory/transcription:
  the question stays visible while answering.

### 5.4 Reduced-motion table (AC-3.3, constitution #6)

| Element | Full motion | `prefers-reduced-motion: reduce` |
|---|---|---|
| Mascot idle bob / wave | `mascot-float`, wave | static pose SVG |
| Mascot celebrate (Tier 2 Lottie) | one-shot 1.2s | static celebrate SVG (EmojiVisual lottie->svg rule) |
| Speaker playing | `speaker-pulse` | thick static ring + "Đang đọc" |
| Speaker blocked cue | pulse + chip | static chip |
| Trail glow (no-voice pointer) | `trail-glow` | static ring 2s |
| Explore/share sheet | `sheet-up` | instant |
| Wrong tile | `tile-shake` | none; ✗ badge + outline instantly |
| Correct reveal | scale 1.04 | ring + ✓ instantly |
| Confetti | `confetti-burst` | static star row |
| Star rain / chest | `star-drop`, `chest-wiggle`, `stars-pop` | final counts shown (existing ChestReveal branch) |
| Gift boxes | wiggle -> lid-pop -> item-rise -> item-home | opened box + item + item already in home |
| Skeleton loaders | `animate-pulse` | static blocks |
| Gate pass check | 300ms fade | instant |

---

## 6. State matrix (new / changed components)

| Component | default | hover | focus-visible | active | disabled | loading | empty | error | success |
|---|---|---|---|---|---|---|---|---|---|
| CTA_GOLD(_XL) | gold | lift -0.5 | amber ring | scale-95 | opacity-50, no lift | label "Đang mở..." | - | - | - |
| BTN_TRAIL_SECONDARY | glass | bg-white/15 + amber ring/50 | amber ring | scale-95 | opacity-50 | - | - | - | - |
| InstructionSpeaker | idle | ring brightens | amber ring | scale-95 | - (never disabled) | playing | - | blocked / unavailable | - |
| ExploreSheet | closed | - | trap | - | - | tile skeleton (rare) | card empty copy | card error copy | - |
| TRAIL_TILE | glass | bg-white/15 | amber ring | scale-95 | hidden (not disabled) when role-gated | - | status line hidden | - | - |
| GIFT_BOX | wiggle | ring brightens | amber ring | scale-95 | opacity-40 (after pick) | - | moment skipped (pool empty) | moment skipped (store error, stickers still shown) | opened + item |
| ParentGate | question | key hover bg-slate-50 | amber ring | key bg-slate-100 | OK disabled <2 digits / cooldown | - | - | wrong (alert) | pass check |
| Report sections A/B | data | - | - | - | - | skeleton | empty copy | error + Thử lại | - |
| Guest teaser | lock + CTA | - | - | - | - | - | - | - | - |
| PLAN_TILE | white | ring sky-700 | amber ring | scale-[.98] | - | - | - | - | - |
| COPY_BTN | "Sao chép" | ring darker | amber ring | scale-95 | - | - | - | "Không chép được..." | "Đã chép ✓" |
| Share preview | - | - | trap | - | share hidden if no logged-in | "Đang tạo ảnh..." | - | retry | shared/downloaded |
| ParentEmailForm | idle | - | ring | - | Lưu disabled while saving | "Đang lưu..." | - | invalid / failed / throttled | sent / verified |
| Session fork | 2 buttons | per token | amber ring | scale-95 | - | - | - | - | - |
| DISCLOSURE_BTN | collapsed | glass hover | amber ring | scale-95 | - | - | - | - | expanded |
| Mascot | idle | - | - | - | - | think | - | emoji fallback | celebrate |

---

## 7. Responsive behaviour

| Breakpoint | Launchpad | Sheet | Fork | Report | Pricing |
|---|---|---|---|---|---|
| 375 (mobile) | single column; mascot 160/128 + bubble stacked (bubble under mascot at <400px); CTA full width | bottom sheet 85vh, 2-col tiles (1-col <360) | side by side (each ≥160px wide, 96px tall G1-2) | single column, charts full width | 1 col tiles |
| 768 (tablet) | mascot left / bubble right; CTA full width of `max-w-2xl` | centered dialog `max-w-xl`, 2-col tiles | side by side | single column | 3 col tiles |
| 1280 (desktop) | same as 768 (content capped at `max-w-2xl`) | same | same | same | same |
| short landscape (`max-height:420px`) | mascot 96px, CTA 76px, bubble 1-line clamp with speaker | sheet 90vh | side by side 76px | - | - |

Vietnamese text-expansion headroom: every label above was sized for ≥30%
growth; no fixed-width text containers; CTA labels ≤3 words.

---

## 8. Microcopy deck (vi, hyphen-only)

| Key | Display | Spoken (vi-VN, G1-2 autoplay) |
|---|---|---|
| launch.g12.bubble | Mình cùng chơi 4 trò nhỏ nhé! Bấm Chơi nào! | Mình cùng chơi bốn trò nhỏ nhé. Bấm nút Chơi màu vàng để bắt đầu! |
| launch.g35.bubble | Sẵn sàng phiêu lưu chưa? | (tap only) Sẵn sàng phiêu lưu chưa? Bấm Chơi để bắt đầu nhé. |
| launch.cta | Chơi | - |
| launch.explore | Khám phá | - |
| launch.exam | Thi & luyện đề | - |
| sheet.title | Khám phá | Chọn một góc để khám phá nhé! |
| speaker.blocked | Bấm để nghe | - |
| speaker.unavailable.sr | Máy chưa có giọng đọc - làm theo nút sáng nhé | - |
| fb.wrong.head | Mình cùng xem lại nhé! | Mình cùng xem lại nhé. Đáp án đúng là... |
| fb.wrong.answer | Đáp án đúng: {word} | - |
| fb.demo | Nghe mẫu | - |
| fb.retry | Thử lại | - |
| fb.retry.ok | Đúng rồi! Em nhớ rồi đó! | - |
| fb.next | Câu tiếp | - |
| round.stars | Em được {n} sao! | Em được {n} sao! |
| round.zero | Em đã chơi hết vòng này - giỏi lắm! Vòng sau mình cùng lấy sao nhé. | same |
| batch.head | Hoàn thành rồi! | Hoàn thành rồi! Em giỏi quá! |
| gift.offer | Em mở được quà! Chọn một hộp nhé! | same |
| gift.got | Em nhận được {item}! | same |
| gift.home | {item} đã vào nhà của {pet}! | same |
| fork.q | Em muốn làm gì tiếp? | Em muốn nghỉ hay chơi tiếp nào? |
| fork.done | Xong rồi | - |
| fork.more | Chơi tiếp | - |
| fork.wellbeing | Hôm nay em học 15 phút rồi - giỏi lắm! Nghỉ ngơi chút nhé. | same |
| streak.chip | Tuần này: {n} buổi | - |
| streak.goal | Học 3-4 buổi mỗi tuần là tuyệt rồi! | - |
| streak.back | Chào em quay lại! Mình học tiếp nhé. | same |
| gate.title | Dành cho ba mẹ | (not spoken) |
| gate.body | Để tiếp tục, ba mẹ giải phép tính: | (not spoken) |
| gate.wrong | Chưa đúng - ba mẹ thử câu khác nhé. | - |
| gate.cooldown | Thử lại sau {s} giây | - |
| parent.pill | Góc ba mẹ | - |
| report.guest | Đăng nhập để xem đầy đủ | - |
| report.error | Chưa tải được dữ liệu - kiểm tra mạng rồi thử lại. | - |
| pricing.title | Nâng cấp English Arena | - |
| pricing.vat | Giá chưa bao gồm VAT. | - |
| pay.manual | Đây là chuyển khoản thủ công. Sau khi nhận tiền, VieSchool đối soát và kích hoạt gói cho tài khoản của bé, rồi báo lại ba mẹ qua Zalo trong giờ hành chính. Gói không tự mở ngay sau khi chuyển. | - |
| share.btn | Chia sẻ thành tích | - |
| send.card | Gửi kết quả cho ba mẹ | Nhờ ba mẹ nhập email để nhận kết quả mỗi Chủ nhật nhé! |

Voice & tone: warm ("em", "nhé", "mình cùng"), process praise over
person praise, never deficit framing on kid surfaces; parent copy factual and
plain (no hype, no scarcity).

---

## 9. Domain UX Benchmark rubric (WP-9)

- **Domain:** education / children's language learning (constitution Domain
  Pack).
- **Standard anchor:** Khan Academy Kids + Duolingo ABC class (constitution
  "Domain UX anchor"; research-kids-ux benchmark skeleton). Ruling R-31: no
  official children's design system exists (unlike GOV.UK/NHS), so the anchor
  is the research-documented pattern set; the anchor scores **5** on every
  dimension by definition.
- **Scale:** 1 = absent/harmful, 2 = present but weak, 3 = adequate, 4 =
  strong (anchor pattern implemented with minor gaps), 5 = anchor-equivalent.
- Declared **before** implementation; re-scored at WP-25 against the shipped
  build by a second evaluator (Design Lead), per-item with evidence.

| # | Dimension | What 5 looks like (anchor) | Current app (score + evidence) | Target after this spec | Measured check |
|---|---|---|---|---|---|
| D1 | Voice guidance | every instruction tappable + read aloud, autoplay once, pulse sync, no dead end without audio | **2** - English content audio is strong (CR-19 pre-rendered, slow mode), but zero Vietnamese instruction voice, no vi-VN, no speaker on instructions | **4** (vi-VN TTS quality is browser-dependent, no pre-rendered vi assets this run) | WP-21 grade-1 no-reader matrix: every instruction surface has `instruction-speaker`; audio-absent run completes |
| D2 | Feedback quality | gentle sound, outcome highlight, demo/retry, process praise | **3** - soft two-tone sfx (CR-20), correct word + IPA + picture + explanation, encouraging mascot; but rose panel + strikethrough, advance-only, no retry/demo | **4** | e2e: wrong answer shows correct-tile highlight + `Nghe mẫu` + `Thử lại`; scoring unchanged |
| D3 | Reward design | one kid currency, collectible with a home, agency, forgiving habit | **2** - stars + points + XP + streak + stickers + pet + chest compete; no collectible home; streak copy is consecutive-day achievement framing (e.g. 'chuỗi N ngày'), no forgiveness framing - pressure-adjacent but no explicit loss threat found in copy scan | **4** | DOM: no points/XP gold fill on kid summaries; gift moment once per unlock; copy scan clean |
| D4 | Choice architecture | one primary per screen for pre-readers; guided path + free-choice area | **1** - ~20+ interactive elements on StartBatch for a G1 child | **5** | DOM count G1-2 = 4, G3-5 ≤6 |
| D5 | Character system | expressive character with emotional states that guides verbally, never guilt | **2** - emoji pig, mood shown only by accent emoji/animation, no voice | **4** (Tier 1 SVG; 5 needs Lottie Tier 2 + mascot-voiced lines) | state attr ∈ 4 approved; asset review checklist |
| D6 | Parent surfaces | gated parent area, progress + stuck + next, remote/email reach, clear purchase | **2** - ungated pill; report reads the LOCAL engagement store (server engagement_state sync exists for logged-in accounts but the screen does not consume it); no trend/minutes; no purchase path | **4** (5 needs remote view - CR-70) | WP-22 funnel e2e: gate -> report -> pricing -> payment ≤2 steps; denial tests |
| D7 | Typography for readers | infant glyphs, band-scaled sizes, sentence case, no homoglyphs in letter tasks | **3** - Be Vietnam Pro single-storey a/g (measured), 20px prompts; but I/l homoglyph, text-xs captions, uppercase labels | **4** | token audit: G1-2 prompts 24px; Andika on letter content; no text-xs on kid/parent |
| D8 | Visual authored-ness | owned illustration style, consistent world, signature motion | **3** - coherent navy/gold shell + authored land strips (SVG), but stock emoji mascot/rewards | **4** | concept falsification test (§2) passes on all kid routes |
| | **Total** | **40** | **18 / 40 = 45%** | **33 / 40 = 82.5%** | |

**Declared floor (release criterion for the benchmark metric):** total
**≥32/40 (80% of anchor)**, AND no dimension below 3, AND D1, D2, D4 (the
pre-reader-critical dimensions) each ≥4. Measured gates that must also be
green regardless of score: 0 serious axe violations per route; every text
pair ≥AA measured; 100% G1-2 interactive targets ≥76px; gold budget rule
holds on every kid route.

Known gaps vs anchor (not closed this run): no pre-rendered vi-VN voice
(quality varies by device), no mascot-voiced character lines, no drag-arrange
home, no parent remote view (CR-70), no Lottie unless Tier 2 lands.

---

## 10. AC -> spec traceability (for RTM)

| AC | Spec section(s) |
|---|---|
| AC-1.1 | §3.2, §3.1, §3.10, §3.11 |
| AC-1.2 | §3.2 (speakInstruction vi-VN) |
| AC-1.3 | §3.2 states `playing` / `blocked` |
| AC-1.4 | §3.2 `unavailable` + rule 4, §5.4 |
| AC-2.1 | §3.1.a, §3.1.c |
| AC-2.2 | §3.1.b |
| AC-2.3 | §3.1.c close paths |
| AC-2.4 | §3.10 |
| AC-3.1 | §3.3.a |
| AC-3.2 | §3.4 |
| AC-3.3 | §5.4, §3.3.c |
| AC-4.1 | §3.5.a |
| AC-4.2 | §3.5.b, §3.5.c |
| AC-4.3 | §3.5.d |
| AC-4.4 | §3.5.b determinism rule |
| AC-5.1 | §3.0 gated list, §3.6 |
| AC-5.2 | §3.7 |
| AC-5.3 | §3.7 data contract (denial rendered as error; tests in WP-22) |
| AC-6.1 | §3.8.c |
| AC-6.2 | deferred (CR-70) - no spec this run |
| AC-6.3 | §3.7 sections A-C mirror the email digest sections (content parity) |
| AC-7.1 | §3.9 |
| AC-8.1 | §4.3 |
| AC-8.2 | §5.1, tokens §4.1 |
| AC-8.3 | §4.3, §8 |
| AC-9.1 | §3.8.a |
| AC-9.2 | §3.8.b |
| AC-9.3 / R10 | out of scope (CR-70); no landing spec here |

---

## 11. Handoff notes for Tech Lead (WP-11)

1. `speech.ts`: add `speakInstruction` (vi-VN voice pick) and an `'ended'`
   playback status (pulse sync).
2. Engagement store: `homeItems: string[]` (+ optional `minutesToday`);
   confirm `engagement_state` JSON carries them without schema change; no PII.
3. Report data: owner-scoped queries on `results` (minutes, program rows) -
   RLS/fitness function per plan privacy section.
4. Asset dirs `public/mascot/`, `public/payment/`, `public/fonts/andika/` ->
   extend `check-attribution.mjs` inventory and constitution C3 text.
   **Dependency (flagged by Design Lead):** constitution C3/#3 amendment is a
   formal approval item - resolved at the human design gate (see §13 O-4).
   Tech Lead implements inventory changes ONLY after that approval is
   recorded; fallback if denied = emoji-tier assets only (no new dirs,
   no Andika).
5. Gate pass token: in-memory module state, 5-minute TTL.
6. Share image: Canvas 2D + Web Share API level 2; no new dependency.
7. Feature flag: recommend `VITE_UX_V2` around launchpad + feedback changes
   (largest e2e selector churn) - Tech Lead decides per plan.

---

## 12. Rulings index

| ID | Ruling |
|---|---|
| R-01 | Andika added for English letter-level content on G1-2 only (Option B); Vietnamese reading stays Be Vietnam Pro. Human confirmation requested. |
| R-02 | "Chơi" CTA uses gold (`CTA_GOLD_XL`), not emerald. |
| R-03 | Parent gate = arithmetic in Vietnamese words (6-9 tables) with numeric keypad; not hold-3s. |
| R-04 | Gift boxes: hidden contents, equal-value free cosmetics, deterministic, unpicked never revealed. |
| R-05 | Mascot license class `LicenseRef-VieSchool-Owned` with generator provenance; new asset dirs added to C3 inventory (needs constitution amendment, see O-4). |
| R-06 | Retry is ungraded; first attempt is scored. |
| R-07 | AC-3.2 sequence applies to BatchScreen + ExamScreen `practice` and `review`; not `exam`. |
| R-08 | Exam results keep points as headline (AC-4.1 scopes batches). |
| R-09 | Kid streak chip = rolling-7-day session count from existing snapshot. |
| R-10 | No per-day price anchor (not in source of truth). |
| R-11 | Transfer content `VS <sdt> <goi>` with codes MUATHI/NAMHOC/FOUNDING (ops to confirm). |
| R-12 | Zalo buttons render only when a Zalo URL is configured; otherwise hidden (no dead controls). |
| R-13 | Gate pass shared across gated surfaces for 5 minutes, in memory only. |
| R-14 | G1-2 launchpad may show a non-interactive grade/land H2. |
| R-15 | G3-5: speaker visible, no autoplay (the speaker is the opt-in). |
| R-16 | Share card logged-in only; first name = last token of display name. |
| R-17 | RoundSummary also gets the fork ("Xong rồi" ends the batch with earned rewards). |
| R-18 | No-vi-voice -> speaker `unavailable` state that points to the CTA (not hidden). |
| R-19 | Mascot moods renamed to the 4 approved states; `data-mascot-state` replaces `data-mascot-mood`. |
| R-20 | Wrong-feedback panel uses sky tint; rose only on the picked-tile marker; no strikethrough, no side-stripe bar. |
| R-21 | Next-session suggestion is text-only (no routing from the parent surface). |
| R-22 | VAT footnote shown as the source doc states (see O-1). |
| R-23 | No preselected plan, no "best value" badge, no slot counter. |
| R-24 | "KẾT THÚC"/"NỘP BÀI" uppercase labels kept (2-word labels, not passages). |
| R-25 | One gift moment per summary even if several stickers unlock. |
| R-26 | Sheets push no history entry; browser back behaves as today. |
| R-27 | InstructionSpeaker is 76px in both bands. |
| R-28 | Keep existing `wrong.mp3` (soft two-tone); Tester verifies duration/character. |
| R-29 | GradeSelect autoplays only when all allowed grades are G1-2. |
| R-30 | Sheet tiles use Tab navigation; no arrow-key roving (≤8 native buttons). |
| R-31 | Benchmark anchor = research pattern set (no official kids design system); anchor = 5/dimension. |

## 13. Objections (advisory - human decides)

- **O-1 Pricing is DRAFT and there is no entitlement.** `01-pricing.md`
  header says "DRAFT, giá đề xuất chờ founder chốt", and its PO risk #1 says
  free accounts may already get full features. The card can display only what
  the doc says and must not promise an unlock, so the purchase value may be
  unclear to parents. Also "Giá chưa bao gồm VAT" on a B2C consumer card may
  conflict with consumer price-listing expectations. *Recommendation:* founder
  confirms final B2C prices, VAT wording and what paid adds before WP-19c
  ships; design needs no change (single constant + copy key).
- **O-2 Visible 5-minute round timer on G1-2** (BatchScreen `RoundTimer`) is a
  time-pressure cue the research lists as a dark-pattern risk for this age.
  Not in any AC, so not changed here. *Recommendation:* CR to hide the timer
  chip on G1-2 (keep the timer logic).
- **O-3 Transfer-content conflict:** `01-pricing.md` says "nội dung ghi
  username"; CR-60 (live) says `VS <sdt> <goi>`. Spec follows CR-60 (R-11).
  *Recommendation:* ops picks one and updates the other doc.
- **O-4 Constitution text vs OM-4 ruling:** constitution #3 lists allowed
  licenses CC0/CC-BY/OFL/MIT and C3 lists three asset dirs; the OM-4 owned
  AI-generated mascot, the payment QR and the Andika font dir need an
  amendment (owned-license class + `public/mascot/`, `public/payment/`,
  `public/fonts/andika/`). Constitution #1 also still names "học sinh lớp 2"
  as the audience while this run covers G1-5. *Recommendation:* amend the
  constitution at the Design gate so later gates don't block on the text.
- **O-5 Zalo OA/number not in repo** (launch plan lists it as an ops todo).
  Spec hides Zalo buttons until configured (R-12); the ≤2-step purchase
  intent is still met through the payment panel.
- **O-6 vi-VN voice availability** varies (many Android/Chrome installs lack a
  vi-VN voice). AC-1.4 degrade is specified, but D1 cannot reach 5 without
  pre-rendered vi-VN instruction audio. *Recommendation:* CR for pre-rendered
  vi-VN instruction clips (same pipeline as CR-19).

## 14. Human-gate rulings (2026-02-16)

- O-4 = **APPROVED**: constitution amended - new dirs `public/mascot/`,
  `public/payment/`, `public/fonts/andika/`; license class "owned/generated"
  added; audience text grade 2 -> G1-5. Tech Lead may implement.
- O-3 = **CR-60 format**: transfer note `VS <sdt> <goi>` on pricing card.
- R-01 = **CONFIRMED**: Andika for English letter-level content on G1-2 only.
- O-1 = **APPROVED**: pricing card shows `01-pricing.md` draft prices with
  "chưa bao gồm VAT" note.
- O-2 = **KEEP TIMER**: 5-min round timer unchanged for all bands (IOE
  discipline intent).
- O-5 standing: Zalo buttons hidden until OA/hotline configured.
- O-6 -> CR backlog: pre-recorded vi-VN instruction audio pipeline.
