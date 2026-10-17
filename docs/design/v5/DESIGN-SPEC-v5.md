# DESIGN-SPEC v5 - CR-82 Workstream B (luxury redesign) + Workstream C (mechanics breadth)

Status: REVISION 3 - addresses Design Lead re-review `docs/reviews/DESIGN-LEAD-v5-review-r2.md` (R2-1 F2
validator, R2-2 touch floor, R2-3 type split) and the human ruling resolving R-v5-12. Revision 2 addressed
`docs/reviews/DESIGN-LEAD-v5-review.md` (REJECTED, F1-F8 +
N1-N3) and records the human rulings on OM-1..OM-6. Ready for Design Lead re-review + human design gate.
Revision 2 and 3 changelogs are in §26.
Owner: Designer phase, CR-82 (`docs/sdlc/CR-82-content-integrity-and-luxury-redesign.md`).
Fidelity: **token-faithful** (standing ruling, `docs/MEMORY.md` 2026-02 intake; no Figma source exists).
Supersedes: the visual sections of `docs/design/v4/DESIGN-SPEC-v4.md` listed in §19. Everything not
listed there is preserved. Workstream A (content integrity) is done and out of scope, except where a
mechanic depends on distractor quality (§13.5).

---

## 0. Context manifest (what this spec was grounded in)

| Source | Used for |
|---|---|
| `docs/sdlc/CR-82-*.md` | scope B1-B6, C1-C5, constraints, acceptance |
| `DESIGN_SYSTEM.md` §3-§12 | brand shell, surface-pairing rule, touch floors, status semantics, anti-slop rules |
| `docs/design/v2/DESIGN-SPEC-v2.md`, `docs/design/v4/DESIGN-SPEC-v4.md` | format, token-layer model, night-journey board, contracts kept |
| `docs/sdlc/CR-79-play-pattern-and-visual-depth.md` | owner ruling 2026-10-16 ("moderate depth, NOT a full illustrated toy-world"); A2 tracing deferral; A3 drag intent |
| `src/lib/ui/tokens.ts`, `src/lib/ui/theme.ts` | every extended token below |
| `src/components/scene/LandScene.tsx`, `LandShell.tsx`, `BatchScreen.tsx`, `QuestionCard.tsx`, `FeedbackPanel.tsx`, `optionButtonStyle.ts`, `ExtraLetterQuestion.tsx`, `ListeningSentenceFillBlankQuestion.tsx` | play surface anatomy + feedback-sheet contract |
| `src/components/ExamScreen.tsx`, `ExamResult.tsx` | exam hall anatomy, testids (`exam-screen`, `exam-timer`, `exam-submit`, `exam-nav-*`, `practice-verdict` ...) |
| `src/components/Mascot.tsx` | current moods `greeting/happy/encouraging/celebrating`, sizes `inline/block/companion` |
| `src/hooks/useDragTile.tsx`, `useDemoHint.ts`, `usePrefersReducedMotion.ts`, `src/lib/sfx.ts`, `src/lib/speech.ts` | input + audio integration points |
| `src/lib/viewer/ViewerContext.tsx` | `useViewer().band/density/land` |
| `src/index.css`, `tailwind.config.js`, `public/fonts/*` | keyframes, reduced-motion block, loaded font weights (Baloo 2 600/700/800; Be Vietnam Pro 400/500/700/800) |
| `src/components/icons.tsx` | icon family (stroke 2, round caps, 24 grid - lucide-style outlined) |
| `.devin/skills/impeccable/reference/animate.md` | detector stance on bounce/elastic easing |

Defects found while reading (fixed by this spec, cited where fixed):

- D1 `DISPLAY_GLYPH` uses `font-black` (900) but Baloo 2 ships only 600/700/800 - the browser synthesizes faux-bold. -> §8.
- D2 `ExamScreen` `practice-verdict` renders wrong answers in **rose** (`border-rose-500 bg-rose-500/15 text-rose-300`) - violates status semantics (answer-wrong = slate). -> §10.
- D3 `.tile-shake` and `.dart-arrow` (`index.css`) are missing from the `prefers-reduced-motion` block. -> §17.
- D4 `StarRain` / `ChestReveal` render reward chrome as emoji (star, gift). Reward chrome is UI, not content illustration. -> §16.
- D5 `LandScene` + `Mascot` carry literal hex fills inside components; city/space lands and `TownScene` still paint indigo/violet ramps after CR-81 "indigo removed". -> §6, §11.
- D6 Ruling 2026-02-16 (Design gate) approved "Andika letter-level G1-2" - never implemented (no `public/fonts/andika`). -> §8.
- D7 Night-journey `night` filter (`brightness-[0.6] saturate-[0.7]`) is a CSS filter on the scene SVG - fine for a 176px strip, expensive on a full-bleed hero on low-end Android. -> §6.4.

---

## 1. Design thesis

**Concept: "Chân trời vàng" (the golden horizon).** Every kid play surface is a moment on a journey
at twilight: a deep VieSchool-navy sky, a warm gold horizon glow behind the child's own land, and the
board floating over it like a travel map held up to the light. As the child answers, the land
**pans past beneath the board** - the journey is literal, not a label.

One-sentence signature (what a parent would describe): *"the questions float over a glowing night
landscape that slowly moves forward as my child plays, and a little pig sits on the edge of the
board reading each question."*

Principles (every decision below cites one):

- P1 **World first, board second.** The scene is the hero; the board is the object in it. No text ever
  sits directly on the scene layer.
- P2 **Toy physics, not glass.** Surfaces have mass: inner highlight, solid base edge, press-to-sink.
  Translucent glass is for chrome only.
- P3 **Two registers.** Play = warm, illustrated, physical. Exam = paper, calm, formal. They never borrow
  each other's materials.
- P4 **Gold means treasure or the next step.** Still ≤1 gold CTA per screen (`CTA_GOLD_XL`).
- P5 **Band-shaped, not band-forked.** G1-2 gets bigger, voice-first, gesture-rich; G3-5 gets denser and
  faster. Driven by `useViewer().band/density`, never local `isG12` sizing forks.
- P6 **Motion carries meaning and always has a still twin.** Every animation lists its reduced-motion
  fallback (§17); the still version must carry the same information.

---

## 2. Advisory: objections, options matrices, rulings

### OBJ-1 - CR-82 B1 reverses the CR-79 owner ruling

CR-79 recorded owner ruling 2026-10-16: *"moderate depth, clean - NOT a full illustrated toy-world
scene."* CR-82 B1 (approved later, user judged CR-81 "không đủ wow") asks for exactly a full-bleed
illustrated hero. Evidence of conflict is direct. Risk of the reversal: visual noise competing with
the question for a 6-year-old's attention (cognitive load).

Ruling: R-v5-01 - CR-82 is the newer approved directive and supersedes the CR-79 depth ruling. The
CR-79 concern is honored by mitigations, not by ignoring it: (a) no text on the scene layer, (b) a
scrim darkens the scene behind the board (`scene.scrim`), (c) ambient motion budget ≤12 animated nodes
per scene, every scene ambient loop period ≥6s (rev 2: `land-twinkle`/`ambient-sparkle`/`land-float`
timings are raised to meet this - §17; mascot and audio-state loops are not scene ambience), (d) foreground props are suppressed on short landscape viewports,
(e) G1-2 instruction audio still leads attention. Human gate may revert to strip mode (`variant="strip"`
is kept, §6.2).

### OM-1 - scene tone per band (B1)

| Option | Strengths | Weaknesses | Risk | Domain fit |
|---|---|---|---|---|
| A. Night everywhere (v4 as-is, full-bleed) | zero palette work; strongest navy brand | G1-2 reads gloomy; little "wow" delta vs CR-81 | user rejects again | low for 6-7yo |
| **B. Dusk for G1-2, night for G3-5 (recommended)** | warmer, friendlier for little ones; older kids get the "cooler" starry register they prefer; navy stays dominant in both | two tone palettes to maintain | low - derived by formula (§6.4) | high: Khan Kids / Lingokids use warm light for youngest |
| C. Full daylight scenes | brightest, most "kid" | breaks navy 60% rule; text-pairing surface becomes light under navy board = contrast churn | high | medium |
| D. Do nothing (keep v4 strip) | no risk | fails CR-82 acceptance ("materially new visual language") | certain CR failure | n/a |

Recommendation: B. Grade-select postcards use the `day` tone at thumbnail size only (§6.6).
**Human ruling (rev 2): B - approved.** Validate on the 390x844 phone frame as well as desktop (§23).

### OM-2 - typography (B3)

| Option | Strengths | Weaknesses | Risk | Domain fit |
|---|---|---|---|---|
| A. Keep Baloo 2 + Be Vietnam Pro, fix hierarchy + weights | 0 new bytes; already Vietnamese-subset; VieSchool-shared body face | Baloo's double-story `a`/`g` is wrong for tracing models | none | good |
| **A + B. Add Andika for letter-level G1-2 only (recommended)** | single-story `a`/`g`, built by SIL for beginning readers; Vietnamese coverage; honors the never-implemented 2026-02-16 ruling (D6) | ~2 extra woff2 files (lazy, only used on G1-2 letter surfaces) | low | very high for tracing/spelling |
| C. Swap display face (e.g. Fredoka) | fresh look | no Vietnamese diacritic coverage in common builds; breaks VieSchool cohesion | high | low |

Recommendation: A + B.
**Human ruling (rev 2): A + B - approved.** Andika already carried the standing 2026-02-16 Design gate
approval; this confirms it rather than granting a new permission.

### OM-3 - mascot rig technology (B4)

The 2026-02-16 Tech gate ruled "mascot Lottie = JSON". `@lottiefiles/dotlottie-react` is already a dependency
(used by `EmojiLottiePlayer`), so the cost is **art production, not code** - and no animator/asset pipeline
exists in the repo.

| Option | Strengths | Weaknesses | Risk |
|---|---|---|---|
| **A. Inline-SVG pose rig extending `PigFace` (recommended now)** | ships with the design pass; crisp at every size; CSS motion with reduced-motion twins; testable (`data-mascot-mood`) | motion less fluid than Lottie | low |
| B. Lottie JSON per pose (honor ruling literally) | richest motion | needs commissioned animation for 6 poses; runtime cost on low-end devices; reduced-motion = static frame export per pose | medium (asset dependency blocks CR) |
| C. A now, Lottie later behind the same `Mascot` props API | no rework of call sites | two art sources temporarily | low |

Designer recommendation was C (SVG now, Lottie later).
**Human ruling (rev 2): B - Lottie JSON NOW, overriding the recommendation.** R-v5-02 is APPROVED for Lottie:
the pose rig ships as Lottie JSON assets in CR-82 (§9.2-§9.5), honoring the 2026-02-16 Tech gate ruling.
The static PigFace-derived SVG pose set is still built, but as the loading poster, the reduced-motion
renderer and the missing-asset fallback - not as the primary rig. Asset production is a Developer-phase
dependency with a non-blocking fallback rule (§9.5).

### OM-4 - exam surface (B5)

| Option | Strengths | Weaknesses | Risk |
|---|---|---|---|
| **A. Light paper sheet on the dark exam desk (recommended)** | literally "IOE-style paper sheet"; calm; maximal distinctness from the navy play board; print-like credibility for parents | supersedes the R7 "IOE mono interior" ruling; all exam interior tokens need paper twins | medium (test churn on classes, none on testids) |
| B. Refine the dark chalkboard (`#16232e`, amber-800 frame) | no ruling change | does not read as "premium paper"; dark-on-dark sameness with play | fails B5 intent |

Recommendation: A. Ruling: R-v5-03 - CR-82 B5 supersedes kids-UX R7 for the exam interior; the
`EXAM_HEADER_BRAND` badge stays the single brand injection.
**Human ruling (rev 2): A - approved; R-v5-03 approved.** Paper text bindings per §5.3 (F1).

### OM-5 - drag-into-gap for sentence items (C2)

`listening-sentence-fill-blank` is currently typed recall. A word bank turns it into recognition.

| Option | Strengths | Weaknesses | Risk |
|---|---|---|---|
| **A. G1-2: word bank (answer + 2 distractors) dragged into the gap; G3-5 keeps typing (recommended)** | removes the typing barrier for pre-writers; gesture fits "put the word in its place" | easier than recall; distractor quality becomes a content risk (Workstream A F2 lesson) | medium - mitigated by §13.5 validation path |
| B. Keep typing everywhere, add optional bank | no pedagogy change | G1-2 typing on phone keyboards stays the bottleneck | low |
| C. Letter tiles for the missing word | keeps spelling recall | very long for multi-letter words; slow | medium |

Designer recommendation was A.
**Human ruling (rev 2, custom): BOTH for G1-2.** On G1-2 sentence-gap items the word-bank drag is the
primary input AND a typed path is available on the same surface as a peer choice (a "Gõ tay" toggle and
tap-the-gap-to-type), not only an error fallback - the child or parent chooses (§13.7). G3-5 keep typing
only. Spell-it drag for G1-2 ships as designed. Recorded as R-v5-10. The word bank appears only on items
that pass the §13.5 validation path; ineligible items render typed-only (R-v5-08).

### OM-6 - city/space land recolor (B6)

Indigo/violet is the "AI-purple" the CR bans, but space is naturally purple-ish.

| Option | Result |
|---|---|
| **A. City -> warm "đèn thành phố" (navy towers + amber-200 windows, orange-300 rim); Space -> navy cosmos with violet confined to the rim + one nebula glow at ≤15% alpha (recommended)** | each land keeps a distinct flag hue; violet becomes one deliberate identity accent, not scatter |
| B. Remove violet entirely (space = sky-300 rim) | collides with town (sky-400 rim) - two lands same flag |
| C. Keep as-is | fails B6 |

Ruling: R-v5-04 - recommend A; adds **orange** to the approved palette list in `DESIGN_SYSTEM.md` §12
(orange is already shipped in `EXAM_SELECTED`, so this documents reality).
**Human ruling (rev 2): A - approved.** The violet inventory is closed and identical in §5.1 and §11:
space `nightRim`, `discBg`, `horizonGlow`, the space map card (`cardTint violet-50/95` + `accentText
violet-800`) and one L1 nebula radial. Nothing else may use violet.

### OBJ-2 - "springy" easing vs the impeccable detector

`impeccable/reference/animate.md` warns against bounce/elastic curves "by reflex"; CR-82 acceptance needs
the detector clean on new code. Ruling: R-v5-05 - springs are restricted to two literal-physics cases
(toy press-release and tile snap-into-slot) using a mild overshoot (`ease-toy`, ≤4% overshoot). All
other motion uses `ease-out-quint`/`ease-out-expo`. If the detector flags `ease-toy`, use the narrowest
`ignore-value` with reason "Designer: literal toy-block physics, CR-82 C5 springy press". Never
`ignore-rule`.

### OBJ-3 - mascot inside the exam hall

kids-UX R7 put a greeting mascot inside the exam header badge. A formal register (P3) and the one-mascot
rule both argue against a character during a timed sitting. Ruling: R-v5-06 - mascot appears on
`ExamIntro` and `ExamResult` only; the header badge keeps the wordmark without the pig during the
sitting. Reversible.

---

## 3. Invariants (unchanged by v5 - violations fail review)

- Navy/gold VieSchool shell; gold = reward + next step; ≤1 `CTA_GOLD_XL` per screen.
- Status semantics: emerald = correct/go; answer-wrong = slate (`OPTION_PICKED_WRONG`, `feedback.wrong`);
  rose = destructive/urgent status only; amber = warning/progress; sky = info.
- Surface-pairing rule (`DESIGN_SYSTEM.md` §3): every new token below declares its surface and measured
  contrast; text on navy = light ramps only, on paper = dark ramps only. Rev 2 (F1): text geometry and
  text color are separate tokens; a component picks the composite for its surface (§5.3) and never stacks a
  geometry token that carries a color with a second color class.
- Gold scope (rev 2, N1): the **timed exam sitting** has no gold fills. Untimed practice drill, `ExamIntro`
  and `ExamResult` may each carry one gold next-step/reward action, like any other screen.
- Touch floors: 76px G1-2 standalone, 64px G3-5 standalone, 48px kid non-standalone, 44px adult,
  36px chips in a row. Read from `useViewer().density`.
- `prefers-reduced-motion` honored by every animation (CSS `motion-reduce:` + the `index.css` block,
  JS paths via `usePrefersReducedMotion()`).
- One mascot visible at a time (`[data-testid="mascot"]` count = 1 per screen state).
- Feedback-sheet contract (§5.5).
- Band gating G1-2 vs G3-5 via `bandForGrade()` / `useViewer().band`.
- All existing testids, aria names, `data-*` verdict attributes, pointer/drag/demo contracts.
- Vietnamese copy hyphen `-` only (`dashGuard.test.ts`); no emoji in UI chrome; icons from
  `src/components/icons.tsx` only.
- Exam register distinct from play register (§10).

---

## 4. Foundations - primitives (new, Tailwind theme extension)

Today navy/exam hex is re-spelled as arbitrary classes in many tokens (`from-[#162C55]`, `bg-[#16232e]`).
v5 names them once in `tailwind.config.js` `theme.extend.colors` so new tokens stop spelling hex.
Legacy tokens migrate opportunistically (no forced rewrite). Values are the already-shipped hex - no new
brand colors.

| Primitive | Hex | Was used as |
|---|---|---|
| `navy-950` | `#0b1224` | `brand.pageGradient` from/to |
| `navy-900` | `#101a36` | page gradient via |
| `navy-850` | `#0E1F42` | `CARD` to |
| `navy-800` | `#162C55` | `CARD` from, board |
| `navy-700` | `#1d3465` | `toy.face` from, `BTN_AUDIO` |
| `navy-650` | `#24406f` | `BTN_AUDIO` hover |
| `navy-600` | `#2a4a82` | audio accent |
| `navy-500` | `#3b5280` | unanswered tile frame |
| `navy-rim` | `#2a3a5e` | hairline rings |
| `navy-base` | `#0a1730` | `toy` base edge |
| `navy-chrome` | `#0B1B3A` | play chrome strip |
| `desk` | `#0d1b26` | exam page |
| `desk-bar` | `#132433` | exam header/strip |
| `desk-well` | `#0a1520` | exam timer/progress wells |
| `desk-card` | `#16232e` | `EXAM_OPTION`, `EXAM_NAV_CELL` |
| `desk-line` | `#22303d` | exam rings |

Font family addition: `fontFamily.letter: ['Andika', '"Be Vietnam Pro"', 'system-ui', 'sans-serif']`
(§8). Motion primitives: §5.4.

---

## 5. Semantic token spec (to add to `src/lib/ui/tokens.ts`)

Naming follows the file's existing style: UPPER_SNAKE string constants + lowercase grouped objects
(`scene`, `toy`). Contrast = WCAG ratio, computed (alpha surfaces composited over their real parent).

### 5.1 Scene layer (`scene.*`, extends the existing `scene` object)

| Token | Classes / value | Surface | Notes |
|---|---|---|---|
| `scene.root` | `pointer-events-none fixed inset-0 z-0 overflow-hidden` | page | `aria-hidden="true"`; replaces the bottom-pinned strip on play surfaces |
| `scene.skyDusk` | `bg-gradient-to-b from-navy-950 via-navy-900 to-navy-700` | page | G1-2 |
| `scene.skyNight` | `bg-gradient-to-b from-navy-950 via-navy-950 to-navy-800` | page | G3-5, adult brand surfaces |
| `scene.horizonGold` | `bg-[radial-gradient(90%_38%_at_50%_100%,rgba(251,191,36,0.28),transparent_70%)]` | page | amber-400 rgb; night variant alpha 0.14 (`scene.horizonGoldNight`) |
| `scene.scrim` | `bg-[radial-gradient(62%_52%_at_50%_44%,rgba(11,18,36,0.55),transparent_76%)]` | page | darkens the scene behind the board (OBJ-1 mitigation) |
| `scene.layer` | `absolute inset-x-[-8%] bottom-0 will-change-transform transition-transform duration-700 ease-out-quint motion-reduce:transition-none` | page | one per parallax layer; transform via CSS var (§6.3) |
| `scene.glow` | unchanged (CR-79) | - | kept for non-hero fallback |

`theme.ts` additions on `Land`:

| Field | playground | town | jungle | city | space | brand |
|---|---|---|---|---|---|---|
| `nightRim` (existing) | `bg-lime-400` | `bg-sky-400` | `bg-emerald-400` | **`bg-orange-300`** (was indigo-400) | `bg-violet-400` | `bg-amber-400` |
| `horizonGlow` (new) | `rgba(163,230,53,0.30)` | `rgba(56,189,248,0.28)` | `rgba(52,211,153,0.28)` | `rgba(253,186,116,0.30)` | `rgba(167,139,250,0.15)` | `rgba(252,211,77,0.24)` |
| `cardTint` (map card) | unchanged | unchanged | unchanged | **`bg-orange-50/95`** | **`bg-violet-50/95`** | unchanged |
| `accentText` | unchanged | unchanged | unchanged | **`text-orange-800`** (6.88:1 on orange-50) | **`text-violet-800`** (8.19:1 on violet-50) | unchanged |
| `discBg` | unchanged | unchanged | unchanged | **`bg-orange-500`** | `bg-violet-500` | unchanged |
| `pageGradient` | unchanged | unchanged | unchanged | **`bg-gradient-to-b from-orange-300 via-amber-100 to-sky-100`** | **`bg-gradient-to-b from-navy-950 via-navy-800 to-navy-700`** | unchanged |

New `theme.ts` export `scenePalette(land, tone)` - see §6.4 (replaces in-component hex, D5).

### 5.2 Material layer (`material.*`, new object; B2)

| Token | Classes | Surface | Text pair (ratio) |
|---|---|---|---|
| `material.board` | `rounded-[2rem] bg-gradient-to-b from-navy-800 to-navy-850 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-2px_0_rgba(0,0,0,0.25),0_32px_64px_-24px_rgba(0,0,0,0.75),0_12px_24px_-12px_rgba(0,0,0,0.5)]` | navy | white 13.77 / sky-200 10.37 / slate-100 12.57 |
| `material.tileFace` | `rounded-[1.25rem] border-2 border-navy-500 bg-gradient-to-b from-navy-700 to-navy-800 text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.20),inset_0_-3px_0_rgba(0,0,0,0.20),0_6px_0_theme(colors.navy.base),0_14px_20px_-10px_rgba(0,0,0,0.6)]` | navy | white on navy-700 12.13 |
| `material.tileHover` | `[@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-amber-300/60 [@media(hover:hover)]:hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.20),inset_0_-3px_0_rgba(0,0,0,0.20),0_8px_0_theme(colors.navy.base),0_18px_24px_-10px_rgba(0,0,0,0.6)] motion-reduce:hover:translate-y-0` | navy | - |
| `material.tilePress` | `active:translate-y-[6px] active:shadow-[inset_0_2px_0_rgba(255,255,255,0.20),inset_0_-3px_0_rgba(0,0,0,0.20),0_0_0_theme(colors.navy.base)] transition-[transform,box-shadow] duration-100 ease-out-quint motion-reduce:active:translate-y-0` + release class `animate-press-release` (§5.4) | navy | shadow swap still signals press under reduced motion |
| `material.tileDisabled` | `cursor-not-allowed opacity-50 saturate-50 shadow-[0_2px_0_theme(colors.navy.base)]` (no hover/press classes) | navy | label still white (contrast floor waived only for disabled per WCAG 1.4.3 exception; disabled state also announced via `disabled`/`aria-disabled`) |
| `material.tileFocus` | `focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70` | navy | amber-300 vs navy-800 9.55 (non-text ≥3) |
| `material.tileCorrect` | `border-emerald-400 bg-gradient-to-b from-emerald-500/30 to-emerald-600/20 text-emerald-100 shadow-[inset_0_2px_0_rgba(255,255,255,0.18),0_6px_0_theme(colors.emerald.800),0_0_22px_rgba(52,211,153,0.45)]` | navy | emerald-100 on emerald-500/30 over navy-800 7.30 (worst stop); 11.15 at the emerald-600/20 bottom stop |
| `material.tileRevealCorrect` | = `OPTION_REVEAL_CORRECT` (kept) | light | emerald-900 on emerald-100 (kept) |
| `material.tilePickedWrong` | `OPTION_PICKED_WRONG` + `translate-y-[4px] shadow-none` ("sunk", read as "that one, done") | light | slate-700 on slate-200 (kept) |
| `material.exhibitPaper` | `inline-block rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200/70 shadow-[inset_0_1px_0_#ffffff,inset_0_-6px_12px_-8px_rgba(146,64,14,0.18),0_4px_10px_-4px_rgba(0,0,0,0.45)]` | warm paper | slate-800 14.11; replaces `EXHIBIT` (slate-50/95). `EXHIBIT_TILT` kept |
| `material.paperSlate` | `rounded-[2rem] bg-amber-50 ring-1 ring-amber-200 shadow-[inset_0_2px_0_#ffffff,0_8px_0_rgba(146,64,14,0.45),0_24px_48px_-20px_rgba(0,0,0,0.7)]` | warm paper | slate-900 17.22; tracing + flashcard front |
| `material.goldCta` (folds into `CTA_GOLD_XL`) | `rounded-3xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-3px_0_rgba(180,83,9,0.35),0_6px_0_theme(colors.amber.700),0_16px_24px_-10px_rgba(245,158,11,0.55)]` + press = `material.tilePress` geometry with amber-700 base | gold | amber-950 on amber-300 10.39 / amber-400 8.97 / amber-500 6.97 |
| `material.chrome` (tokenizes the inline BatchScreen strip) | `rounded-2xl bg-navy-chrome/85 ring-1 ring-navy-rim backdrop-blur-md shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6),0_4px_12px_-6px_rgba(0,0,0,0.4)] sm:rounded-full` | navy glass | sky-300 10.22; amber-200 chips per `CHIP_AMBER` |

Radius scale (codifies v4 S7, chunkier per B2): board `2rem` · card `rounded-3xl` (1.5rem) · tile
`1.25rem` · exhibit/slot `rounded-2xl` (1rem) · control `rounded-xl` · chip `rounded-full`. No other radii
on kid surfaces.

Elevation scale: e0 flat (exam paper interior) · e1 tile (6px base + soft drop) · e2 card · e3 board
(32px drop) · e4 sheet/dialog/drag-ghost (`0_28px_48px_-16px_rgba(0,0,0,0.75)`).

### 5.3 Type layer (`TYPE_*` geometry + `INK_*` color; B3) - rev 2 (F1)

Rev 1 baked colors into type tokens (`TYPE_PROMPT` carried `text-white`, `TYPE_HERO_GLYPH` carried
`text-amber-100`) and then used them on paper (G1-2 exam prompt on slate-50 = **1.05:1**; G3-5 flashcard front
word on amber-50 = **1.07:1**). A parent's dark text cannot override a child's explicit light class. Rev 2
splits every type token into **geometry** (face, size, weight, leading - no color) and **ink** (color bound to a
surface), and exports **surface composites** that are the only thing components import.

**Geometry tokens (color-free - never used alone in JSX; only inside composites):**

Rev 3 (R2-3): each geometry token carries exactly one size (or none, where noted), and a composite never gets a
size utility appended. Where a second size is needed it is its own geometry token, so no class string ever holds
two conflicting `text-*` sizes.

| Token | Classes |
|---|---|
| `TYPE_HERO_GLYPH_GEO` | `font-display text-7xl font-extrabold leading-[1.1] sm:text-8xl` (fixes D1: `font-black` -> `font-extrabold`) |
| `TYPE_CARD_GLYPH_GEO` (rev 3) | `font-display text-6xl font-extrabold leading-[1.1]` (card-size hero word; replaces rev 2's "hero glyph at text-6xl") |
| `TYPE_HERO_NUMBER_GEO` | `font-display text-6xl font-extrabold leading-none tabular-nums` |
| `TYPE_SECTION_GEO` | `font-display text-2xl font-bold leading-tight tracking-tight` |
| `TYPE_PROMPT_GEO` | G1-2 `text-2xl font-bold leading-snug`; G3-5 `text-xl font-bold leading-snug` (pick via `useViewer().band`) |
| `TYPE_INSTRUCTION_GEO` | `text-base font-medium leading-normal sm:text-lg` |
| `TYPE_BODY_GEO` | `text-base font-normal leading-relaxed` |
| `TYPE_CAPTION_GEO` | `text-sm font-medium leading-snug` (kid minimum 14px; 12px adult/parent only) |
| `TYPE_IPA_GEO` (rev 3) | `font-mono text-sm font-medium leading-snug` |
| `TYPE_LETTER_TILE_GEO` (rev 3) | `font-letter text-3xl font-bold leading-none` (Andika, spell tiles/slots) |
| `TYPE_LETTER_CARD_GEO` (rev 3) | `font-letter text-6xl font-bold leading-[1.1]` (Andika, G1-2 flashcard back word) |
| `TYPE_LETTER_WORD_GEO` (rev 3) | `font-letter text-3xl font-bold leading-snug` (Andika, tracing exhibit word) |
| `TYPE_NUMERAL` | `tabular-nums` (color-free utility, safe on any surface; the only token allowed to be added next to a composite, because it sets no size and no color) |

The rev 2 size-less `TYPE_LETTER_GEO` is removed; its three uses now name a sized letter token.

**Ink tokens (one per surface class):**

| Token | Class | Legal effective surfaces |
|---|---|---|
| `INK_NAVY` | `text-white` | navy board/card/chrome, flashcard back face, desk |
| `INK_NAVY_SOFT` | `text-slate-100` | navy, `QUESTION_BANNER` |
| `INK_NAVY_MUTED` (rev 3) | `text-slate-300` | navy (replaces the literal `text-slate-300` inside rev 2 composites) |
| `INK_NAVY_IPA` (rev 3) | `text-sky-200` | navy |
| `INK_NAVY_HERO` | `text-amber-100 drop-shadow-[0_3px_0_rgba(0,0,0,0.35)]` | navy only |
| `INK_PAPER` | `text-slate-900` | warm paper (amber-50), exam paper (slate-50), white |
| `INK_PAPER_SOFT` | `text-slate-700` | warm paper, exam paper, white |
| `INK_PAPER_HERO` | `text-navy-800` | warm paper, exam paper |

**Surface composites (what components import):**

| Composite | = | Used by |
|---|---|---|
| `TYPE_HERO_GLYPH_NAVY` | `TYPE_HERO_GLYPH_GEO` + `INK_NAVY_HERO` | phonics sound glyph on the board (replaces `DISPLAY_GLYPH`, kept as alias) |
| `TYPE_CARD_GLYPH_PAPER` (rev 3) | `TYPE_CARD_GLYPH_GEO` + `INK_PAPER_HERO` | G3-5 flashcard front word (rev 2 named this `TYPE_HERO_GLYPH_PAPER` "at text-6xl"; that composite is removed) |
| `TYPE_HERO_NUMBER_NAVY` / `_PAPER` | geo + `INK_NAVY` / `INK_PAPER_HERO` | round/batch summary score / ExamResult score |
| `TYPE_PROMPT_NAVY` / `_PAPER` | geo + `INK_NAVY` / `INK_PAPER` | board prompts / exam sheet prompts (all grades) |
| `TYPE_INSTRUCTION_NAVY` | geo + `INK_NAVY_SOFT` | `QUESTION_BANNER` on every kind, incl. tracing |
| `TYPE_SECTION_NAVY` / `_PAPER` | geo + `INK_NAVY` / `INK_PAPER` | summary headings / exam + flashcard summary headings on paper |
| `TYPE_BODY_NAVY` / `_PAPER` | geo + `INK_NAVY_MUTED` / `INK_PAPER_SOFT` | explanations |
| `TYPE_CAPTION_NAVY` / `_PAPER` | geo + `INK_NAVY_MUTED` / `INK_PAPER_SOFT` | captions, legends |
| `TYPE_IPA_NAVY` (rev 3) | `TYPE_IPA_GEO` + `INK_NAVY_IPA` | flashcard back IPA (and FeedbackPanel IPA when it migrates) |
| `TYPE_LETTER_TILE_NAVY` (rev 3) | `TYPE_LETTER_TILE_GEO` + `INK_NAVY` | spell tiles, filled spell slots |
| `TYPE_LETTER_CARD_NAVY` (rev 3) | `TYPE_LETTER_CARD_GEO` + `INK_NAVY` | G1-2 flashcard back word |
| `TYPE_LETTER_WORD_PAPER` (rev 3) | `TYPE_LETTER_WORD_GEO` + `INK_PAPER` | tracing exhibit word |
| `TYPE_TITLE` | = `H1` (kept, carries `text-white`) | navy surfaces only |

Rules (rev 3, R2-3):

1. A component never imports a `*_GEO` token, and never adds a color or size utility next to a composite
   (`TYPE_NUMERAL` is the only permitted neighbour). Component tokens (`material.*`, `EXAM_*`, `SPELL_*`,
   `WORD_CHIP`, `CHIP_*`, `EXAM_RING_LABEL`) are different: each owns a complete class set bound to the one surface
   named in its table row, and may sit on the same element as a `TYPE_*` composite only when both carry the same
   ink and only one of them sets a size.
2. **Pairing follows the effective painted surface, not any ancestor.** The effective surface of a text node is
   its nearest ancestor-or-self that paints a background (a `bg-*` fill or gradient at ≥80% opacity). A
   `*_NAVY` composite is legal when that surface is navy/desk; a `*_PAPER` composite when it is paper
   (amber-50, slate-50, white, `*-50`/`*-100` paper tints). Consequences:
   - `FLASH_FACE_BACK` paints navy, so `TYPE_LETTER_CARD_NAVY` / `TYPE_IPA_NAVY` / `TYPE_BODY_NAVY` are legal on
     the back face even though the card root is `material.paperSlate` - rev 2's blanket "banned inside
     `material.paperSlate`" was overbroad and is withdrawn.
   - `EXAM_QNUM` (navy chip) inside `EXAM_SHEET` paints navy, so its white numeral is legal.
   - Text sitting directly on `EXAM_SHEET`, `FLASH_FACE_FRONT`, `material.exhibitPaper`, `PAPER_PANEL`,
     `FLASH_PANEL` or any `bg-white`/`bg-*-50` container with no navy fill in between must use `*_PAPER`.
3. Enforcement (claim narrowed to what each check can catch):
   - **Token unit test** (`tokens.test.ts`, new): every exported `*_PAPER` composite contains no
     `text-white`, `text-amber-100/200/300`, `text-sky-100/200/300`, `text-slate-100/200/300`; every `*_NAVY`
     composite contains no `text-slate-600..950`, `text-navy-*`, `text-*-700..950`; no composite contains two
     `text-(xs|sm|base|lg|[2-9]?xl)` size classes outside responsive prefixes.
   - **Source scanner** (`colorPairingGuard.test.ts` extension): catches only literal same-element stacking -
     an element class string that combines a paper surface token with a light ink literal. It cannot see a
     child composite inherited onto a paper parent, and this spec no longer claims it does.
   - **Regression fixtures (required, render tests)** for the exact rev 1 defects: (a) G1-2 exam prompt rendered
     inside `EXAM_SHEET` has `text-slate-900` and no `text-white`; (b) G3-5 flashcard front word has
     `text-navy-800` and no `text-amber-100`; (c) G1-2 flashcard back word has `text-white` and its nearest
     painted ancestor is the `FLASH_FACE_BACK` element (navy), proving rule 2's nested case.

**Actual-usage contrast matrix (every place a composite lands):**

| Usage | Composite | Text / surface | Ratio | Floor |
|---|---|---|---|---|
| Board prompt (all bands) | `TYPE_PROMPT_NAVY` | white / navy-800 (worst board stop) | 13.77 | 4.5 |
| Banner instruction | `TYPE_INSTRUCTION_NAVY` | slate-100 / white-7% over navy-800 | 10.19 | 4.5 |
| Phonics hero glyph | `TYPE_HERO_GLYPH_NAVY` | amber-100 / navy-800 | 12.36 | 3 (large) |
| Spell tile letter | `TYPE_LETTER_TILE_NAVY` | white / navy-700 | 12.13 | 3 (large) |
| Exam prompt G1-2 + G3-5 | `TYPE_PROMPT_PAPER` | slate-900 / slate-50 | 17.06 | 4.5 |
| Exam option label | `EXAM_OPTION_PAPER` (slate-800) | slate-800 / white | 14.63 | 4.5 |
| Exam sheet header | `EXAM_SHEET_HEADER` | slate-700 / slate-50 | 9.90 | 4.5 |
| Exam explanation / caption | `TYPE_BODY_PAPER` | slate-700 / slate-50 | 9.90 | 4.5 |
| ExamResult score | `TYPE_HERO_NUMBER_PAPER` | navy-800 / slate-50 | 13.16 | 3 (large) |
| Flashcard front word G3-5 | `TYPE_CARD_GLYPH_PAPER` | navy-800 / amber-50 | 13.27 | 3 (large) |
| Flashcard front caption | `TYPE_CAPTION_PAPER` | slate-700 / amber-50 | 9.99 | 4.5 |
| Flashcard back word G1-2 (effective surface = `FLASH_FACE_BACK`) | `TYPE_LETTER_CARD_NAVY` | white / navy-850 (worst back stop) | 16.24; 13.77 on navy-800 | 3 (large) |
| Flashcard back IPA / explanation | `TYPE_IPA_NAVY` / `TYPE_BODY_NAVY` | sky-200 / navy-800 (12.24 on navy-850); slate-300 / navy-800 | 10.37 / 9.27 | 4.5 |
| Feedback / summary body on navy | `TYPE_BODY_NAVY` | slate-300 / navy-800 | 9.27 | 4.5 |
| Tracing exhibit word | `TYPE_LETTER_WORD_PAPER` | slate-900 / amber-50 | 17.22 | 3 (large) |
| Exhibit captions (play) | `TYPE_CAPTION_PAPER` | slate-700 / amber-50 | 9.99 | 4.5 |
| Flashcard + exam summary heading on paper | `TYPE_SECTION_PAPER` | slate-900 / amber-50 or slate-50 | 17.22 / 17.06 | 3 (large) |
| Summary score on navy | `TYPE_HERO_NUMBER_NAVY` | white / navy-800 | 13.77 | 3 (large) |

Weights in use: Baloo 2 600/700/800 only; Be Vietnam Pro 400/500/700/800 only (no `font-semibold`
on Be Vietnam text - 600 is not shipped).

### 5.4 Motion primitives (`tailwind.config.js` + `index.css`)

| Primitive | Value | Use |
|---|---|---|
| `ease-out-quint` | `cubic-bezier(0.22,1,0.36,1)` | default UI arrivals, scene pan |
| `ease-out-expo` | `cubic-bezier(0.16,1,0.3,1)` | sheets, dialogs, card enter |
| `ease-in-out-soft` | `cubic-bezier(0.65,0,0.35,1)` | flip, ambient loops |
| `ease-toy` | `cubic-bezier(0.34,1.30,0.64,1)` | ONLY press-release + snap-into-slot (R-v5-05) |
| `duration-80` / `100` / `160` / `240` / `400` / `700` | ms | instant / press / quick / base / emphasis / pan+celebrate |
| keyframe `press-release` | `0% translateY(6px)` -> `60% translateY(-1px)` -> `100% translateY(0)`, 240ms `ease-toy` | tile/CTA release |
| keyframe `snap-in` | `0% scale(1.08)` -> `100% scale(1)`, 180ms `ease-toy` | drop into slot |
| keyframe `streak-burst` | ring `scale(0.6) opacity(0.9)` -> `scale(1.6) opacity(0)`, 520ms `ease-out-quint` | C5 streak |
| keyframe `star-fly` | translate along `--fx/--fy` + `scale(1 -> 0.5)`, 600ms `ease-out-expo` | correct answer -> score chip |
| (rev 2) mascot motion | lives inside the Lottie assets (§9.5); no CSS mascot keyframes are added. Existing `mascot-wave/pop/calm/celebrate` + `mascot-float` stay only for the static SVG renderer's non-reduced path and are retired once all 6 Lottie poses ship | - |
| keyframe `scene-drift-far` | `translateX(0 -> 18px)`, 60s alternate | far clouds/stars band |
| (rev 2, N2) `land-twinkle` / `ambient-sparkle` / `land-float` | periods raised 2.6s -> 6.5s / 3.4s -> 7s / 5s -> 7s in `index.css` | scene ambience ≥6s (OBJ-1 c) |

Every class above is listed in the `@media (prefers-reduced-motion: reduce)` block in `index.css`
(§17 gives the per-animation still twin).

### 5.5 Feedback-sheet contract (restated - mechanics plug into this, never around it)

Owned by `QuestionCard.tsx` + `FeedbackPanel.tsx` (CR-73 s5.2, r22/r23):

1. On commit, the question body calls one `onSubmit*` callback; `QuestionCard` receives `currentAnswer`
   with `isCorrect`.
2. The feedback zone = fixed bottom sheet (`fixed inset-x-2 bottom-0 z-40 max-w-[40rem]`) containing
   `FeedbackPanel` + `next-button`; card reserves `calc(min(40vh,320px) + 5.5rem)` bottom padding
   (rev 2: + perch overhang `2.75rem` when the sheet perch renders - §9.3).
3. `FeedbackPanel`: `data-correct`, `aria-live="polite"`, verdict sfx on mount (`playSfx('correct')` /
   `playGentleWrong()`), headline + "Em chọn:" (wrong) + "Từ đúng là:" + IPA + picture + explanation +
   "Nghe mẫu" (wrong, band floor height), bounded `max-h-[min(40vh,320px)]`, `overscroll-contain`,
   safe-area pad. `celebrate` = streak ≥3.
4. `next-button` advances; `pronunciation-recording` keeps its own in-flow panel.

v5 changes inside the contract are visual only (materials; the mascot perch is a sibling layer in
`QuestionCard`'s fixed sheet wrapper, outside the scrolling `FeedbackPanel` - §9.3), plus two additive props on
`FeedbackPanel`: a per-kind headline map for `letter-tracing` (§12.6) and `mascotPlacement: 'inline' | 'none'`
(§9.3). No new feedback surface is introduced
for judged mechanics. Flashcards are **not judged** and do not use the sheet (§14).

---

## 6. B1 - Scene upgrade (land scene as hero)

### 6.1 UX description + rationale

The land fills the viewport behind every kid play surface. Three illustrated layers (far / mid / near)
sit on a navy sky with a gold horizon glow tinted by the land's flag color. The board floats centered
over it. On each question advance the mid and near layers pan a step left - the child feels they are
travelling through their land. Rationale: young children respond to place and story more than to chrome
(Khan Academy Kids world framing, Lingokids "playlands"); the existing art already exists, so the hero
is built from owned SVG with zero licensing risk.

- **G1-2 (dusk tone):** warmer, brighter scene; larger, friendlier near props (swing, slide, houses);
  journey pan step larger (more visible reward for progress).
- **G3-5 (night tone):** deeper sky, more stars, cooler; props more silhouette-like; pan subtler - older
  kids find heavy decoration babyish.

### 6.2 Component spec - `LandScene` / `LandShell`

New props (backwards compatible):

```ts
// src/components/scene/LandScene.tsx
interface LandSceneProps {
  land: LandKey;
  /** v5: 'hero' = full-bleed fixed layers; 'strip' = v4 bottom strip (kept for revert + auth/credits). */
  variant?: 'hero' | 'strip';        // default 'strip' (no behavior change until a caller opts in)
  /** v5: palette tone - replaces the `night` CSS filter. `night` prop maps to tone='night'. */
  tone?: 'day' | 'dusk' | 'night';
  /** 0..1 journey position - drives the pan (§6.3). Omit = static. */
  journey?: number;
}
```

`LandShell` gains `tone` and forwards `journey`. `App.tsx` `shell(node, gradeId)` resolves
`tone = band === 'G12' ? 'dusk' : 'night'` for kid play surfaces (same routing as CR-81 `night`).
`BatchScreen` passes `journey = progressFraction` (it already computes `progressFraction`).

Layer composition (z-order bottom -> top), all inside `scene.root`:

| Layer | Content (reuses existing art in `LandScene.tsx`) | Parallax factor | Ambient motion |
|---|---|---|---|
| L0 sky | `scene.skyDusk`/`skyNight` + `scene.horizonGold` + land `horizonGlow` radial | 0 | none |
| L1 far | `AmbientSparkles`, `Sun` (dusk: low setting sun at horizon) / moon (night: new `Moon` = circle + offset crescent mask), far `Cloud`s, `SpaceScene` stars/planets | 0.15 | `scene-drift-far` on cloud group, `land-twinkle` on ≤6 stars (rev 2: 6.5s period) |
| L2 mid | `Hills`, `TownScene` houses, `CityScene` skyline, jungle vines | 0.45 | none (stability anchor) |
| L3 near | swing set + `land-sway`, slide, ball, jungle big leaves + `land-sway`, city bus, rocket + `land-float`, flowers | 1.0 | `land-sway` 6s (existing) / `land-float` (rev 2: 5s -> 7s) |
| L4 scrim | `scene.scrim` centered on the board | 0 | none |

Rules:
- Each layer is its own `<svg viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax slice">` inside a
  `scene.layer` div, so layers transform independently. Mid/near art must extend 8% past both edges
  (the `inset-x-[-8%]` bleed) so the pan never reveals an edge.
- Ground height: mid+near layers occupy `h-[38vh] max-h-[360px] min-h-[180px]`; L0/L1 fill `inset-0`.
- Ambient node budget: ≤12 animated nodes per scene total; ambient animations pause when
  `document.visibilityState === 'hidden'` (`data-scene-paused` on `scene.root` -> `animation-play-state: paused`).
- **No text, controls or hit targets on the scene.** `pointer-events-none` on the root.

Responsive:

| Viewport | Behavior |
|---|---|
| 390x844 (phone portrait) | ground 38vh; near props cropped at both edges, peek beside/below the board; `BatchScreen` `pb-16` peek reserve kept |
| 844x390 (`max-height:420px`) | L3 near hidden (`[@media(max-height:420px)]:hidden`), L2 ground `h-[30vh]`; pan disabled (factor 0) - too little vertical room, props would collide with tiles |
| 768 tablet | ground 34vh; full layers |
| 1280 desktop | board `max-w-2xl` centered; the land is visible wide on both sides - near props sit fully left/right of the board (this is the "wow" frame) |

States: idle (ambient running) · reduced-motion (all layers static, pan at 0, sparkles fixed opacity 0.8)
· loading (n/a - inline SVG, no network) · empty (n/a) · **unknown land key (rev 2, N3)** - see guard below.

Unknown-land runtime guard (rev 2, N3). Rev 1 wrongly claimed `getLand` covers this: `getLand(gradeId)`
(`theme.ts:130-134`) only maps a grade id, while `LandShell` indexes `LANDS[land]` directly when a `land`
override is passed, so a bad override yields `undefined` and crashes on `.pageGradient`. Required:

```ts
// src/components/LandShell.tsx
const resolved: Land = (land !== undefined ? LANDS[land] : undefined) ?? getLand(gradeId);
// LandScene: `scenePalette(land, tone)` returns SCENE_BASE.sky for an unknown key;
// the layer switch renders the sky art in its default branch instead of nothing.
```

`scenePalette` and `LandScene` apply the same `?? sky` default, so a stale or mistyped key (e.g. from persisted
state) renders the sky land instead of a blank screen or an exception. Unit test: `LandShell` with
`land={'unknown' as LandKey}` renders and resolves to `sky`.

### 6.3 Journey pan (signature motion)

- `--journey` CSS var on `scene.root` = `journey` prop (0..1).
- Layer transform: `translateX(calc(var(--journey) * var(--pan) * -1))` with `--pan`:
  G1-2 near `9vw`, mid `4vw`, far `1.2vw`; G3-5 near `6vw`, mid `2.5vw`, far `0.8vw`. Max pan ≤ 8% bleed.
- Transition 700ms `ease-out-quint` (`scene.layer`). Pan moves on every advance, correct or not
  (progress is never conditional on correctness - no punishment).
- On round change (`roundKey` changes) the var resets to 0 with a 400ms crossfade of L2/L3 opacity
  (0 -> 1), so the reset never reads as "going backwards".
- Reduced motion: `--pan: 0` (layers static); progress remains visible in the chrome track + journey
  trail (§7.3).
- Optional P2 (not CR-82 acceptance): pointer parallax on `(hover:hover) and (pointer:fine)` only,
  ≤6px, rAF-throttled. Off under reduced motion.

### 6.4 Tone palettes without CSS filters (fixes D5, D7)

`theme.ts` exports a pure helper and per-land base palettes (hex lives here - the token home - and
nowhere in components):

```ts
// src/lib/ui/theme.ts (new)
export type SceneTone = 'day' | 'dusk' | 'night';
export interface ScenePalette { ground: [string, string]; props: Record<string, string>; lights: Record<string, string> }
export function scenePalette(land: LandKey, tone: SceneTone): ScenePalette;
```

Derivation rule (deterministic, so token-faithful without per-hex design review):
- `day` = the current `LandScene` fills, moved verbatim into `SCENE_BASE[land]`.
- `dusk` = `mix(day, navy-900 #101a36, 0.30)`; `night` = `mix(day, navy-950 #0b1224, 0.50)`.
- `lights` (windows, stars, moon, sun core, rocket flame) are **never mixed** - they stay bright, which
  is what makes the night read as magical rather than dim.
- City base fills change per OM-6: towers `#2a4a82` / `#3b5280` / `#075985` (sky-800) / `#475569`
  (slate-600), windows `#fde68a` (amber-200) lit / `#cbd5e1` unlit at 0.5; `TownScene` house
  `#a5b4fc`/`#4f46e5` -> `#fdba74`/`#c2410c` (orange-300/700). Space ground `#c4b5fd`/`#a78bfa` ->
  `#94a3b8`/`#64748b` (moon rock slate) with one violet nebula radial at 0.15 alpha in L1.
- Computed once at module load (memoized); zero runtime filter cost.

### 6.5 A11y

Whole scene `aria-hidden="true"`; no information lives only in the scene (journey progress is also in
`RoundProgress` text + track). No flashing: twinkle is opacity 0.9 -> 0.25 over 2.6s (well under the
3 flashes/second threshold).

### 6.6 Surface application

| Surface | Scene |
|---|---|
| `StartBatchScreen`, `BatchScreen` (+ RoundSummary/BatchSummary inside), `FlashcardScreen` (new) | `hero`, grade land, tone by band, `journey` on BatchScreen only |
| `GradeSelect` (journey map) | `hero` brand land, `night` tone, gold horizon; each grade card gets a 96px `strip` thumbnail of its land in `day` tone as a "postcard" header (aria-hidden) |
| `AuthScreen` | `hero` brand, `night`; `CARD_DARK` form floats over it |
| Exam, ExamResult, parent report, admin, credits | **no hero** (exam = desk register §10; adult surfaces keep `brand` strip) |

---

## 7. B2 - Materials (soft-3D tiles, chunky radii, warm paper)

### 7.1 UX description + rationale

Option tiles, letter tiles, word chips and the gold CTA become physical toys: a lit top edge, a solid
base you can see, and a press that sinks the tile into its base then springs back. Prompt imagery sits on
warm paper "exhibit" cards pinned to the board. Rationale: tangible affordance - a 6-year-old reads
"pressable" from the base edge without needing hover (touch devices have no hover); warm paper separates
"the thing to look at" from "the thing to press".

- G1-2: tile min-height 96px for image options (`density.tileMinH`), 76px letter tiles, larger base (6px).
- G3-5: 76px option tiles, 64px secondary rows; same material.

### 7.2 State matrix - `material.tile*` (applies to `getOptionButtonClassName`, `ExtraLetterQuestion` tiles, phonics tiles, spell tiles, word chips)

| State | Visual | Behavior / a11y |
|---|---|---|
| idle | `tileFace` | `button`, label text; emoji/image inside `exhibitPaper` |
| hover (pointer-fine only) | `tileHover`: lift 2px, amber-300/60 border | none on touch (media-gated - avoids sticky hover on iOS) |
| focus-visible | `tileFocus` ring 4px amber-300/70 | keyboard order = visual order |
| press | `tilePress`: sink 6px, base collapses (100ms) | `pointerdown`; release plays `press-release` |
| disabled (after verdict, non-picked) | `tileDisabled` | `disabled` attribute; not focusable |
| loading (image) | `exhibitPaper` with `bg-amber-100 animate-pulse motion-reduce:animate-none` skeleton at fixed size | no layout shift (fixed `width/height`) |
| error (image) | existing fallback chain photo -> lottie -> svg -> native emoji (`EmojiVisual`) | unchanged |
| judged correct | `tileCorrect` + "Đáp án:" label (existing `getOptionLabel`) | never color alone |
| judged picked-wrong | `tilePickedWrong` (sunk slate) + "Em chọn:" | never rose |
| reveal correct (after miss) | `tileRevealCorrect` | only emerald surface on screen |
| empty | n/a (questions never render 0 options - content contract) | - |

### 7.3 Board as journey surface

`QuestionCard` root adopts `material.board` and keeps the land rim (`land.nightRim`, now 6px `h-1.5`
-> `h-2`, rounded to board radius). The `question-progress` chip becomes a **journey trail**: a row of
stepping-stone dots (one per question, 10px, gap 6px) inside `material.chrome`:
done = `bg-amber-300`, current = `bg-amber-300 ring-4 ring-amber-300/30`, upcoming = `bg-white/20`;
the text `Câu 3/10` stays (`data-testid="question-progress"`, text never removed - dots are aria-hidden).
For >12 questions, dots collapse into the existing `PROGRESS_TRACK` bar.

### 7.4 Motion

Press 100ms `ease-out-quint`; release 240ms `press-release` (`ease-toy`); hover 160ms. Reduced: no
translate; the shadow/base swap alone signals press (instant).

---

## 8. B3 - Typography

### 8.1 Description + rationale

Real hierarchy: one hero element per screen in Baloo 2 at display size (the sound glyph, the score, the
grade number), prompts in Be Vietnam Pro bold, instructions in medium weight - three clearly different
voices instead of "everything bold". Andika carries any letter a G1-2 child must **copy or form**
(tracing models, spell tiles, flashcard word), because its single-story `a`/`g` match the letters
Vietnamese grade-1 English textbooks teach and the child writes.

### 8.2 Scale (major-third 1.25 on 16px, snapped to Tailwind steps)

| Step | Size | Geometry token (composites per surface, §5.3) | Face/weight |
|---|---|---|---|
| hero | 72/96px (`text-7xl sm:text-8xl`) | `TYPE_HERO_GLYPH_GEO` | Baloo 2 800 |
| display | 60px | `TYPE_HERO_NUMBER_GEO` | Baloo 2 800 tabular |
| h1 | 30/36px | `TYPE_TITLE` (`H1`, navy only) | Baloo 2 800 |
| h2 | 24px | `TYPE_SECTION_GEO` | Baloo 2 700 |
| prompt | 24px G1-2 / 20px G3-5 | `TYPE_PROMPT_GEO` | Be Vietnam Pro 700 |
| instruction | 16/18px | `TYPE_INSTRUCTION_GEO` | Be Vietnam Pro 500 |
| body | 16px | `TYPE_BODY_GEO` | Be Vietnam Pro 400 |
| caption | 14px kid / 12px adult | `TYPE_CAPTION_GEO` | Be Vietnam Pro 500 |

Vietnamese headroom: display/hero `leading-[1.1]` minimum (stacked diacritics such as "Ễ", "Ậ" clip at
`leading-none` in Baloo 2 - verify with "Chính xác! Giỏi quá!" and "Vùng đất 4"); body `leading-normal`
or looser; buttons allow 2-line wrap at 375px with ≥30% text-expansion headroom (Vietnamese runs longer
than English source labels).

### 8.3 Andika loading

- Self-host `public/fonts/andika/andika-{latin,vietnamese}-{400,700}.woff2` (SIL OFL 1.1; add `OFL.txt`
  and the provenance entry like the other two families).
- `@font-face` with `font-display: swap` and `unicode-range` per subset; no preload (only G1-2 letter
  surfaces use it, the browser fetches on first use). Target ≤60KB per subset file after subsetting -
  Tech Lead to verify; if exceeded, ship 700 only.
- Fallback: the `font-letter` family (used by `TYPE_LETTER_TILE_GEO` / `_CARD_GEO` / `_WORD_GEO`) falls back to Be Vietnam Pro, which also has a double-story `a` - tracing stroke
  data (§12.3) is authored against Andika's single-story forms, so the tracing guide is **drawn from stroke
  data, not from the font** (font is used for labels/tiles only). No tracing correctness depends on font load.

---

## 9. B4 - Character system (Bé Heo companion)

### 9.1 Description + rationale

Bé Heo becomes a companion with a body and poses that react to what the child is doing. He perches on the
top edge of the board, leaning over the instruction banner as if reading it aloud. Rationale: a consistent
reacting character reduces anxiety and gives non-readers an emotional readout of state (Duolingo ABC /
Khan Kids pattern). One character, one instance on screen - attention stays on the task.

### 9.2 Pose set (extends `MascotMood`)

`type MascotMood = 'idle' | 'thinking' | 'greeting' | 'happy' | 'celebrating' | 'encouraging'`

Rev 2 (human ruling OM-3 -> Lottie JSON now, R-v5-02 approved): each pose ships as a **Lottie JSON** asset
(primary renderer) plus a **static SVG pose** derived from `PigFace` (poster / reduced-motion / fallback
renderer). The `Mascot` props API (`mood`, `size`) is unchanged; call sites do not change.

| Pose | Trigger | Art (half-body bust: head + shoulders + two hooves) | Lottie motion (primary) | Static SVG pose (reduced motion + poster + fallback) | `aria-label` |
|---|---|---|---|---|---|
| `idle` | question shown, before answer (replaces today's `encouraging` companion) | open eyes, small smile, hooves resting on board rim | seamless loop 3.2s: breathe + one blink | eyes open, hooves on rim | "Heo con đang chờ em" |
| `thinking` | G1-2 only: 12s with no input after instruction audio ended; also while word audio is loading | eyes look up-left, one hoof at chin, three-dot thought bubble | loop 1.8s x2 (dots appear in sequence), then hold last frame | bubble with 3 dots, hoof at chin | "Heo con đang suy nghĩ" |
| `greeting` | GradeSelect, AuthScreen, StartBatch, ExamIntro | wave arm | loop 1.8s x2, then hold | raised hoof | "Heo con vẫy chào" (existing) |
| `happy` | correct verdict | closed happy eyes, both hooves up small | one-shot 0.6s, hold last frame | happy eyes, hooves up | "Heo con vui mừng" (existing) |
| `celebrating` | streak ≥3 verdict, RoundSummary, BatchSummary earned, flashcard deck full completion, ExamResult | open mouth, both hooves high, confetti specks | one-shot 1.2s, hold last frame | hooves high, specks static | "Heo con ăn mừng" (existing) |
| `encouraging` | wrong verdict, BatchSummary not-earned, flashcard zero-progress exit | soft brows, one hoof fist-pump | loop 2.4s x2, then hold | soft brows, fist up | "Heo con động viên" (existing) |

Finite loops (x2 then hold) keep motion purposeful and stop it from competing with the task; only `idle` loops
continuously, and its period (3.2s) is a character loop, not scene ambience (OBJ-1 c applies to the scene).

`thinking` copy: when it fires, the banner speaker replays the instruction once and the `DemoHint` for the
kind replays if one exists (`useDemoHint`). No text nag. G3-5 never gets `thinking` (no nagging older kids).

Art rules: palette constants (`OUTLINE`, `SKIN`, ...) move to `theme.ts` `MASCOT_PALETTE` (D5). Plum
outline `#4A2E3F` stays - it is what keeps the character crisp on both navy and paper. Sizes:

| Size | G1-2 | G3-5 | Where |
|---|---|---|---|
| `inline` | 32px | 32px | FeedbackPanel headline at `max-height:420px` (v9 overflow context) - **always the static SVG pose** (Lottie at 32px adds runtime cost with no visible benefit) |
| `companion` | 72px (was 56) | 56px (was 45 via scale) | board perch + sheet perch |
| `block` | 96px (was 80) | 80px | hero screens |

### 9.3 Placement + one-mascot enforcement

- **Board perch:** `absolute -top-9 left-4 z-10 pointer-events-none` on `QuestionCard`; the hooves overlap
  the land rim. `QUESTION_BANNER` gets a speech tail (`before:` 10px triangle, `white/[0.07]`) pointing up
  to him, and left padding `pl-20` (G1-2) / `pl-16` (G3-5) so text never sits under him.
  (v4 put him top-right - he now visibly "speaks" the left-aligned banner.)
- **Sheet perch (rev 2, F4).** Rev 1 placed the perch inside `FeedbackPanel`, whose root is a bounded
  scroll container (`relative max-h-[min(40vh,320px)] overflow-y-auto`) - protruding art would be clipped and
  would scroll with the content. Rev 2 moves it to a **sibling layer in `QuestionCard`'s fixed sheet wrapper**
  (`QuestionCard.tsx` - the `fixed inset-x-2 bottom-0 z-40 ...` div that holds `FeedbackPanel` + `next-button`),
  which does not scroll and does not clip:

  ```tsx
  <div className="fixed inset-x-2 bottom-0 z-40 mx-auto max-w-[40rem] rounded-t-2xl bg-desk p-2 ...">
    {perch && (
      <span aria-hidden="true" data-testid="sheet-perch"
            className="pointer-events-none absolute -top-11 right-4 z-10">   {/* sibling, not inside the panel */}
        <Mascot mood={verdictMood} size="companion" />
      </span>
    )}
    <FeedbackPanel ... mascotPlacement={perch ? 'none' : 'inline'} />
    {nextButton}
  </div>
  ```

  - The wrapper must keep `overflow: visible` (never add `overflow-hidden` to it); the panel keeps its own
    `overflow-y-auto` + `overscroll-contain`, so feedback text scrolls underneath a perch that stays put.
  - Geometry: perch `companion` (72px G1-2 / 56px G3-5) overhangs the sheet top by `2.75rem` (44px) and
    sits **top-right** (the panel's left edge carries the verdict accent bar and the headline starts left).
    Clearance inside the sheet: the portion below the sheet edge (≤28px) sits over the wrapper `p-2` + panel
    `p-4` padding; the headline row gets `pr-16` (G1-2) / `pr-14` (G3-5) when `mascotPlacement='none'`, so text
    never runs under the hooves.
  - Overlap with the board: `QuestionCard` adds the 2.75rem overhang to its bottom reserve while the perch
    renders (§5.5 item 2), so no answer tile sits behind the mascot.
  - Unmount rule (unchanged intent of CR-79 AC-79.1): the board companion renders only while
    `!hasAnswered`; the sheet perch renders only while `showFeedbackZone`. They never coexist. `FeedbackPanel`
    renders its own inline mascot only when `mascotPlacement='inline'`.
  - Short landscape (`max-height:420px`): `perch = false` (chosen in JS via a `useMediaQuery('(max-height: 420px)')`
    hook, not CSS hiding, so exactly one `mascot` node exists in the DOM) and `FeedbackPanel` renders the static
    `size="inline"` mascot in the headline as today.
  - `pronunciation-recording` (no sheet) keeps its own in-flow panel and current mascot behavior.
- **Exam:** `ExamIntro` + `ExamResult` only (R-v5-06).
- Test hook: every screen state renders exactly one `[data-testid="mascot"]`; add a parametrized test
  across: GradeSelect, AuthScreen, StartBatch, question (unanswered), question (answered), RoundSummary,
  BatchSummary, Flashcard card, Flashcard summary, ExamIntro, ExamResult, exam sitting (= 0).

Impact note for Dev/Test: the pre-answer companion changes from `data-mascot-mood="encouraging"` to
`"idle"`; tests asserting the old value must be updated in the same commit.

### 9.4 A11y

`role="img"` + Vietnamese `aria-label` (existing pattern). Board/sheet perches are decorative duplicates of
state already announced by `aria-live` - mark the perch wrapper `aria-hidden="true"` (as today) so screen
readers do not hear the pose twice. The Lottie canvas inside is always `aria-hidden`; the label lives on the
`Mascot` wrapper, which is identical for Lottie and static renderers.

### 9.5 Lottie asset spec + renderer rules (rev 2, R-v5-02)

**File list** (owned/commissioned art; provenance entry in `public/attribution.json`):

| File | Pose | Loop |
|---|---|---|
| `public/mascot/be-heo-idle.json` | idle | seamless 3.2s |
| `public/mascot/be-heo-thinking.json` | thinking | 1.8s segment |
| `public/mascot/be-heo-greeting.json` | greeting | 1.8s segment |
| `public/mascot/be-heo-happy.json` | happy | 0.6s one-shot |
| `public/mascot/be-heo-celebrating.json` | celebrating | 1.2s one-shot |
| `public/mascot/be-heo-encouraging.json` | encouraging | 2.4s segment |

**Asset requirements:** Lottie JSON (bodymovin), square 512x512 artboard, 30fps, ≤40KB gzipped each; colors
only from `MASCOT_PALETTE` (plum outline `#4A2E3F` etc.); no text layers, no raster images, no expressions;
**frame 0 must match the static SVG pose** (so poster -> animation swap has no visual jump); the bust framing
is identical across poses so pose swaps do not shift position.

**Renderer:** existing dependency `@lottiefiles/dotlottie-react` (already used by `EmojiLottiePlayer`; no new
dependency). Tech Lead confirms the player loads plain Lottie JSON (dotlottie-web supports `.json` sources);
if it does not, assets are packaged as `.lottie` with the same base names - a packaging detail, not a design
change.

**Render decision per `Mascot` instance:**

| Condition | Renderer |
|---|---|
| `size="inline"` | static SVG pose |
| `usePrefersReducedMotion()` true | static SVG pose (no Lottie runtime mounted at all) |
| asset loading | static SVG pose as poster in the same box (no layout shift), crossfade 120ms to Lottie on `load` |
| asset failed to load / missing / player error | static SVG pose; stays static for the session for that pose |
| otherwise | Lottie |

**Performance:** one player instance at a time (follows the one-mascot rule); a pose change swaps the source
on the same instance. Preload on play screens: `idle`, `happy`, `encouraging` (the per-question set);
`celebrating`, `thinking`, `greeting` load on first use. Pause playback when `document.hidden`.

**Asset production = Developer-phase implementation dependency, with a non-blocking fallback rule.** If a pose
asset is not available at implement time, that pose ships on the static SVG renderer (the same path as a load
failure), the build is NOT blocked, and the Developer logs the gap in `docs/MEMORY.md` "Open threads /
deferred work" as `<date> | CR-82 | Lottie pose <name> missing - static SVG fallback live`. Tests assert
`data-mascot-mood` and `aria-label`, never the renderer, so they pass on either path. A `data-mascot-renderer=
"lottie|static"` attribute is exposed for Playwright visual checks.

---

## 10. B5 - Exam surface (formal premium paper)

### 10.1 Description + rationale

The exam hall becomes a dark, quiet **desk** with a single **paper sheet** on it: slate-50 paper, ruled
header ("VieSchool English Arena - Thi thử - Lớp 3"), numbered question, lettered options like a printed
IOE sheet. No scene, no mascot during the sitting, no ambient motion, and **no gold fills during the timed
sitting** (rev 2, N1: untimed practice drill, `ExamIntro` and `ExamResult` may each carry one gold
next-step/reward action - `EXAM_PRACTICE_NEXT`, `exam-begin`, `exam-play-again`). Rationale: parents and
teachers read "real test" credibility from paper conventions; kids switch into a calmer mindset when the
register visibly changes (P3). Slate-50 (not pure white) on the dark desk limits glare across 30-200
question sittings.

- G1-2 exams: option rows 76px, prompt `TYPE_PROMPT_PAPER` (G1-2 geometry, slate-900 ink - 17.06 on slate-50),
  picture options in paper frames 2-up.
- G3-5: option rows 64px, prompt `TYPE_PROMPT_PAPER` (G3-5 geometry), denser 1-column list, passage panel
  scrolls independently. No `*_NAVY` composite or `H1`/`H2` (white) may render inside `EXAM_SHEET` (§5.3 rule 2).

### 10.2 Tokens (`exam.*` paper twins; desk tokens `EXAM_NAV_CELL`, `EXAM_HEADER_BRAND` kept)

| Token | Classes | Surface | Text pair (ratio) |
|---|---|---|---|
| `EXAM_DESK` | `flex min-h-screen flex-col bg-desk p-2 text-white sm:p-4` | desk | white 17.47 |
| `EXAM_SHEET` | `mx-auto my-3 w-full max-w-3xl flex-1 rounded-[1.25rem] bg-slate-50 p-5 text-slate-800 ring-1 ring-slate-200 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_24px_48px_-24px_rgba(0,0,0,0.8)] sm:p-8` | paper | slate-800 13.98; replaces the amber-800 framed chalkboard |
| `EXAM_SHEET_HEADER` | `mb-5 flex items-baseline justify-between border-b-2 border-slate-200 pb-3 font-display text-lg font-bold text-slate-700` | paper | slate-700 on slate-50 9.90 |
| `EXAM_QNUM` | `mr-2 inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-navy-800 px-2 font-display text-base font-extrabold text-white tabular-nums` | navy chip on paper | white on navy-800 13.77 |
| `EXAM_OPTION_PAPER` | `flex min-h-[64px] w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-left font-medium text-slate-800 ring-1 ring-slate-300 shadow-sm transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-600 motion-reduce:transition-none` (G1-2 `min-h-[76px]`) | paper | slate-800 on white 14.63; focus sky-600 4.10 non-text |
| `EXAM_OPTION_KEY` | `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700` (A/B/C/D) | paper | slate-700 on slate-100 9.45 - the letter key, not the 1px ring, identifies the option boundary |
| `EXAM_SELECTED_PAPER` | `bg-sky-100 text-sky-900 ring-2 ring-sky-600` + key chip `bg-sky-700 text-white` + `IconCheckCircle` | paper | sky-900 on sky-100 8.24; white on sky-700 5.93. Replaces orange ring on paper (orange stays on desk strip) |
| `EXAM_NAV_FLAGGED` | `bg-amber-100 text-amber-900 ring-amber-400` + `IconFlag` | desk strip + paper navigator | amber-900 on amber-100 8.15 |
| `EXAM_NAV_CELL_PAPER` / `_ANSWERED_PAPER` | `h-12 w-12 rounded-lg bg-white text-slate-700 ring-1 ring-slate-300` / `bg-emerald-50 text-emerald-800 ring-emerald-400` + `IconCheck` | paper (navigator dialog) | slate-700 on white 10.35 / emerald-800 on emerald-50 7.29 |
| `EXAM_TIMER` | `inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-desk-well px-3 font-mono text-xl font-extrabold tabular-nums text-amber-300 sm:text-2xl` | desk | amber-300 on desk-well 12.76 |
| `EXAM_TIMER_URGENT` (≤60s) | `bg-rose-600 text-white` - **no pulse** (calm register; the old `animate-pulse` is removed) | desk | white on rose-600 4.70 (≥ 4.5 and large text) |
| `EXAM_VERDICT_CORRECT` (practice mode) | `rounded-xl border-l-4 border-emerald-600 bg-emerald-50 p-4 text-emerald-800` | paper | 7.29 |
| `EXAM_VERDICT_WRONG` (practice mode) | `rounded-xl border-l-4 border-slate-400 bg-slate-100 p-4 text-slate-700` + "Đáp án đúng:" in `text-emerald-800 font-extrabold` | paper | slate-700 on slate-100 9.45; emerald-800 on slate-100 7.01. **Fixes D2** (rose removed) |
| `EXAM_PRACTICE_NEXT` | `CTA_GOLD_XL` geometry at `min-h-[64px]` (G1-2 76) - the one gold action in untimed practice mode (next step); never rendered in the timed sitting (N1) | paper | amber-950 on amber-400 8.97 |

Exhibits in the exam use `material.exhibitPaper` **without tilt** and without the soft-3D shadow
(`shadow-none ring-1 ring-slate-200`) - formal register.

### 10.3 Anatomy

```
[desk-bar header]  English Arena badge | Thi thử - Tiếng Anh - Lớp 3 | progress ring | timer | NỘP BÀI
[desk-bar strip]   < 1 2 3 4 5 6 7 8 9 10 >  [Tất cả câu]           (exam mode only)
[paper sheet]      Câu 12 ............................... [Đánh dấu câu này]
                   prompt / passage / image
                   (A) option   (B) option   (C) option   (D) option
                   [Câu trước]                                  [Câu sau]
```

### 10.4 States

| State | Spec |
|---|---|
| intro (`ExamIntro`) | paper card on desk, mascot `greeting` block, grade/program, question count, time limit, gold `exam-begin` |
| loading bank | sheet skeleton: 1 header bar + 4 option bars `bg-slate-200 animate-pulse motion-reduce:animate-none`; `aria-busy="true"` on sheet; text "Đang lấy đề..." |
| load error | paper card: "Chưa tải được đề - em kiểm tra mạng rồi thử lại nhé." + `BTN_SECONDARY_PAPER` "Thử lại" (calls `begin`) + "Quay lại" |
| pool warning | existing `exam-pool-warning` band, restyled `bg-amber-100 text-amber-900` on paper top (8.15) |
| answering | as anatomy |
| ≤60s | `EXAM_TIMER_URGENT`; sr-only `aria-live="polite"` announces "Còn 1 phút" once; and "Còn 5 phút" at 5:00 |
| time up | existing CR-69 auto-submit; closes the review sheet if open |
| result (`ExamResult`) | paper "certificate" sheet (`EXAM_SHEET` + `GOLD_HAIRLINE`): `TYPE_HERO_NUMBER_PAPER` correct-count (navy-800, 13.16 on slate-50), gold `SCORE_PILL_LG` for points, mascot `celebrating`/`encouraging`, review list unchanged (`exam-review`, `exam-review-toggle`, `exam-retry`, `exam-play-again`) |

---

## 11. B6 - Brand (navy/gold, richer ramps, no AI-purple)

- Gold leaf ramp (rewards, CTA, score): amber-200 -> amber-300 -> amber-400 -> amber-500, base edge
  amber-700 (§5.2 `material.goldCta`). Gold text on navy: amber-200 (13.04 on navy-850) / amber-300 (11.26).
- Navy depth ramp (sky, board, chrome): navy-950 -> navy-900 -> navy-850 -> navy-800 -> navy-700. All new
  gradients use only these stops + land `horizonGlow`.
- **Gold hairline** for premium frames (pricing card, ExamResult certificate, flashcard deck summary):
  `GOLD_HAIRLINE = 'ring-1 ring-amber-300/60 shadow-[inset_0_0_0_1px_rgba(253,230,138,0.25)]'` (decorative,
  never the only boundary).
- Indigo/violet purge list (D5): `theme.ts` city (`indigo-*`) and space (`indigo-*` cardTint/pageGradient)
  per §5.1; `LandScene` City/Town/Sky/Space fills per §6.4; `Confetti` `COLORS` drop `#a78bfa` (use
  `#fbbf24`, `#34d399`, `#38bdf8`, `#fb7185` - amber-400/emerald-400/sky-400/rose-400 - confetti is
  celebratory decoration, rose here is not a status); `toy.tints` (deprecated since CR-81 S9 - delete);
  `HUB_ICON_TINTS` violet entry -> `bg-amber-200/80 text-amber-800` (amber-800 on amber-200 5.69; the /80 chip sits on sky-50 paper so the composite is lighter, ratio ≥5.69). Violet
  remains only in this closed inventory (identical to §2 OM-6 and the §5.1 table, R-v5-04): space `nightRim`
  (violet-400), space `discBg` (violet-500), space `horizonGlow` (violet-400 at 0.15), the space grade map card
  (`cardTint` violet-50/95 + `accentText` violet-800, 8.19), and one L1 nebula radial (≤0.15 alpha). Space
  `pageGradient` is navy (§5.1), not violet.
- `DESIGN_SYSTEM.md` §12 approved palette: remove indigo, add orange (city identity + exam ring).

---

## 12. C1 - Letter tracing (G1-2)

### 12.1 Description + rationale

The child sees a picture + word ("apple"), hears the letter, and traces a big letter on a warm paper slate
with a finger: a green numbered dot shows where to start, arrows show direction, and each stroke snaps clean
and turns green when done. Rationale: tracing builds letter formation for pre-writers (Duolingo ABC, ABC
Kids); with Vietnamese "ô li" style guide lines it matches what children do in grade-1 notebooks.
G1-2 only (band gate); G3-5 never receives the kind.

### 12.2 Data + kind

New `QuestionKind` member `'letter-tracing'`:

```ts
interface LetterTracingQuestion {
  id: string; topicId: string; kind: 'letter-tracing';
  letter: string;            // single grapheme, 'a'..'z' | 'A'..'Z'
  exampleWordId: string;     // VocabWord id - picture + audio via getWordVisual / speakWord
  explanation: string;       // Vietnamese, e.g. 'Chữ "a" như trong "apple" - quả táo.'
}
```

Stroke data: new `src/data/tracing/strokes.ts` - per letter an ordered array of strokes, each a polyline in a
0-100 box (baseline y=80, x-height y=45, ascender y=10), authored against Andika's single-story forms.
Round composition (how many tracing items per round, which round) is a BA/Tech Lead decision - design
constraint: ≤2 per round, never the first question of a session (the first-encounter demo needs a calm
moment).

### 12.3 Layout + tokens

| Element | Spec | Token / contrast |
|---|---|---|
| Banner | "Tô theo nét chữ nhé. Bắt đầu từ chấm xanh." (autoplay voice, G1-2) | `QUESTION_BANNER` + `TYPE_INSTRUCTION_NAVY` (rev 3: was the undefined `TYPE_INSTRUCTION`) |
| Exhibit | picture + word in `TYPE_LETTER_WORD_PAPER` (slate-900, 17.22 on amber-50) with the target letter emphasized (`underline decoration-amber-600 decoration-4`; decoration is non-text, amber-600 3.07 on amber-50 ≥3) + `BTN_AUDIO` speaker | `material.exhibitPaper` |
| Slate | square `min(82vw, 46vh, 380px)`; short landscape: `min(40vh)` with controls to the right | `material.paperSlate` |
| Guide lines (ô li) | 3 horizontal lines (ascender, x-height, baseline) 1.5px | `TRACE_RULE` stroke amber-200 (decorative; baseline slate-400) |
| Letter track | wide band along each stroke, width 16% of box, round caps | `TRACE_TRACK` stroke amber-200 at 0.9 |
| Centerline | dashed 2px along stroke | `TRACE_CENTERLINE` slate-500 - 4.59 on amber-50 (≥3 non-text) |
| Start dot | circle r=6% with numeral "1"/"2" | `TRACE_START` fill emerald-700 (5.29 on amber-50), numeral white bold (5.48 on emerald-700) |
| Direction arrows | 2-3 chevrons along the active stroke | `TRACE_ARROW` slate-500 |
| Child ink | 10% box width, round caps/joins | `TRACE_INK` sky-700 - 5.72 on amber-50 |
| Done stroke | clean guide path redrawn | `TRACE_DONE` emerald-600 - 3.63 on amber-50 |
| Pending strokes | track at 40% opacity, no start dot | - |
| Controls | "Xem mẫu" (`IconEye`) + "Tô lại" (`IconRefresh`), `BTN_SECONDARY_NAVY` at `density.primaryMinH` (76px) | sky-200 on white/10 7.68 |
| Keyboard/assist control | "Tô tự động từng nét" (`IconPencil`) - visible, third control | same token |

Rendering: guide layer = inline SVG (`viewBox="0 0 100 100"`, crisp, testable); ink layer = `<canvas>` absolutely
over it, sized to the slate's CSS box × `devicePixelRatio` (cap 2).

### 12.4 Input event spec (pointer events)

| Event | Handling |
|---|---|
| `pointerdown` on canvas | accept only `isPrimary` and (`pointerType` touch/pen, or mouse `button===0`). Must land within start tolerance of the active stroke's start dot (G1 18% box, G2 12%); else pulse the start dot (no attempt counted). On accept: `setPointerCapture`, begin path |
| `pointermove` | read `getCoalescedEvents()` when available (smooth fast strokes on iOS/Android); append points ≥2px apart; draw with quadratic smoothing in rAF |
| `pointerup` | evaluate stroke (§12.5) |
| `pointercancel` / `lostpointercapture` | discard current stroke silently (OS gesture, palm) - no attempt counted |
| additional pointers | ignored while a stroke is active (palm rejection) |
| CSS | `touch-action: none` on the canvas only; the page outside the slate still scrolls; `user-select: none`; `-webkit-touch-callout: none` |

### 12.5 Scoring + feedback integration

Per stroke (tunables in new `src/lib/tracing/score.ts`, calibrated in Tester phase with real traces):
- Resample guide to 32 points. **coverage** = share of guide points within tolerance (G1 14% box, G2 10%)
  of the drawn polyline. **precision** = share of drawn points within 1.5× tolerance of the guide.
- G2 also checks **direction**: drawn start is nearer the guide start than the guide end. G1 skips direction.
- Pass = coverage ≥ 0.75 and precision ≥ 0.65 (+ direction for G2).

Flow:
1. Pass -> ink crossfades into the clean `TRACE_DONE` path (200ms), `pop` sfx (ui tier §16.3), next start
   dot activates; sr announce "Nét 1 trên 2 xong rồi".
2. Fail -> ink fades (300ms); banner line swaps to "Gần đúng rồi - em tô lại nét này nhé." (spoken G1-2);
   attempt++.
3. 2 fails on the same stroke -> auto-demo of that stroke plays once, tolerance ×1.5 (assisted).
4. 3 fails -> the stroke draws itself and the flow moves on. The child is never stuck.
5. Letter complete -> `onSubmitTracing(isCorrect)` where `isCorrect` = every stroke passed within ≤2
   attempts without auto-complete. `QuestionCard` gets a new prop `onSubmitTracing: (isCorrect: boolean) => void`
   mirroring `onSubmitPairMatching`. The feedback sheet then behaves per §5.5: `correctWord` = the letter,
   `picture` = example word visual, "Nghe mẫu" speaks the letter + example word.
6. Telemetry hook: pass `{ assisted: boolean, attempts: number[] }` alongside so skill stats can exclude
   assisted completions (Tech Lead decides storage).

### 12.6 Feedback-sheet extension (additive)

`FeedbackPanel` gains an optional per-kind headline map; for `letter-tracing`:
correct "Em tô đẹp quá!" / not-correct "Em tô xong rồi - lần sau mình tự tô hết nhé!" (completion is
acknowledged; the generic "Chưa đúng rồi" would shame a finished trace). `data-correct`, `aria-live`, sfx,
`next-button` unchanged.

### 12.7 States, a11y, keyboard

| State | Spec |
|---|---|
| first encounter | `useDemoHint('letter-tracing')` -> the hand-dot travels stroke 1 (new `DemoHint` variant `'trace'` following the stroke path); dismissed on first touch |
| idle | active stroke start dot ring-pulses (1.2s) |
| drawing | ink follows finger; mascot `thinking` suppressed while drawing |
| stroke done / fail / assisted / auto | as §12.5 |
| complete | full letter glows emerald 400ms, then sheet |
| disabled | after submit, canvas `pointer-events-none`, controls disabled |
| error | canvas unsupported (no `getContext`) -> fall back to assisted mode only (keyboard path) - never a dead screen |

A11y: slate container `role="group"` `aria-label="Khung tô chữ a"`; SVG guide `aria-hidden`; live region
(`aria-live="polite"`) for stroke progress. **Keyboard/switch alternative:** "Tô tự động từng nét" is in tab
order before the canvas; each Enter/Space animates the next stroke (demo-equivalent), and after the last stroke
the item submits with `isCorrect=true, assisted=true`. Ruling: R-v5-07 - tracing is a motor exercise with no
keyboard equivalent; the equivalent learning exposure (watching stroke order) is the accessible alternative,
and assisted completions are flagged so they do not inflate mastery stats.

Testids: `tracing-slate`, `tracing-canvas`, `tracing-stroke-{i}` (`data-state="pending|active|done|auto"`),
`tracing-demo`, `tracing-reset`, `tracing-auto-step`; root `data-tracing-attempts`. Synthetic pointer paths in
Playwright (`page.mouse` down/move/up along stroke data) must pass, and a deliberately off-path trace must fail.

---

## 13. C2 - Drag expansion (G1-2), tap fallback everywhere

### 13.1 Description + rationale

Two new drag surfaces where the gesture is the pedagogy:
- **Spell it** (`listening-fill-blank`, G1-2): hear a word, drag letter tiles into empty slots to build it.
- **Fill the gap** (`listening-sentence-fill-blank`, G1-2): drag the right word chip into the gap in the sentence.
  Rev 2 (R-v5-10, human ruling): the word bank is the primary input AND typing is a peer choice on the same
  surface (§13.7). The bank appears only on items that pass the §13.5 validation path; others are typed-only.

G3-5 keep typed input (`answer-input`) - recall and keyboard speed fit older kids. Tap works everywhere in
both bands: tap a tile -> it flies to the first empty slot; tap a filled slot -> the tile returns.

CR-82 acceptance needs "at least one new drag surface": **Spell-it is the guaranteed carrier**. Gap ships on top
of it for validated items; if no Gap items validate, acceptance is still met (R-v5-08).

### 13.2 Tokens

| Token | Classes | Surface | Ratio |
|---|---|---|---|
| `SPELL_SLOT` | `flex h-[76px] min-w-[48px] max-w-[64px] flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-sky-300/70 bg-navy-900/60` (slot row is one line; width shares the row, floored at 48px - see §13.4 cap) | navy board | sky-300 vs navy-900/60 over navy-800 9.53 (non-text) |
| `SPELL_SLOT_TARGET` (drag-over) | `border-solid border-amber-300 ring-4 ring-amber-300/40` | navy | amber-300 9.55 |
| `SPELL_SLOT_FILLED` | slot hosts a `material.tileFace` tile (letter in `TYPE_LETTER_TILE_NAVY`) | navy | white 12.13 |
| `SPELL_TILE` | `material.tileFace` + `h-[76px] w-[64px]` + `TYPE_LETTER_TILE_NAVY` (size comes only from the composite; `tileFace`'s `text-white` is the same ink, so no conflict); bank wraps at 4 tiles per row on 375px | navy | white 12.13 |
| `WORD_CHIP` | `material.tileFace` + `min-h-[76px] px-5 text-xl font-bold` (ink from `tileFace`: white) | navy | white 12.13 |
| `GAP_INPUT_TOGGLE` | `BTN_SECONDARY_NAVY` + `min-h-[48px]`; icon + label swap per mode (§13.7); non-standalone control in the answer zone | navy | sky-200 on white/10 7.68 |
| `SENTENCE_GAP` | `inline-flex min-h-[56px] min-w-[7ch] items-center justify-center rounded-xl border-2 border-dashed border-sky-300/70 bg-navy-900/60 px-3 align-middle` (drop + tap target, non-standalone ≥48) | navy | as slot |
| `DRAG_GHOST` | tile classes + `scale-[1.08] rotate-[3deg] shadow-[0_28px_48px_-16px_rgba(0,0,0,0.75)]` (e4) | navy | - |

### 13.3 Interaction model

| Step | Pointer | Tap | Keyboard |
|---|---|---|---|
| pick | `pointerdown` on tile; `useDragTile` arms; becomes drag after 8px (`DRAG_THRESHOLD_PX`, existing) | tap (<8px) | Tab to tile |
| move | ghost follows pointer (rAF); slot under pointer gets `SPELL_SLOT_TARGET` via `elementFromPoint(...).closest('[data-slot-index]')` | - | - |
| drop on empty slot | tile snaps in (`snap-in` 180ms), `pop` sfx | tile flies to first empty slot (240ms `ease-out-quint`) | Enter/Space places in first empty slot |
| drop on filled slot | swap: incoming takes slot, outgoing returns to bank | - | - |
| drop elsewhere | ghost springs back to origin (240ms) | - | - |
| remove | drag a placed tile back to the bank, or tap the slot | tap slot | focus slot + Enter, or Backspace removes last placed |
| submit | gold "Kiểm tra" (`submit-answer-button`, kept), enabled when all slots/the gap are filled | same | Enter on Kiểm tra |

Generalize `useDragTile` with `targetAttr: 'data-slot-index'` (its API already takes `targetAttr` and `onDrop`).
Click-suppression rule (keyboard clicks always pass, gesture-trailing click suppressed) is preserved.
`touch-action: none` on tiles only while the G1-2 drag path is enabled; bank/board otherwise scrolls.

### 13.4 Scoring integration (no new scoring path)

- Spell: slots concatenate to a string -> existing `onSubmitListening(typedAnswer)`. Judge, `pickedAnswer`
  ("Em chọn: ..."), feedback sheet: unchanged.
- Gap: chosen chip text -> existing `onSubmitListening(typedAnswer)` (the component already submits the gap word
  through this callback). Unchanged sheet incl. "Câu đúng: ..." `fullSentence`.

**Spell-it tile cap (rev 2, F7).** Rev 1 allowed G2 seven-letter words with two distractors (= 9 tiles) under an
8-tile max. Rev 2 uses one deterministic rule per grade, derived from the slot-row floor: the slot row must stay on
one line (so it reads as a word) with each slot ≥48px wide at the 375px minimum viewport. Usable width 343px,
gap 6px: 6 slots -> 52px each (pass), 7 slots -> 43px (fails the 48px kid non-standalone floor).

| Grade | Eligible word length | Distractor letters | Max tiles | Otherwise |
|---|---|---|---|---|
| G1 | 2-6 letters (letters only, no space/hyphen/apostrophe) | 1 | 7 | typed input (`answer-input`) |
| G2 | 2-6 letters (same) | 2 | 8 | typed input |

Eligibility is decided once per item, before render, by a pure function `spellEligibility(word, grade)` (new,
`src/lib/rounds/` alongside the round builders) - never by viewport, so the same item behaves the same on every
device.

Tile generation (deterministic, seeded by `question.id` so retries are stable):
- Distractor letters: lowercase letters not present in the word, excluding visually confusable pairs of letters
  already in the word (`b/d`, `p/q`, `m/n`, `i/l`) so a distractor never looks like a correct letter.
- **Per-instance tile ids for repeated letters:** each tile gets `id = <letter>-<occurrence>` (e.g. `book` ->
  `b-0`, `o-0`, `o-1`, `k-0`; distractors `x-d0`). React keys, drag source ids and `spell-tile-{i}` testids use the
  bank index; `data-tile-id` carries the instance id. Judging uses the composed string only, so either `o` tile is
  correct in either `o` slot.
- Shuffle guarantee: the shuffled bank never presents the word already spelled in order (re-shuffle with the next
  seed step if it does).

Boundary tests (Tester): `book` and `school` (repeated letters: both `o` tiles interchangeable, placement and removal
by instance id); G1 6-letter word -> drag (7 tiles); G1 7-letter word (e.g. `rainbow`) -> typed; G2 6-letter word ->
drag (8 tiles); G2 7-letter word -> typed; 8-letter word -> typed in both; two-word or hyphenated answer -> typed.

Gap word bank: exactly 3 options (answer + exactly 2 validated distractors), only for items that pass §13.5;
never padded.

### 13.5 Gap distractor validation path (rev 2, F2; tightened rev 3, R2-1)

Rev 1 required distractors from a *different* grammatical slot or semantic set. That rule was wrong: it deliberately
produces the mixed-category distractors Workstream A F3 flags as defective (a weekday answer next to non-weekday
options is guessable by category, not by listening). Rev 1 also implied `scripts/audit-qb.mjs` validates generated
banks; it does not - it reads exported `qb_questions` bank rows and checks ambiguity only for published
`question_type === 'mcq'` rows without context. Rev 2 replaced both; rev 3 replaces rev 2's topic-equality
coherence check (it admitted within-topic category mismatches, article mismatches, duplicate and undersized banks).

**Content rule (rev 3, R2-1).** A bank is offered only when **every distractor is plausible in isolation yet
contradicted by the spoken sentence**:
- *Plausible in isolation* = with the audio muted, the distractor reads as a correct, natural sentence in the
  displayed stem - same grammatical form (article, countable/mass, verb form) and same reviewed semantic group
  as the answer. Topic equality alone is NOT enough: `g2-kitchen` holds `spoon`, `salt`, `butter` and `chef`
  (`src/data/vocabulary/kitchen.ts`), and the generator itself already routes `chef` to the occupation class
  (`WORD_ID_OVERRIDES`, `listeningSentenceFillBlank.ts`); `owl` shares `g2-animals` with `cat` but cannot fill
  "I can see a ___." because of its article.
- *Contradicted by the spoken sentence* = the audio (`speakSentence(question.sentence)`) says the answer, and no
  distractor can be heard as the answer (not equal, not a homophone, not a one-letter minimal pair).

**Validation path (generation-to-validator adapter; no runtime trust of unchecked banks).**

1. Normalization `norm(s)` used by every rule: Unicode NFC, trim, lowercase, remove every character that is not a
   letter, digit or inner space, collapse runs of spaces. (`"Dog."`, `" dog"`, `"DOG"` all normalize to `dog`.)
2. Candidate pool (generator side): `VocabWord`s with the same `topicId` as the answer `wordId`, the topic must be
   listed in the reviewed allowlist `GAP_BANK_TOPICS` (new, next to the validator; each entry optionally declares
   reviewed `groups: string[][]` of word ids for topics that mix semantic sub-fields - e.g. kitchen utensils vs
   foods). A topic enters the allowlist only after a content review (same reviewer discipline as Workstream A2).
   The generator walks candidates in seeded order and takes the first pair that passes `validateGapBank`; if no
   pair passes, the item is typed-only. Banks are never padded or partially filled.
3. `validateGapBank(question, distractors)` (new, `src/lib/rounds/gapBankValidator.ts`) - pure, runs at round-build
   time, returns `{ eligible: boolean, reasons: string[] }`. Rules:
   - **V0 shape / minimum size:** `distractors.length === 2` exactly, so the bank is exactly 3 options (answer + 2).
     Each distractor `norm()` is non-empty. 0, 1 or ≥3 distractors -> ineligible. (3 is both the minimum and the
     fixed size: fewer options make guessing trivial; more crowd the G1-2 answer zone.)
   - **V1 audio identity:** `norm(question.sentence)` contains `norm(question.word)` exactly once as a whole word,
     and `blankOutWord(question.sentence, question.word) === question.displaySentence` (the audio says the
     answer at the gap).
   - **V2 frame match (grammatical plausibility):** for each distractor `d`, the set
     `sentencesForWord(d).map(s => blankOutWord(s, d.word))` contains `question.displaySentence` exactly. Both
     helpers already exist and are exported from `src/lib/generators/listeningSentenceFillBlank.ts`; they apply
     `sentenceClassFor` (incl. `WORD_ID_OVERRIDES`) and the sound-based `article()` rule, so this one check rejects
     class mismatches (`chef` vs `spoon`: occupation vs countable frames), mass/countable mismatches (`salt` vs
     `spoon`) and article mismatches (`owl` in "I can see a ___.").
   - **V3 semantic group (reviewed plausibility):** the answer's topic is in `GAP_BANK_TOPICS`; if that entry
     declares `groups`, the answer and both distractors belong to the same group.
   - **V4 distinct options (pairwise, all 3 options):** for every pair among {answer, d1, d2}: `norm` values differ;
     neither is the `plural` (or `+s`/`+es` form) of the other; the pair is not in the homophone /
     near-homophone list (`four/for`, `two/too/to`, `sea/see`, `son/sun`, `eight/ate`, `pear/pair`,
     `right/write`, `blue/blew`, `no/know`, `hour/our`; grows with review findings). Duplicates such as
     `dog/dog` or `Dog/dog.` fail here.
   - **V5 audible contrast vs the answer:** each distractor's `norm` has Levenshtein distance ≥2 from the
     answer's (G1-2 TTS + young listeners: one-letter minimal pairs such as `cat/hat` are not fair as a bank). The
     same ≥2 distance applies between d1 and d2 (near-duplicate distractors such as `cats`/`cat` already fail V4).
   - **V6 no stem leak:** neither distractor nor the answer appears elsewhere in `displaySentence`.
   - **V7 audio required:** the item is a listening kind with sentence audio; a context-only (silent) variant is
     never bank-eligible (without audio, frame-matching distractors are mutually valid - the Workstream A F2
     defect).
   - **V8 audio availability (play time, not build time):** if the speech layer reports `unsupported` or `error`
     when the sentence plays, the bank is disabled for that item and the surface switches to typed (§13.7) with
     the existing `AudioPlaybackWarning`. Round-build does not claim to prove playback.
4. Failure rule: failing any of V0-V7 -> **typed-only** (no bank, no "Gõ tay" toggle because typing is the only
   mode). Reasons are logged to the dev console in development only.
5. Fixtures (unit tests on `validateGapBank` + the generator walk; all required before the bank ships). Each
   rejection type has at least one fixture:

| # | Fixture | Expected | Rule |
|---|---|---|---|
| 1 | answer `cat`, stem "I can see a ___.", distractors `dog`, `bird` | eligible | - |
| 2 | answer `Monday`, distractors `Tuesday`, `Friday`, audio says Monday | eligible (audio selects) | - |
| 3 | one distractor only | ineligible | V0 |
| 4 | three distractors | ineligible | V0 |
| 5 | distractor `"  "` or `"."` (empty after `norm`) | ineligible | V0 |
| 6 | answer twice in the sentence | ineligible | V1 |
| 7 | within-topic category mismatch: answer `spoon` ("I have a ___."), distractors `chef`, `jar` | ineligible (`chef` frame is occupation) | V2 |
| 8 | mass/countable mismatch: answer `spoon`, distractors `salt`, `jar` | ineligible | V2 |
| 9 | article mismatch: answer `cat` ("I can see a ___."), distractors `owl`, `dog` | ineligible | V2 |
| 10 | topic not in `GAP_BANK_TOPICS` | ineligible | V3 |
| 11 | reviewed group mismatch inside an allowlisted topic | ineligible | V3 |
| 12 | mixed-category set (weekday + `Holiday`/`Weekend`) | ineligible | V2/V3 |
| 13 | duplicate distractors `dog`, `dog` | ineligible | V4 |
| 14 | normalized duplicate `Dog`, `dog.` | ineligible | V4 |
| 15 | plural pair among distractors `cats`, `cat` (answer `dog`) | ineligible | V4 |
| 16 | homophone with answer (`four` / `for`) | ineligible | V4 |
| 17 | minimal pair with answer `cat` / `hat` | ineligible | V5 |
| 18 | stem leak (distractor already printed in the sentence) | ineligible | V6 |
| 19 | silent context-only variant | ineligible | V7 |
| 20 | generator walk: pool has only 1 valid distractor | item typed-only, no padded bank | generator |

6. Coverage gate: a vitest sweep builds G1-2 rounds over a fixed seed sample, asserts every offered bank passed the
   validator and had exactly 3 distinct options, and reports the eligible share for the design gate (no minimum
   share is required - Spell-it carries CR-82 drag acceptance, R-v5-08).

`scripts/audit-qb.mjs` remains the gate for remote bank rows (Workstream A) and is not claimed as the validator
for generated listening gap banks.

### 13.6 States + a11y

States: idle · dragging (ghost + source tile leaves a dashed `SPELL_SLOT`-style hole in the bank) · over-target
· filled · all-filled (Kiểm tra enabled; before that `disabled` with `aria-disabled` and hint "Em điền hết các ô
nhé") · judged (tiles `disabled`, sheet open) · first encounter (`DemoHint` `variant="drag"`, existing).

A11y: bank `role="group" aria-label="Các chữ cái"`; each slot `button` with `aria-label="Ô 2: trống"` /
`"Ô 2: chữ c"`; tiles `button` with `aria-label="Chữ c"`; placement announced via live region ("Đã đặt chữ c
vào ô 2"). Drag is never the only path (WCAG 2.5.7 Dragging Movements - tap + keyboard equivalents above).

Reduced motion: ghost still tracks the pointer (direct manipulation, not decoration) but no scale/rotate;
snap, fly-to-slot and spring-back become instant position changes.

Testids: `spell-bank`, `spell-tile-{i}` (+ `data-tile-id`), `spell-slot-{i}`, `gap-bank`, `gap-chip-{i}`,
`sentence-gap`, `gap-input-toggle`; existing `submit-answer-button` + `answer-feedback` kept; `answer-input`
remains on the G3-5 path, the G1-2 typed mode of Gap, and Spell-it typed fallback.

### 13.7 Gap dual input for G1-2 (rev 2, R-v5-10 - human ruling)

On a bank-eligible G1-2 Gap item both inputs live on the same surface; neither is an error fallback.

| Element | Spec |
|---|---|
| Default mode | word bank (primary). Session preference overrides: last chosen mode is stored in `sessionStorage` key `ea-gap-input-mode` (`bank` / `type`) and applied to the next Gap item |
| Mode toggle | `gap-input-toggle` button under the sentence, `aria-pressed` = typing mode on; label "Gõ tay" (`IconPencil`) when in bank mode, "Chọn từ" (`IconBook`) when in typing mode; `GAP_INPUT_TOGGLE` 48px |
| Tap-the-gap-to-type | in bank mode, tapping/Enter on an **empty** `sentence-gap` opens typing mode with focus in `answer-input` (a placed chip in the gap is removed by tap as before - only the empty gap opens typing) |
| Typing mode | existing `answer-input` + `submit-answer-button` UI (current component), autofocus on switch; the bank is unmounted (not just hidden) |
| Switching | clears any un-submitted chip placement or typed text (announced: "Đã chuyển sang gõ tay" / "Đã chuyển sang chọn từ"); never submits |
| Submit | both modes call the existing `onSubmitListening(typedAnswer)` - one scoring path, unchanged feedback sheet |
| Ineligible item | typed-only, no toggle rendered |
| Audio failure mid-item (V8) | bank disabled, typing mode forced, toggle hidden for that item, `AudioPlaybackWarning` shown |
| Parent control | none beyond the toggle in CR-82 (a persistent per-profile preference is an open question, Q10) |
| G3-5 | typed only, no toggle |

Spell-it keeps its designed drag/tap/keyboard path; it gets typed input only through the §13.4 eligibility cap
(the ruling did not extend the toggle to Spell-it).

---

## 14. C3 - Flashcard mode (swipeable vocab, Monkey Junior pattern)

### 14.1 Description + rationale

A calm, no-score mode: a stack of big paper cards, one word each. See the picture, hear the word, flip to see
the word and meaning, then swipe right "Em nhớ rồi" or left "Ôn lại". Rationale: high-repetition exposure with
picture + audio + text together is the Monkey Junior core loop; self-rating keeps it pressure-free and feeds
review.

- **G1-2 front:** picture (large) + word audio autoplay; **back:** word in `TYPE_LETTER_CARD_NAVY` + IPA (`TYPE_IPA_NAVY`) +
  Vietnamese explanation (`TYPE_BODY_NAVY`).
- **G3-5 front:** word in `TYPE_CARD_GLYPH_PAPER` (navy-800 on amber-50, 13.27 - rev 2, F1; rev 3 named size token; rev 1's
  `text-amber-100` on paper was 1.07:1) + audio button (no autoplay); **back:** picture + Vietnamese explanation
  (recall-first for older kids).

The mode is **unscored**: no verdict, no points, no feedback sheet, no streaks, no engagement/quest credit in
CR-82 (Q5b).

### 14.2 Entry + IA (rev 2, F3; rev 3 - human ruling R-v5-12 resolved)

Current G1-2 tree (`StartBatchScreen.tsx`): first paint Back, Chơi, Luyện thêm, Phần thưởng (4 decisions).
"Luyện thêm" expands to Tiếng Anh, Toán tiếng Anh, Khoa học, Đấu trường + conditional Ôn tập = **4 controls
(Review absent) or 5 (Review present)** - the Review-present state already exceeds the ≤4-per-expansion budget,
and rev 1's extra flashcard subtile would have made it 5 or 6.

**Human ruling (rev 3, R-v5-12 RESOLVED):** "Đấu trường becomes its own top-level menu entry - NOT inside Phần
thưởng; rewards are outcomes of learning/testing, not a subject." The rev 2 T-A proposal (arena under Phần
thưởng) and the T-B alternative are withdrawn. Phần thưởng stays rewards-only.

**Binding revised G1-2 tree:**

```
[Back]  |  Chơi  |  Luyện thêm  |  Đấu trường  |  Phần thưởng
 nav       gold      hub tile       hub tile        hub tile
 chrome    CTA       (subjects)     (arena, "vs")   (rewards)

Luyện thêm  (hub-tile-more -> hub-panel-more)                  Review absent: 3   Review present: 4
  Tiếng Anh        (hub-subtile-english -> hub-section-english)
      drill-english | exam-program-english | advanced-english | flashcards-start   (4 controls)
  Toán tiếng Anh   (hub-subtile-math -> hub-section-math)        3 controls (unchanged)
  Khoa học         (hub-subtile-science -> hub-section-science)  3 controls (unchanged)
  Ôn tập           (hub-subtile-review; conditional, unchanged)  sections review? coach? (1-2 controls)

Đấu trường  (hub-tile-arena -> hub-panel-arena; sections hub-section-arena?, hub-section-rank)
  today's arena content, unchanged (ArenaCard when arena handlers exist; LeaderboardCard always)

Phần thưởng (hub-tile-reward -> hub-panel-reward -> hub-section-reward)   unchanged, rewards only
```

- **Luyện thêm** drops Đấu trường: 3 subjects + Ôn tập when present = **3 or 4 controls**, within budget in both
  Review states (this also fixes the pre-existing Review-present overflow).
- **Flashcards** stay as the 4th action inside **Tiếng Anh** (vocabulary is English content), budget-neutral at
  the Luyện thêm level. Rev 3 (R2-2): `flashcards-start` is a `BTN_DRILL`-family paper row labeled "Thẻ từ vựng"
  (`IconBook`) at **`min-h` = `density.primaryMinH` (76px G1-2 / 64px G3-5)** - it launches a practice screen, so
  it is a standalone control. Its siblings in the same section (`drill-english`, `exam-program-english`,
  `advanced-english`, and the same three rows in Toán tiếng Anh / Khoa học) are standalone launchers too and move
  from the fixed `min-h-[64px]` to `density.primaryMinH` in the same change (a pre-existing G1-2 sub-floor;
  sibling sizing is not an exception to the floor).
- **Đấu trường top-level entry (placement + styling):** a hub tile at the same level as the other hub groups
  (Luyện thêm, Phần thưởng), ordered **between** them: learning first, competition second, rewards last.
  - Token `TRAIL_TILE_ARENA` (new): `TRAIL_TILE` geometry (`min-h` = `density.tileMinH`, 96px G1-2 / 76px
    G3-5) + `border-b-4 border-orange-300 bg-orange-50 text-slate-800 hover:bg-orange-100`
    (slate-800 on orange-50 13.78; focus `ring-sky-600` 3.86 non-text). Distinct from the sky-50 subject tiles
    by surface hue and by its emblem, not by gold (gold stays reward/next-step).
  - "vs" emblem: a 48px navy disc `bg-navy-800 ring-2 ring-orange-300` holding `IconSwords` in `text-orange-200`
    (10.17 on navy-800), with a small "VS" badge `font-display text-sm font-extrabold text-orange-200` on the disc
    edge (decorative, `aria-hidden`). Label "Đấu trường", sub "Thi đua với bạn bè" (`TYPE_CAPTION_PAPER`,
    slate-700 on orange-50 ≥7.1).
  - Same `aria-expanded` + `aria-controls` + Enter/Space + headless `InstructionSpeaker` voice hint ("Chọn bạn đấu
    nhé!") as every hub tile; it controls `hub-panel-arena`, whose sections keep today's region ids
    (`hub-section-arena` only when arena handlers exist, `hub-section-rank` always - so the tile is never
    empty). Collapsed regions stay mounted as empty wrappers (CR-73 contract).
  - Orange here is the arena identity hue (approved palette, R-v5-04), not a status color.
- **First-paint budget accounting.** The ruling makes the G1-2 first paint 5 controls (Back, Chơi, Luyện thêm,
  Đấu trường, Phần thưởng). Designer accounting (R-v5-14): Back is persistent navigation chrome (`NAV_PILL`,
  top-left, present on every screen) and is not a mode decision, so G1-2 shows **4 mode decisions + Back**.
  `DESIGN_SYSTEM.md` §5 wording changes from "≤4 decisions (Back, Chơi, Luyện thêm, Phần thưởng)" to "≤4 mode
  decisions (Chơi, Luyện thêm, Đấu trường, Phần thưởng) + Back navigation". This aligns G1-2 with G3-5, which
  already has a top-level Đấu trường. BA confirms the wording when updating the PRD; the IA itself is human-ruled
  and binding.
- aria-controls / regions: `hub-subtile-arena` is replaced by `hub-tile-arena` (top-level ids `hub-tile-arena` /
  `hub-panel-arena`); `hub-section-arena` and `hub-section-rank` ids are unchanged. `hub-subtile-review` stays
  omitted from both the list and the DOM when there is nothing to review. `hub-section-reward` unchanged.
- Test impact: tests that open `hub-tile-more` then `hub-subtile-arena` now open `hub-tile-arena` directly;
  G1-2 first-paint count tests change from 4 to 5 interactive hub-level controls (4 mode decisions + Back);
  `ModeHub` G1-2 snapshot updates. No reward-panel test changes.

**G3-5:** unchanged IA - "Luyện & thi" (budget ≤6) already shows each program block with header and Đấu trường is
already top-level. Flashcards become the 4th row of the Tiếng Anh block (`flashcards-start`,
`density.primaryMinH` = 64px). G3-5 Đấu trường tile adopts `TRAIL_TILE_ARENA` styling for cross-band consistency.

New screen `FlashcardScreen` (play register: hero scene, tone by band, no journey pan).

**Deck building (rev 2, F6):**
- Source: bundled `VocabWord`s (`src/data/vocabulary/*`) for the grade's topics - no network needed to build a
  deck. "Ôn lại" words from the local store are placed first.
- Deck size `N = min(10, eligibleCount)`. Eligible = has `emoji` or approved `imageUrl` + non-empty `word`.
  `eligibleCount = 0` -> empty state. `1 ≤ N < 10` is a valid **small deck** (counter reads `Thẻ 1/N`).
- Retry deck ("Ôn lại k thẻ"): `N = k` cards rated "Ôn lại" in the finished deck, same rules, counts reset;
  retry of a retry is allowed until k = 0.

**Persistence (rev 2, F8 - Ruling R-v5-11): local-only in CR-82.** Ratings are written to `localStorage` key
`ea-flash-review:<gradeId>` (word ids + last rating + timestamp, capped at 200 entries). No server write, no
CR-28 store coupling in CR-82. Save failure (storage disabled, quota, private mode): ratings are kept in session
memory for the current visit, the child sees no error, retry decks still work in-session, and prioritization
simply starts fresh next visit. Tech Lead may propose a server store in a later CR.

### 14.3 Anatomy + tokens

```
[material.chrome]  Thẻ 3/10 (CHIP_AMBER)                       KẾT THÚC (existing end-session token)
         [stack: 2 cards behind, offset 6px, scale .96/.92]
         [FLASH_CARD]  active face only in the a11y tree      [speaker]  (card-level sibling, top-right)
[Ôn lại]                                                    [Em nhớ rồi]
```

DOM structure (rev 2, F5) - one flip control, speaker outside it:

```tsx
<div data-testid="flashcard-card" data-face={face} role="group"
     aria-roledescription="thẻ từ vựng" aria-label={`Thẻ ${i} trên ${N}`}
     className={FLASH_CARD} onPointerDown={swipe.down} onPointerMove={swipe.move} onPointerUp={swipe.up}>
  <button type="button" data-testid="flashcard-flip" className={FLASH_FLIP}
          aria-label={face === 'front' ? 'Lật thẻ để xem mặt sau' : 'Lật thẻ để xem mặt trước'}
          onClick={flip}>
    <div className={FLASH_FACE_FRONT} {...(face !== 'front' && { inert: '', 'aria-hidden': true })}>...</div>
    <div className={FLASH_FACE_BACK}  {...(face !== 'back'  && { inert: '', 'aria-hidden': true })}>...</div>
  </button>
  <button type="button" data-testid="flashcard-speaker" className={BTN_AUDIO}
          aria-label={`Nghe từ ${word}`} onPointerDown={stop} onClick={speak} />   {/* sibling of flip */}
</div>
```

| Token | Classes | Surface | Ratio |
|---|---|---|---|
| `FLASH_CARD` | `material.paperSlate` + `relative aspect-[3/4] w-[min(84vw,360px)] [perspective:1200px]` | warm paper | - |
| `FLASH_FLIP` | `absolute inset-0 rounded-[2rem] [transform-style:preserve-3d] transition-transform duration-400 ease-in-out-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-600 motion-reduce:transition-none` + `[transform:rotateY(180deg)]` when back | warm paper / navy | focus sky-600 3.95 on amber-50; on the navy back face the ring sits on the paper card edge |
| `FLASH_FACE_FRONT` | `absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 [backface-visibility:hidden] text-slate-900` | warm paper | slate-900 on amber-50 17.22 (composites per §5.3 matrix) |
| `FLASH_FACE_BACK` | `absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-gradient-to-b from-navy-800 to-navy-850 text-white [transform:rotateY(180deg)] [backface-visibility:hidden]` | navy | white 13.77; IPA sky-200 10.37; explanation slate-300 9.27 |
| `FLASH_SWIPE_LABEL_KNOWN` | `absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1 text-lg font-extrabold text-white` + `IconCheck` (`aria-hidden`, visual only - the outcome is announced via live region) | over card | white on emerald-700 5.48 |
| `FLASH_SWIPE_LABEL_AGAIN` | `... bg-slate-700 text-white` + `IconRefresh` (`aria-hidden`) | over card | white on slate-700 10.35 |
| `BTN_FLASH_AGAIN` | `BTN_SECONDARY_NAVY` + `min-h-[76px]` G1-2 / `min-h-[64px]` G3-5 + `IconRefresh` | navy | sky-200 7.68 |
| `BTN_FLASH_KNOWN` | `inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-5 font-extrabold text-emerald-100 ring-1 ring-emerald-400/50 transition hover:bg-emerald-500/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 active:scale-[0.98] motion-reduce:active:scale-100` + band min-h + `IconCheck` | navy | emerald-100 on emerald-500/20 over navy 8.73 |
| `FLASH_PANEL` (empty / error / summary) | `material.paperSlate` + `p-6 text-center` with `TYPE_SECTION_PAPER` heading + `TYPE_BODY_PAPER` body; secondary actions inside it use `BTN_SECONDARY_PAPER` at band floor (sky-800 on sky-100 6.59) - navy-glass buttons/chips are banned on this paper | warm paper | 17.22 / 9.99 |
| `CHIP_PAPER_EMERALD` | `CHIP_BASE` geometry + `bg-emerald-100 text-emerald-800 ring-emerald-300` | warm paper | emerald-800 on emerald-100 6.78 |
| `CHIP_PAPER_SKY` | `CHIP_BASE` geometry + `bg-sky-100 text-sky-800 ring-sky-300` | warm paper | sky-800 on sky-100 6.59 |

Gold appears only on the deck summary CTA (next step). "Em nhớ rồi" is emerald = "go/correct" semantics, not gold.

### 14.4 Gesture + keyboard spec (rev 2, F5: one flip path)

| Input | Behavior |
|---|---|
| tap on the card face (<8px movement) | native `click` on `flashcard-flip` -> flip (rotateY 180deg, 400ms `ease-in-out-soft`); `flip` sfx (ui tier) |
| Enter / Space | only via native activation of the focused `flashcard-flip` button (no extra keydown handler on the group - so there is exactly one activation path and no double flip) |
| `pointerdown` + horizontal move on the card | handled by the group container (bubbling from the flip button); card follows `dx`; rotation `clamp(dx/20, -12deg, 12deg)`; swipe label opacity `min(1, |dx|/threshold)`. A real drag sets the `useDragTile`-style suppress flag so the trailing click does NOT flip |
| direction lock | in the first 10px, if `|dy| > |dx|` the gesture is released to the page (vertical scroll); card `touch-action: pan-y` |
| release | commit if `|dx| ≥ 30% card width` or velocity ≥ 0.6 px/ms: card flies out 250ms `ease-out-expo`, next card rises 240ms; else springs back 300ms `ease-out-quint` |
| ArrowRight / ArrowLeft | while focus is inside the card group or on the two decision buttons: "Em nhớ rồi" / "Ôn lại" |
| decision buttons | always visible; identical outcome to swipe (swipe is never the only path - WCAG 2.5.7) |
| speaker button | sibling of `flashcard-flip`, never inside it; `onPointerDown` stops propagation (cannot arm a swipe), its `click` cannot reach the flip button (not an ancestor), Enter/Space activate only the speaker |

**Focus rules:**
- After flip: focus stays on `flashcard-flip`; its `aria-label` updates and a polite live region
  (`flashcard-live`) reads the newly active face ("Mặt sau: cat - con mèo").
- After a decision (swipe, button or arrow): the next card mounts and focus moves to its `flashcard-flip`;
  the live region announces "Đã lưu: nhớ rồi. Thẻ 4 trên 10".
- After the last decision or a confirmed KẾT THÚC: focus moves to the summary heading (`tabIndex={-1}`).
- After closing the end dialog with "Tiếp tục": focus returns to `flashcard-flip` (ConfirmEndDialog restore).

**Accessibility-tree isolation:** the inactive face always carries `inert` + `aria-hidden="true"` (React 18:
`inert=""` string attribute; Tech Lead to add the type augmentation). Under reduced motion the inactive face is
**unmounted** (no 3D needed). Tab order on a card is exactly: `flashcard-flip` -> `flashcard-speaker` ->
"Ôn lại" -> "Em nhớ rồi"; screen-reader browse mode reaches only the active face's text. Playwright/axe check:
on each face, `getByRole` finds no element from the other face.

### 14.5 States (rev 2, F6 + F8)

| State | Spec |
|---|---|
| loading (deck build, image decode) | card skeleton `bg-amber-100 animate-pulse motion-reduce:animate-none`, decision buttons `disabled`, `aria-busy="true"` on the card region; deck build is local so this is normally <100ms |
| idle front / back | as above |
| audio playing | speaker icon swaps to animated bars (reduced: static playing icon + sr text "đang phát") |
| audio failed | speaker shows the existing `AudioPlaybackWarning` pattern; the card stays usable (audio is not required to rate) |
| image error | `EmojiVisual` fallback chain (unchanged) |
| empty deck (`eligibleCount = 0`) | `FLASH_PANEL`: "Chưa có thẻ cho lớp này - em thử phần khác nhé." + `BTN_SECONDARY_PAPER` "Về trang chính" at band floor (76/64); mascot `encouraging` |
| **load error** (deck could not be built: vocabulary module/chunk failed to load, or an unexpected exception in deck building) | `FLASH_PANEL` with `role="alert"`: heading "Chưa mở được bộ thẻ" + body "Có lỗi khi mở thẻ - em thử lại nhé. Nếu vẫn lỗi, báo bố mẹ giúp em." + `BTN_SECONDARY_PAPER` "Thử lại" (rebuilds the deck) + "Về trang chính", both `min-h` = `density.primaryMinH` (76 G1-2 / 64 G3-5); focus moves to the heading (`tabIndex={-1}`); mascot `encouraging`. Copy deliberately differs from the empty state - a failure never claims there are no cards |
| review store unreadable (localStorage disabled/corrupt) | **not an error**: build the deck without "Ôn lại" prioritization from bundled data, no message (usable fallback). Corrupt JSON is discarded and rewritten |
| offline | deck is built from bundled data and works offline; images fall back via `EmojiVisual`; audio may fail (row above). Only if the vocabulary chunk itself is not cached and cannot load does the **load error** state show |
| review save fails | session-memory only, silent (R-v5-11) |
| full completion (`rated = N`) | mascot `celebrating` block; heading "Em đã xem hết {N} thẻ - giỏi lắm!"; chips "Nhớ: {known}" (`CHIP_PAPER_EMERALD`) "Ôn lại: {again}" (`CHIP_PAPER_SKY`); `CTA_GOLD_XL` "Học tiếp bộ mới"; `BTN_SECONDARY_PAPER` "Ôn lại {again} thẻ" (hidden if `again = 0`), "Về trang chính" |
| partial exit (`0 < rated < N`, via KẾT THÚC) | mascot `happy`; heading "Em đã xem {rated}/{N} thẻ - lần sau mình xem tiếp nhé!"; same chips; `CTA_GOLD_XL` "Xem tiếp {N - rated} thẻ" (resumes the same deck at the first unrated card); "Ôn lại {again} thẻ" (if > 0); "Về trang chính" |
| zero-progress exit (`rated = 0`) | mascot `encouraging`; heading "Mình chưa xem thẻ nào - em quay lại khi sẵn sàng nhé."; no chips; `CTA_GOLD_XL` "Bắt đầu xem thẻ"; "Về trang chính" |
| end early (KẾT THÚC) | `ConfirmEndDialog` "Dừng xem thẻ?" / "Các thẻ em đã chọn Nhớ hoặc Ôn lại sẽ được lưu." -> partial or zero-progress exit |

Touch floors in §14 (rev 3 sweep, R2-2): every action that starts, resumes, retries or leaves a flashcard flow is
standalone and uses `min-h` = `density.primaryMinH` (76px G1-2 / 64px G3-5): `flashcards-start`, "Ôn lại" /
"Em nhớ rồi", empty/error "Thử lại" and "Về trang chính", summary "Học tiếp bộ mới" / "Xem tiếp" / "Bắt đầu xem
thẻ" (`CTA_GOLD_XL`, 76px), "Ôn lại {k} thẻ" and "Về trang chính". `BTN_SECONDARY_PAPER`'s default 48px is
overridden by the density floor in these panels. Non-standalone controls stay at the 48px kid floor:
`flashcard-speaker` and the chrome `KẾT THÚC` (FlashcardScreen uses `min-h-[48px]`; BatchScreen's existing 44px
`batch-end-early` is a pre-existing deviation outside this spec, logged for the Tech Lead). `flashcard-flip` covers
the whole card (≥ 300px). No §14 control is below its floor.

Counting rules: `rated = known + again`. The current card at exit - flipped or not - is **unrated**: not counted,
not saved, and is the first card of "Xem tiếp". A card counts only once it receives a decision. Small decks use
the same copy with their own `N`. Retry decks use the same three exit states with `N = k`. Still unscored: chips
are counts of the child's own self-ratings, never "correct/wrong".

Testids: `flashcard-screen`, `flashcard-card` (`data-face="front|back"`), `flashcard-flip`, `flashcard-speaker`,
`flashcard-known`, `flashcard-again`, `flashcard-live`, `flashcard-summary` (`data-exit="full|partial|zero"`),
`flashcard-next-deck`, `flashcard-resume`, `flashcard-retry-again`, `flashcard-empty`, `flashcard-error`,
`flashcard-error-retry`, `flashcards-start` (hub entry).

Reduced motion: flip = 150ms crossfade with the inactive face unmounted after the fade (no rotateY); drag
follows the finger without rotation; fly-out = 150ms fade; stack static.

---

## 15. C4 - Exam flow polish

### 15.1 Progress ring

`ExamProgressRing` (new, header): 40px SVG ring on `desk-bar`; track `stroke-white/15` 4px, fill `stroke-amber-300`
`stroke-linecap-round`, `stroke-dashoffset` transition 240ms `ease-out-quint` (reduced: none). Label `12/30`
sits to the **right** of the ring (not inside it, so 3-digit totals such as `120/200` fit) in `EXAM_RING_LABEL`
(rev 3 named component token: `tabular-nums text-sm font-extrabold text-white` - 14px kid caption minimum;
desk-bar surface, white on desk-bar 15.82; not a type composite with an added color). Wrapped in `role="progressbar" aria-valuemin=0
aria-valuemax={total} aria-valuenow={answered} aria-label="Đã làm 12 trên 30 câu"`. Existing `exam-progress`
(practice) keeps its text chip; the ring is added in exam mode (`data-testid="exam-progress-ring"`).
Amber here = progress semantics (allowed), not a gold fill.

### 15.2 Question navigator

- The existing strip (`exam-nav-*`, paging by `STRIP_PAGE`) stays on `desk-bar` with its tokens; it gains the
  flagged state (`EXAM_NAV_FLAGGED`, icon + sr-only "đã đánh dấu").
- New "Tất cả câu" button (`IconHash`, 48px, `data-testid="exam-nav-open"`) opens a **navigator dialog**: paper
  sheet grid of all questions (`grid-cols-5 sm:grid-cols-10 gap-2`, `EXAM_NAV_CELL_PAPER` 48px) with legend
  (Đã làm / Chưa làm / Đã đánh dấu / Câu hiện tại - icon + text, never color alone). Tap a cell -> `jump(index)`
  and close. For 200 questions the grid scrolls inside `max-h-[70vh] overflow-y-auto`.
- Dialog behavior follows the `ConfirmEndDialog` reference (MEMORY lesson): `role="dialog" aria-modal="true"`,
  focus trap, Escape closes, focus restored to the opener (`useModalBehavior`).

### 15.3 Flag for review

On the sheet header: toggle "Đánh dấu câu này" / "Đã đánh dấu" (`IconFlag`, `aria-pressed`,
`BTN_SECONDARY_PAPER` 48px, `data-testid="exam-flag"`). Flags are UI state only (not scored, not persisted after
submit).

### 15.4 Review-before-submit

`NỘP BÀI` (`exam-submit`, exam mode) opens a **review sheet** dialog instead of the bare confirm:

```
Xem lại trước khi nộp
Đã làm: 27/30   Chưa làm: 3   Đã đánh dấu: 2
[Chưa làm]   Câu 4   Câu 17   Câu 29          (each a 48px paper cell -> jump + close)
[Đã đánh dấu] Câu 8   Câu 21
[Quay lại làm tiếp]              [Nộp bài]
```

- "Nộp bài" = `BTN_PAPER_ACTION` scaled to 48px+ (sky-700 + white 5.93) - **not gold** (submitting a test is a
  commit, and the timed sitting has no gold fills - CR-73 exam gold remediation, scoped by N1); `data-testid="exam-review-submit"`.
- 0 unanswered + 0 flagged -> the sheet shows "Em đã làm hết các câu rồi." and the same two buttons.
- Practice mode keeps the existing `ConfirmEndDialog` ("Kết thúc bài?") - practice has no review need.
- Timer expiry while open: auto-submit (existing CR-69 rule), dialog closes; flag state resets on `begin()`
  (MEMORY lesson "stale confirm state").
- Existing tests that click `exam-submit` then confirm: the confirm control testid inside the review sheet must
  keep the name the existing tests use (Dev to map from `ExamScreen.endConfirm.test.tsx`), or tests update in
  the same commit.

### 15.5 Keyboard

In the sitting: `1-4` / `A-D` select options (when focus is not in a text input), `←/→` previous/next question,
`F` toggles flag, `N` opens navigator. Shortcuts listed in the navigator dialog footer (recognition, not recall).
Disabled while a dialog is open.

---

## 16. C5 - Micro-interactions + sound-consistent rewards

### 16.1 Springy press

All `material.tile*`, `CTA_GOLD_XL`, `BTN_REWARD_EARNED`: press sink (100ms) + `press-release` (240ms, `ease-toy`).
Secondary buttons keep `active:scale-[0.98]` (quieter). Exam surface: no springs (formal) - press = 1px translate.

### 16.2 Streak bursts + star fly

| Moment | Visual | Sound | Reduced motion |
|---|---|---|---|
| correct answer | small gold star (`IconStar` filled `text-amber-300`) flies from the tile to the `LiveScore` chip (`star-fly` 600ms); chip number ticks +1 with a 160ms scale 1 -> 1.12 -> 1 | `correct` (existing) | no fly; chip number updates with a static 600ms `ring-2 ring-amber-300` highlight |
| streak 3 | `streak-burst` ring behind the sheet perch (rendered in the same non-scrolling perch layer, §9.3; at `max-height:420px` the ring is omitted) + `CHIP_GOLD` "3 câu đúng liên tiếp!" slides into the sheet headline row; existing `Confetti big` | `streak` (new) after `correct` | chip appears without slide; no ring; no confetti (existing rule) |
| streak 5 | same, chip "5 câu liên tiếp - siêu quá!", 2 rings | `streak` | static chip |
| streak 10 | same, chip "10 câu liên tiếp - vô địch!", 3 rings + mascot `celebrating` | `streak` | static chip |
| round summary stars | `StarRain` re-skinned: SVG gold medallion stars (`IconStar` in a `material.goldCta` disc, 56px) instead of emoji (D4); `star-drop` kept | `star` (new) per star, 180ms apart | stars rendered landed (existing) |
| chest | `ChestReveal`: SVG chest (new `IconChest`-style illustration in icons.tsx style, gold material) replaces gift emoji (D4) | `star` | static open chest + "+N sao" |
| wrong answer | no burst, no shake on G1-2 option tiles (picked tile sinks - §7.2); `ExtraLetterQuestion` `tile-shake` kept but added to reduced-motion block (D3) | `playGentleWrong()` (existing) | no shake |

Streak counts `correctStreak` already passed to `QuestionCard` (CR-79 A5). Chips never use emoji.

### 16.3 Sound system (tiers)

Extend `SfxName` in `src/lib/sfx.ts`: `'correct' | 'wrong' | 'tap' | 'pop' | 'flip' | 'streak' | 'star'`.
New files `public/sfx/{tap,pop,flip,streak,star}.mp3` - self-hosted, CC0 or owned, ≤20KB each, provenance added to
`public/attribution.json` like other assets.

| Tier | Sounds | Gain | Rules |
|---|---|---|---|
| verdict | `correct`, gentle wrong | 0.6 / 0.35 (existing) | always wins; interrupts ui tier |
| reward | `streak`, `star` | 0.5 | queued after the verdict (starts 250ms after), never overlaps it |
| ui | `tap`, `pop`, `flip` | 0.25 | dropped (not queued) if a verdict/reward sound or any `speech.ts` audio is playing; never on every button - only tile drop, flip, tracing stroke done |

Same pitch family (one key, e.g. C major) across all files so rewards feel consistent. `stopSfx()` before
mic-open stays. Exam mode stays silent (as today - `ExamScreen.answer()` only plays sfx in practice mode);
practice mode keeps verdict sfx only, no ui/reward tiers (formal register).

---

## 17. Motion master table (every animation + its reduced-motion twin)

| Animation | Where | Duration / easing | Reduced-motion fallback (same information) |
|---|---|---|---|
| ambient drift far (`scene-drift-far`) | L1 clouds | 60s alternate, in-out-soft | static |
| `land-drift` / `land-drift-slow` | clouds (existing) | 9s / 14s | static (existing) |
| `land-sway` | swing, leaves (existing) | 6s | static (existing) |
| `land-twinkle`, `ambient-sparkle` | stars | rev 2 (N2): 6.5s / 7s (were 2.6s / 3.4s) | static opacity 0.8 |
| `land-float` | rocket | rev 2 (N2): 7s (was 5s) | static |
| journey pan | L1-L3 on advance | 700ms ease-out-quint | `--pan: 0`; progress shown by trail/track |
| round reset crossfade | L2/L3 | 400ms | instant |
| `screen-enter` | screens (existing) | 200ms | none (existing) |
| tile hover lift | pointer-fine | 160ms | no translate; border color change only |
| tile press + `press-release` | tiles, gold CTA | 100ms + 240ms ease-toy | shadow/base swap only, no translate |
| drag ghost lift/rotate | C2 | 160ms | ghost tracks pointer, no scale/rotate |
| `snap-in`, fly-to-slot, spring-back | C2 | 180 / 240 / 240ms | instant placement |
| tracing demo stroke | C1 | 1200ms per stroke | static numbered arrows; each Space/tap reveals the next stroke statically |
| tracing ink crossfade / fade | C1 | 200 / 300ms | instant swap |
| start-dot pulse | C1 | 1.2s loop | static ring |
| card flip | C3 | 400ms in-out-soft | 150ms crossfade (opacity only), inactive face unmounted after fade |
| card swipe follow / fly-out / spring-back | C3 | live / 250 / 300ms | follow without rotate; fade 150ms; instant return |
| deck stack rise | C3 | 240ms | instant |
| progress ring fill | C4 | 240ms | instant |
| dialog/sheet enter | C4, sheets | 240ms ease-out-expo (opacity + 12px rise) | opacity only, 120ms |
| `star-fly` | C5 | 600ms ease-out-expo | none; static chip highlight 600ms |
| score chip tick | C5 | 160ms | none |
| `streak-burst` | C5 | 520ms | none; chip still appears |
| `Confetti` | C5 (existing) | 700ms | not rendered (existing) |
| `star-drop`, `stars-pop`, `chest-wiggle`, `sticker-chip` | summaries (existing) | existing | final state (existing) |
| `tile-shake`, `dart-arrow` | ExtraLetter (existing) | 300 / 400ms | **add to reduced block** (D3) - none |
| mascot Lottie poses (rev 2) | B4 | per §9.2 / §9.5 (finite loops except idle) | static SVG pose renderer; no Lottie runtime mounted (pose art carries the mood) |
| legacy mascot CSS (`mascot-wave/pop/calm/celebrate`, `mascot-float`) | B4 static renderer only, until Lottie poses ship | existing | none (existing) |
| thinking dots | B4 (inside the Lottie asset) | 1.8s x2 then hold | static SVG pose with 3 dots |
| exam urgent timer | B5 | **none** (pulse removed) | n/a |
| audio "playing" bars | C3, audio buttons | 800ms loop | static playing icon + sr text |

Implementation rule: CSS animations go in the `@media (prefers-reduced-motion: reduce)` block; JS-driven motion
(pan var, star-fly, swipe physics, tracing demo) branches on `usePrefersReducedMotion()`; Tailwind classes pair
`motion-reduce:` variants. Budget: transform/opacity only (no layout properties), ≤1 continuously animating
element per board outside the scene.

---

## 18. Accessibility summary

| Area | Requirement |
|---|---|
| Contrast | rev 2 (F1): every token pair in §5, §10.2, §12.3, §13.2, §14.3 is computed **and** every place a type composite lands is listed in the §5.3 actual-usage matrix; the claim covers exactly those listed usages. Body ≥4.5, large ≥3, non-text ≥3. Lowest text pair: white on rose-600 4.70 (urgent timer, large mono). Lowest non-text: amber-600 underline decoration on amber-50 3.07, `TRACE_DONE` 3.63, sky-600 focus on amber-50 3.95. Guard: `colorPairingGuard.test.ts` extension bans light ink classes on paper tokens (§5.3 rule 3) |
| Focus | navy surfaces `ring-amber-300/60-70`; paper surfaces `ring-sky-600` (4.10 on white, 3.91 on slate-50, 3.95 on amber-50) |
| Targets | §3 floors; new controls: tracing controls 76, spell tiles 76×64, spell slots 76 tall × ≥48 wide (cap §13.4), gap 56 (non-standalone ≥48), gap input toggle 48, flashcard decisions + error/empty/summary actions 76/64, flashcard speaker 48, flashcard chrome KẾT THÚC 48, hub `flashcards-start` + sibling launch rows `density.primaryMinH` 76/64 (rev 3, R2-2), `TRAIL_TILE_ARENA` 96/76, exam nav/flag/ring-opener 48, navigator cells 48 |
| Drag alternatives | WCAG 2.5.7: every drag (C2, C3) has tap + keyboard; tracing has the assisted alternative (R-v5-07) |
| Pointer cancellation | WCAG 2.5.2: drops/commits on `pointerup`, never `pointerdown`; `pointercancel` aborts without effect |
| Live regions | verdict (existing), tracing stroke progress, spell placement, gap mode switch, flashcard face + decision (`flashcard-live`), flashcard load error (`role="alert"`), exam 5:00/1:00 announcements |
| Dialogs | navigator + review sheet follow `ConfirmEndDialog` (focus trap, Escape, restore) |
| Never color alone | journey trail has `Câu x/y` text; nav cells icon + sr text; swipe labels icon + text; verdict tiles labels |
| Reduced motion | §17, every row |
| Locale | Vietnamese diacritic leading (§8.2); 30% label expansion headroom; hyphen-only copy |
| Screen reader names | all new controls have Vietnamese accessible names (listed per section) |
| Hidden content | rev 2 (F5): inactive flashcard face is `inert` + `aria-hidden` (unmounted under reduced motion); bank unmounted in Gap typing mode; perch wrappers `aria-hidden` |

---

## 19. What changes vs v4 / what is preserved

### Changes (v4 -> v5)

| v4 | v5 |
|---|---|
| `LandScene night` = bottom strip, CSS brightness/saturate filter | `variant="hero"` full-bleed 4-layer scene, `tone` dusk (G1-2) / night (G3-5) from precomputed palettes, journey pan |
| scene peek under the board | board floats over a full world; scrim behind board |
| board `CARD`-style gradient, 1.5px land rim | `material.board` (32px radius, e3 depth), 2px rim, journey-trail dots |
| `toy.face` 5px base | `material.tile*` 6px base + inner bottom shade + soft drop, 20px radius, press-release spring |
| `EXHIBIT` slate-50/95 | `material.exhibitPaper` warm amber-50 |
| `DISPLAY_GLYPH` `font-black`; type tokens carry color | `TYPE_*_GEO` geometry + `INK_*` color + surface composites (`*_NAVY` / `*_PAPER`), `font-extrabold`; Andika for G1-2 letters |
| mascot face-only SVG, 4 moods, top-right companion, inline mascot in FeedbackPanel | Lottie JSON half-body rig (6 poses) with static SVG poster/reduced-motion/fallback, left board perch speaking the banner, sheet perch as a sibling layer of the fixed sheet wrapper; G1-2 sizes up |
| exam dark chalkboard, orange-ring selected, rose practice-wrong, pulsing urgent timer, mascot in header | paper sheet on desk, sky selected on paper, slate practice-wrong, static urgent timer, no mascot during sitting |
| `exam-submit` -> confirm dialog | review-before-submit sheet + navigator dialog + flags + progress ring |
| city indigo, space indigo/violet, scattered violet | city orange/navy, space navy + one violet identity accent |
| emoji stars/gift in StarRain/ChestReveal | SVG gold reward chrome |
| sfx: correct/wrong | tiered set + streak/star/pop/flip/tap |
| (new) | `letter-tracing` kind, Spell-it drag (G1-2, ≤6-letter cap) + Gap word bank with peer typing toggle (G1-2, validated items only), FlashcardScreen (local-only ratings) |
| G1-2 hub: Đấu trường under Luyện thêm; launch rows 64px | (human ruling R-v5-12) Đấu trường is its own top-level hub tile (`TRAIL_TILE_ARENA`, "vs" emblem) between Luyện thêm and Phần thưởng; Phần thưởng rewards-only; flashcards as 4th action in Tiếng Anh; G1-2 launch rows at 76px |

### Preserved (CR-82 constraints)

Navy/gold brand; semantic token layers + surface-pairing rule; touch floors 76/64/48 (+44/36); reduced-motion
everywhere; all existing testids/aria/`data-*` (new ones only added; the two intentional value changes are called
out: `data-mascot-mood` pre-answer `idle`, exam submit flow testids in §15.4; `hub-subtile-arena` becomes top-level `hub-tile-arena` / `hub-panel-arena` with unchanged section ids, R-v5-12); feedback-sheet contract (§5.5); one
mascot; band gating; `QUESTION_BANNER` left-aligned instruction; single unanswered tile frame (no rainbow tints);
≤1 gold CTA; CR-55 end-session control (`KẾT THÚC` / `NỘP BÀI`); `ConfirmEndDialog` pattern; timed exam sitting has no gold
fills (N1); adult surfaces stay `brand`; `EXAM_HEADER_BRAND`; `pronunciation-recording` own panel; no new heavy deps
(tracing = canvas; Lottie player `@lottiefiles/dotlottie-react` already present - CR-82 adds only Lottie JSON assets, not a library).

---

## 20. Implementation map (for Tech Lead)

| File | Change |
|---|---|
| `tailwind.config.js` | `colors.navy/desk`, `fontFamily.letter`, timing functions, durations, keyframes (§4, §5.4) |
| `src/index.css` | Andika `@font-face`; new keyframes; `land-twinkle` 6.5s, `ambient-sparkle` 7s, `land-float` 7s (N2); reduced-motion block adds all new classes + `.tile-shake`, `.dart-arrow` |
| `src/lib/ui/tokens.ts` | `scene.*` additions, `material.*`, `TYPE_*_GEO` + `INK_*` + surface composites (F1), exam paper tokens, `CHIP_PAPER_*`, `GAP_INPUT_TOGGLE`, `FLASH_FLIP`/`FLASH_PANEL`, `TRACE_*`, `SPELL_*`, `WORD_CHIP`, `SENTENCE_GAP`, `DRAG_GHOST`, `FLASH_*`, `GOLD_HAIRLINE`; `CTA_GOLD_XL` re-materialized; `DISPLAY_GLYPH` -> alias of `TYPE_HERO_GLYPH_NAVY`; `toy.tints` removed; `HUB_ICON_TINTS` violet swap |
| `src/lib/ui/theme.ts` | `horizonGlow`, city/space recolor, `SCENE_BASE`, `scenePalette()`, `MASCOT_PALETTE` |
| `src/components/scene/LandScene.tsx` | layers, `variant`, `tone`, `journey`, `Moon`; fills from `scenePalette` (no literal hex) |
| `src/components/LandShell.tsx`, `src/App.tsx` | tone routing by band; hero on kid surfaces + GradeSelect + Auth; unknown-land runtime guard (N3) |
| `src/components/BatchScreen.tsx` | pass `journey`; chrome strip -> `material.chrome`; `KẾT THÚC` unchanged |
| `src/components/QuestionCard.tsx` | `material.board`, journey trail, board perch, **sheet perch sibling layer in the fixed sheet wrapper + overhang reserve** (F4), `onSubmitTracing`, `letter-tracing` case |
| `src/components/QuestionBanner.tsx` | speech tail + perch padding |
| `src/components/Mascot.tsx` | 6 poses; Lottie renderer (existing dotlottie player) + static SVG pose renderer; render-decision table §9.5; sizes; palette import; `data-mascot-renderer` |
| new `public/mascot/be-heo-{idle,thinking,greeting,happy,celebrating,encouraging}.json` | Lottie pose assets (Developer-phase asset production; static fallback rule §9.5) |
| `src/components/FeedbackPanel.tsx` | `mascotPlacement` prop (perch lives in QuestionCard, not here), per-kind headline map, streak chip |
| `src/components/optionButtonStyle.ts`, `ExtraLetterQuestion.tsx`, phonics tiles | `material.tile*` |
| `src/components/ListeningFillBlankQuestion.tsx`, `ListeningSentenceFillBlankQuestion.tsx` | G1-2 Spell-it (cap §13.4) / Gap bank + typing toggle (§13.7) |
| new `src/lib/rounds/gapBankValidator.ts` (+ tests/fixtures), `spellEligibility()` | §13.4, §13.5 |
| `src/hooks/useDragTile.tsx` | slot targets (existing `targetAttr` API) |
| new `src/components/LetterTracingQuestion.tsx`, `src/lib/tracing/score.ts`, `src/data/tracing/strokes.ts` | C1 |
| new `src/components/FlashcardScreen.tsx` (+ local store `ea-flash-review:<gradeId>`); `StartBatchScreen.tsx` G1-2 tile tree per §14.2 (human-ruled; arena top-level, launch rows at `density.primaryMinH`); new `TRAIL_TILE_ARENA` token | C3 |
| `src/components/ExamScreen.tsx`, `ExamResult.tsx` | paper sheet, ring, navigator, flags, review sheet, verdict recolor, timer |
| `src/components/celebrations/*`, `LiveScore.tsx` | SVG reward chrome, star-fly, streak burst |
| `src/components/icons.tsx` | new: `IconChest`, `IconFlip` (if flip needs a distinct glyph), same stroke-2/round-cap/24-grid style |
| `src/lib/sfx.ts`, `public/sfx/*`, `public/attribution.json` | tiered sfx |
| `DESIGN_SYSTEM.md` | v5 section, palette list (remove indigo, add orange), materials, radius/elevation scales, exam paper pairs |

Icon inventory (all `aria-hidden`, paired with text): IconEye "Xem mẫu" 20px; IconRefresh "Tô lại"/"Ôn lại" 20px;
IconPencil "Tô tự động từng nét" 20px; IconCheck "Em nhớ rồi"/answered 12-20px; IconFlag "Đánh dấu" 18px;
IconHash "Tất cả câu" 20px; IconCheckCircle selected exam option 20px; IconStar reward 24-32px; IconSpeaker audio
18px; IconBook "Thẻ từ vựng" row + "Chọn từ" toggle 20-24px; IconPencil "Gõ tay" toggle 20px; IconClock timer 18px; IconChest (new) chest 64px.

---

## 21. Domain UX Benchmark

- Domain: children's early-literacy / EFL learning app (G1-5, Vietnam), with a formal test-prep sub-surface.
- Standard anchor: kid-app exemplars named in CR-82 (Khan Academy Kids, Duolingo ABC, Lingokids, Monkey Junior,
  ABC Kids) for play; IOE / printed test conventions for the exam; WCAG 2.2 AA + Nielsen 10 as the measurable floor.
- Why: no single battle-tested kids design system exists. Ruling: R-v5-09 - rubric constructed from the adjacent
  "kids -> delight/guidance" scales in the ux-designer skill §4.12 plus the competitor set the owner named.

**Target floor (declared before scoring): every item ≥4/5; any 3 must have a named gap + owner; no measured check fails.**

Rev 2 note (Design Lead): the 1-5 scores below are **design targets with cited evidence in this spec**, not
measurements. Visual and kid-behavior scores (delight, attention safety, aesthetic) are only confirmed by the
§23 screenshots, Tester observation and the human design gate.

### Nielsen 10

| Heuristic | Score | Evidence |
|---|---|---|
| Visibility of system status | 5 | journey trail + pan, progress ring, timer with live announcements, tracing stroke progress, flashcard counter + honest full/partial/zero exit copy, loading skeletons + distinct load-error states for exam/flashcards |
| Match with real world | 5 | ô li guide lines, paper exam sheet, flashcards, "put the word in the gap" gesture; Vietnamese kid voice ("em", "nhé") |
| User control & freedom | 4 | Tô lại, remove tile, swipe spring-back, Quay lại làm tiếp, KẾT THÚC everywhere. Gap: no undo after a flashcard decision (deliberate - low stakes; revisit in "Ôn lại N thẻ") |
| Consistency & standards | 5 | one material system, one feedback sheet, one end-session control, one dialog pattern; registers distinct by rule |
| Error prevention | 5 | Kiểm tra disabled until filled; review-before-submit lists unanswered; tracing start tolerance; direction lock on swipe |
| Recognition over recall | 4 | word bank and letter tiles for G1-2, legend in navigator, shortcuts listed. Gap: G1-2 Gap bank trades recall for recognition (OM-5); the peer typing toggle (R-v5-10) keeps a recall path one tap away |
| Flexibility & efficiency | 4 | G3-5 typing kept, exam keyboard shortcuts, tap and drag both. Gap: no shortcut to skip tracing demo for fast G2 tracers beyond first-touch dismiss |
| Aesthetic & minimalist | 4 | strong hierarchy, scrim, motion budget. Risk: hero scene density on 375px (OBJ-1) - verify in screenshots; fallback `strip` exists |
| Help users recover from errors | 5 | gentle wrong flow, assisted tracing, auto-complete after 3, load-error retry copy says what + what to do |
| Help & documentation | 4 | voice instructions, first-encounter demos, thinking-pose replay (G1-2). Gap: no parent-facing explainer for new modes (out of scope) |

### Kid-app criteria

| Criterion | Score | Evidence |
|---|---|---|
| Delight / wow | 5 | hero land, journey pan, perched character, toy materials, tiered rewards |
| Guidance for pre-readers | 5 | voice-first G1-2, demos, mascot speaking the banner, icon+text controls |
| No-shame feedback | 5 | slate wrong (exam too, D2 fixed), tracing completion acknowledged, no shake under G1-2 options |
| Motor-appropriate input | 5 | 76px floors, tolerance by grade, palm rejection, drag thresholds, tap fallback |
| Attention safety | 4 | ≤12 ambient nodes, slow periods, scrim, no text on scene. Gap: needs real-kid observation (Tester phase) |
| Band appropriateness | 5 | dusk/night, recall vs recognition, flashcard front/back reversal, thinking pose G1-2 only |
| Brand distinctiveness | 5 | navy/gold "golden horizon" signature; no indigo scatter; cover-the-logo test passes on scene + perch |
| Exam credibility | 5 | paper sheet, lettered options, navigator, review-before-submit, calm timer |

### Measured checks

| Check | Result |
|---|---|
| Contrast pairs computed | all listed token pairs and every listed composite usage (§5.3 matrix) pass their floor; rev 1 paper misbindings (1.05 / 1.07) removed (F1) |
| Keyboard path for every mechanic | yes (tracing via assisted alternative R-v5-07) |
| All states specified | tile, scene (incl. unknown land), tracing, spell/gap (incl. ineligible + typing mode + audio failure), flashcard (loading, empty, load error, offline, store unreadable, save failure, full/partial/zero exits, small/retry decks), exam (§7.2, §6.2, §12.7, §13.6-§13.7, §14.5, §10.4). Rev 1 claimed this without flashcard load-failure; corrected (F8) |
| Target sizes | all ≥ band floor (§18) |
| Text expansion headroom | 30% + 2-line wrap rule (§8.2) |
| Reduced-motion twin for every animation | yes (§17) |

Gaps vs benchmark: (1) Lottie motion quality depends on asset production (§9.5); any pose without an asset ships
static until delivered; (2) no adaptive handwriting model - tracing uses geometric tolerance, not stroke
recognition; (3) flashcards have local-only ratings and no spaced-repetition scheduling UI (R-v5-11); (4) no
parent explainer.

---

## 22. Visual quality bar (anti-slop + distinctiveness)

Anti-slop audit:
- [x] Not generic AI look - no purple/indigo gradients (purged §11), no interchangeable glass cards (glass only on chrome).
- [x] Distinctive decisions - golden horizon, perched speaker mascot, toy-block materials, paper exam.
- [x] Stock decoration - none; owned SVG art; emoji only as content illustration (pedagogical), reward chrome now SVG.
- [x] Hierarchy - hero/prompt/instruction three voices (§8).
- [x] Template rhythm - board-over-world (play), sheet-on-desk (exam), card-stack (flashcards), slate (tracing): four compositions.

Distinctiveness: signature = "Chân trời vàng" journey pan + perched Bé Heo; palette = VieSchool navy/gold + land
flags; type = Baloo 2 / Be Vietnam Pro / Andika chosen for kids + Vietnamese + letter formation; motion = every
animation tied to progress, reward or manipulation (§17).

---

## 23. Verification (maps to CR-82 acceptance B + C)

- Screenshots at 390x844 / 844x390 / 1280x800 for: G1 question (dusk), G4 question (night), feedback sheet with
  streak chip, tracing (mid-stroke + complete), Spell-it (dragging), Gap, flashcard front/back/summary, exam sheet,
  navigator dialog, review sheet, ExamResult; each paired with the v4 screenshot (side-by-side).
- Reduced-motion screenshots for the same set (static twins carry the same information).
- `[data-testid="mascot"]` count test (§9.3); dash guard + color-pairing guard green; impeccable detector clean
  (R-v5-05 narrow ignore only if needed).
- Synthetic-pointer Playwright: tracing pass + fail paths; Spell-it drag + tap + keyboard incl. repeated letters and
  the 6/7/8-letter boundaries (§13.4); Gap bank + "Gõ tay" toggle + tap-empty-gap-to-type; flashcard swipe + buttons
  + arrows, speaker tap never flips, swipe never flips; exam navigator jump + review-submit + time-up while review open.
- Render regression fixtures (rev 3, R2-3): G1-2 exam prompt on `EXAM_SHEET` has no light ink; G3-5 flashcard
  front word is navy-800; G1-2 flashcard back word is white with `FLASH_FACE_BACK` as its nearest painted ancestor;
  `tokens.test.ts` composite ink/size assertions (§5.3 rule 3).
- Hub (rev 3): G1-2 first paint shows Chơi, Luyện thêm, Đấu trường, Phần thưởng + Back; Luyện thêm has 3 or 4
  subtiles; `hub-tile-arena` controls `hub-panel-arena`; launch rows measure ≥76px at G1-2.
- Unit: `validateGapBank` fixtures 1-20 (§13.5 item 5); `spellEligibility`; `LandShell` unknown-land guard; flashcard
  counting (full/partial/zero, small deck N<10, retry deck, unrated current card).
- A11y: axe + role queries on each flashcard face (inactive face absent from the tree, Tab order per §14.4); focus
  after flip/advance/exit; flashcard load-error focus on heading.
- Feedback perch: screenshot with a long explanation scrolled inside the panel - perch stays fixed and unclipped;
  844x390 shows the inline mascot and exactly one `mascot` node.
- Mascot renderer: Playwright reads `data-mascot-renderer`; reduced-motion run must show `static` everywhere.
- Performance: hero scene on a throttled mid-tier Android profile keeps ≥50fps during ambient + pan (Chrome
  DevTools CPU 4x); no CSS filter on scene layers.

---

## 24. Open questions (rev 2 - honest status)

Resolved since rev 1:
- ~~Q1 OM-1..OM-6 picks~~ - human ruled (§2): OM-1 B, OM-2 A+B, OM-3 Lottie JSON now, OM-4 A, OM-5 both inputs
  for G1-2, OM-6 A. Nothing in this spec now proceeds on an unratified recommendation except where marked
  "pending BA" below.
- ~~Q2 R-v5-02 mascot rig~~ - approved for Lottie JSON now (§9.5).
- ~~Q5 flashcard store~~ (persistence part) - local-only in CR-82 (R-v5-11). Quest credit remains open (Q5b).
- ~~Q7 gap distractor guarantee~~ - replaced by the §13.5 validator path; eligibility is per item, Spell-it carries
  acceptance if no item validates (R-v5-08).

Still open:
- ~~Q3 G1-2 hub tree~~ - resolved by human ruling (rev 3): Đấu trường is its own top-level entry (R-v5-12).
- Q3b (BA, wording only, non-blocking) Update the PRD / `DESIGN_SYSTEM.md` §5 G1-2 first-paint budget wording to
  "≤4 mode decisions + Back navigation" (R-v5-14).
- Q4 (BA/Tech Lead) Tracing round composition (which round, how many items, G2 word-tracing stretch).
- Q5b (BA) Does a completed flashcard deck credit the daily quest (CR-27)? Default in CR-82: no.
- Q6 (Tech Lead) Andika subset size ≤60KB per file; else 700-only.
- Q8 (content) Sound files sourcing (CC0 vs commissioned) and one shared key.
- Q9 (Tester) Tracing tolerance calibration with real G1/G2 traces before go-live.
- Q10 (BA) Should the Gap input-mode choice (R-v5-10) persist per profile for parents, beyond the session?
  Default in CR-82: session only.
- Q11 (Tech Lead) Confirm `@lottiefiles/dotlottie-react` plays plain Lottie JSON; else package as `.lottie` (§9.5).
- **Implementation dependency (not a question): Lottie pose asset production** - six JSON files per §9.5, a
  Developer-phase task. Non-blocking: missing poses ship on the static SVG renderer and are logged in MEMORY.

---

## 25. Rulings index (this spec)

| ID | Ruling | Status |
|---|---|---|
| R-v5-01 | CR-82 B1 supersedes CR-79 owner depth ruling; mitigations OBJ-1 a-e (scene ambience ≥6s now enforced, §17); `strip` kept for revert | Designer, reversible; OM-1 B human-approved |
| R-v5-02 | Mascot rig = **Lottie JSON per pose in CR-82** + static SVG pose set as poster / reduced-motion / missing-asset fallback; same `Mascot` API | **Human-approved (rev 2)** |
| R-v5-03 | Exam interior = paper sheet; supersedes kids-UX R7 interior clause | **Human-approved (rev 2)** |
| R-v5-04 | City -> orange/navy; violet closed inventory (space rim/disc/glow/map card + one nebula); palette list remove indigo, add orange | **Human-approved (rev 2, OM-6 A)** |
| R-v5-05 | `ease-toy` overshoot only for press-release + snap; narrow `ignore-value` if detector flags | Designer |
| R-v5-06 | No mascot during exam sitting (intro/result only) | Designer, reversible |
| R-v5-07 | Tracing keyboard alternative = assisted stroke-step; assisted flagged out of mastery stats | Designer (a11y) |
| R-v5-08 | (rev 3) Gap word bank only on items passing the §13.5 validator (V0-V7 at build: exactly 3 normalized pairwise-distinct options, frame match via `sentencesForWord`/`blankOutWord`, reviewed topic allowlist + groups, audible contrast; V8 at play time); failing items typed-only; Spell-it is the guaranteed CR-82 drag surface; `audit-qb.mjs` is not the generated-bank validator | Designer + Tech Lead |
| R-v5-09 | Benchmark rubric constructed from kids delight/guidance scales + owner-named competitor set; scores are targets | Designer |
| R-v5-10 | **G1-2 Gap = word-bank drag primary + peer typed input on the same surface** ("Gõ tay" toggle + tap-empty-gap-to-type), child/parent chooses; G3-5 typing only; Spell-it unchanged | **Human ruling (rev 2, OM-5 custom)** |
| R-v5-11 | Flashcard ratings local-only (`localStorage`), silent session-memory fallback on save failure; no server store in CR-82 | Designer; Tech Lead may revisit in a later CR |
| R-v5-12 | G1-2 hub: **Đấu trường is its own top-level hub tile** (between Luyện thêm and Phần thưởng, `TRAIL_TILE_ARENA` "vs" styling); Phần thưởng rewards-only (rewards are outcomes of learning/testing, not a subject); Luyện thêm = 3 subjects + Ôn tập when present (≤4); flashcards inside Tiếng Anh | **RESOLVED - human ruling (rev 3)**; rev 2 T-A/T-B withdrawn |
| R-v5-13 | Type tokens split into color-free geometry + surface-bound ink + composites (refined by R-v5-16: sized geometry tokens, effective-surface pairing, narrowed enforcement) | Designer (F1) |
| R-v5-14 | G1-2 first paint = 4 mode decisions (Chơi, Luyện thêm, Đấu trường, Phần thưởng) + Back as navigation chrome; DESIGN_SYSTEM §5 wording updated accordingly, matching G3-5 | Designer; BA confirms wording (non-blocking) |
| R-v5-15 | Gap bank validator: exactly 3 normalized pairwise-distinct options; plausibility by frame match (`sentencesForWord`/`blankOutWord`) + reviewed `GAP_BANK_TOPICS` groups; audible contrast (no homophones, Levenshtein ≥2); fixtures 1-20 | Designer (R2-1) |
| R-v5-16 | Pairing follows the effective painted surface (nearest ancestor-or-self background), not any ancestor; sized geometry tokens, no appended size/color on composites; enforcement claims narrowed + render regression fixtures | Designer (R2-3) |

---

## 26. Revision 2 changelog (Design Lead r1 findings + human rulings)

| Section | Change | Driver |
|---|---|---|
| Header | status -> revision 2; §13.5 cross-ref fix | review |
| §2 OBJ-1 | `SCENE_SCRIM` -> `scene.scrim`; ambient ≥6s promise scoped to scene and made true | rename, N2 |
| §2 OM-1..OM-6 | human rulings recorded; OM-3 switched to Lottie now; OM-5 custom dual input; OM-6 violet inventory closed and aligned with §5.1/§11 | human rulings |
| §3 | geometry/ink separation rule; gold prohibition scoped to timed sitting | F1, N1 |
| §5.3 | rewritten: `*_GEO` + `INK_*` + surface composites, banned-pairing rules, guard test, actual-usage contrast matrix | F1 |
| §5.4 | CSS mascot keyframes dropped (motion lives in Lottie); twinkle/sparkle/float periods raised | OM-3, N2 |
| §5.5 | sheet reserve + perch overhang; perch outside `FeedbackPanel`; `mascotPlacement` prop | F4 |
| §6.2 | unknown-land runtime guard spec replaces the false `getLand` claim; layer motion timings | N3, N2 |
| §8.3 | `TYPE_LETTER_GEO` reference | F1 |
| §9.2 | pose table re-specified as Lottie primary + static SVG pose; finite loops | OM-3 |
| §9.3 | sheet perch moved to a non-clipping sibling layer of QuestionCard's fixed wrapper; geometry, clearance, scroll, unmount, short-landscape (JS, one node) rules | F4 |
| §9.5 (new) | Lottie file list, asset requirements, renderer decision table, performance, non-blocking missing-asset rule + MEMORY logging | OM-3 / R-v5-02 |
| §10.1-§10.4 | paper prompt composites; gold scoped to untimed practice/intro/result; ExamResult composite | F1, N1 |
| §12.3 | tracing exhibit word composite + decoration contrast | F1 |
| §13.1 | dual input note; Spell-it as guaranteed drag carrier | R-v5-10, F2 |
| §13.2 | slot width rule, letter composites, `GAP_INPUT_TOGGLE` | F7, F1, R-v5-10 |
| §13.4 | deterministic per-grade cap (G1/G2 ≤6 letters), eligibility function, per-instance tile ids, boundary tests | F7 |
| §13.5 | rewritten: coherent plausible distractors, audio-identity uniqueness, validator V1-V6, failure rule, fixtures, coverage sweep; `audit-qb.mjs` no longer claimed | F2 |
| §13.7 (new) | G1-2 Gap dual-input spec | R-v5-10 |
| §14.1-§14.5 | paper-safe front word; unscored statement; explicit G1-2/G3-5 hub tree with counts and aria-controls; deck sizing, small/retry decks; local-only persistence; one flip path DOM, speaker sibling, inert inactive face, focus rules; load error vs empty, offline, store/save failure; full/partial/zero exit copy and counting; paper chips/buttons inside paper panels | F3, F5, F6, F8, F1 |
| §15.4 | gold wording scoped | N1 |
| §16.2 | streak ring rendered in the perch layer | F4 |
| §17 | twinkle/sparkle/float timings; Lottie mascot rows; flip unmount | N2, OM-3, F5 |
| §18 | contrast claim scoped to listed usages + guard; targets, live regions, hidden-content rows | F1, F5, F7, F8 |
| §19 | change/preserve rows for type split, Lottie, perch, hub tree, gold scope | all |
| §20 | implementation map updated (tokens, guard, perch, Lottie assets, validator, eligibility, flashcard store, hub tree) | all |
| §21 | scores labelled as targets; measured-check rows corrected; gaps updated | review note, F8 |
| §23 | new verification items (validator fixtures, spell boundaries, flashcard a11y, perch scroll, renderer) | F2-F8 |
| §24-§25 | open questions re-statused; R-v5-02/03/04 approved, R-v5-08 revised, R-v5-10..13 added | human rulings |

### Revision 3 changelog (Design Lead r2 findings R2-1..R2-3 + human ruling on R-v5-12)

| Section | Change | Driver |
|---|---|---|
| Header | status -> revision 3 | review r2 |
| §5.3 | sized geometry tokens (`TYPE_CARD_GLYPH_GEO`, `TYPE_IPA_GEO`, `TYPE_LETTER_TILE/CARD/WORD_GEO`) replace size-appended usages; size-less `TYPE_LETTER_GEO` and `TYPE_HERO_GLYPH_PAPER` removed; new inks `INK_NAVY_MUTED`, `INK_NAVY_IPA`; new composites `TYPE_CARD_GLYPH_PAPER`, `TYPE_IPA_NAVY`, `TYPE_LETTER_TILE_NAVY`, `TYPE_LETTER_CARD_NAVY`, `TYPE_LETTER_WORD_PAPER`; rule 1 bans appended size/color and defines component-token coexistence; rule 2 pairing follows the effective painted surface (flashcard back face and `EXAM_QNUM` legal; blanket paperSlate ban withdrawn); rule 3 enforcement narrowed (token unit test, same-element scanner only, required render regression fixtures); matrix rows migrated | R2-3 |
| §8.3, §12.3, §13.2, §14.1, §15.1 | stale/undefined references migrated (`TYPE_INSTRUCTION` -> `TYPE_INSTRUCTION_NAVY`, letter/glyph/IPA composites); exam ring label is a named token `EXAM_RING_LABEL` at 14px beside the ring | R2-3 |
| §13.4-§13.5 | bank = exactly 3 options, never padded; content rule = plausible in isolation yet contradicted by the audio; normalization defined; candidate pool from reviewed `GAP_BANK_TOPICS` (+ optional groups) with seeded generator walk; validator V0-V8 (shape/minimum size, audio identity, frame match via existing `sentencesForWord`/`blankOutWord` covering class + article + mass/countable, reviewed group, pairwise distinctness incl. normalized/plural/homophone, audible contrast Levenshtein ≥2, stem leak, audio required, play-time audio availability); 20 fixtures, one or more per rejection type | R2-1 |
| §13.7 | audio-failure rule renumbered V8 | R2-1 |
| §14.2 | R-v5-12 resolved by human ruling: Đấu trường is its own top-level hub tile (`TRAIL_TILE_ARENA`, "vs" emblem) between Luyện thêm and Phần thưởng; Phần thưởng rewards-only; Luyện thêm = 3 subjects + Ôn tập (≤4); T-A/T-B withdrawn; first-paint accounting (R-v5-14); region ids + test impact; `flashcards-start` and sibling launch rows at `density.primaryMinH` (76 G1-2) | human ruling, R2-2 |
| §14.5 | §14 touch-floor sweep: all flow actions at 76/64, panel `BTN_SECONDARY_PAPER` overridden to the floor, speaker + chrome KẾT THÚC at 48 | R2-2 |
| §18-§20, §23 | target inventory, change/preserve, implementation map and verification updated (hub, floors, render fixtures, validator fixtures 1-20) | R2-1..R2-3 |
| §24-§25 | Q3 resolved, Q3b wording follow-up; R-v5-08 tightened; R-v5-12 RESOLVED; R-v5-13 refined; R-v5-14..16 added | human ruling, review r2 |
