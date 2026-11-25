# CR-143: Whole-app UX audit + refresh (Designer phase)

**Status: Direction A approved by owner → implemented.** All 7 findings
fixed; DESIGN_SYSTEM.md amended with 5 new laws (splash skeleton,
board-fill, desktop launchpad 2-col, stats-vs-actions row separation,
mode-card + round-end copy). Verified via Playwright captures
(`_shots/cr143/`): desktop hub 2-col, tablet game board centered,
learn mode cards, grade-select split rows, login skeleton.


## Why
Owner report: "thật sự vẫn chưa ưng giao diện lắm" - request to run the
updated ux-designer skill over the whole product and identify what can
improve for students (Grades 1-5, phones/tablets) while staying credible
for parents/teachers. Scope: every student-facing screen.

## Method (per ux-designer SKILL)
- Design context: education/kids, Vietnamese primary students, low
  density, bright/friendly, generous delightful motion, comprehension
  is the key risk. Domain anchor: Duolingo ABC / Lingokids / Khan Kids.
- Evidence: Playwright captures of the real rendered app at
  phone 390x844, tablet 768x1024, desktop 1440x900
  (`_shots/ux-audit/` - login, grade-select, hub, batch q+feedback,
  learn drawer, games shelf, game level picker, game play, round end).
- Rubric scored 1-5 against the kids-edu benchmark.

## Verdict up front
The current system is **competent, not distinctive**: registers are
deliberate (day/navigation vs desk/play), tokens are disciplined,
touch floors are real. What drags it below benchmark is a set of
dead zones, busy chrome and copy that contradicts itself - fixable
without a redesign.

## Rubric (evidence-based)

| Item | Score | Evidence |
|---|---|---|
| Visibility of status | 4 | Round/timer/score chips persistent on every play surface |
| System-world match | 4 | Land->arena metaphor consistent; kid copy is warm vi-VN |
| User control | 4 | Back pills + KẾT THÚC always present; platform back wired |
| Consistency | 3 | Registers deliberate, but see C1/C2 below |
| Error prevention | 4 | Disabled-next-until-answered, parent gate, inert loading |
| Recognition | 4 | Icon+label tiles; no icon-only kid controls |
| Delight (kids scale) | 3 | Land scenes carry it; boards + summary under-deliver (P2) |
| Guidance (kids scale) | 3 | Quest card good; learn drawer walls of text (P4) |
| Minimal aesthetic | 3 | Chrome rows busy (P1); dead zones (P2/P3) |
| Measured: targets | 4 | 76/64/48px floors verified in tokens + rendered |
| Measured: instant paint | 2 | Login splash = dead gradient (P3) |
| Copy quality | 3 | Contradictory summary copy + 0/0 stat (C3) |

## Findings (P = polish-worthy, C = consistency, F = fix bug)

- **P3 (instant paint) - login/loading splash is a dead zone.**
  `tablet-01`: hero art ends ~37vh, below it an empty mint gradient with
  one tiny `Đang tải...` centered at ~57vh. On every cold open (the
  app's front door, incl. the Android WebView) the product shows a
  mostly-blank screen for seconds. Violates the skill's instant-paint
  rule. Fix: skeleton of the actual login card (title + inputs + CTA)
  or a designed splash (mascot + brand mark + progress), not a bare
  gradient.

- **P2 (dead zone) - game boards top-cluster on tall screens.**
  `p3-tablet-22`: "Tìm kẻ lạ" question + 4 tiles end at ~40% viewport;
  the bottom ~60% is blurred empty board. Same root cause in
  `p3-tablet-21` level picker (buttons end ~76%, rest empty). Boards
  should vertical-center content or stretch the play area - a half-
  empty stage reads broken on tablets.

- **P2 (dead zone) - desktop surfaces are phone columns.**
  `desktop-03-hub`: hub content is a ~450px column inside flat green
  margins (no art behind the card zone). Grade-select + batch hide it
  well (full-bleed land art), but hub/game/report screens on desktop
  or classroom projector show a strip of product in a sea of gradient.
  Fix: at `lg`, hub goes two-column (hero+status left, tiles right)
  or widens to ~720px with the land vignette continuing behind.

- **P1 (busy chrome) - grade-select status row mixes semantics.**
  `tablet-02`: one row carries [gold CTA "Làm bài kiểm tra đầu vào"]
  [★ 0 sao] [🔥 0 ngày] [Tân binh] [🏅 Huy hiệu (0)] - an action
  next to four stats reads as five competing pills; on phone they
  wrap into a cramped 4-cell grid. Fix: stats become one consolidated
  profile bar (or move under the journey header); the placement CTA
  stays a standalone gold pill.

- **C3 (copy bug) - round end contradicts itself + shows 0/0.**
  `p4-*-30`: "Em đã chơi hết vòng này - giỏi lắm!" and "Cố lên,
  luyện tập thêm để đạt điểm cao hơn nhé!" render on the same screen
  (praise + push simultaneously), while stats read "0/0 câu / 0/0
  điểm" (zero-answer rounds should not print a meaningless stat).
  Fix: one message branch - praise on success, encouragement on miss;
  hide the stat line when answered === 0.

- **P4 (guidance) - learn drawer is a wall of text for kids.**
  `p2-tablet-10`: the expanded Luyện & thi drawer opens with a grey
  explainer line + program rows that repeat mode copy ("Luyện đề - 20
  câu", "Thi thử - 120 câu"). For G1-3 readers this is dense. Fix:
  three visual mode cards (icon + big label + one-line promise) instead
  of text rows; keep exam register button for Thi thử.

- **C2 (micro) - "Đăng nhập" pill floats over the map hero.**
  `tablet-02`: the login pill sits mid-art at top-right with no anchor
  context - reads like a stray sticker. Move into the status row or a
  real header row on the hero.

- **F1 (verify) - pass-4 automation could not finish a round with
  scored answers** (0/0 shown) - confirm whether rapid option+next
  sequences can skip-commit answers; if real, queue commits.

## Not findings (checked, intentional)
- Day/desk register split (light world vs navy play board) - documented
  design law since CR-116/118; keep.
- Feedback bottom-sheet covering answered options on phone - standard
  verdict idiom; the options are locked anyway.
- Hub candy tiles - on-brief, AA-passing, touch-legal.

## Proposed direction (needs approval)

### Direction A - "Fill the stage" polish
Goal: close every finish-level gap the audit found. No new tokens, no
register change - same system, finished surfaces.

| Finding | Concrete change |
|---|---|
| P3 splash dead zone | Cold-open shows the login card skeleton instantly (land hero + milk-glass card shell + gold CTA silhouette), `Đang tải...` becomes a tiny bouncing Bé Heo. First meaningful paint <100ms vs blank gradient for seconds. (~40 lines in AuthScreen/loading branch) |
| P2 game board 40% | Board content zone becomes `flex flex-col justify-center` with `min-h-[52vh]`; option tiles `flex-1` grow to fill stage (2x2 tiles ~30% taller on tablet). Same for level picker (grid vertically centered). (~30 lines in GameScreen/board container) |
| P2 desktop columns | Hub card `max-w-md lg:max-w-3xl`; at `lg:` hub splits 2-col: left = greeting + Nhiệm vụ ngày + Chơi CTA, right = 4 arena tiles. Land vignette keeps bleeding behind. Game boards `lg:max-w-4xl`. (~20 lines) |
| P1 chrome 5-pill | Stats (★/🔥/rank/🏅) collapse into ONE profile bar with thin dividers; placement-test CTA stands alone under it. "Đăng nhập" pill moves into that bar's right edge instead of floating on art. (~40 lines in GradeSelect) |
| C3 round-end copy | Copy branches on result: ≥70% praise / 30-70% "cố lên, gần được rồi" / <30% pure encouragement - exactly ONE line, not two. `0/0 câu` hidden when answered===0. (~25 lines in RoundSummary) |
| P4 learn drawer | Grey explainer line removed; three mode rows become visual cards (big icon + title + 1-line promise: "20 câu, biết đúng sai ngay" / "120 câu như thi thật" / "Nâng cao hơn"). Kid scannable. (~50 lines) |

- Scope: ~6 files, ~200 lines, 0 new tokens, 0 breaking change.
- Deliverable: every audited surface fills its stage; no dead gradient anywhere.
- Risk: low - layout/copy only, tests snapshot-proof via testids.

### Direction B - A + signature moment
Everything in A, PLUS one thing the product lacks vs benchmark
(Duolingo's Duo, Khan's Khanmigo): an ever-present companion that
reacts. Infra ALREADY exists - `Mascot` has 6 authored poses
(idle/thinking/greeting/happy/celebrating/encouraging) + sheet-perch
reacts to verdicts + RoundSummary shows celebrating. We extend, not
invent:

1. **Board perch everywhere:** Bé Heo idles at every play board corner
   (batch, exam, games - currently only the feedback sheet), thinking
   pose during unanswered state.
2. **Journey greeting:** greeting pose on hub first-visit-of-day with
   a one-line kid bubble ("Sẵn sàng leo núi chưa?").
3. **Ceremony upgrade:** round summary gets the existing Confetti +
   StarRain + count-up score pill wired together into a 1.5s payoff
   moment (currently text lines + static mascot). This is the
   highest-delight-per-effort item in the whole app.

- Scope: A + ~3 files, ~100 lines, mostly placement/state wiring of
  existing art - no new assets, no art pipeline needed.
- Risk: medium-low - mascot perf budget already enforced
  (lottieBudget tests); just placement discipline.
- Alternative signature considered: Duolingo-style journey trail map
  for the hub. REJECTED - our hub is a section switcher, not a
  sequential lesson path; a trail would hurt scannability for a fake
  metaphor. If wanted later it needs its own IA rethink.

### Direction C - full visual redesign
New direction doc: replace day/desk registers, palette, type scale,
land art set, card shapes. Examples it could take: cel-shaded
board-game island, paper-craft storybook, or neon arcade arena.

- Scope: ~90 components re-skimmed, 12 screens re-composed, every
  token re-audited, DESIGN-SPEC v7 rewrite, art pipeline run for new
  world set, full Playwright re-verification. Est: several CR cycles.
- Risk: high - throws out CR-73→118 accumulated decisions; gain is
  real only if we believe the world metaphor itself is wrong. Audit
  evidence says it isn't - registers are the strongest part.
- Honest call: C is the wrong answer to this audit. A(+B) fixes the
  actual deltas; C buys novelty at 10x cost.

### Recommendation
**B if appetite allows, A as floor.** A alone lands a visibly better
app; B adds the remembered signature kids apps live on, and its art
cost is zero because the mascot poses exist.

## Files touched by Direction A (preliminary)
- `src/components/AuthScreen.tsx` + splash renderer (P3)
- `src/games/GameScreen.tsx` / game boards (P2 vertical layout)
- `src/components/StartBatchScreen.tsx` + hub container (P2 desktop, P1, P4)
- `src/components/RoundSummary.tsx` (C3 copy branches + stat guard)
- `src/components/GradeSelect.tsx` (P1, C2)
- `DESIGN_SYSTEM.md` - new laws: splash pattern, board fill rule,
  desktop max-width law, summary copy branches.
