# English Arena - Design Spec v2 (CR-73) - REVISION 7 - APPROVED

> Method: `adaptive-uiux-design-system` (extend + ecosystem mode).
> Replaces `DESIGN_SYSTEM.md` on approval; `src/lib/ui/tokens.ts` stays the
> code SSOT and is reorganized to match §4.
> Design Lead verdict: APPROVE_WITH_CHANGES (round 5→6). Rev7 applies the
> final 1 major + 8 minors the reviewer listed.

---

## 1. Context manifest

| Field | Value |
|---|---|
| project | English Arena - ea.vieschool.com (Vite+React+TS, Tailwind, Supabase) |
| design_mode | extend (existing system) + ecosystem (3 role surfaces, one brand) |
| domain | K-5 English learning, Vietnam; IOE/Violympic prep; gamified practice |
| user_groups | Kids G1-2 (6-7y, pre/early readers, voice-first) · Kids G3-5 (8-10y, readers, competitive) · Parents (buyers, vi-VN, mobile) · Teachers/admin (utility) |
| primary_tasks | Kid: play batch, drill, mock exam, earn stars · Parent: evidence + gate/purchase · Exam: timed run + review |
| platforms | mobile-first 360-390px; tablet/desktop; safe-area; short-landscape ≤420px |
| locale | vi-VN chrome copy (hyphen only); en-US learning content |
| brand_facts | VieSchool navy/gold shell (KEEP); Baloo 2 + Be Vietnam Pro self-hosted; per-grade land identities |
| business_goals | parent conversion via honest reports+pricing; kid retention via stars/quests; IOE-authentic exam credibility | <!-- spec-lint-ignore -->
| accessibility_needs | touch floors §3; computed contrast; reduced-motion parity; AT retries (click/keydown/pointerdown); never color-alone |
| technical_constraints | tokens.ts SSOT (Tailwind class constants); icons.tsx SVG family (24px, 2px stroke) - documented exception to Phosphor default; emoji = pedagogy only; screen-state machine in App.tsx; `ViewerContext.band` exists, defaults `G345` in unwrapped renders/tests |
| evidence | observed: tokens.ts, DESIGN_SYSTEM.md, StartBatchScreen, ExamScreen, ParentGate, GradeSelect, GatedLink, ExploreSheet, theme.ts, ViewerContext, StartBatchScreen.test.tsx, e2e/kids-ux.spec.ts, docs/sdlc/adr-kids-ux.md |
| unknowns | teacher persona depth - admin stays utility-reskin |

## 2. Design thesis

**"Một đấu trường, ba khán phòng"** - one navy/gold arena, three role
experiences sharing foundations:

- **Kid stage:** playful, one mission per screen, voice-led G1-2,
  dashboard G3-5.
- **Parent desk:** calm paper, evidence-first, honest pricing.
- **Exam hall:** focused IOE-authentic teal-slate/wood register.

### Principles

1. **One mission per screen** - exactly one `action.primary` per kid screen.
2. **Discovery is visible** - the Khám phá drawer becomes labeled,
   INLINE expandable hub sections (accordion on the launchpad; no new
   `Screen` values, nothing hidden behind a generic word).
3. **Density follows the reader** - G1-2 max 4 interactive elements,
   G3-5 max 6 (matches AC-2.1, adr-kids-ux.md). Density =
   `ViewerContext.band` consumed via tokens.
4. **Status is semantic** - success/info/warning/danger +
   earned/locked + audio + feedback.wrong|reveal; `status.danger` is
   destructive/urgent ONLY, never answer-wrong.
5. **Motion teaches** - transform/opacity feedback only +
   `motion-reduce:` equal.
6. **Text does work** - verb-first child register; icons never carry
   meaning alone; vi copy hyphen-only.

## 3. Invariant / adapt matrix

| Layer | INVARIANT | ADAPT |
|---|---|---|
| Brand | navy shell `#0b1224`/`#101a36`; **gold FILLS/gradients = reward + next-step only** (amber-hued text/icons for warning/timer chips are a documented exception - they are status semantics, not gold surfaces; exam ◀▶ nav arrows stop being gold, they remap to `exam.navStrip` per §5.4/§6) | land accent per grade |
| Type | Baloo 2 display/score; Be Vietnam Pro copy; body ≥16px | exam/parent tables `text-sm` allowed |
| Icons | icons.tsx SVG family; ALL unicode arrows out of chrome: `←`/`→`/`◀`/`▶`/`▲`/`▼` map to `IconArrowLeft`/`IconArrowRight`/`IconChevronLeft`/`IconChevronRight`/`IconChevronUp`/`IconChevronDown` (add the missing exports; `IconArrowLeft` exists) | mascot/illustration SVGs separate class |
| Tokens | primitive → semantic → component → theme; surface-pairing rule | theme overrides preserve meaning |
| States | default/hover/focus/pressed/selected/disabled/loading/success/error/earned/locked | treatment per surface |
| Spacing | 4px scale | kid roomier, parent/exam denser |
| Focus | visible ring everywhere incl. exam options (current gap at ExamScreen.tsx:777-781 gets one) | ring color per `focus.ring` |
| Motion | transform/opacity only + `motion-reduce:` | kid celebration, parent/exam minimal |
| Copy | vi-VN hyphen-only, verb-first CTA | reading level per role |
| Emoji | pedagogy only | - |
| Color-alone | never sole state carrier | - |

### Touch floors (amendment recorded: the "76px anything" invariant
becomes band-based; G1-2 keeps 76px, G3-5 gains a 64px primary floor
because 8-10y motor control + IOE density need it - DESIGN_SYSTEM.md:110
and tokens.ts:13 are updated in the same commit)

| Control role | G1-2 | G3-5 | Exam (any band) | Parent/adult |
|---|---|---|---|---|
| Standalone primary (Chơi, options, submit) | 76px | 64px | band value | 44px |
| Hub tiles | 96px | 76px | - | - |
| Exam option keys / nav arrows | - | - | 64px options / 48px nav-strip (compact-chrome exception) | - |
| Gate keys | - | - | - | 64px |
| Chips in a group row | 36px | 36px | 36px | 36px |
| Any other control | 48px | 48px | 48px | 44px |

## 4. Foundations - semantic token layers

### 4.1 Primitives (hex only; `navy` ordered by luminance dark→light;
`exam` teal-slate is a SEPARATE ramp - it is not navy)

```ts
PRIMITIVE = {
  // measured luminance (relative): .0063 < .0112 < .0115 < .0147 < .0263 < .0433
  navy: { page:'#0b1224', pageGradient:'#101a36', raised:'#121b33', card:'#0E1F42', raisedHi:'#162C55', ring:'#2a3a5e' },
  exam: { hall:'#0a1520', deep:'#0d1b26', panel:'#132433', card:'#16232e', line:'#22303d', wood:'#92400e' },
  gold: { hi:'#fde68a', mid:'#fbbf24', deep:'#f59e0b', frame:'#92400e', text:'#451a03' },
  status: { success:'#10b981', info:'#0ea5e9', warning:'#f59e0b', danger:'#f43f5e', audio:'#6366f1', examSelected:'#f97316' },
  radius: { sm:12, md:16, lg:24, xl:32, pill:999 },
  touch:  { chip:36, adult:44, kidMin:48, navStrip:48, g35Primary:64, g12Primary:76, g35Tile:76, g12Tile:96 },
  motion: { fast:'150ms', base:'300ms', slow:'700ms', ease:'cubic-bezier(0.2,0.7,0.4,1)' },
}
```

### 4.2 Semantic roles (computed pairs; alpha surfaces composited over
navy.card `#0E1F42` unless noted)

Ratios measured: TEXT vs the surface it renders on (alpha fills
composited over `navy.card #0E1F42`; ring ratios measured ring-color vs
background). All pass AA; `text-lg`+bold passes at ≥3:1.

| Token | Navy | Paper | Ratio (text vs surface) |
|---|---|---|---|
| `text.primary` | white | slate-800 | 16.24:1 / 14.63:1 |
| `text.secondary` | slate-300 | slate-600 | 10.94:1 / 7.58:1 |
| `text.accent` | amber-200 | sky-700 | 13.04:1 / 5.93:1 |
| `action.primary` | solid amber-400 + amber-950 | same | 8.97:1 |
| `action.secondary` | white/10 + sky-200 | sky-100 + sky-800 | 9.19:1 / 6.59:1 |
| `action.destructive` | rose-600 + white | rose-600 + white | 4.70:1 |
| `action.audio` | indigo-500/20 + indigo-200 | indigo-100 + indigo-800 | 8.68:1 / 8.06:1 |
| `action.endSession` | sky-700 + white ≥16px bold | same | 5.93:1 |
| `status.success` | emerald-500/15 + emerald-300 | emerald-100 + emerald-800 | 8.36:1 / 6.78:1 |
| `status.info` | sky-500/15 + sky-200 | sky-100 + sky-800 | 9.63:1 / 6.59:1 |
| `status.warning` | amber-500/15 + amber-200 | amber-100 + amber-800 | 10.23:1 / 6.4:1 |
| `status.danger` | rose-500/15 + rose-300 | rose-100 + rose-800 | 7.55:1 / 6.8:1 |
| `feedback.wrong` | slate-200 + slate-700 | same | 8.40:1 |
| `feedback.reveal` | emerald-100 + emerald-900 + ring | same | 8.57:1 |
| `reward.earned` | gold gradient (worst stop amber-500) + amber-950 | same | 6.97:1 |
| `reward.locked` | slate-600/30 + slate-300 (navy) | slate-200 + slate-700 | 8.98:1 / 8.40:1 |
| `exam.selected` | orange-500 ring (5.70:1) + orange-200 text (11.81:1) on exam.card | same | ring 5.70:1 |
| `parent.trend` | - | emerald-700 on white | 5.48:1 |
| `focus.ring` | ring-4 amber-300/60 | ring-2 sky-600 | 4.1:1 non-text |

Note: the current exam selected state is an orange-500 FILL with white
text = 2.80:1 FAIL at text-lg; `exam.selected` replaces the fill with a
ring + light text for exactly that reason. `arena-exit` "Quay lại"
(solid amber-400 on a back action, ExamScreen.tsx:1067) →
`button.secondary` - gold is reward/next-step only; `practice-next` and
`exam-text-submit` keep gold (they ARE next-step).

### 4.3 Component tokens

`button.primary` · `button.secondary` · `button.quiet` ·
`button.destructive` · `button.endSession` (NỘP BÀI + KẾT THÚC, CR-55/69)
· `button.audio` (listen/replay only - indigo reserved for audio, scoped
to interactive controls; land accent indigo is decoration, unaffected) ·
`nav.pill` · `chip.info/success/warning/danger` · `chip.gold` ·
`tile.hub` · `card.panel` · `card.tinted.*` · `sheet.bottom` ·
`gate.key` · `score.pill(.lg)` · `progress.track/fill` · `paper.*` ·
`exam.header` · `exam.option` · `exam.navStrip` ·
`option.choice` / `option.pickedWrong` / `option.revealCorrect`.

### 4.4 Themes

- **Land themes:** per-grade accent on canvas + accent text (theme.ts
  unchanged). On indigo/violet lands (G4/G5), `action.audio` keeps its
  indigo - the icon+label pairing carries meaning, and the light land
  surfaces still give ≥4.5:1 (verify per land).
- **Role themes:** `kid` default; `parent` paper overrides; `exam`
  teal-slate register; `admin` paper-dense.
- **Density:** `ViewerContext` extended with `density` getters
  (`tileMinH`, `primaryMinH`, `maxDecisions`). Unwrapped render default
  `G345` documented; band-sensitive tests wrap `ViewerProvider`
  (StartBatchScreen.test.tsx gets the wrap added - see §8 migration).

## 5. Product themes

### 5.1 Kid stage - Mode Hub (inline accordion, no drawer, no new Screens)

**Recorded amendment to AC-2.1/2.2/2.3 (prd-kids-ux.md:50-58):** the PRD
specified ONE "Khám phá" sheet entry. The hub replaces the sheet with
inline sections, so the counting rule changes to: **"interactive
elements visible with ALL sections collapsed"** - G1-2 ≤4, G3-5 ≤6.
Collapsed sections keep an EMPTY region container mounted (carries the
`hub-panel-*`/`hub-section-*` id so `aria-controls` always resolves);
only their children unmount - an empty div is not interactive, so the
DOM count holds. AC-2.3 (sheet close/tap-outside) is superseded by the
section's own chevron toggle. All sections collapsed by default on
BOTH bands.

The hub is a light `paper` panel inside the navy launchpad card, holding
labeled section tiles (`tile.hub`) that expand inline. Tiles are grouped
into **panels** (`hub-panel-*` = the `aria-controls` target); each panel
wraps one or more sections (`hub-section-*`).

**Panel → section map:**

| Tile (`hub-tile-*`) | `aria-controls` → Panel (`hub-panel-*`) | Sections inside (`hub-section-*`) | Bands |
|---|---|---|---|
| `learn` (Luyện & thi) | `hub-panel-learn` | `learn` (3 programs × drill/exam/advanced + FormPicker), `review` (ReviewCard, `hasDueReview`), `coach` (CoachCard, `hasCoachHints`) | G3-5 |
| `arena` (Đấu trường) | `hub-panel-arena` | `arena` (ArenaCard), `rank` (LeaderboardCard) | G3-5 |
| `reward` (Phần thưởng) | `hub-panel-reward` | `reward` (PetCard + HomeShelf) | G3-5 |
| `reward` (Phần thưởng) | `hub-panel-reward` | `reward` (DailyQuestCard + PetCard + HomeShelf) | G1-2 |
| `more` (Luyện thêm) | `hub-panel-more` | Nested single-open subtiles (below) | G1-2 |

**G1-2 `more` internals:** expanding `hub-tile-more` reveals FOUR fixed
subtiles (`hub-subtile-*` testids; `aria-controls` → the `hub-section-*`
they open; only one open at a time) + ONE conditional:

- `hub-subtile-english` (Tiếng Anh) → `hub-section-english`: 3 mode
  buttons (`drill-english`, `exam-program-english`,
  `advanced-english`) + admin-only `forms-toggle-english`.
- `hub-subtile-math` (Toán tiếng Anh) → `hub-section-math`: same 3 modes
  for math + `forms-toggle-math`.
- `hub-subtile-science` (Khoa học) → `hub-section-science`: same 3
  modes for science + `forms-toggle-science`.
- `hub-subtile-arena` (Đấu trường) → `hub-section-arena` +
  `hub-section-rank` (drop `hub-section-arena` from the `aria-controls`
  id list when its handlers are absent - controls never point at
  unmounted ids, consistent with the m5 container rule): ArenaCard
  (create + bot + guest-login + accept list CAPPED at first 2 +
  `Xem thêm` = INLINE expansion revealing the rest; the extra tap is a
  documented budget exception on both bands) + LeaderboardCard.
- CONDITIONAL `hub-subtile-review` (Ôn tập): rendered only when
  `hasDueReview || hasCoachHints`; `aria-controls` lists only the
  sections actually rendered: `hub-section-review` when
  `hasDueReview`, `hub-section-coach` when `hasCoachHints`.

Rule (G1-2 only - G3-5 is bounded by section grouping, not a
per-expansion count): an expansion reveals ≤4 new interactive controls;
documented exception - `more` may show a 5th subtile only when
review/coach is due. A program subtile reveals 3 modes + the admin-only
FormPicker toggle (admin exception, counted separately). Tap budget:
G1-2 hub destinations ≤3 taps (more → subtile → action), G3-5 ≤2 (tile
→ action); the admin-only FormPicker path (subtile → forms-toggle →
form) and the `Xem thêm` overflow path are EXEMPT - recorded amendment
§5.1/§9.

**Action buttons inside relocated cards are reclassified** (all become
`button.secondary`/`reward.earned` - no card may carry `action.primary`
or `action.destructive` on the launchpad):

| Card button | Was | Becomes |
|---|---|---|
| ReviewCard start (gold gradient) | action-primary-like | `button.secondary` |
| CoachCard start (gold gradient) | action-primary-like | `button.secondary` |
| PetCard evolve (amber-400 solid) | action.primary pair | `reward.earned` |
| ArenaCard `Nhận kèo` (amber-400) | action.primary pair | `button.secondary` |
| ArenaCard `arena-create` (rose-600!) | action.destructive pair on a non-destructive action | `button.secondary` |
| LeaderboardCard login | link-ish | `button.secondary` |
| ArenaCard guest-login (`Đăng nhập để đấu với bạn thật`, sky-600+white = 4.10:1 fail at 16px) | unpaired | `button.secondary` |

Section inventory (single source):

| Section id | Contents | Condition |
|---|---|---|
| `learn` (G3-5) | 3 programs × [Luyện đề `drill-*` / Thi thử `exam-program-*` / Nâng cao `advanced-*`] + admin FormPicker (`forms-toggle-*`, `form-*`) | always |
| `english` / `math` / `science` (G1-2) | per-program: 3 mode buttons + admin `forms-toggle-*` | always |
| `review` | ReviewCard | `hasDueReview` - hidden entirely otherwise |
| `coach` | CoachCard | `hasCoachHints` - hidden entirely otherwise |
| `arena` | ArenaCard (create/accept/bot) | handlers present |
| `rank` | LeaderboardCard | always (product reason: G3-5 IOE competitiveness; G1-2 reaches it one level deeper inside `more`) |
| `reward` | DailyQuestCard (G1-2 only - G3-5 has it on-screen) + PetCard + HomeShelf | always |

**Launchpad composition:**

- **G1-2 (≤4 elements, collapsed):** `← Quay lại` (IconArrowLeft),
  `Chơi` (action.primary), `Luyện thêm` (tile.hub `hub-tile-more`),
  `Phần thưởng` (tile.hub `hub-tile-reward`).
- **G3-5 (≤6 elements, collapsed):** `← Quay lại`, `Chơi`,
  `DailyQuestCard` on-screen (progress info card), `Luyện & thi`
  (`hub-tile-learn`), `Đấu trường` (`hub-tile-arena`), `Phần thưởng`
  (`hub-tile-reward`).
- Expansion voice prompt: opening a tile speaks its section hint once
  (e.g. "Chọn môn để luyện nhé!") via the same headless
  InstructionSpeaker with a per-section autoplayKey - replaces the old
  sheet greeting ("Chọn một góc để khám phá nhé!"). Instruction copy
  updates: G1-2 "Bấm Chơi màu vàng để bắt đầu, hoặc bấm Luyện thêm hoặc
  Phần thưởng để xem thêm!"; G3-5 "Bấm Chơi để bắt đầu, hoặc mở một mục
  bên dưới nhé!".
- DailyQuestCard on the G3-5 launchpad: its claim button is classified
  `reward.earned` (NOT `action.primary`) - it is a reward claim, not a
  navigation/primary action - and the card counts as one of the ≤6
  elements.
- Parent entry is NOT on the launchpad (unchanged). Gate = arithmetic
  challenge (Vietnamese number words, 5-min in-memory token). All gate
  entry points: GradeSelect report link, `GatedLink` (external allowlist
  only), ShareCard + SendResultsCard (rendered on ExamResult,
  BatchSummary AND RoundSummary - intended: parent-facing actions on
  kid surfaces, gated), PricingCard, ParentReportScreen. `report`
  screen reachable from GradeSelect only.
- Cards inside the paper panel (ArenaCard, LeaderboardCard, PetCard,
  HomeShelf, DailyQuestCard, ReviewCard, CoachCard - all navy `CARD`)
  keep `surface.raised`: the paper panel is a container, not a text
  surface - the sanctioned nesting pattern (same as light land cards on
  navy, inverted). ring-sky-200 separates them.

### 5.2 QuestionFrame contract

4 zones: chrome → prompt → answer → feedback (bottom-anchored,
max-height `min(40vh, 320px)`, `overflow-y-auto` + `overscroll-contain` +
`env(safe-area-inset-bottom)` pad; ≤420px heights / keyboard-open →
bottom-sheet overlay instead of pushing the answer zone).

### 5.3 Parent desk

`parent` theme: paper register, 44px floors, `text-sm` tables, evidence
order did→trend→next→price, `parent.trend` emerald-700.

### 5.4 Exam hall

Teal-slate/wood register kept (`exam.*`); entry buttons remap to
semantic actions (BTN_EXAM indigo-700, FormPicker indigo-600 rows →
`action.secondary`/navy - indigo is `action.audio` only). ALL gold
fills inside the exam surface remap (◀▶ arrows `bg-amber-500/90`,
question-strip cells, True/False keys, extra-letter keys `bg-amber-300`)
→ `exam.navStrip`/aux contract in §6 (non-gold exam.card fills, focus
ring, 48/64px floors). Selected state: the current orange-500 FILL +
white text (2.80:1, fails AA) is REPLACED by `exam.selected` = orange-500
ring + orange-200 text. NỘP BÀI/KẾT THÚC = `button.endSession` + CR-69
confirm dialog. Exam nav ◀▶ → `IconChevronLeft/Right`.

### 5.5 Auth/admin

Paper-dense reskin, semantic tokens only.

## 6. Component contracts (binding)

Legend: D default · H hover · F focus · P pressed · S selected ·
Di disabled · L loading · Su success · E error · Ea earned · Lo locked.

| `tile.hub` (section header) | |
|---|---|
| Anatomy | icon(24, aria-hidden) + label + optional sub + chevron(`IconChevronDown/Up`) |
| Tokens | `tile.hub` - paper pairs (`bg-sky-50`, `ring-sky-200`, `text-slate-800` label, `text-sky-700` icon) - tiles live inside the paper panel |
| D | paper tile, sky-200 ring, slate-800 label |
| H | `bg-sky-100` |
| F | `focus.ring` paper variant |
| P | `scale-[0.99]` |
| S (expanded) | chevron rotates 180°, `ring-sky-400` + `bg-sky-100` persists |
| Di | `opacity-60`, no pointer |
| Conditional | whole tile hidden when its cards would all return null |
| Keyboard/AT | `button`, Enter/Space toggles, `aria-expanded` bound, `aria-controls` → `hub-panel-*` id (top-level tiles) or `hub-section-*` id (`hub-subtile-*`) |
| Overflow | `min-w-0` truncate label; grid-cols-1 mobile stacked (sections stack vertically) |
| Don't | icon-only tile; tile to an empty section |

| `button.primary` (Chơi / next step) | |
|---|---|
| Anatomy | label + optional icon + optional sub-line |
| Tokens | `action.primary` |
| D | solid amber-400 (matches CTA_GOLD_XL), amber-950 text, border-b-4 amber-600 |
| H | `bg-amber-300` |
| F | `focus.ring` navy variant |
| P | `translate-y-0.5` + border-b-2 |
| Di | `opacity-60`, cursor-not-allowed |
| L | spinner icon + "Đang tải", disabled |
| Rule | ONE per kid screen |

| `option.choice` (answer option, all question kinds) | |
|---|---|
| Anatomy | label + optional emoji/image + state icon slot |
| Tokens | `option.choice` (white/paper bg, slate-800 text, border-slate-300) |
| D | white, `border-b-4`, slate-800 |
| H | `bg-sky-50` |
| F | `focus.ring` |
| P | `translate-y-0.5` |
| S (pre-submit pick) | `ring-2 ring-sky-400 bg-sky-50` |
| picked-wrong | `feedback.wrong` slate + "Chưa đúng" label |
| reveal-correct | `feedback.reveal` emerald + check icon + label |
| Di | after verdict: no pointer, opacity-90 |
| L | verdict pending: shimmer |
| Floor | band primary floor (76/64) |

| `exam.option` | |
|---|---|
| Anatomy | letter key + label |
| Tokens | `exam.card` bg, `exam.line` ring, white text |
| D | `exam.card`, ring `exam.line` |
| H | brighten `exam.panel` |
| F | `focus.ring` amber-300/60 (NEW - fixes the current no-ring gap) |
| P | `translate-y-0.5` |
| S | `exam.selected` orange-500 ring + orange-200 text |
| correct-verdict | `feedback.reveal` |
| wrong-verdict | `feedback.wrong` |
| Di | post-submit |
| Floor | 64px |

| `button.audio` (Nghe mẫu / replay) | |
|---|---|
| Anatomy | `IconSpeaker`/`IconReplay` + label |
| Tokens | `action.audio` indigo |
| D | indigo-500/20 + indigo-200 (navy) / indigo-100 + indigo-800 (paper) |
| H | +8% bg |
| F | `focus.ring` |
| P | `scale-[0.98]` |
| Di | `opacity-50` while other audio plays |
| L | `animate-pulse motion-reduce:animate-none` icon |

| `chip.*` (engagement/status chips) | |
|---|---|
| Anatomy | icon(16-20, aria-hidden) + value |
| Tokens | `chip.info/success/warning/danger` translucent (navy-only) or `chip.gold` (light, amber-950 text) |
| D | translucent status pair |
| urgent | `status.danger` chip + `animate-pulse motion-reduce:animate-none` |
| earned | `chip.gold` |
| F | chips are non-interactive UNLESS they open an action - interactive chips get `focus.ring`; static chips get NO tab stop |
| Floor | 36px |

| `gate.key` (ParentGate numpad) | |
|---|---|
| Anatomy | digit label |
| Tokens | `gate.key` paper |
| D | white, sky-300 border-b-4, slate-800 |
| H | `bg-sky-50` |
| F | `focus.ring` paper |
| P | `translate-y-0.5` |
| Floor | 64px |

| `FeedbackPanel` | |
|---|---|
| Anatomy | icon + verdict + explanation + `Nghe mẫu` (`button.audio`) + Next (`button.primary`) |
| States | success `status.success`; wrong `feedback.wrong`; reveal `feedback.reveal` |
| Layout | bottom-anchored per §5.2; never pushes answer zone off-screen |

| `EndSessionButton` | |
|---|---|
| Anatomy | uppercase label (NỘP BÀI / KẾT THÚC) |
| Tokens | `button.endSession` sky-700 solid, white ≥16px bold |
| D | sky-700 + white |
| H | sky-600 |
| F | `focus.ring` navy variant |
| P | `scale-95` |
| Di | `opacity-60` during submit |
| L | "Đang nộp..." spinner |
| Behavior | opens CR-69 confirm dialog before resolving |

| `ScorePill` | `reward.earned` semantics only; D state only (non-interactive, no tab stop); `.lg` variant for summaries |

| `EngagementBar` | one compact row ≤3 chips + overflow into a sheet; every indicator has reduced-motion equal |

| `Sheet` | `surface.overlay`, `overscroll-contain`, focus trap, return-focus, scrim+Esc dismiss, safe-area bottom pad |

| `ParentGate` | arithmetic challenge (vi number words), `gate.key` keys, 5-min in-memory token; entry points per §5.1 (GradeSelect, GatedLink, ShareCard, SendResultsCard, PricingCard, ParentReportScreen), never on kid launchpad |

| `ExamHeader` | `exam.panel` band + `exam.line` hairline + timer chip (`status.warning` rest, `status.danger` urgent pulse + reduce-off) |

| `exam.navStrip` + exam aux keys (question-strip `exam-nav-*` cells, True/False keys, extra-letter keys, `exam-tile-*` word-order tiles) | |
|---|---|
| Current defect | all use `bg-amber-300`/`bg-amber-500` gold fills (gold=reward violation), strip cells `h-11`=44px and letter keys `h-14`=56px under floor; answered cells use emerald-600+white = 3.77:1 fail |
| D (unanswered) | `exam.card` bg + `exam.line` ring + white text (non-gold) |
| answered | `status.success` translucent pair + small check icon (8.11:1 on exam.card, not color-alone) |
| H | `exam.panel` brighten |
| F | `focus.ring` amber-300/60 |
| S (current question) | `exam.selected` orange-500 ring + orange-200 text |
| current+answered | `exam.selected` ring + check icon kept; `aria-current="step"` + sr-only "đã trả lời" (current state is visual+semantic, not visual-only) |
| Floor | nav-strip 48px, option/letter/tile keys 64px |
| `exam-listen` | remaps to `button.audio` (current orange-500 + white = 2.80:1 fail, and orange≠audio) |
| `exam-slot-*` (answer slots) | remaps to `exam.selected` (current emerald-600 + white = 3.77:1 fail) |

| `Mascot` | SVG pig moods greeting/happy/encourage/celebrate; decorative, aria-hidden |

## 7. Critical journeys (+ non-happy states)

**Kid G1-2:** grade → Chơi (instruction autoplays; first gesture retries
if blocked) → rounds → reward → Phần thưởng section → back.

**Kid G3-5:** launchpad → quest/hub section → mode → play/drill →
summary → next-mission hint.

**Parent:** GradeSelect arithmetic gate → report (evidence) → email
opt-in → pricing → bank transfer → share.

**Exam:** program select → hall → timed run → confirm submit → review →
retry.

| Non-happy | Behavior |
|---|---|
| Supabase unconfigured | LeaderboardCard gets an explicit locked/empty state (today it spins "Đang tải…" forever - flagged as a code change) |
| Guest | rank card: `reward.locked` + Login CTA; arena card: guest bot stays PLAYABLE ("Đấu với máy", CR-34) + Login CTA - not locked |
| No due review / no hints | those cards absent; section hides if all its cards absent |
| Bank fetch failure | `status.danger` inline message + retry in section |
| Audio/TTS failure | key released + gesture retry; text fallback |
| Exam pool < needed | `status.warning` banner before start |
| Offline | local progress kept; sync on mutation |

## 8. Implementation mapping

| Spec | Code |
|---|---|
| semantic layers | `tokens.ts` reorganized; old names = deprecated aliases one release |
| density | `ViewerContext` extended with `density` getters; `isG12` JSX forks drop |
| Mode Hub | new `ModeHub.tsx` accordion on StartBatchScreen; ExploreSheet retired (inline sections replace it) |
| exam indigo entries | BTN_EXAM/BTN_DRILL/BTN_ADVANCED + FormPicker rows → semantic actions; `action.audio` keeps indigo |
| unicode arrows | `←`/`→`/`▲`/`▼`/`◀`/`▶` → `IconArrowLeft`/`IconArrowRight`/`IconChevronLeft/Right/Up/Down` (add missing exports) |
| feedback zone | QuestionCard/ActiveRoundQuestion per §5.2 |
| exam selected/focus | `exam.selected` token; `focus.ring` added to `exam.option` |
| parent paper | PAPER_* → `parent` overrides |

### Testid + test migration

| Old | New | Tests/files to update |
|---|---|---|
| `explore-toggle` | `hub-tile-more` (G1-2) / `hub-tile-learn\|arena\|reward` (G3-5) | e2e/kids-ux.spec.ts, StartBatchScreen.test.tsx |
| `explore-sheet`, `explore-backdrop`, `explore-close` | REMOVED (inline expansion - no overlay/backdrop/close) | ExploreSheet.test.tsx → ModeHub.test.tsx |
| `role=dialog` assertions (sheet) | REMOVED - panels are inline regions, not dialogs; no focus-return-to-toggle test needed (focus stays on the tile) | e2e/kids-ux.spec.ts:46-51, StartBatchScreen.test.tsx openSheet helper (:23-26) |
| `drill-*`, `exam-program-*`, `advanced-*`, `forms-toggle-*`, `form-*` | KEEP (inside `hub-section-<program>`) | none |
| `start-batch-button`, `back-to-grades` | KEEP | none |
| NEW `hub-subtile-english\|math\|science\|arena\|review` | nested tiles inside `hub-panel-more` (G1-2) | ModeHub.test.tsx (new), StartBatchScreen.test.tsx G12 paths: `drill-math` test taps `hub-tile-more` → `hub-subtile-math` → `drill-math`; e2e/kids-ux.spec.ts:45-47 taps `hub-tile-more` → `hub-subtile-english` → `drill-english` |
| instruction text containing "Khám phá" | new copy per §5.1 | StartBatchScreen.tsx:238-239 + assertions |
| G1-2 single-sheet card assertions (:86-98: `daily-quest-card`, `pet-card`, `leaderboard-card`, `drill-english`) | split across containers: `daily-quest-card`+`pet-card` → `hub-panel-reward`; `leaderboard-card` → `hub-subtile-arena`; `drill-english` → `hub-subtile-english` | StartBatchScreen.test.tsx:86-98 rewritten per destination |
| CR-50 forms tests (:120-140, `forms-toggle-*`) | path = `hub-tile-more` → `hub-subtile-english` → `forms-toggle-english` | StartBatchScreen.test.tsx:120-140 |
| launchpad control count test (:62-76, expects 3) | now expects 4 (back, Chơi, Luyện thêm, Phần thưởng) | StartBatchScreen.test.tsx:62-76 |
| band-sensitive renders | wrap in `ViewerProvider` where tests assert G12 layout | StartBatchScreen.test.tsx + new ModeHub tests |

## 9. Validation checklist

- [ ] one `action.primary` per kid screen
- [ ] hub tiles labeled; icons aria-hidden; no orphan rows; sections hide when empty
- [ ] every hub destination reachable: G3-5 ≤2 taps (tile → action), G1-2 ≤3 (more → subtile → action) - recorded amendment §5.1
- [ ] G1-2 launchpad ≤4 interactive elements; G3-5 ≤6 (AC-2.1)
- [ ] §4.2 pairs ship only as listed; new pairings get computed ratios
- [ ] `exam.option` focus ring verified visually
- [ ] reduced-motion per animation
- [ ] Playwright 390×844 + 1280 per redesigned screen
- [ ] testid migration applied; vitest + e2e green
- [ ] vi copy hyphen-only
