# Design Brief + Interaction Specification - Visual Content Upgrade

- **Project:** student-self-practice-web (brownfield, strangler-fig)
- **Phase:** Designer (PM -> BA -> **Designer** -> Tech Lead -> Dev -> Tester -> Deployer -> PM)
- **Date:** 2026-09-29. **Revision:** d1.
- **Binding inputs:** `docs/sdlc/prd.md` r3 (US-1..US-11, BR-01..BR-16, D-1..D-11, A-06 amended, A-09), `docs/sdlc/constitution.md` (non-negotiables 1-9, checks C2-C6, SAFE), `docs/sdlc/advisory-log.md`, `docs/sdlc/discovery-baseline.md`, `docs/sdlc/project-plan.md`, `docs/research-visual-content.md` section 5.
- **Code read (as-is, commit under work):** `src/components/{ImageChoiceQuestion,ListeningImageChoiceQuestion,CountingImageQuestion,DescribeAndChooseImageQuestion,PicturePairMatchingQuestion,FeedbackPanel,Mascot,QuestionCard,GradeSelect,StartBatchScreen,RoundSummary,BatchSummary,BatchScreen,optionButtonStyle,actionButtonStyle}.tsx|ts`, `src/App.tsx`, `src/index.css`, `tailwind.config.js`, `src/test/setup.ts`, `src/components/*.test.tsx`, `e2e/utils/{mascot-flow,pair-matching-flow,practice-flow,batch-flow,viewport-flow}.ts`.
- **Fidelity:** `reference-only` (no Figma). The UX anchor is the existing app visual language (Tailwind, sky/amber/emerald/rose palette, rounded-2xl, 76 px touch targets) plus research section 5.
- **Artifact language:** English. Vietnamese UI strings are quoted exactly and are normative. No em-dash or en-dash characters appear in this file (constitution #8).

Precedence: where this spec and the PRD differ, the PRD wins unless a `Ruling:` here says the human approved a change. Every design decision carries AC ids; section 11 is the full trace.

---

## 1. Design Brief

| Field | Value | Source |
|-------|-------|--------|
| Product | Responsive web app, single-page, no accounts, Vercel static | discovery-baseline |
| Core tasks | (1) recognise a word from a picture, (2) choose the right picture for a heard word, (3) feel rewarded after answers and Rounds | US-1, US-2, US-3, US-5, US-9, US-10 |
| Primary user | học sinh lớp 2, 7-8 years old, early reader, low tech literacy, phone or tablet, often without an adult | constitution #1, PRD section 2 |
| Secondary user | phụ huynh/giáo viên: trust in content and sources (Credits) | US-4, US-7 |
| Context of use | Short self-practice sessions (Batch = 4 Rounds, 5:00 timer per Round); phone portrait and landscape, tablet | PRD F-13 viewport list |
| Accessibility needs | Large targets, large pictures, reduced motion honoured, existing screen-reader contract kept (A-04 B), option naming deferred (CR-02) | constitution #1, #6, NFR-7 |
| Locale | vi-VN UI copy, English vocabulary | constitution #9 |
| Domain | Education / children vocabulary. Red lines: no outbound links, no unreviewed photos, no distracting motion in answer options, one picture = one meaning | constitution #1, #5, SAFE, fault catalog |
| Brand personality | Friendly, calm, encouraging. Existing brand assets: 🐷 mascot, Tailwind palette above. No new colors, fonts or decoration are introduced by this feature | Mascot.tsx, research 5.1 |
| Dark mode | Not required (none today) | as-is |
| Stack | React 18 + Tailwind 3.4, `@lottiefiles/dotlottie-react` (lazy), assets in `public/` | PRD DEP-1, A-07 |

### 1.1 Domain UX benchmark (rubric declared before design)

- Anchor: research section 5 principles R5.1..R5.7 (simplicity, one style per view, >= 96 px pictures, highlight active element, purposeful animation, glanceable single meaning, no seductive details), plus the app's own v9/v10 conventions (76 px touch targets, `[@media(max-height:420px)]` compaction, `motion-reduce:animate-none`).
- Scored checks (Design Lead verifies): each R5.x cited in at least one decision below; zero new CSS animation without a `motion-reduce:` pair (C6); zero Lottie in grid/repeated contexts (C5); all new text/background pairs >= 4.5:1 (section 7.3); every interactive element has default, hover, focus, disabled, loading and error states where applicable (section 10).

### 1.2 Deliverable coverage (ux-designer 8 deliverables, brownfield scope)

| Deliverable | Where | Note |
|-------------|-------|------|
| Personas / JTBD | 1 | Unchanged personas; brief table suffices |
| Information architecture | 5.6 | Only change: new Credits screen off GradeSelect |
| Flows | 5, 6 | Question flows unchanged; visual states per screen |
| Wireframes | 5 | Textual per-screen specs (brownfield, layout kept) |
| Tokens | 3.5, 9 | No new tokens except 1em picture box and Lottie crossfade |
| Interaction states | 3.3, 10 | Render-mode state machine + component state matrix |
| A11y spec | 7 | |
| Microcopy | 5.6 | All strings from PRD US-7; no new copy invented |

---

## 2. Advisory: Objections, Options Matrices, Rulings

### DS-1: What shows while the Lottie player lazy-loads (AC-2.1, AC-2.5, AC-2.8)

| Option | Strengths | Weaknesses | Risk | Domain fit |
|--------|-----------|------------|------|------------|
| A. Skeleton box (soft pulse) until first frame | No style swap | Child sees no picture for up to 2000 ms cold (NFR-1); needs a new pulse animation | Prompt unreadable during load | Poor (R5.6 glanceable) |
| **B. Twemoji SVG poster immediately, canvas crossfades in on first frame (150 ms), poster removed** | Picture readable from first paint; same poster is the failure fallback; no layout shift (same 1em box) | Visible art-style change Twemoji -> Noto once per mount | Low | Good |
| C. Render nothing until ready | Simplest | Blank prompt, jarring pop-in | High | Poor |

- **Recommendation: B.** `Ruling: Designer, B` (UX detail inside PRD bounds; data-emoji-mode is `lottie` from mount per AC-2.5, the poster is a presentation detail). Reversible by human at the design gate.

### DS-2: Loop vs play-once for Lottie (AC-2.1)

- **Objection:** for 7-8 year olds, a picture that loops forever beside 4 text options competes for attention while the child reads (R5.5). The reward accents (✨, 🎉) also loop while the child reads the explanation.
- **Evidence:** research 5.5 ("chuyển động liên tục gây phân tán"); constitution #5 (animation only where purposeful).

| Option | Strengths | Weaknesses | Risk |
|--------|-----------|------------|------|
| **A. Autoplay + loop forever (PRD AC-2.1 as written)** | Matches binding AC; Noto clips are short, subtle, seamless loops; acts as an attention hint on the prompt (R5.5 d) | Continuous motion during reading | Mild distraction |
| B. Loop 3 cycles then hold the last frame | Delight then calm | Contradicts AC-2.1 "looping"; needs PRD amendment | Low |
| C. Play once | Calmest | Weakest reward feel; contradicts AC-2.1 | Low |

- **Recommendation for this run: A** (binding). Designer preference for a later CR: B. `Ruling: A per PRD AC-2.1 (binding); objection logged for the human as a candidate CR after field feedback.` EmojiVisual therefore has no loop prop.

### DS-3: A photo fails at runtime inside the all-or-nothing ListeningImageChoice set (AC-5.3, AC-5.4, BR-09)

| Option | Strengths | Weaknesses | Risk |
|--------|-----------|------------|------|
| A. Only the failed option falls back to SVG | No extra prop | Board becomes photo + emoji mixed, violating the intent of BR-09 and R5.2 | Rare but real |
| **B. Group fallback: any option photo error switches all 4 options to SVG** | Keeps one style per view | Adds `onImageError` prop to EmojiVisual and one state flag in the component | Low |

- **Recommendation: B.** `Ruling: Designer, B` (does not change any AC outcome; AC-5.4 happy paths unchanged). Tech Lead may object at ADR time.

### DS-4: ImageChoice prompt on landscape phones (max-height 420 px) (AC-1.8, NFR-7)

- **Objection:** `image-choice` becomes live in Round 1 (US-9). At 667x375 / 844x390 the 96 px prompt + 4 option buttons (2x2, 76 px min) + FeedbackPanel + "Câu tiếp theo →" exceed the viewport; the existing v9 compaction pattern (`[@media(max-height:420px)]`) shrinks other elements but not this prompt.

| Option | Strengths | Weaknesses | Risk |
|--------|-----------|------------|------|
| **A. Keep 96 px at every viewport** | Matches NFR-7 "prompt 96 px" and AC-1.8 literally | One scroll needed after answering in landscape | Low; existing specs allow one reasonable scroll |
| B. `[@media(max-height:420px)]:text-6xl` (60 px) on the prompt container | Consistent with v9 compaction; less scrolling | Deviates from NFR-7 at that viewport; needs human approval | Low |

- **Recommendation: B**, because the v9 compaction precedent exists for exactly this tight-height problem. `Ruling: human approved B at the design gate, 2026-09-29.` PRD patched: AC-1.8 and NFR-7 now state 96 px default / 60 px at viewport height <= 420 px.

### DS-5: Where the Credits link lives (AC-7.1)

- The dispatch brief suggested "footer of HomeScreen / settings". The app has no settings screen; the home screen is `GradeSelect` (`App.tsx` initial `screen = 'grade-select'`). PRD D-3 fixes the entry as a button on GradeSelect "below the grade cards" and forbids it elsewhere.
- `Ruling: follow PRD D-3 (GradeSelect only, below the grade cards).`

### DS-6: Credits button prominence and target size (AC-7.1, AC-7.10)

| Option | Strengths | Weaknesses |
|--------|-----------|------------|
| A. Full 76 px amber/sky card like grade cards | Largest target | Competes with the only child task on the screen (choose grade); children tap it by mistake |
| **B. Secondary pill identical to the existing "← Quay lại chọn lớp" button (StartBatchScreen), ~52 px tall** | Existing pattern; clearly secondary; >= 44 px WCAG; has `focus:ring-4` (AC-7.10) | Below the 76 px child convention |

- **Recommendation: B.** `Ruling: Designer, B` (parent-facing secondary control; exception to 76 px justified by prominence hierarchy, still >= 44 px).

### DS-7: Photo legibility at 96 px (AC-5.7, RK-8)

- **Objection:** a photo in a 96 px box carries less detail than the same box as an emoji; at 16-20 px in FeedbackPanel a photo is barely legible (accepted in RK-8 by ruling D-11).
- **Options:** A keep AC-5.7 box (binding); B future CR "photo prompt box 128 px". `Ruling: A for this run; B logged as a future CR idea, not approved.` The curator checklist (section 6.1, P-11) mitigates by demanding thumbnail legibility.

### DS-8: Mixed styles on one screen after answering (BR-09, D-11, A-03)

- Accepted mixes, logged not changed: (a) Noto animated prompt/accent next to Twemoji static pig (D-2, A-03); (b) FeedbackPanel photo of the correct word while ListeningImageChoice options above are SVG (D-11 + AC-10.5). Never mixed: photo + emoji inside one option set or one repeated/pair board (BR-09). `Ruling: accepted by human rulings D-2, D-11.`

### DS-9: Session circuit breaker for Lottie failures (AC-2.8, NFR-1)

- If the player chunk or WASM fails once, every later animated EmojiVisual would show a poster then time out again. **Recommendation:** after the first player-level failure (chunk import error or WASM load error, not a single JSON 404), the session stops attempting Lottie; later animated EmojiVisuals resolve directly to `svg`. `Ruling: Designer, recommended; Tech Lead confirms in ADR.` Does not affect AC-5.2 (defined under normal network).

### DS-10: Photo eligibility by word type (BR-11, SAFE)

- Photos of feelings, actions, numbers, colors and weather phenomena are ambiguous or show identifiable people. **Recommendation:** curators approve photos only for concrete, picturable nouns (animals, food, objects, vehicles, places, clothes, body parts shown without a face, occupations only via tools/uniform without an identifiable face). `Ruling: curator guideline (section 6.1 P-2), not a code gate; human may override per word.`

### DS-11: Fact correction for the dispatch brief

- The brief assumed "~48 px" touch targets. Code shows **76 px** minimum (`min-h-[76px]` in `optionButtonStyle.ts`, `actionButtonStyle.ts`, pair tiles, extra-letter tiles, per plan.md v9 "Touch Target Sizing"). This spec keeps 76 px everywhere it exists.
- The dispatch cited "BR-04" for the photo/emoji mix rule; the PRD rule is **BR-09** (BR-04 is the fallback chain). Both are traced correctly below.

### DS-12: Screen-reader exposure of the new FeedbackPanel picture (AC-1.3, AC-10.4)

| Option | Strengths | Weaknesses |
|--------|-----------|------------|
| **A. No aria-hidden wrapper; the sr-only emoji is read ("Từ đúng là: cat, cat face")** | Same A-04 rationale (emoji names are meaningful); answer is already revealed, so no leak | Slight verbosity |
| B. Wrap in `aria-hidden="true"` like the question prompts | Terser | Hides useful reinforcement |

- **Recommendation: A.** `Ruling: Designer, A.` Question-body sites keep their existing `aria-hidden` wrappers unchanged (CR-02 owns option naming).

---

## 3. EmojiVisual component contract (single render path; BR-01..BR-04, BR-06, BR-09)

### 3.1 Props

| Prop | Type | Default | Rule | AC |
|------|------|---------|------|----|
| `emoji` | `string` | required | One emoji (may be a ZWJ/keycap sequence). Used for `data-emoji-visual`, the text layer and the emoji key | AC-1.1 |
| `count` | `number` | `1` | Integer >= 1. `count > 1` = repeated context: renders `count` pictures, one text node `emoji.repeat(count)`; **forces** no Lottie and no photo regardless of other props (defensive BR-03/BR-09) | AC-1.2, AC-2.3, AC-5.5 |
| `animated` | `boolean` | `false` | Only single-image contexts pass `true` (table 3.6) | AC-2.1..AC-2.3, C5 |
| `imageUrl` | `string` | undefined | Only passed where BR-09 allows; call sites resolve it through `getWordVisual(wordId)`, never by emoji | AC-5.1, AC-5.6 |
| `variant` | `'inline' \| 'block'` | `'inline'` | Layout only. Size always = 1em of the container font-size (PRD 9.1). `block` = exact 1em flex box with no line box (prompt, listening option); `inline` = sits in text flow (feedback line, repeated rows, tiles, mascot) | AC-1.8, AC-10.2 |
| `loading` | `'eager' \| 'lazy'` | `'eager'` | Applies to `image` mode only. ListeningImageChoice options pass `lazy` | AC-5.7 |
| `onImageError` | `() => void` | undefined | Fired once when the photo fails (DS-3 group fallback) | AC-5.3 |
| `className` | `string` | undefined | Spacing utilities only (for example `ml-[0.3em]`); never size, opacity or display | AC-10.2 |

"Size variant" requested by the dispatch is realised as **container font-size** (the size token lives on the call site, table 3.5) plus `variant` for layout. EmojiVisual never sets a font-size itself, so native fallback text renders at exactly the size it replaces (AC-1.7).

### 3.2 Emoji key and asset URLs (BR-06, BR-07, A-07)

- Key = Twemoji file-name rule: lowercase hex code points joined by `-`; if the sequence contains no U+200D (ZWJ), strip every U+FE0F first; if it contains a ZWJ, keep FE0F. Examples (AC-1.6): 🐱 `1f431`, 🐿️ `1f43f`, ✈️ `2708`, 1️⃣ `31-20e3`, 🔟 `1f51f`, 🧑‍⚕️ `1f9d1-200d-2695-fe0f`, 🧑‍🍳 `1f9d1-200d-1f373`.
- SVG URL `${import.meta.env.BASE_URL}emoji/svg/{key}.svg`; Lottie URL `${BASE_URL}emoji/lottie/{key}.json`. Same-origin only.
- `hasLottie(key)` reads a bundled key set generated by `npm run assets:emoji` (no network probe, AC-2.2). The set is small (~130 short strings) and may live in the entry chunk (AC-2.10 budget).

### 3.3 Render-mode state machine (BR-03, BR-04)

Initial mode, computed at mount (pure function, unit-testable):

1. `image` if `imageUrl` is set and `count === 1`.
2. else `lottie` if `animated && count === 1 && hasLottie(key) && !prefersReducedMotion && !lottieDisabledForSession` (DS-9).
3. else `svg`.

Transitions (one-way, never back up the chain within one mount):

| From | Event | To | AC |
|------|-------|----|----|
| `image` | photo `error` | `lottie` if rule 2 holds, else `svg`; also call `onImageError` | AC-5.3, AC-10.5 |
| `lottie` | chunk import fails, WASM/JSON load error, or not ready within **2500 ms** | `svg` (no console error, no unhandled rejection; errors caught by an error boundary + player error callback) | AC-2.8 |
| `lottie` | `prefers-reduced-motion` changes to `reduce` | `svg` (player unmounted) | AC-2.7, C6 |
| `svg` | any img `error` (for `count > 1`: first error) | `native` | AC-1.7 |
| `native` | - | terminal | AC-1.7 |

`data-emoji-mode` always reflects the current mode. `prefersReducedMotion` comes from `matchMedia('(prefers-reduced-motion: reduce)')`, subscribed for changes; when `matchMedia` is missing (jsdom) it is treated as `no-preference`.

### 3.4 DOM per mode (hidden-text contract; BR-02, A-04 B)

Root element: `<span data-emoji-visual={emoji} data-emoji-mode={mode}>` with `position: relative` (anchors the sr-only child). Recommended extra hook: `data-emoji-ready="true"` once the visible layer has loaded (poster or canvas first frame, photo `load`, svg `load`); it is additive and lets e2e wait without sleeps.

| Mode | Children (in this order) | Root classes |
|------|--------------------------|--------------|
| `svg`, count 1 | `<img src=svgUrl alt="" aria-hidden="true" draggable="false" decoding="async" class="block h-full w-full select-none">` + text span | inline: `relative inline-block h-[1em] w-[1em] align-[-0.125em] leading-none`; block: `relative mx-auto flex h-[1em] w-[1em] items-center justify-center leading-none` |
| `svg`, count N | N x `<img ... class="inline-block h-[1em] w-[1em] mx-[0.05em] align-[-0.125em] select-none">` + one text span | `relative inline` (pictures wrap like glyphs; container `leading-*` still applies) |
| `lottie` | poster = the svg-mode img (until ready) + `<span aria-hidden="true" class="absolute inset-0 opacity-0 transition-opacity duration-150">` holding the dotLottie canvas (100% x 100%), switched to `opacity-100` on first frame, then the poster is unmounted + text span | same as svg count 1 |
| `image` | `<img src=imageUrl alt="" aria-hidden="true" loading={loading} decoding="async" class="block h-full w-full object-contain select-none">` + text span | same as svg count 1 |
| `native` | text span only, now visible | `relative inline-block leading-none` (no fixed box; glyph at container font-size) |

Text span (exactly one per EmojiVisual, all modes):

- Content: exactly `emoji.repeat(count)` as a single text node, nothing else (no ASCII, no spaces; F-15, AC-1.3, AC-10.4).
- In `image`, `lottie`, `svg`: `class="sr-only"` = Tailwind's built-in utility (`position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border-width:0`). Do **not** use width/height 0, `clip-path` only, `display:none`, `visibility:hidden`, `opacity:0`, the `hidden` attribute or `aria-hidden` on the span itself.
- In `native`: the same element (same React key, so the same DOM node) swaps `sr-only` for `inline-block leading-none`.
- Why it keeps existing tests green: testing-library `getByText('🐱')` / `getByText('🐱🐱🐱')` match the span's own text node; `toHaveTextContent` on option buttons and `mascot` reads `textContent`; jest-dom `toBeVisible` passes (no display/visibility/opacity/hidden); Playwright `toBeVisible` passes because the 1x1 px box is non-empty (RK-3); `innerText` (batch-flow.ts:204, mascot.spec.ts:63-66) includes clipped-but-rendered text; `extractRevealedWord` ignores it (no ASCII).
- Images, poster and canvas wrapper are `aria-hidden="true"` with `alt=""` (AC-1.1, AC-5.7). No `title` attribute (would add a tooltip and an accessible description).

### 3.5 Sizing tokens per context (AC-1.8, AC-3.2, AC-10.2)

The size token is the call site's existing font-size class; EmojiVisual renders a 1em box. Current values read from code:

| Context | Site (current code) | Container class today | Computed px (normal / `max-height:420px`) | variant | count | animated | photo |
|---------|---------------------|-----------------------|-------------------------------------------|---------|-------|----------|-------|
| Question prompt, large | `ImageChoiceQuestion.tsx:20` | `mb-3 text-8xl` (aria-hidden div) | 96 / 96 (60 if DS-4 B approved) | block | 1 | true | yes, eager |
| Listening option | `ListeningImageChoiceQuestion.tsx:53` | `text-6xl` span in option button | 60 / 60 | block | 1 | false | all-or-nothing, lazy |
| Counting prompt (`image-to-count`) | `CountingImageQuestion.tsx:35` | `mb-3 text-6xl leading-relaxed` | 60 / 60 | inline | N | false | no |
| Counting option (`count-to-image`) | `CountingImageQuestion.tsx:51` | unsized span inside button `text-2xl` | 24 / 24 | inline | N | false | no |
| Describe option | `DescribeAndChooseImageQuestion.tsx:59` | `text-4xl leading-relaxed` span | 36 / 36 | inline | N | false | no |
| Pair picture tile, small | `PicturePairMatchingQuestion.tsx:87` | tile button `text-2xl` | 24 / 24 | inline | 1 | false | never (D-9) |
| Feedback inline picture | `FeedbackPanel.tsx:37` "Từ đúng là:" `<p>` | `text-xl` / `text-base` | 20 / 16 | inline | 1 | true | yes, eager |
| Mascot inline (pig + ✨) | `Mascot.tsx:45` via FeedbackPanel | `text-2xl` / `text-lg` | 24 / 18 | inline | 1 | pig false, accent true | never |
| Mascot block (pig + 🎉 reward, greeting pig) | `Mascot.tsx:46` via StartBatch, RoundSummary, BatchSummary | `text-5xl` | 48 / 48 | inline | 1 | pig false, accent true | never |

No container class changes except those listed in section 9. Because every picture is exactly 1em and glyphs were ~1em, no layout shift beyond sub-pixel line-box differences.

### 3.6 Animation eligibility by call site (BR-03, A-03, C5)

`animated={true}` appears in exactly three places: ImageChoice prompt, FeedbackPanel picture, Mascot accent. Every other site passes nothing (default `false`); grid/repeated sites additionally have `count > 1` or no `animated` prop. Grep check for C5: `animated` appears only in `ImageChoiceQuestion.tsx`, `FeedbackPanel.tsx`, `Mascot.tsx`.

---

## 4. Wiring and resolution per site (BR-05, A-06 amended)

| Site | emoji source | imageUrl source |
|------|--------------|-----------------|
| ImageChoice prompt | `question.emoji` | `getWordVisual(question.wordId)?.imageUrl` |
| ListeningImageChoice option i | `question.options[i]` | only if all four `getWordVisual(optionWordIds[k])?.imageUrl` exist and no option has reported `onImageError`; then `...[i].imageUrl`, else undefined for all four |
| Counting prompt / options, Describe options | `option.emoji` with `count={option.count}` | none |
| Pair picture tile | `tile.label` (tiles with `tileType === 'picture'`) | none; word tiles stay plain text |
| FeedbackPanel picture | `picture.emoji` from QuestionCard | `picture.imageUrl` from QuestionCard (`getWordVisual(correct wordId)`, US-10 table) |
| Mascot | literal 🐷, ✨, 🎉 | none |

FeedbackPanel does no lookup (presentational). QuestionCard builds `picture` only for the five "yes" kinds of the US-10 table.

---

## 5. Per-screen visual spec

### 5.1 Round 1 (extra-letter + shuffled image-choice; US-9, AC-2.4, AC-9.1, AC-9.4, AC-9.5)

- **Round composition (AC-9.1):** the child sees 10 questions per Round 1 batch, mixed: 7 spelling (extra-letter) and 3 picture questions (image-choice), in a seeded random order (D-10 A). The round title stays "Vòng 1: Bắn chữ cái thừa". No new screens; the same QuestionCard/FeedbackPanel/Next-question flow applies to both kinds.
- **Score and summary flow (AC-9.5):** image-choice answers feed the same live-score counter and FeedbackPanel as extra-letter answers. After question 10 the RoundSummary screen shows as before; "Vòng tiếp theo →" starts Round 2. Nothing in the Round 1 score or summary visuals changes.
- **Extra-letter question:** unchanged before answering (no picture exists in its body). After answering, FeedbackPanel shows the picture (5.4).
- **Image-choice question:** layout unchanged: instruction "Từ nào đúng với hình này?" (text-xl sky-700), prompt, then the existing 4 **text** option buttons (`grid-cols-1 sm:grid-cols-2 gap-4`, `getOptionButtonClassName`). Only the prompt glyph becomes `<EmojiVisual variant="block" animated imageUrl=... />` inside the existing `mb-3 text-8xl` aria-hidden div, horizontally centered (`mx-auto`); the prompt container gains `[@media(max-height:420px)]:text-6xl` (60 px) per DS-4.
  - Prompt appearance: photo (object-contain, no border, no shadow, no rounded crop so the object is never clipped) or Noto animation (loop) or Twemoji SVG.
  - After answering: the prompt keeps playing (it is the reward-moment picture; FeedbackPanel shows no second picture for image-choice, US-10 table), mascot ✨ may animate: 2 players max (A-09).
  - The `Câu x/10` header and `data-question-kind="image-choice"` are unchanged.

### 5.2 Round 2 ListeningImageChoice options (US-5, AC-5.4, AC-2.3)

- Keep the current grid: `grid grid-cols-1 gap-4 sm:grid-cols-2`, 4 buttons, `getOptionButtonClassName` (76 px min height, border-4, rounded-2xl, p-5). Picture sits **inside** the button, centered, replacing the glyph in the existing `text-6xl` aria-hidden span: `<EmojiVisual variant="block" imageUrl=... loading="lazy" />`. Button height stays 108 px (60 + 2x20 padding + 2x4 border).
- **All-or-nothing:** all four photos or all four Twemoji SVGs, decided per question (4.) and kept consistent on runtime failure (DS-3). Never animated.
- Answered states keep the existing styling: correct `border-emerald-500 bg-emerald-50`, chosen wrong `border-rose-500 bg-rose-50`, others `opacity-50` (applies to the picture too; text layer opacity is inherited from an ancestor, never set to 0 on the span, so AC-1.3 holds).
- "🔊 Nghe" / "🔁 Nghe lại" stay native text (BR-01 a).

### 5.3 Round 4 pair-matching tiles (AC-1.4, AC-5.5, D-9)

- Picture tiles: `<EmojiVisual emoji={tile.label} />` at 24 px inside the unchanged tile button (`min-h-[76px] text-2xl p-4 border-4 rounded-2xl`). Word tiles: unchanged plain text.
- Tile state colors (pending amber, wrong-flash rose, matched emerald) unchanged. Twemoji SVG only; no photo; no animation.
- DescribeAndChoose options (Round 4) and Counting (not live) repeated pictures: N Twemoji SVGs, same sizes, wrap inside the option at 390 px and 320 px without horizontal overflow (inline flow).

### 5.4 FeedbackPanel (US-10, AC-10.1..AC-10.6, AC-3.2)

Structure (additions in bold):

```
[p headline, flex items-center gap-1, text-2xl / text-lg]
  Mascot inline: [🐷 svg][✨ lottie when correct]  "Chính xác! Giỏi quá!" | "Chưa đúng rồi, cố lên nhé!"
[p text-xl / text-base]
  Từ đúng là: <span font-extrabold>{correctWord}</span>**<EmojiVisual className="ml-[0.3em]" animated emoji imageUrl />**
[p explanation]
```

- Picture is **inside** the "Từ đúng là:" paragraph, **after** the correct-word span, separated by a margin (no extra whitespace text node, so the paragraph text is unchanged apart from the sr-only emoji). Height = 1em = 20 px, 16 px at max-height 420 px (AC-10.2 bound "<= paragraph font-size"). `align-[-0.125em]` keeps it inside the 28 px / 24 px line box: paragraph height unchanged within 2 px.
- Photo in this box uses object-contain (AC-10.5; RK-8 accepted legibility).
- Mascot accent placement: unchanged position (inside the Mascot span, right of the pig, `gap-1`), same line as the headline; ✨ is a 1em Lottie at 24 / 18 px. The encouraging mood has no accent (AC-3.4).
- Without `picture`: FeedbackPanel's own markup is byte-identical to today (AC-10.6), with one amended exception (A-13, 2026-09-29): a line's tag is `<div>` instead of `<p>` exactly when an EmojiVisual inside it may mount its Lottie layer - the DotLottieReact canvas wrapper is block-level and invalid inside `<p>` (React validateDOMNesting). So the headline renders `<div>` when `isCorrect` (happy accent present) and stays `<p>` when encouraging; the "Từ đúng là:" line renders `<div>` only when `picture` is present, keeping its baseline classes otherwise. Note: the Mascot child's inner DOM changes under US-3 in both cases; FeedbackPanel.test.tsx does not assert Mascot internals.
- `answer-feedback` testid rule unchanged; pair-matching `correctWord` string with inline emoji stays native text (BR-01 b, F-16).

### 5.5 RoundSummary / BatchSummary / StartBatch (AC-3.1, AC-3.3, AC-3.4)

- Keep the existing block Mascot (48 px) at the top; no separate confetti overlay or extra decoration (R5.1, R5.7, cap <= 1 on non-question screens). The mascot's 🎉 accent becomes an animated EmojiVisual (Noto party popper, loop) next to the static Twemoji 🐷; the root keeps `animate-mascot-celebrate motion-reduce:animate-none`.
- StartBatch greeting: static 🐷 SVG, `animate-mascot-wave`, no accent, no player.

### 5.6 Credits surface (US-7, AC-7.1..AC-7.10, D-3)

**Entry (GradeSelect):** below the grade-card grid, centered, `mt-10`:

- Button text "Nguồn hình ảnh", `data-testid="credits-link"`, style identical to the StartBatch back pill: `rounded-full bg-sky-100 px-6 py-3 text-lg font-bold text-sky-700 transition hover:bg-sky-200 focus:outline-none focus:ring-4 focus:ring-sky-500` (DS-6). Rendered only when `onOpenCredits` is provided (no dead control; keeps `GradeSelect.test.tsx` type-valid).

**Credits screen** (new `App` screen `'credits'`; wrapper `mx-auto max-w-2xl px-4 py-12 text-left`):

| Zone | Content | Style |
|------|---------|-------|
| Back | "← Quay lại", `data-testid="credits-back"` | same pill as the entry button, `mb-6` |
| Heading | h1 "Nguồn hình ảnh và giấy phép" | `mb-3 text-3xl font-extrabold text-sky-900` |
| Intro | "Ứng dụng dùng hình ảnh miễn phí từ các nguồn dưới đây. Cảm ơn các tác giả!" | `mb-8 text-lg text-sky-700` |
| Section 1 | h2 "Bộ biểu tượng cảm xúc"; one card per collection: "{title} của {author}, giấy phép {licenseLabel}", then "Giấy phép: {licenseUrl}", "Nguồn: {sourceUrl}" | h2 `mb-3 text-xl font-bold text-sky-900`; card `mb-3 rounded-2xl border-4 border-sky-200 bg-sky-50 p-4` (BatchSummary breakdown pattern); main line `text-base text-slate-700`; URL lines `text-sm text-slate-700 break-all` |
| Section 2 | h2 "Ảnh chụp trong kho ảnh"; one card per approved photo: "Ảnh \"{title}\" của {creator} cho từ \"{word}\", giấy phép {licenseLabel}, nguồn {provider}" + " (đã thay đổi kích thước)" when modified; "không rõ tác giả" for cc0 unknown creator; URL lines as above | same |
| Empty | "Chưa có ảnh chụp nào trong kho ảnh." under section 2 | `text-base text-slate-700` |
| Error | "Không tải được danh sách nguồn hình ảnh. Vui lòng thử lại sau." replacing both sections; back button still works | `rounded-2xl border-4 border-rose-300 bg-rose-50 p-4 text-base font-semibold text-rose-700` |
| Loading | heading + intro + 3 skeleton cards `h-16 rounded-2xl bg-sky-100 animate-pulse motion-reduce:animate-none`; no new copy | C6 pair present |

- URLs are plain text, never anchors (AC-7.5). No pictures or mascot on Credits (0 players). Data comes only from `/attribution.json` (same-origin fetch, AC-7.8). Focus: on open, focus moves to the h1 (`tabIndex={-1}`) so keyboard and screen-reader users land on the page; on back, focus returns to the "Nguồn hình ảnh" button (AC-7.10).
- License label mapping per PRD: `cc0` -> "CC0 1.0"; `by` + version -> "CC BY {version}"; collections use `licenseLabel`.

---

## 6. Animation and motion rules (BR-03, A-03, A-09, constitution #5, #6)

### 6.1 Which emoji animate

| Context | Animated | Accent meaning |
|---------|----------|----------------|
| ImageChoice prompt (single-image) | yes if Noto exists, no photo, motion allowed | attention on the prompt (R5.5 d) |
| FeedbackPanel correct-word picture | yes, same conditions | reinforcement |
| Mascot ✨ (mood `happy`) | yes | correct answer = happy (R5.5 a, b) |
| Mascot 🎉 (mood `celebrating`) | yes | Round / Batch completion = celebration (R5.5 c) |
| Mascot 🐷 | never (not in Noto set, F-3, D-2) | character constancy; CSS mood keyframes unchanged |
| Any grid or repeated context | never | options stay still (R5.5) |

### 6.2 Playback policy

- Autoplay on mount, loop (DS-2 ruling A). No controls, no click handling on the canvas (clicks pass through to the option/button; canvas wrapper `pointer-events-none`).
- Render quality: canvas sized to the 1em box; device pixel ratio capped at 2 to bound GPU cost on phones.
- Loading: Twemoji poster first, 150 ms opacity crossfade to the canvas on first frame (DS-1). The crossfade is only reachable when motion is allowed, so it needs no reduced-motion pair; it animates opacity only.
- Failure: poster stays / returns as `svg` within 2500 ms (AC-2.8 bound 3000 ms). Circuit breaker DS-9.
- Lazy boundary: `React.lazy` wrapper module that imports `@lottiefiles/dotlottie-react` and calls `setWasmUrl(<same-origin wasm URL>)` once before the first player mounts (BR-07, AC-2.5, AC-2.6). Nothing from the player is imported by the entry chunk.

### 6.3 Reduced motion (NFR-2, C6, AC-2.7, AC-10.3)

- `prefers-reduced-motion: reduce` -> rule 2 of 3.3 never selects `lottie`, so no player chunk, WASM or JSON is requested; pictures show as `image` or `svg`.
- Mascot keeps `motion-reduce:animate-none` on its root (AC-3.1). New CSS animation introduced by this spec: only `animate-pulse` on Credits skeletons, paired with `motion-reduce:animate-none`.

### 6.4 Player cap per screen (A-09, AC-2.9)

| Screen / state | Possible players | Max |
|----------------|------------------|-----|
| GradeSelect, Credits, StartBatch (greeting) | none | 0 |
| Any question before answering, image-choice | prompt | 1 |
| Any question before answering, other kinds | none | 0 |
| After answering image-choice | prompt + ✨ (correct only) | 2 |
| After answering extra-letter, listening-sentence, listening-image-choice, describe, counting | FeedbackPanel picture + ✨ (correct only) | 2 |
| After answering pair-matching | ✨ (correct only) | 1 |
| Pronunciation (own panel, no Mascot) | none | 0 |
| RoundSummary, BatchSummary | 🎉 | 1 |

The cap holds by construction (3.6); Tester verifies by counting canvases on each row.

---

## 7. Responsive and accessibility

### 7.1 Viewports (AC-1.8, AC-3.2, AC-10.2)

- Width 320 px (320x568): repeated pictures wrap inline (no horizontal overflow); Credits URLs `break-all`; the Credits pill fits (text-lg, px-6).
- Height <= 420 px (667x375, 844x390): every EmojiVisual inherits the existing `[@media(max-height:420px)]` font-size compaction of its container (FeedbackPanel line 16 px, Mascot inline 18 px). FeedbackPanel headline stays one line (mascot + text overlap vertically, AC-3.2); the picture adds no row (AC-10.2). ImageChoice prompt per DS-4.
- Existing responsive e2e specs pass unchanged; any test needing an extra-letter question advances to one per allowlist T-5 (Tester concern, not a design change).

### 7.2 Touch targets

- Unchanged: option buttons, pair tiles, extra-letter tiles, action buttons all `min-h-[76px]`. Pictures never shrink a target; the canvas and imgs are non-interactive and do not capture clicks.
- Credits pill ~52 px (DS-6 exception, >= 44 px).

### 7.3 Contrast of new text (measured, WCAG 2.x relative luminance)

| Pair | Ratio | Result |
|------|-------|--------|
| sky-900 `#0c4a6e` on page slate-50 `#f8fafc` (Credits h1, h2) | 9.0:1 | AA pass |
| sky-700 `#0369a1` on slate-50 (intro) | 5.3:1 | AA pass |
| slate-700 `#334155` on sky-50 `#f0f9ff` (card lines) | 9.8:1 | AA pass |
| sky-700 on sky-100 `#e0f2fe` (Credits pill, existing pattern) | 4.8:1 | AA pass (bold 18 px) |
| rose-700 `#be123c` on rose-50 `#fff1f2` (error) | 5.7:1 | AA pass |

### 7.4 Accessible naming decision (AC-1.1..AC-1.3, AC-1.9, CR-02)

- Picture layers: `alt=""` + `aria-hidden="true"`; the sr-only text layer carries the name (the emoji, read by screen readers as its Unicode name). Confirmed against AC-1.1 (exactly one img with alt "" and aria-hidden "true" + one sr-only element) and AC-1.3.
- Existing aria-hidden wrappers at question sites stay exactly as today (ImageChoice prompt div, ListeningImageChoice option span, Counting prompt/option spans, Describe option span), so the accessibility tree of question bodies is unchanged. Button naming is CR-02 (not in this run).
- Pair picture tiles have no aria-hidden wrapper today; the tile's accessible name remains the emoji (via sr-only text), same as today.
- Mascot: root keeps `role="img"` and `aria-label` ("Heo con vẫy chào", "Heo con vui mừng", "Heo con động viên", "Heo con ăn mừng"); inner spans keep `aria-hidden="true"` and contain the EmojiVisuals (AC-1.9).
- FeedbackPanel picture: readable (DS-12 A).
- Known text collision, harmless: vocabulary word "pig" uses 🐷. `mascotLocator` uses `getByText('🐷').first()`; the Mascot precedes the "Từ đúng là:" picture in DOM order, so it still resolves to the mascot.

### 7.5 Keyboard

- No new focusable element except the Credits pill and "← Quay lại" (both `<button>`, `focus:ring-4`). Pictures are never focusable (`tabIndex` not set; canvas not focusable).

---

## 8. Asset style rules for curation (constitution #3, SAFE, BR-08, BR-09, BR-11, BR-12)

### 8.1 Photo reviewer checklist (every item must pass; any fail = `reviewStatus: "rejected"`)

| ID | Check | Pass when |
|----|-------|-----------|
| P-1 | License | `cc0` or `by` (any version); `by` has a non-empty creator; not SA/NC/ND/PDM-only |
| P-2 | Word type | Concrete picturable noun (DS-10). Feelings, actions, numbers, colors, weather phenomena: reject, emoji stays |
| P-3 | Literal and correct sense | Shows the exact sense in the word's `explanation` (bat animal vs bat sport); a real instance, not a logo, toy, drawing, cartoon, painting, sign or text of the word |
| P-4 | Single object | One instance of the object (or one natural pair for plural-only words: pants, glasses, scissors); no competing subject |
| P-5 | Framing | Object centered, occupies roughly 50-90% of the frame, fully visible (not cropped at edges), survives a square `object-contain` box |
| P-6 | Background | Plain, light or softly blurred; no clutter, no busy patterns, no other bank objects in view |
| P-7 | Not confusable | Would not better depict another bank word (cup vs glass, sea vs ocean, bag vs backpack) |
| P-8 | People | No identifiable faces, especially children; hands or uniform-only shots acceptable |
| P-9 | Child safety | No violence, weapons, blood, injury, alcohol, tobacco, drugs, nudity, frightening or disturbing imagery, dangerous acts (fire = controlled campfire or fireplace only) |
| P-10 | Clean image | No watermark, overlaid text, brand logo, border, collage or filter effect |
| P-11 | Thumbnail legibility | Recognisable at 96 px (prompt) and at 60 px (listening option); still a recognisable shape at 20 px (feedback) |
| P-12 | Quality | In focus, well lit, natural color, not heavily compressed; after normalization <= 512 px, <= 80 KB, WebP, no EXIF (AC-4.4) |
| P-13 | Cultural fit | Appropriate and familiar for Vietnamese 7-8 year olds; no culturally offensive content |
| P-14 | Style coherence | A real photograph (not a 3D render or illustration), so the photo set is one style (R5.2) |

Curator records `reviewStatus`, `reviewedBy`, `reviewedAt` (BR-12). Suggestion to Tech Lead: an optional `reviewNote` field in `image-staging/candidates.json` only, for rejection reasons (not part of `public/attribution.json`).

### 8.2 Emoji consistency rule

- Static pictures: Twemoji only, one pinned release, files unmodified (collection `modified: false`). No OpenMoji (CC BY-SA), no Fluent (personal use), no OS glyphs except the `native` failure fallback.
- Animated pictures: Noto Emoji Animation only, keyed by the Twemoji key (BR-06), files <= 120 KB.
- The mascot 🐷 is always the Twemoji SVG (never a photo, never a Lottie substitute from another set).

### 8.3 Mix rule (BR-09)

- Never photo + emoji inside one option set, one repeated render, or one pair-matching board. ListeningImageChoice is all-or-nothing (DS-3 group fallback). Repeated contexts and pair-matching never show photos. Photos are static.

---

## 9. Design tokens and files touched (mapping only, no code)

### 9.1 Tokens

| Token | Value | Use |
|-------|-------|-----|
| Picture box | `h-[1em] w-[1em]` | every EmojiVisual picture |
| Inline baseline | `align-[-0.125em]` | inline variant (Twemoji standard offset) |
| Repeat spacing | `mx-[0.05em]` | per picture when count > 1 (approximates glyph advance) |
| Feedback gap | `ml-[0.3em]` | FeedbackPanel picture after the word |
| Crossfade | `transition-opacity duration-150` | Lottie canvas reveal |
| Lottie ready timeout | 2500 ms | 3.3 |
| Size tokens | existing `text-8xl`, `text-6xl`, `text-5xl`, `text-4xl`, `text-2xl`, `text-xl`, `text-lg`, `text-base` | table 3.5 |

No change to `tailwind.config.js` or `src/index.css` is required (arbitrary values and built-in `sr-only`, `animate-pulse` suffice).

### 9.2 New files (final paths per Tech Lead ADR)

| File | Responsibility |
|------|----------------|
| `src/components/EmojiVisual.tsx` | Contract of section 3 |
| `src/components/EmojiLottiePlayer.tsx` | Lazy chunk: dotLottie player, `setWasmUrl`, ready/error callbacks |
| `src/lib/emoji/emojiKey.ts` | Twemoji key rule (3.2) |
| `src/lib/emoji/emojiAssets.ts` | `svgUrl(key)`, `lottieUrl(key)`, `hasLottie(key)` over the generated key set |
| `src/lib/emoji/lottieKeys.generated.ts` (or JSON) | Key set written by `npm run assets:emoji` |
| `src/lib/emoji/wordVisual.ts` | `getWordVisual(wordId)` built once from `ALL_WORDS` (AC-5.9) |
| `src/hooks/usePrefersReducedMotion.ts` | matchMedia subscription (jsdom-safe) |
| `src/components/CreditsScreen.tsx` | 5.6 |
| `src/lib/credits/attribution.ts` | Types for 9.2 schema, fetch `/attribution.json`, license label formatting |
| Tests (T-4) | `EmojiVisual.test.tsx`, `emojiKey.test.ts`, `wordVisual.test.ts`, `CreditsScreen.test.tsx`, e2e visual specs |

Test infrastructure note for Tech Lead: jsdom needs a global dotLottie mock (precedent: speech API stubs in `src/test/setup.ts`). Confirm whether editing `setup.ts` falls under allowlist T-4 (infrastructure addition) before Dev starts.

### 9.3 Edits to existing files

| File | Edit |
|------|------|
| `ImageChoiceQuestion.tsx` | Prompt glyph -> `EmojiVisual variant="block" animated imageUrl` inside existing div (+ DS-4 class only if approved) |
| `ListeningImageChoiceQuestion.tsx` | Option glyph -> `EmojiVisual variant="block" loading="lazy"`; all-or-nothing + group-fallback state |
| `CountingImageQuestion.tsx` | Prompt and count-to-image option strings -> `EmojiVisual count={option.count}`; `repeatedEmoji` helper removed from render |
| `DescribeAndChooseImageQuestion.tsx` | Option strings -> `EmojiVisual count={option.count}` |
| `PicturePairMatchingQuestion.tsx` | Picture tiles -> `EmojiVisual emoji={tile.label}`; word tiles unchanged |
| `Mascot.tsx` | 🐷 -> `EmojiVisual` (static); accent -> `EmojiVisual animated`; wrappers, classes, aria unchanged |
| `FeedbackPanel.tsx` | Optional `picture` prop; EmojiVisual inside "Từ đúng là:" paragraph after the word span |
| `QuestionCard.tsx` | Build `picture` for the 5 US-10 kinds from the correct wordId via `getWordVisual` |
| `GradeSelect.tsx` | Optional `onOpenCredits`; Credits pill below grid |
| `App.tsx` | `Screen` gains `'credits'`; open/back handlers; focus return |
| `RoundSummary.tsx`, `BatchSummary.tsx`, `StartBatchScreen.tsx` | No edit (Mascot change propagates) |

### 9.4 Test hooks

| Hook | Where | Status |
|------|-------|--------|
| `data-emoji-visual="<emoji>"` | EmojiVisual root | normative (PRD 6 conventions) |
| `data-emoji-mode="image\|lottie\|svg\|native"` | EmojiVisual root | normative |
| `data-emoji-ready="true"` | EmojiVisual root once visible layer loaded | recommended, additive |
| `data-testid="credits-link"`, `"credits-back"` | GradeSelect, Credits | normative (AC-7.1, AC-7.2) |
| Existing `option-{i}`, `pair-tile-{i}`, `mascot`, `data-mascot-mood`, `answer-feedback`, `data-question-kind` | unchanged | preserved |

---

## 10. State matrix

| Component | Default | Hover / focus | Disabled / answered | Loading | Error | Reduced motion |
|-----------|---------|---------------|---------------------|---------|-------|----------------|
| EmojiVisual `image` | photo in 1em box | n/a (non-interactive) | inherits ancestor opacity | reserved 1em box, transparent until `load` | -> lottie/svg (3.3) | same (static) |
| EmojiVisual `lottie` | looping canvas | n/a | keeps playing (reward moment) | Twemoji poster, crossfade on first frame | -> svg <= 2500 ms | never entered |
| EmojiVisual `svg` | Twemoji img | n/a | inherits ancestor opacity | reserved 1em box (SVG <= 20 KB, near-instant) | -> native | same |
| EmojiVisual `native` | visible glyph at container size | n/a | inherits | n/a | terminal | same |
| Listening option with pictures | white, sky-200 border | sky-400 border / ring-4 sky-500 | correct emerald, chosen rose, others opacity-50 | per EmojiVisual | group fallback to svg (DS-3) | static |
| Pair picture tile | unchanged | unchanged | pending amber, wrong rose, matched emerald | per EmojiVisual | per EmojiVisual | static |
| FeedbackPanel picture | inline 1em after word | n/a | n/a | poster / reserved box | chain to native | svg or photo |
| Mascot accent | ✨ / 🎉 lottie | n/a | n/a | Twemoji poster | svg | svg; root animate-none |
| Credits pill | sky-100 bg | sky-200 bg / ring-4 sky-500 | n/a | n/a | n/a | n/a |
| Credits screen | sections | back pill states | n/a | 3 skeleton cards (pulse, motion-reduce none) | rose error box + back works | no pulse |

---

## 11. Acceptance trace (AC -> design decision)

| AC | Design decision |
|----|-----------------|
| AC-1.1 | 3.4 svg DOM: one img alt "" aria-hidden, one sr-only span, key per 3.2, hooks 9.4 |
| AC-1.2 | 3.1 `count`; 3.4 count-N row: N imgs, single text node `emoji.repeat(N)` |
| AC-1.3 | 3.4 text-span rules (Tailwind sr-only, forbidden techniques, emoji only) |
| AC-1.4 | 4 wiring table + 9.3 edits; BR-01 exceptions left native (5.2, 5.4) |
| AC-1.5 | 3.4 "why existing tests stay green"; layout kept (3.5); T-5 note 7.1 |
| AC-1.6 | 3.2 key rule + examples |
| AC-1.7 | 3.3 svg -> native; 3.4 native row; no font-size set by EmojiVisual (3.1) |
| AC-1.8 | 3.5 size table (96/60/60/36 px), 1em box, inline wrap |
| AC-1.9 | 7.4 Mascot naming unchanged |
| AC-1.10 | 3.2 same-origin SVG for every picture; native only on error |
| AC-2.1 | 3.3 rule 2; 3.4 lottie row; 6.2 autoplay + loop (DS-2) |
| AC-2.2 | 3.2 `hasLottie` from bundled key set, no probe; 3.3 rule 3 |
| AC-2.3 | 3.6 animated only at 3 sites; `count > 1` forces static (3.1) |
| AC-2.4 | 5.1 prompt `animated`, options unchanged |
| AC-2.5 | 6.2 lazy boundary; mode set at mount, requests only after lottie mount |
| AC-2.6 | 6.2 `setWasmUrl` same-origin |
| AC-2.7 | 6.3 reduced motion: no lottie, no requests; Mascot animate-none |
| AC-2.8 | 3.3 lottie -> svg <= 2500 ms, error boundary; DS-9 |
| AC-2.9 | 6.4 cap table |
| AC-2.10 | No design surface; small key set noted (3.2) |
| AC-3.1 | 5.5, 6.1 static pig, mood classes kept |
| AC-3.2 | 5.4 accent 1em lottie on the headline line; 3.5 mascot inline 24/18 px |
| AC-3.3 | 5.5 🎉 lottie accent on summaries |
| AC-3.4 | 5.5, 6.1 greeting/encouraging: no accent |
| AC-5.1 | 4 ImageChoice imageUrl via wordId; 3.3 rule 1 (no canvas) |
| AC-5.2 | 3.3 rules 2-3 |
| AC-5.3 | 3.3 image -> lottie/svg; DS-3 |
| AC-5.4 | 4 all-or-nothing; 5.2; DS-3 |
| AC-5.5 | 3.1 `count > 1` ignores imageUrl; 4 (no imageUrl at repeated/pair sites); 5.3 |
| AC-5.6 | 4 resolution only via `getWordVisual(wordId)` |
| AC-5.7 | 3.4 image row (object-contain, alt "", aria-hidden, same 1em box); 3.1 `loading` |
| AC-7.1 | 5.6 entry pill below grade cards, only on GradeSelect (DS-5, DS-6) |
| AC-7.2 | 5.6 screen zones, back button |
| AC-7.3, AC-7.4 | 5.6 section 1 / section 2 line templates |
| AC-7.5 | 5.6 URLs as plain text, no anchors |
| AC-7.6 | 5.6 empty state |
| AC-7.7 | 5.6 error state, back works |
| AC-7.8 | 5.6 data from `/attribution.json` only |
| AC-7.9 | Copy verbatim from PRD; this spec has no dashes |
| AC-7.10 | 5.6 focus handling; 7.5 ring-4 |
| AC-9.1 | 5.1 Round 1 composition: 10 questions, 7 extra-letter + 3 image-choice seeded-shuffled |
| AC-9.4 | 5.1 prompt chain image -> lottie -> svg in live Round 1 |
| AC-9.5 | 5.1 same FeedbackPanel/live-score flow; RoundSummary after q10 then Round 2 |
| AC-10.1 | 4 QuestionCard builds `picture` for 5 kinds only |
| AC-10.2 | 5.4 inside paragraph, after word span, 1em (20/16 px), no extra row |
| AC-10.3 | 6.1, 6.3 feedback picture animates, static under reduced motion |
| AC-10.4 | 3.4 text layer emoji only (no ASCII); no whitespace text node (5.4) |
| AC-10.5 | 5.4 photo object-contain in the same inline box; 3.3 chain to native |
| AC-10.6 | 5.4 without `picture` FeedbackPanel markup unchanged |

No design surface (owned by BA/Tech Lead/Dev/Tester, listed for completeness): AC-4.1..AC-4.12 (pipeline; curation criteria feed from 8.1), AC-5.8, AC-5.9 (data), AC-6.1..AC-6.9 (vocabulary), AC-7.11 (attribution script), AC-8.1..AC-8.4 (deploy), AC-9.2, AC-9.3, AC-9.6 (generator and test mechanics), AC-11.1..AC-11.8 (sentence templates).

---

## 12. Handoff notes

- Human decisions resolved at the design gate: DS-4 approved B (60 px at <=420 px height; PRD patched), DS-2 confirmed loop per AC-2.1 (capped loop may return as a later CR). All other DS items are Designer rulings, reversible.
- Tech Lead to confirm: DS-3 `onImageError` prop, DS-9 circuit breaker, 2500 ms timeout, `setup.ts` mock allowlist status, file locations (9.2), `hasLottie` key-set format.
- PM note: dispatch assumptions corrected in DS-5 (Credits location) and DS-11 (76 px targets, BR-09 citation).

---

## 13. CR-06 design addendum - phonics nang sau (final sounds / blends / rhyming)

Scope: three new phonics question kinds added to the CR-03 phonics block
inside Round 4 (PRD section 15). Everything below reuses the CR-03
phonics screen contract unless noted - same question-card shell, same
option-button grid, same FeedbackPanel.

### 13.1 Learning flows

| Skill | Sees | Hears (TTS) | Does | Skill exercised |
|-------|------|-------------|------|-----------------|
| `phonics-final-choice` | word + picture, prompt "Từ này kết thúc bằng âm nào?" | the WORD (never a bare letter name - AC-Pd8) | picks 1 of 4 letter/digraph options | segment the ending sound |
| `phonics-blend-choice` | word + picture, prompt "Từ này bắt đầu bằng cụm âm nào?" | the WORD | picks 1 of 4 cluster options (2-3 letters) | isolate the initial blend |
| `phonics-rhyme-choice` | prompt word + picture, prompt "Từ nào có vần giống từ này?" | the prompt WORD | picks 1 of 4 WORD options | compare sound + spelling endings |

Rationale (Designer ruling): all three are "hear/see the word, pick the
answer" shaped - identical cognitive frame to CR-03 sound-choice, so the
child reuses an already-learned interaction instead of learning a new
one. The rhyme kind's options are WORD TEXT, not pictures: rhyming is a
sound+spelling skill and a picture would hide the rime ending the child
must compare (BA ruling 15.2, confirmed Designer).

### 13.2 Prompt wording (Vietnamese-first, no English UI copy)

- Final: `Từ này kết thúc bằng âm nào?` - mirrors CR-03's
  `Từ này bắt đầu bằng âm nào?` so the pair reads as two directions of
  the same skill.
- Blend: `Từ này bắt đầu bằng cụm âm nào?` - "cụm âm" (cluster) chosen
  over "âm đôi"/"phụ âm đôi" because blends can be 3 letters (str, thr).
- Rhyme: `Từ nào có vần giống từ này?` - "vần" is the word Vietnamese
  phonics lessons use for rhyming word families.

### 13.3 Option layouts and states

- Final + blend options: same 4-tile letter grid as
  `PhonicsSoundChoiceQuestion` (`grid-cols-2 sm:grid-cols-4`,
  `text-3xl font-extrabold`, `getOptionButtonClassName` for
  default/hover/correct/incorrect states). One shared component
  (`PhonicsEndingChoiceQuestion`) renders both kinds; prompt text and
  option aria-label prefix switch on `question.kind`.
- Rhyme options: 2x2 word grid (`grid-cols-2`, `text-2xl` at phone
  landscape heights) - words are wider than letters so the grid stays
  2-column at all breakpoints.
- Post-answer states unchanged: clicked-wrong option gets incorrect
  styling, correct option reveals, all options disable, FeedbackPanel
  shows explanation + correct-word picture (AC-Pd8).

### 13.4 Audio/TTS behavior

- The only TTS surface is the prompt word via `useAudioPlayback` +
  `speakWord` (same hook contract as every TTS kind): `🔊 Nghe` ->
  `🔁 Nghe lại`, `AudioPlaybackWarning` on failure.
- Option buttons are never spoken: a bare letter name ("c" -> "see")
  would mislead on final/blend kinds, and letting the child hear each
  rhyme option would leak the answer by ear alone (the skill must also
  engage spelling).
- No `getSoundUtterance` use on these kinds - that helper exists for
  sound-choice where the sound IS the payload; here the word is.

### 13.5 Accessibility

- Final/blend option buttons carry explicit aria-labels naming the
  option (`âm t`, `cụm fr`) - same contract as CR-03 (`âm c`), because a
  bare letter/cluster glyph is not a self-describing accessible name.
- Rhyme option buttons carry their word text as the accessible name
  (implicit, no aria-label needed - the visible word IS the name).
- Prompt word picture stays `aria-hidden` with `EmojiVisual animated`
  (reward-context single image - Lottie allowed per BR-03).
- Reduced-motion honored via EmojiVisual's existing chain.

### 13.6 Responsive

- Inherits the QuestionCard/BatchScreen landscape-phone contract
  (`[@media(max-height:420px)]` shrink on emoji 6xl->5xl, word
  4xl->3xl, vertical padding). Rhyme words get the same height-fallback
  (2xl->xl).

### 13.7 Designer rulings (CR-06)

- DS-P1: ONE component (`PhonicsEndingChoiceQuestion`) renders
  final+blend rather than two near-identical files - kind-keyed prompt
  text, same shell. `Ruling: Designer - shared component keeps the
  CR-03 layout contract in a single place.`
- DS-P2: rhyme options are words, not pictures (BA 15.2 confirmed) -
  see 13.1. `Ruling: Designer, confirmed.`
- DS-P3: no per-option audio on any CR-06 kind (13.4). `Ruling:
  Designer - answer leakage + letter-name mispronunciation risk.`

---

## 14. CR-09 design addendum - app-level design system + screen refresh

Retroactive Designer phase for the whole product surface (PRD section
16). Everything below becomes token, not convention. Existing
data-testids, accessible names, 76px targets, landscape fallbacks and
reduced-motion behavior are INVARIANT - this pass changes how things
look, never how they work.

### 14.1 Design language - "lớp học vui" (playful classroom)

Warm paper background, big friendly cards, chunky rounded controls,
the pig mascot as the app's guide character. Every screen reads as one
scene: a header area, a content card, one dominant action. Nothing
crowds; whitespace is the design.

### 14.2 Tokens (single source: `src/lib/ui/tokens.ts` + Tailwind)

| Token | Value | Use |
|-------|-------|-----|
| `bg.page` | `from-sky-50 via-amber-50/40 to-emerald-50` soft diagonal gradient | body |
| `surface.card` | `bg-white rounded-3xl shadow-lg ring-1 ring-slate-200/60` | content cards, question card |
| `surface.tint` | `bg-{color}-50 ring-1 ring-{color}-200` | feedback/summary accents |
| `text.heading` | `text-sky-900 font-extrabold` | h1/h2 |
| `text.body` | `text-slate-700` | copy |
| `text.accent` | `text-sky-700` | prompt lines, progress |
| `action.primary` | emerald-500/600 white | start/continue CTAs |
| `action.listen` | indigo-500/600 white | TTS buttons |
| `action.nav` | `bg-white ring-1 ring-sky-200 text-sky-700` | back/credits pills |
| `choice.*` | sky default / emerald correct / rose incorrect / opacity-50 unchosen | option tiles (keep semantics, restyle shell) |
| `radius` | `rounded-3xl` cards, `rounded-2xl` options, `rounded-full` pills | |
| `target` | `min-h-[76px]` | all interactive |
| `motion.ui` | enter 200ms fade+rise 8px; press `active:scale-95`; option flash <=300ms | transform/opacity only |
| `font.display` | Baloo 2 (self-hosted woff2, OFL) | headings, numbers, buttons |
| `font.body` | system stack | Vietnamese body copy |

Font ruling (DS-U1): Baloo 2 for display/buttons - rounded, friendly,
Vietnamese-complete subset, OFL-licensed, self-hosted under
`public/fonts/` + `font-display: swap`. Body stays the system stack so
long Vietnamese copy stays neutral and zero layout risk.

### 14.3 Screen specs

**GradeSelect:** centered scene - mascot `greeting` above a display
headline "Chọn lớp của em", subline, then a 2-col grid (1-col small
phones) of grade cards: big grade number in a colored disc, grade name
display font, hover lift (`hover:-translate-y-1 hover:shadow-lg`).
Credits pill below (nav style).

**StartBatchScreen:** scene card containing mascot `greeting` + grade
headline + explainer line + one dominant emerald CTA ("Bắt đầu luyện
tập", display font, arrow). Back pill top-left of the card.

**Active play chrome (BatchScreen header):** one `surface.card` strip:
left `Vòng X/4` pill (sky tint), center animated progress track
(sky gradient fill, rounded-full), right timer chip (amber tint, clock
emoji) + score chip (emerald tint, star emoji). Same bar on portrait
and landscape; at <=420px height it compacts to a single text row.

**QuestionCard:** prompt + options live inside the big content card;
question-kind prompt lines keep `text.accent`; phonics/big-word prompts
use `font.display`. Option tiles: same getOptionButtonClassName
semantics, restyled to `ring`-based borders (border-4 kept for state
weight), `active:scale-[0.97]` press feedback, `shadow-sm` resting.

**FeedbackPanel:** full-width tint banner inside the card
(emerald-50/emerald ring correct, rose tint incorrect), mascot `happy`
/`encouraging` inline, word+picture line unchanged (AC-10.x), then the
next button (primary or amber per existing convention).

**RoundSummary / BatchSummary:** celebration scene - mascot
`celebrating`, points as a big "coin" (amber disc, display font),
per-round breakdown rows as small tint cards (icon + `Vòng n` + score),
CTA stack (primary + nav).

**CreditsScreen:** card sections per collection, same heading/body
tokens; links remain non-anchor text (AC-7.5), pill back.

### 14.4 States

- Loading/empty: muted card + body copy (existing empty states restyled,
  no new copy).
- Audio warning: amber tint banner (existing AudioPlaybackWarning
  restyled to tokens).
- Timer end: existing flow unchanged; timer chip pulses amber under
  30s (transform/opacity only, motion-reduce off).
- Error boundaries: existing EmojiVisualErrorBoundary unchanged.

### 14.5 Motion rules

- Screen enter: 200ms fade + 8px rise on the content card (CSS only,
  `motion-reduce:animate-none`).
- Button press: `active:scale-95` (universal, zero JS).
- Mascot: existing 4 animations only; no new looping animation on
  question screens (focus preservation).
- No new Lottie call sites; CR-03 rules still cap option grids at
  static.

### 14.6 Accessibility invariants (restated as tokens)

76px targets, ring-4 focus in each action color, option aria-labels
unchanged, `aria-hidden` decorative emoji unchanged, status colors
always paired with icon + text (never color alone).

### 14.7 Grade-1 readiness notes (for CR-07)

- G1 skin = same tokens, `text-*` one step larger, fewer options per
  screen where the kind allows, no timer chip (or decorative-only),
  TTS button duplicated next to every text option on listening kinds.
- Recorded here so the G1 pass is a config delta, not a redesign.

### 14.8 Designer rulings (CR-09)

- DS-U1 font: Baloo 2 display + system body. `Ruling: Designer -
  self-hosted OFL; body stays system for Vietnamese copy safety.`
- DS-U2 header chrome: single card strip replaces scattered progress/
  timer/score lines. `Ruling: Designer - one visual unit kids read
  instantly.`
- DS-U3 grade cards: numbered-disc tiles (not illustrated scenes yet -
  custom art is a later CR; emoji glyph per grade allowed). `Ruling:
  Designer - scope stays CSS-level.`
- DS-U4 semantics unchanged: emerald=correct/go, rose=wrong,
  amber=progress, sky=info, indigo=audio. `Ruling: Designer - kids
  already learned these meanings; restyle shells, not semantics.`

## 15. CR-08 addendum - login + admin console surfaces (2026-10-01)

All screens reuse the section-14 token system (SURFACE_*, TEXT_*,
BUTTON_*, CHIP_*, INPUT_*, pageBg). No new colors or type styles.

### 15.1 AuthScreen (`screen-login`)

- Centered scene card (max-w-md): mascot + "Chào bé!" heading,
  sub-line "Đăng nhập để vào lớp của mình".
- Inputs: rounded-2xl INPUT field style, `inputMode="numeric"` for PIN,
  PIN masked (type="password", pattern [0-9]*). Labels in Vietnamese.
  testids: `login-username`, `login-pin`, `login-submit`,
  `login-error`, `guest-button`.
- Error: rose-tinted banner (ring-rose-300 bg-rose-50 text-rose-700),
  copy "Tên đăng nhập hoặc mã PIN chưa đúng."
- Guest entry: secondary BUTTON "Chơi không cần tài khoản" under the
  form - never a dead end.
- Busy state: submit disabled + spinner text "Đang vào...".

### 15.2 AdminScreen (`screen-admin`)

- Header strip identical to Batch chrome (back chip "Thoát", title
  "Quản trị", admin name chip).
- Tab bar: four CHIP-sized tabs - `admin-tab-accounts` "Tài khoản" /
  `admin-tab-classes` "Lớp học" / `admin-tab-enroll` "Gán học sinh" /
  `admin-tab-scope` "Nội dung". Active tab = indigo chip, inactive =
  surface chip.
- Lists are scene-card surfaces with row-per-item, right-aligned action
  buttons (secondary BUTTON). Empty state: mascot + gray text.
- Forms sit inside the tab panel; inline validation text in rose.
- testids: `account-list`, `account-create-form`, `account-row-<id>`,
  `class-list`, `class-create-form`, `enroll-class-select`,
  `enroll-student-list`, `scope-class-select`, `scope-grade-<id>`,
  `admin-toast` for success feedback.

### 15.3 Student filtered GradeSelect

- Same GradeSelect, `allowedGrades` prop filters the card list; a small
  caption chip "Lớp của bé mở: ..." renders when filtered. A sign-out
  chip sits top-right (`signout-button`).
- Student with zero scope sees an empty-state card "Cô/Thầy chưa mở
  nội dung cho bé - hãy hỏi cô nhé!" + sign-out chip (never blank).

### 15.4 Guest flow

- Guest skips auth entirely: AuthScreen -> guest-button -> GradeSelect
  with all grades; a subtle "Đăng nhập" chip stays visible for
  switching to account mode.


## 16. CR-10 design system - "Hanh trinh cua Be Heo" (2026-10-01)

Grounded in docs/research-visual-identity.md. Section 14 tokens stay;
this section defines the WORLD layer on top.

### 16.1 The world

One adventure map: pig travels five lands, one per grade.

| Grade | Land (Vi) | Palette | Scene motifs |
|---|---|---|---|
| 1 | San choi (Playground) | green + sun yellow | sun, clouds, hills, swing, flowers |
| 2 | Thi tran (Town) | sky blue + peach | houses, road, trees, kite |
| 3 | Rung ram (Jungle) | deep green + lime | big leaves, vines, toucan-eye dots |
| 4 | Thanh pho (City) | indigo + coral | skyline, windows, bus, pigeons |
| 5 | Vu tru (Space) | deep navy + violet + gold | stars, planets, rocket, moon |

Non-grade surfaces use the shared "sky" land (saturated azure
gradient, drifting clouds) so login/admin/credits feel part of the
same world.

### 16.2 Surface rules (DS-T1..T5)

- DS-T1 Page background = land gradient (2-3 stops) + LandScene SVG
  pinned bottom, pointer-events-none, aria-hidden.
- DS-T2 Content sits on "cloud cards": white 92% opacity, 24px radius,
  colored ring per land accent, chunky shadow (no blur ambiguity).
- DS-T3 Saturated accents only inside content chrome; max 3 bright
  hues per view (research rule).
- DS-T4 Journey map: land cards zigzag (alternating left/right offset
  on sm+, single column on mobile) with dotted path between them -
  reads as a journey, not a settings list.
- DS-T5 Locked-vs-earned legibility: star counts on land cards; zero-
  star lands still fully playable (no locking - guest rule).

### 16.3 Reward moments (DS-R1..R4)

- DS-R1 Correct answer: ConfettiBurst - ~14 particles (circles +
  squares, palette of 5) radiating from the feedback banner, 700ms,
  transform+opacity only; reduced-motion = none. Mascot happy.
- DS-R2 Wrong answer: no particles; mascot encouraging; rose banner
  unchanged (status semantics frozen).
- DS-R3 Round end: StarRain - 0-3 gold stars drop in sequence with
  squash-bounce onto the points chip; reduced-motion = stars render
  already landed. Points chip keeps amber semantics.
- DS-R4 Batch end: ChestReveal - sticker chest (emoji + CSS) opens,
  +stars ticker counts up, newly earned stickers slide in as chips;
  reduced-motion = final state immediately.

### 16.4 Stickers

Emoji-based achievements (Twemoji already vendored): first batch
🏅, 3-star round 🌟, 3-day streak 🔥, all-grades visited 🗺️,
500-star bank 💎. Album panel on journey map: earned in color,
locked at 30% opacity with "???" name.

### 16.5 Mascot

Moods (existing): greeting/happy/encouraging/celebrating/thinking.
Land accessory tint: a tiny colored band behind the mascot per land
(themed halo) - emoji itself stays Twemoji. On space land the halo is
a starfield ring.

### 16.6 Copy

All VN copy hyphen-only. Land names on cards: "Lop 1 - San choi" etc.
Streak chip label: "x ngay lien tiep". Star chip: "x sao".


## 17. CR-11 addendum - balance + premium finish (2026-10-01)

Implements the human polish request after CR-10. One rule set, applied
through tokens/constants only (no per-component ad-hoc styling).

### 17.1 Alignment invariants (DS-P1)

- Every standalone CTA renders centered in its card: button constants
  use `inline-flex` (Chromium shrinks `display:flex` buttons to
  fit-content AND drops text-align inheritance - verified quirk, A-29).
- No zigzag offsets on the journey map; when the visible card count is
  odd the trailing card centers itself (`sm:col-span-2 sm:mx-auto
  sm:max-w-sm` behavior via a wrapper rule).
- Spacing rhythm: sections inside a card use a single stack scale -
  gap-2 (inline rows) / mt-3 (between text lines) / mt-6 (before the
  CTA) / mt-8 (between major blocks). No mb-1/2/3/10 mixing.

### 17.2 Premium surface language (DS-P2)

Kid-premium (Duolingo Max / Lingokids level) - warm, tactile, glossy:

- Primary CTA: vertical gradient (lighter top) + `inset 0 -3px` bottom
  shade (pressed-toy edge) + hover -translate-y-0.5 + active scale.
  CONTINUE = amber gradient, START = emerald, SUBMIT = emerald,
  AUDIO = indigo.
- Score/points pill: gold gradient `amber-300->amber-500`, amber glow
  shadow, ring-amber-200/80.
- Cards: white -> `bg-gradient-to-b from-white to-sky-50/50`,
  shadow-xl, ring-slate-200/60. Summary cards get `max-w` rhythm
  unchanged.
- Chips (engagement bar, header strip): glassy - `bg-white/80
  backdrop-blur-sm` + soft ring; status tints keep their hue.
- Land map cards: `bg-gradient-to-br` per land tint, disc gets
  gradient + inner ring; hover lift + ring glow instead of plain
  shadow change.
- Display headings: `tracking-tight`; H1 scales `text-3xl
  sm:text-4xl`.

### 17.3 Responsive rules (DS-P3)

- Primary CTAs in summary/start contexts: `w-full sm:w-auto`.
- Page paddings: `px-4 py-6 sm:py-10` on screen wrappers (replaces
  flat py-12).
- Keep every existing `[@media(max-height:420px)]` compaction.
- Grid: `grid-cols-1 sm:grid-cols-2`; odd trailing card centered.
