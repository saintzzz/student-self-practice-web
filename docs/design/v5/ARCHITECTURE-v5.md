# ARCHITECTURE v5 - CR-82 Workstream B (luxury redesign) + Workstream C (mechanics breadth)

- **Phase:** Tech Lead (PM -> BA -> Designer -> **Tech Lead** -> Developer -> Tester -> Deployer -> External Review).
- **Revision:** a2. **Status:** Tech Lead cross-model review `docs/reviews/TECH-LEAD-v5-review.md` returned
  APPROVE_WITH_CHANGES (5 must-fix findings). a2 applies all five (changelog §16). Developer may start once the reviewer
  confirms the fixes; M1 does not depend on any of them.
- **Design Lead deviation rulings (recorded from the review):** all four deviations listed in §14.2 are **APPROVED** -
  D-16 flashcard-stack perch, the tracing load-failure "Bỏ qua câu này" escape (now gated on genuinely fresh attempts,
  D-22), D-12 Andika 700-only, D-13 extra review-sheet testids.
- **Binding input (WHAT):** `docs/design/v5/DESIGN-SPEC-v5.md` revision 3 (1,903 lines, read in full), Design Lead reviews
  `docs/reviews/DESIGN-LEAD-v5-review.md`, `-r2.md`, `-r3.md`. This document decides HOW. Where this document and the spec
  disagree, the spec wins unless a `D-##` decision below records the deviation and its reason; every such deviation is
  flagged `DEVIATION` and listed in §14 (all four a1 deviations are now APPROVED, §14.2).
- **R3-1 check (Design Lead r3, sole required correction):** confirmed closed in the spec text - fixtures 1 and 9 now use the
  generated frame "I can see a ___." (spec §13.5 table rows 1 and 9). No action left for Tech Lead.
- **Code verified (read, not assumed):** `src/lib/ui/{tokens,theme}.ts`, `tailwind.config.js`, `src/index.css`,
  `src/components/scene/LandScene.tsx`, `src/components/{LandShell,Mascot,EmojiLottiePlayer,QuestionCard,FeedbackPanel,
  ActiveRoundQuestion,BatchScreen,StartBatchScreen,ModeHub,ExamScreen,ExamResult,ExtraLetterQuestion,
  ListeningFillBlankQuestion,ListeningSentenceFillBlankQuestion,ConfirmEndDialog,DemoHint}.tsx`,
  `src/components/celebrations/*`, `src/hooks/{useDragTile,useDemoHint,useModalBehavior,usePrefersReducedMotion,
  useAudioPlayback}.ts(x)`, `src/lib/viewer/ViewerContext.tsx`, `src/lib/sfx.ts`, `src/lib/speech.ts` (exports),
  `src/lib/practiceSession.ts`, `src/lib/rounds/{types,roundDefinitions,round1ExtraLetter,round2ListeningSentence}.ts`,
  `src/lib/batch/batchSession.ts`, `src/lib/engagement/skills.ts`, `src/components/RoundSummary.tsx`,
  `src/lib/generators/listeningSentenceFillBlank.ts`, `src/types/index.ts`, `src/App.tsx` (shell + routing),
  `supabase/migrations/0002_practice_results.sql`, `0008_engagement_sync.sql`, `scripts/{check-bundle-budget,
  check-attribution,check-ea-classes}.mjs`, `vite.config.ts`, `playwright.config.ts`, `src/test/setup.ts`,
  `src/lib/{colorPairingGuard,dashGuard}.test.ts`, the `e2e/` suite and helpers, `docs/MEMORY.md`.
- **Measured / external facts (with source):**
  - `npm run build` on current `main` (this session): entry JS `index-*.js` **224.55 kB gzip**, entry CSS **13.08 kB gzip**;
    `scripts/check-bundle-budget.mjs` reports **OVER BUDGET** (max 121 / 10). The gate is already red before CR-82 (GT-3).
  - `@lottiefiles/dotlottie-web@0.80.0` typings (`node_modules/@lottiefiles/dotlottie-web/dist/index.d.ts`): config
    `loop` + `loopCount` ("n plays n + 1 times"), `freezeOnOffscreen`, `setLoop`, `setFrame`, `setSegment`, `load(config)`,
    events `load`/`loadError`/`render`/`renderError`/`loop`/`complete`.
  - `@fontsource/andika@5.3.0` file list (unpkg `?meta`): `andika-latin-700-normal.woff2` 19,472 B,
    `andika-vietnamese-700-normal.woff2` 8,288 B, latin-400 19,208 B, vietnamese-400 8,280 B.
- **Artifact language:** English. No em-dash or en-dash characters (Vietnamese UI copy quoted from the spec uses `-`).

---

## 0. Summary

CR-82 B+C is a **client-only** change: no migration, no new RPC, no new runtime dependency, no server write
(§6.4 confirms). It ships in **ten independently buildable milestones** (§7): M1 foundations (config + tokens +
guards), M2 hero scene, M3 materials + typography + board, M4 mascot rig with static fallback + Lottie budget, M5 exam
paper surface + navigator + review sheet, M6 letter tracing, M7 Spell-it + Gap bank + dual input, M8 hub IA +
flashcards, M9 micro-interactions + rewards + sfx, M10 final integration gate + evidence pack.

The five load-bearing calls this document makes (each with an Options Matrix or rationale below):

1. **D-01 Spell-it has no carrier today** - the `listening-fill-blank` kind is generated only in tests and never reaches
   a child (GT-1). Ruling: G1-2 Round 2 composition changes to carry Spell-it; tracing goes into G1-2 Round 1.
2. **D-08 Lottie assets = geometry-shared, script-generated JSON first** (placeholder-first with real motion), with a
   drop-in path for commissioned art. Static SVG pose set and Lottie frame 0 come from one geometry source.
3. **D-03 Bundle gate is already red** - CR-82 is measured as a **delta** against the pre-CR-82 baseline, and the two
   heaviest new surfaces (tracing, flashcards) are lazy chunks.
4. **D-05 `useDragTile` is generalized, not forked** - it currently drops a bank tile on the same-numbered slot as a
   no-op (`dest !== source`, GT-2) and positions its ghost with `left/top`; both are fixed behind backwards-compatible options.
5. **D-04 Grade-specific behaviour (G1 vs G2 caps/tolerances) is baked into question payloads at round-build time**,
   not read from context, because `useViewer().band` only knows G12 vs G345 (GT-4).
6. **D-20 One owner allocates every Lottie player on the board** (mascot + prompt illustration + feedback picture), so
   the constitution #5 / PRD AC-2.9 cap (≤1 before answering, ≤2 after) holds for the whole screen, not only the mascot.
   **D-21** keeps pre-round screens Lottie-free (PRD AC-2.5) until a human amends it. **D-22** makes lazy-chunk retry a
   real new import attempt.

---

## 1. Ground-truth findings that shape the plan (GT-##)

| ID | Finding (verified location) | Consequence |
|---|---|---|
| GT-1 | `generateListeningFillBlankQuestions` (`src/lib/generators/listeningFillBlank.ts:10`) has **no non-test caller**; Round 1 = extra-letter + image-choice, Round 2 = sentence-fill + listening-image-choice (`round1ExtraLetter.ts`, `round2ListeningSentence.ts`). Drill/exam modes run `ExamScreen`, not `QuestionCard`. | Spec §13.1 "Spell-it is the guaranteed carrier" would never render. Needs a round-composition decision (D-01). |
| GT-2 | `useDragTile.onPointerUp` calls `onDrop` only when `dest !== source` (`useDragTile.tsx:111`); ghost uses `style={{left, top}}` and hex classes (`:146-151`); ghost content is `dangerouslySetInnerHTML` of the source tile. | Bank index 2 dropped on slot 2 is silently ignored; ghost animates layout properties (spec §17 budget: transform/opacity only). Fixed in D-05. |
| GT-3 | Entry bundle already exceeds `check-bundle-budget.mjs` (224.55/121 kB JS, 13.08/10 kB CSS gzip, measured this session). | An absolute budget cannot be a CR-82 fitness function. D-03 delta budget + lazy chunks. |
| GT-4 | `ViewerContext` exposes `band: 'G12' \| 'G345'` and `density`, no grade number (`ViewerContext.tsx:23-36`). `RoundContentDefinition.buildQuestions(seed, words)` has no grade (`rounds/types.ts`). `batchSession.startRound` does know `gradeId`. | G1 vs G2 Spell-it caps (§13.4) and tracing tolerances (§12.4-§12.5) need the grade. D-04. |
| GT-5 | Every e2e batch flow defaults to `gradeIndex = 0` = grade-1 (`e2e/utils/batch-flow.ts:38`); `submitListeningAnswer` types into `answer-input` (`e2e/utils/practice-flow.ts:269`). | All G1-2 mechanics (tracing in R1, Spell-it + bank-default Gap in R2) hit the existing e2e suite. Helper updates are in the test-impact register (§8). |
| GT-6 | `e2e/mascot.spec.ts:71` locates the feedback mascot **inside** `answer-feedback`. | Sheet perch moves the mascot outside `FeedbackPanel` (§9.3). Spec locator must target the new `feedback-sheet` wrapper. |
| GT-7 | `EmojiLottiePlayer.tsx` already fetches **plain Lottie JSON** and passes it as `data` to `DotLottieReact`, with `setWasmUrl` self-hosting. | Spec Q11 resolved: plain JSON works; no `.lottie` packaging. Mascot player reuses the same lazy-chunk + self-hosted WASM pattern. |
| GT-8 | Andika 700 woff2: latin 19.5 kB, vietnamese 8.3 kB (fontsource 5.3.0). All letter geometry tokens use `font-bold` (700) only (spec §5.3). | Spec Q6 resolved: ship 700 only (~27.8 kB total, far under 60 kB/file). D-12. |
| GT-9 | `LandShell` is rendered by `App.shell()` **around** `BatchScreen` (`App.tsx:361-365, 515`); `BatchScreen` owns `progressFraction` (`BatchScreen.tsx:108`). | Journey value must cross a component boundary without re-rendering the board. D-06 imperative journey channel. |
| GT-10 | `end-confirm-ok` / `end-confirm-cancel` are used by `ExamScreen.endConfirm.test.tsx` (exam flow) and `e2e/end-early-confirm.spec.ts` (batch flow). `exam-review` is already the ExamResult answer-review list testid (`ExamResult.tsx:190`). | Review sheet needs new non-colliding testids; batch `ConfirmEndDialog` untouched. D-13. |
| GT-11 | `check-attribution.mjs` only inventories `public/{images,emoji,fonts,sfx}`. | `public/mascot/` must be added to the gate or new assets ship unchecked. M4 task. |
| GT-12 | Batch skill stats are recorded per round as aggregates (`RoundSummary.tsx:97`, `recordSkillAnswers(gradeId, skillKeyForRound(roundType), correct, total)`). | Spec §12.5 item 6 (exclude assisted tracing from mastery stats) needs per-answer meta and a round-level "skill counts" field. D-10. |
| GT-13 | `SpaceScene` paints 40 stars with every 5th twinkling (8) plus 7 `ambient-sparkle` dots plus `land-float` rocket (`LandScene.tsx:313-342, 51-76`). | Exceeds the OBJ-1 ≤12 animated-node budget; hero art must cap twinkles (FF-13). |
| GT-14 | `PhonicsWordChoiceQuestion.tsx:69` appends `[@media(max-height:420px)]:text-5xl` to `DISPLAY_GLYPH`. | Allowed under spec §5.3 rule 3 only because it is a responsive variant; it moves into `TYPE_HERO_GLYPH_GEO` so the call site appends nothing (rule 1). |
| GT-15 | `sfx.ts` has a single `active` element and no tiering; `speech.ts` exports no "is audio playing" query. | Tier rules (§16.3) need `isAudioPlaying()` added to `speech.ts`. M9. |
| GT-16 | `toy.tints` has no consumer outside `tokens.ts` (grep). | Safe deletion in M1 (spec §11). |
| GT-17 | `usePrefersReducedMotion` treats missing `matchMedia` as "no preference"; jsdom has no `matchMedia` unless stubbed (`src/test/setup.ts`). | Mascot Lottie must not mount in jsdom or every component test pays the 171 kB player chunk (cf. `vite.config.ts` comment). D-09. |
| GT-18 | Constitution #5 / check C5 and PRD AC-2.9: max 1 Lottie player before answering ("the single-image prompt"), max 2 after (feedback picture + mascot). Today `ImageChoiceQuestion.tsx:41-46` and `Phonics{Sound,Ending,Rhyme}ChoiceQuestion.tsx` request `animated` prompts; `FeedbackPanel.tsx:125` requests an `animated` picture; `GiftBoxPicker.tsx:103` an animated reward. | A Lottie board mascot would make 2 players pre-answer and 3 post-answer. Needs one allocator (D-20). |
| GT-19 | PRD AC-2.5: "When the GradeSelect and StartBatch screens are shown, no request is made for the dotLottie player chunk, any .wasm file, or any /emoji/lottie/ file". | An animated `greeting` mascot on GradeSelect/StartBatch violates AC-2.5 (D-21). |
| GT-20 | `React.lazy` stores the rejected promise on the lazy **type** (`node_modules/react/cjs/react.development.js` `lazyInitializer`), so an error-boundary reset or key bump rethrows the same rejection. | "Retry" by remount is not a retry (D-22). |
| GT-21 | `InstructionSpeaker` props are `{ text, lang?, autoplayKey? }` (`InstructionSpeaker.tsx:35-42`); statuses come from `speakInstruction` as `InstructionStatus = 'playing' \| 'ended' \| 'blocked' \| 'unavailable' \| 'error'` (`speech.ts:535-540`), not `SpeechPlaybackStatus`. A blocked autoplay releases its key and arms a gesture retry. | D-15 needs an explicit callback prop and status mapping. |
| GT-22 | `GradeSelect.tsx:179, 227+` already paints a per-card `LandStrip` with literal hex fills. | The spec §6.6 postcard replaces it with `LandScene variant="strip" tone="day"` (palette-sourced, FF-6 scope widens to GradeSelect). |
| GT-23 | `e2e/emoji-visual.spec.ts` asserts the mascot is a Twemoji pig (`:48-58`), uses the `✨`/`🎉` EmojiVisual mascot accents for Lottie mounts (`:106-145`, `:207-218`), counts every `<canvas>` as a Lottie player (`:121-144`), and requires no Lottie traffic on pre-round screens (`:178-193`). Since CR-72 the mascot is an inline SVG with `IconSparkles`/`IconParty` accents, so the pig/accent assertions are already stale on `main`. | Register entry with superseded/retained assertions (§8.1). |

---

## 2. Decisions (D-##)

Material decisions with two or more viable paths carry an Options Matrix and a recommendation; the human may override any
`Ruling:` below at the Tech gate. Smaller decisions carry a one-paragraph rationale.

### D-01 - Where Spell-it and tracing appear (round composition) - Options Matrix

Spec Q4 leaves tracing composition to "BA/Tech Lead" with constraints (≤2 per round, never the first question of a
session). Spell-it composition is unstated, and GT-1 shows there is no current carrier.

| Option | Strengths | Weaknesses | Risk | Domain fit |
|---|---|---|---|---|
| A. Do nothing (Spell-it only where `listening-fill-blank` appears) | zero composition change | Spell-it never renders -> CR-82 C2 acceptance ("at least one new drag surface") fails unless Gap validates | certain acceptance failure if `GAP_BANK_TOPICS` is thin | n/a |
| **B. G1-2 Round 2 = 3 `listening-image-choice` + 4 `listening-sentence-fill-blank` + 3 `listening-fill-blank` (Spell-it eligible words only); G1-2 Round 1 = 6 extra-letter + 2 image-choice + 2 `letter-tracing` at fixed positions 4 and 8; G3-5 unchanged (recommended)** | both new mechanics guaranteed on every G1-2 batch; Spell-it is a listening task so it fits the listening round; tracing is letter-level so it fits the letter round; each round stays 10 questions so points/max-points/timer contracts are unchanged; typing load for pre-writers drops from 5 to 4 items | changes the G1-2 kind mix that e2e and round tests assert; round 1 title "Bắn chữ cái thừa" no longer describes 2 of 10 items | low - composition constants are isolated per builder | high: pre-writers get gesture input in both letter and listening rounds |
| C. New 5th round for G1-2 mechanics | no mix change in existing rounds | breaks the fixed 4-round contract (`practice.results.rounds_completed`, BatchSummary, timers, AC17) | high - touches DB-visible counts | low |

**Ruling (Tech Lead, reversible): B.** Constants live in the two round builders (`ROUND_1_G12_*`, `ROUND_2_G12_*`) so a
BA/human change is a constant edit. Tracing positions are fixed indices 3 and 7 (0-based) after the existing seeded
shuffle - never index 0. If a grade pool yields fewer than 2 traceable letters or fewer than 3 Spell-it-eligible words,
the builder backfills with the round's original kind so the round still has 10 items (never short). BA confirms the
G1-2 mix and whether Round 1's title should change for G1-2 (handoff H-1, non-blocking: Developer may proceed on B).

### D-02 - Tracing letter scope

Spec §12.2 types `letter` as `'a'..'z' | 'A'..'Z'`. Stroke data is authored per glyph against Andika single-story forms.

**Ruling: CR-82 ships stroke data for the 26 lowercase letters only; the generator emits lowercase items only.** The type
keeps the uppercase range so adding uppercase later is data-only. Rationale: example words are lowercase vocabulary, the
single-story `a`/`g` argument (OM-2) is about lowercase, and 52 hand-authored glyphs double the Tester calibration load
(Q9). The example word is the first word (seeded order) in the grade pool that starts with the letter and has an emoji
or approved image; letters with no example word in the pool are not eligible. Recorded for BA (H-2).

### D-03 - Bundle budget for CR-82 (pre-existing red gate)

| Option | Strengths | Weaknesses | Risk |
|---|---|---|---|
| A. Keep the absolute gate (121/10 kB) | no script change | already failing; CR-82 cannot be judged by it; teaches everyone to ignore it | gate stays meaningless |
| **B. Delta gate vs a recorded pre-CR-82 baseline + lazy chunks for heavy surfaces (recommended)** | measures what CR-82 adds; executable; honest about the inherited debt | the inherited 100+ kB overrun stays a separate debt item | low |
| C. Fix the inherited overrun inside CR-82 | gate green again | scope creep (lazy vocabulary is the known root, deferred in advisory A-28) | high schedule risk |

**Ruling: B.** `scripts/check-bundle-budget.mjs` gains a `CR82_BASELINE` block (JS 224.55 kB, CSS 13.08 kB gzip as
measured on the commit M1 branches from; the Developer re-measures and records the exact numbers in the M1 commit) and
fails if CR-82 adds more than **+20 kB JS gzip** or **+4.0 kB CSS gzip** to the entry chunks, or if the lazy chunks
exceed: `LetterTracingQuestion` ≤ 12 kB gzip, `FlashcardScreen` ≤ 12 kB gzip, `MascotLottie` adds 0 kB to the entry (it
shares the existing dotlottie async chunk). The inherited overrun is logged in `docs/MEMORY.md` "Open threads" as its
own debt item. Lazy: `LetterTracingQuestion` (prefetched by `BatchScreen` when the current round contains a tracing
item), `FlashcardScreen` (route-level). Eager: Spell-it/Gap (small, share `useDragTile`), exam dialogs (small).

### D-04 - Grade-specific behaviour is baked into payloads at build time

`RoundContentDefinition.buildQuestions` becomes `(seed, words, ctx?: { gradeId: string }) => Question[]` (optional third
parameter, all current call sites stay valid); `batchSession.startRound` passes `{ gradeId }`. Builders compute:
`ListeningFillBlankQuestion.spell` (tiles, only when `spellEligibility(word, grade).eligible`),
`ListeningSentenceFillBlankQuestion.bank` (only when the validator passes), `LetterTracingQuestion.grade` (1 | 2).
Components render what the payload carries and additionally require `band === 'G12'` as defense in depth. Rationale:
spec §13.4 requires eligibility "decided once per item, before render ... never by viewport"; payload data is pure,
seeded and unit-testable; no Viewer API change.

### D-05 - Drag mechanics: generalize `useDragTile` in place

`useDragTile` keeps its signature and gains optional fields (pair-matching call site unchanged):

```ts
useDragTile(opts: {
  enabled: boolean;
  targetAttr: string;                 // existing
  onDrop: (sourceIndex: number, targetIndex: number) => void;   // existing
  /** v5: source and target indexes live in different namespaces (bank vs slots) -
   *  drop is delivered even when sourceIndex === targetIndex. Default false (pair-matching semantics). */
  crossNamespace?: boolean;
  /** v5: pointerup over no target - caller springs the tile back or returns it to the bank. */
  onDropOutside?: (sourceIndex: number) => void;
  /** v5: React ghost renderer replaces innerHTML cloning (removes dangerouslySetInnerHTML). */
  renderGhost?: (sourceIndex: number) => ReactNode;
  /** v5: ghost class set (DRAG_GHOST; reduced motion drops scale/rotate). Default keeps today's look via tokens. */
  ghostClassName?: string;
});
```

Ghost positioning switches from `left/top` to `transform: translate3d(x, y, 0)` on a `fixed left-0 top-0` node (compositor
only). The 8px threshold, click-suppression rule, `pointercancel`/`lostpointercapture` cleanup and rAF throttling are kept
verbatim. Spell-it uses two hook instances: bank tiles -> `data-slot-index` targets, placed tiles -> `data-bank-drop`
target (returning to the bank). Canonical reference: MDN Pointer Events `setPointerCapture`
(https://developer.mozilla.org/docs/Web/API/Element/setPointerCapture); WCAG 2.2 SC 2.5.7 Dragging Movements
(https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements).

### D-06 - Journey pan channel (LandShell <- BatchScreen)

| Option | Strengths | Weaknesses |
|---|---|---|
| A. Lift `progressFraction` into `App` and pass `journey` to `LandShell` | plain props | App recomputes live score on every answer; widens App's responsibilities |
| **B. `SceneJourneyContext` provided by `LandShell`; `BatchScreen` calls `useSceneJourney(fraction, roundKey)`; the setter writes `--journey` and `data-round` imperatively on the scene root ref (recommended)** | zero React re-render of board or scene on advance; works for any future surface; the CSS transition does the motion | imperative DOM write (contained in one hook, unit-testable via the root's style) |
| C. Global CSS variable on `document.documentElement` | trivial | global state; leaks across screens; untestable ownership |

**Ruling: B.** `LandScene` also accepts the `journey` prop from the spec (§6.2) for static callers and tests; the context
path is what `BatchScreen` uses. `--pan` is set per layer in CSS and forced to `0` by
`@media (prefers-reduced-motion: reduce), (max-height: 420px)`, so neither reduced motion nor short landscape needs JS.
Round reset: when `roundKey` changes, the hook sets `--journey: 0` and toggles `data-round-reset` for the 400ms L2/L3
crossfade (removed on `animationend`; instant under reduced motion).

### D-07 - Hero scene composition and art split

`LandScene.tsx` (351 lines of mixed art) is split: `src/components/scene/art/{sky,playground,town,jungle,city,space}.tsx`
each export `{ Far, Mid, Near }` functional components that take a `ScenePalette` and render SVG children only.
`LandScene` composes them: `variant="strip"` renders Far+Mid+Near in one `<svg>` (v4 behaviour, filter removed in favour
of `tone`), `variant="hero"` renders L0 sky div, three `scene.layer` divs each with its own
`<svg viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax slice">`, and the L4 scrim. All fills come from
`scenePalette(land, tone)` (no hex in components; FF-6). `Moon` is a new art helper in `scene/art/shared.tsx` with
`Sun`, `Cloud`, `Hills`, `AmbientSparkles`. Visibility pause: `LandScene` hero sets `data-scene-paused` on
`visibilitychange`; CSS `[data-scene-paused] * { animation-play-state: paused }`. Unknown land: `LANDS[land] ?? getLand`
in `LandShell` and `SCENE_BASE[land] ?? SCENE_BASE.sky` in `scenePalette` (spec §6.2 N3).

### D-08 - Lottie asset strategy (see §9 for the full asset contract) - Options Matrix

| Option | Strengths | Weaknesses | Risk |
|---|---|---|---|
| A. Commission an animator for 6 poses before ship | richest motion | no animator/pipeline exists (spec OM-3); blocks on an external party; frame-0 parity with the SVG poster is manual | high schedule risk; asset never arrives -> static everywhere |
| B. Developer hand-writes bodymovin JSON in an editor | no external party | error-prone (bezier vertex arrays by hand), unreviewable diffs, frame-0 parity is manual, palette drift | medium-high defect risk |
| C. Placeholder-only (ship all poses static, log 6 gaps in MEMORY) | trivial; spec-legal via §9.5 fallback | ignores the human OM-3 ruling "Lottie JSON NOW" in substance | process risk (ruling satisfied only on paper) |
| **D. Geometry-shared, script-generated Lottie (recommended)** - pose geometry is authored once as data (`src/lib/mascot/poses.ts`: ellipses + cubic paths + named groups, palette keys only); the static SVG renderer draws it; `scripts/gen-mascot-lottie.ts` (run with the `vite-node` binary that ships with vitest) emits `public/mascot/be-heo-<pose>.json` with transform/opacity keyframes on the same groups (breathe, blink, hoof wave, dots) | frame 0 equals the static pose by construction; palette locked to `MASCOT_PALETTE`; deterministic, reviewable diffs; real Lottie motion ships in CR-82; commissioned art can later replace any file by name (manifest switch) | motion limited to rigid group transforms (no mesh/morph) - "less fluid" than hand animation | low |

**Ruling (Tech Lead, firm): D, placeholder-first in the sense that the generated assets are the CR-82 deliverable and
commissioned files are a drop-in upgrade.** Each pose's source is declared in `src/lib/mascot/assets.ts`
(`MASCOT_ASSET_SOURCE: Record<MascotMood, 'generated' | 'commissioned' | 'missing'>`). `missing` makes `Mascot` skip the
fetch entirely (static renderer, no 404 noise) and is the state a pose is in until its file lands; any `missing` at
deploy time is logged in `docs/MEMORY.md` per spec §9.5.

### D-09 - Mascot renderer decision and test determinism

`MascotRig` mounts Lottie only when **all** hold: `size !== 'inline'`; `typeof window.matchMedia === 'function'`;
`usePrefersReducedMotion() === false`; `MASCOT_ASSET_SOURCE[mood] !== 'missing'`; the session runtime breaker is not
tripped; this pose has not failed this session. Otherwise it renders `MascotStaticPose`. Missing `matchMedia` is
treated as "static" for the mascot only (old webviews and jsdom), which keeps every component test on the static
renderer with no test-only branch (GT-17). Tests assert `data-mascot-mood` + `aria-label` (spec §9.5), never the renderer.

### D-10 - Tracing telemetry and assisted exclusion

`QuestionCard` gets `onSubmitTracing(isCorrect: boolean, meta: TracingMeta)`, `TracingMeta = { assisted: boolean;
attempts: number[] }`. `practiceSession.submitTracingAnswer` stores `meta` on `CurrentAnswer.tracing` and sets
`AnswerRecord.assisted`. `RoundOutcome` gains `skillCorrect`/`skillTotal` = counts excluding assisted answers;
`RoundSummary` passes those to `recordSkillAnswers` (points, stars, quests still use `correctCount`, so assisted items
are never punished - spec R-v5-07). Skill bucket: `KIND_TO_SKILL['letter-tracing'] = 'spelling'`. Nothing is persisted
beyond the existing engagement blob counters (no schema change, §6.4).

### D-11 - Flashcard entry route and lazy loading

New `Screen` value `'flashcards'` in `App.tsx`; `StartBatchScreen` gets `onStartFlashcards()`. The route renders the
flashcard screen through the retryable lazy factory of **D-22** inside a `FlashcardErrorBoundary` (new, pattern of
`EmojiVisualErrorBoundary`). Chunk-load failure and deck-build exceptions both render the spec §14.5 **load error**
panel. "Thử lại" starts a genuinely new import attempt (D-22), not a remount of the same lazy type (GT-20). After two
fresh attempts have failed, the panel also shows "Tải lại trang" (deliberate `location.reload()`, see D-22). The
copy already says "Nếu vẫn lỗi, báo bố mẹ giúp em". Shell: `hero`, grade land, tone by band, no journey.

### D-12 - Andika delivery

Vendor `andika-latin-700-normal.woff2` and `andika-vietnamese-700-normal.woff2` from `@fontsource/andika@5.3.0` into
`public/fonts/andika/` with `OFL.txt` (no `package.json` change; sha256 recorded in the attribution entry). Two
`@font-face` rules (weight 700, `font-display: swap`, the same `unicode-range` split as Baloo 2), no preload. 400 is not
shipped because no token uses it (spec §5.3 letter geometry = `font-bold`). Size gate FF-15.

### D-13 - Review-before-submit testids

| Option | Strengths | Weaknesses |
|---|---|---|
| A. Reuse `end-confirm-cancel` / `end-confirm-ok` on the review sheet | zero test churn | spec §15.4 names `exam-review-submit`; "end-confirm" names on a review sheet mislead future readers |
| **B. New ids `exam-review-sheet`, `exam-review-back`, `exam-review-submit`, `exam-review-jump-{index}`; update exam-mode cases of `ExamScreen.endConfirm.test.tsx` in the same commit (recommended)** | spec-faithful; no collision with ExamResult's `exam-review` list (exact-match testids) | 3 test cases edited (listed in §8) |

**Ruling: B** (spec §15.4 explicitly allows "tests update in the same commit"). Practice mode keeps `ConfirmEndDialog`
and its `end-confirm-*` ids; batch `KẾT THÚC` is untouched.

### D-14 - Gap input-mode flag storage

Hook `useGapInputMode()` (new, `src/hooks/useGapInputMode.ts`) reads/writes `sessionStorage['ea-gap-input-mode']`
(`'bank' | 'type'`), with a module-level fallback variable when storage throws - the exact degradation pattern of
`useDemoHint`. Default `'bank'`. Only consulted on bank-eligible G1-2 items; V8 audio failure forces `'type'` for that
item without writing the preference.

### D-15 - `thinking` pose triggers

`useThinkingPose({ enabled: band === 'G12' && !hasAnswered && !isDrawing, resetKey: question.id, idleStartAt,
audioLoading })` lives in `QuestionCard` (the board owns the perch, so it owns the pose). It returns `true` after 12 s
with no `pointerdown`/`keydown` inside `question-card` counted from `idleStartAt`, or while `audioLoading` has been true
for more than 400 ms (so a fast cache hit never flickers the pose). G3-5 never enables it.

**Instruction signal (GT-21).** `InstructionSpeaker` gains one optional prop
`onSettled?: (outcome: 'ended' | 'not-played') => void`, called at most once per mount. `QuestionBanner` forwards it as
`onInstructionSettled`; `QuestionCard` passes a handler that sets `idleStartAt = now`. Mapping:

| Instruction situation | `InstructionStatus` / cause | `onSettled` | Idle clock starts |
|---|---|---|---|
| spoke to the end (or user-cancelled) | `ended` | `'ended'` | at that moment |
| autoplay refused by the browser | `blocked` | `'not-played'` | immediately (the existing gesture retry stays armed; a later successful replay does not restart the clock) |
| no TTS / no voice | `unavailable` | `'not-played'` | immediately |
| speech error | `error` | `'not-played'` | immediately |
| dropped because content audio was busy (autoplay never interrupts content) | reported as `ended` by `speakInstruction` | `'ended'` | immediately |
| skipped: key already played this round (once-per-round rule) or no `autoplayKey` | no speak attempt | `'not-played'` (synchronously in the mount effect) | at question mount |
| still `playing` | `playing` | not called | clock not running |

**Audio-loading signal (child -> board).** No new audio channel is introduced. `useAudioPlayback` gains `isLoading`
(true between `play()`/`playSlow()` and the `started`/`error`/`unsupported` status). Question bodies that own word or
sentence audio (`ListeningFillBlankQuestion`, `ListeningSentenceFillBlankQuestion`, `ListeningImageChoiceQuestion`,
`LetterTracingQuestion` exhibit speaker, phonics kinds with a speaker) report it through one optional callback that
`QuestionCard` already threads like `speakerKey`: `onAudioLoadingChange?: (loading: boolean) => void`, called from a
`useEffect` on `isLoading`. `QuestionCard` keeps the latest value in state and passes it to `useThinkingPose`.

When `thinking` fires it replays the instruction once (`speakInstruction`, deliberate, `autoplay: false`) and re-arms
`useDemoHint` for the kind (spec §9.2). Tests: `useThinkingPose.test.tsx` (each mapping row, 400 ms debounce, reset on
input, disabled for G345 and while drawing) and `InstructionSpeaker.test.tsx` additions (`onSettled` fires exactly once
per status class).

### D-16 - Flashcard-card mascot placement (spec gap)

Spec §9.3 requires exactly one mascot on "Flashcard card", but §14.3's anatomy shows none. **Ruling:** a `companion`
`idle` mascot perches on the top-left edge of the card stack (`absolute -top-9 left-2`, outside `flashcard-card`,
`aria-hidden` wrapper, `pointer-events-none`), mirroring the board perch; it switches to `happy` for 600 ms after
"Em nhớ rồi" and `encouraging` for 600 ms after "Ôn lại" (static under reduced motion). `DEVIATION` (fills a gap, no
contradiction) - **APPROVED** by the Design Lead (§14.2). The perch mascot is the screen's single Lottie player; card
images render static (D-20).

### D-17 - Star-fly origin and target

`BatchScreen` provides `RewardFxContext { registerScoreTarget(el), fireStar(origin: DOMRect) }`; `LiveScore` registers its
chip; `QuestionCard` calls `fireStar` on a correct verdict with origin = `document.activeElement` rect when it is inside
`question-card` (the tapped tile, or `submit-answer-button` for typed/drag kinds), else the card's centre.
`StarFlyLayer` renders one `fixed` `IconStar` animated with `--fx/--fy` (spec §5.4 `star-fly`). Reduced motion: no fly;
`LiveScore` gets the 600 ms `ring-2 ring-amber-300` highlight.

### D-18 - Exam flags and shortcuts are UI state

Flags are `useState<ReadonlySet<number>>` in `ExamScreen`, cleared in `begin()` and on finish (MEMORY lesson "stale
confirm state"); never written to `ExamState`, telemetry or results. Shortcuts live in `useExamShortcuts` (new) bound
on `document` only while no dialog is open and focus is not in `input/textarea/[contenteditable]`.

### D-19 - `inert` typing

`src/types/react-inert.d.ts` augments `react`'s `HTMLAttributes` with `inert?: ''`. React 18 forwards the string
attribute; boolean `true` is never used (React 18 drops/warns on it). Browsers without `inert` still get
`aria-hidden="true"`, and the inactive face contains no focusable descendants (the speaker is a sibling of
`flashcard-flip`), so tab order is unaffected. Canonical: MDN `inert` (https://developer.mozilla.org/docs/Web/HTML/Global_attributes/inert).

### D-20 - Lottie player budget owner (whole screen, not only the mascot) - Options Matrix

Binding cap (GT-18): constitution #5 / C5 and PRD AC-2.9 - at most **1** Lottie player before answering, at most **2**
after, at most **1** on non-question screens, **0** in grids/repeated contexts. Tracing canvases are not Lottie players.

| Option | Strengths | Weaknesses | Risk |
|---|---|---|---|
| A. Each component decides on its own (status quo + mascot) | no new code | 2 players pre-answer, 3 post-answer - violates C5/AC-2.9 | certain constitution breach |
| B. "Only the mascot animates on the board; every EmojiVisual there is static" | simplest rule | removes the existing P1 prompt animation that AC-2.9 names as the pre-answer player; feedback picture never animates | regresses shipped behaviour |
| **C. One board-level allocator with a fixed, state-derived policy (recommended)** | deterministic, unit-testable, one place to read; preserves prompt animation where it exists today; every suppressed illustration keeps its visible static twin (EmojiVisual svg/image mode, mascot static pose) | one small context + 6 caller edits | low |
| D. Amend the constitution to allow 2 pre-answer | richer motion | needs a human constitution amendment for decorative gain only | process risk |

**Ruling: C.** `src/components/fx/LottieBudget.tsx` (new) exports `LottieBudgetProvider`, `useLottieSlot(owner)` and the pure
`allocateLottie(state)`. `QuestionCard` is the only provider on play surfaces; it computes:

| Board state | Prompt illustration | Board / sheet mascot | Feedback picture | Max players |
|---|---|---|---|---|
| unanswered, prompt animation-eligible (`animated` requested AND `hasLottie(emojiKey)` AND not reduced motion) | **Lottie** | static pose | n/a | 1 |
| unanswered, prompt not eligible (no prompt, photo, or no Lottie asset) | static | **Lottie** (idle / thinking) | n/a | 1 |
| answered, sheet perch shown | static (prompt stays mounted under the sheet) | **Lottie** (happy / celebrating / encouraging) | **Lottie** if eligible | 2 |
| answered, short landscape (inline mascot) | static | static (inline is always static, D-09) | **Lottie** if eligible | 1 |
| reduced motion / no `matchMedia` | static | static | static | 0 |

Outside `QuestionCard` the default slot policy is "mascot only" (one player): GradeSelect, AuthScreen, StartBatch are
additionally governed by D-21; RoundSummary has the mascot only (StarRain/ChestReveal become SVG in M9);
BatchSummary has the mascot plus `GiftBoxPicker`'s reward illustration, which is allowed (post-answer reward moment,
2 max) but `GiftBoxPicker` reads `useLottieSlot('reward')` so the screen provider can never exceed 2. Flashcards: card
images render **static** (`animated={false}`, a repeated context) and the perch mascot is the single player.

Caller changes (file level): `ImageChoiceQuestion.tsx`, `PhonicsSoundChoiceQuestion.tsx`,
`PhonicsEndingChoiceQuestion.tsx`, `PhonicsRhymeChoiceQuestion.tsx` pass `animated={useLottieSlot('prompt')}` instead of
the literal `animated`; `FeedbackPanel.tsx` passes `animated={useLottieSlot('feedback')}` on the picture;
`GiftBoxPicker.tsx` passes `animated={useLottieSlot('reward')}`; `MascotRig` adds `useLottieSlot('mascot')` to its D-09
conditions. `EmojiVisual` itself is unchanged (its `animated=false` path is the static twin). For measurement, the two
player wrappers get `data-lottie-player="emoji"` (`EmojiLottiePlayer.tsx`) and `data-lottie-player="mascot"`
(`MascotLottie.tsx`); tests count `[data-lottie-player] canvas`, never bare `canvas` (tracing has a canvas).

Tests: `LottieBudget.test.ts` (every row of the allocation table as a pure function), `QuestionCard.lottieBudget.test.tsx`
(rendered image-choice question with a Lottie-eligible emoji: before submit exactly one owner reports animated; after
submit at most two, prompt static), and the e2e player-count assertions in §8.1 (`emoji-visual.spec.ts`).

### D-21 - Pre-round screens stay Lottie-free (PRD AC-2.5) - Options Matrix

| Option | Strengths | Weaknesses |
|---|---|---|
| **A. GradeSelect, AuthScreen and StartBatch render the static `greeting` pose; the first player/WASM/JSON request happens on the first question (recommended default)** | complies with AC-2.5 as written; no amendment needed; StartBatch stays the fastest screen | the greeting wave is a still pose on those three screens (ExamIntro and summaries still animate) |
| B. Amend AC-2.5 so the mascot may load one player on pre-round screens after first paint (`requestIdleCallback`) | greeting moves everywhere, matching OM-3 literally | requires a human/BA amendment of an approved AC; adds a 1.2 MB WASM fetch before play starts on slow networks |

**Ruling: A as the shipped default**, implemented as one constant `PRE_ROUND_MASCOT_ANIMATED = false` in
`src/lib/mascot/assets.ts` consulted by `MascotRig` via the screen-level slot policy. Flipping it to B is a one-line
change after a recorded human amendment of AC-2.5 (handoff H-8). The existing `emoji-visual.spec.ts` AC-2.5 test is
therefore retained, not deleted.

### D-22 - Retryable lazy chunks (flashcards route + tracing chunk)

GT-20: a `React.lazy` type caches its rejection, so remounting retries nothing. Contract (`src/lib/retryableLazy.ts`, new):

```ts
export function createRetryableLazy<P>(load: () => Promise<{ default: ComponentType<P> }>): {
  /** One lazy type per attempt number; a new number = a new type = a new load() call. */
  typeFor(attempt: number): LazyExoticComponent<ComponentType<P>>;
  /** How many times load() has actually been invoked (fresh attempts). */
  invocations(): number;
};
```

`typeFor` memoizes by attempt number (so re-renders within one attempt do not refetch) and wraps `load` to increment an
invocation counter before calling `import()`. Callers keep `attempt` in state; "Thử lại" increments it, the error
boundary resets with `key={attempt}`, and React renders a brand-new lazy type whose initializer calls `import()` again.

- **Fresh vs cached failure.** The boundary records `invocations()` at each caught error. A failure counts as a
  **fresh failed attempt** only if `invocations()` increased since the previous caught error. A rethrow without a new
  invocation (cached type, render exception after load) is not counted as a load attempt.
- **Browser module-map caching.** Some engines may cache a failed module fetch for the same URL, so a fresh `import()`
  can reject again even after connectivity returns. Documented fallback: after **two fresh failed attempts** the
  flashcard panel adds "Tải lại trang" (`location.reload()`; the child lands on GradeSelect - nothing is lost because
  flashcard ratings are saved per decision). The tracing chunk never offers reload mid-batch (it would discard round
  progress held in `App` state).
- **Tracing.** `QuestionCard` renders the tracing body through its own `createRetryableLazy` instance inside
  `TracingChunkBoundary`: failure 1 -> inline paper panel "Chưa mở được bài tô chữ" + "Thử lại"; "Bỏ qua câu này"
  appears **only after a second fresh failed attempt** (invocation count ≥ 2 with both attempts rejected), and calls
  `onSubmitTracing(true, { assisted: true, attempts: [] })` (assisted -> excluded from skill stats, D-10). A render
  exception after a successful load (not a load failure) shows the same panel but is never counted toward the skip threshold.
- **Prefetch.** `BatchScreen`'s tracing prefetch calls the same `load` (attempt 0), so a successful prefetch is reused.

Tests (`src/lib/retryableLazy.test.tsx`, `FlashcardRoute.retry.test.tsx`, `TracingChunkBoundary.test.tsx`): a loader
mock that rejects once then resolves - first render shows the load-error panel; activating "Thử lại" calls the loader a
second time (invocations = 2) and renders the real component. Second mock rejects twice: flashcards show "Tải lại trang"
(reload spied, not executed), tracing shows "Bỏ qua câu này" only after the second invocation. Third mock throws a
render error after a successful load: invocation count stays 1 and the skip never appears. One e2e smoke in
`cr82-flashcards.spec.ts`: `page.route` aborts the flashcard chunk once, restore routing, click `flashcard-error-retry`,
assert `flashcard-card` renders.

---

## 3. File map (every new or changed file, one line each)

Legend: **N** new, **C** changed, **D** deleted content. Milestone in brackets.

### 3.1 Config, styles, tokens, theme

| File | Kind | Change |
|---|---|---|
| `tailwind.config.js` | C | `colors.navy.{950,900,850,800,700,650,600,500,rim,base,chrome}`, `colors.desk.{DEFAULT,bar,well,card,line}`; `fontFamily.letter`; `transitionTimingFunction.{out-quint,out-expo,in-out-soft,toy}`; `transitionDuration.{80,160,240,400}`; keyframes + animations `press-release`, `snap-in`, `streak-burst`, `star-fly`, `scene-drift-far`, `scene-reset-fade` [M1] |
| `src/index.css` | C | Andika `@font-face` x2; `.scene-layer` `--pan` vars per band + `@media (prefers-reduced-motion: reduce), (max-height:420px) { --pan: 0 }`; `[data-scene-paused]` pause rule; `land-twinkle` 6.5 s, `ambient-sparkle` 7 s, `land-float` 7 s; reduced-motion block adds every new class + `.tile-shake`, `.dart-arrow`, `.trace-start-pulse`, `.audio-bars` [M1] |
| `public/fonts/andika/andika-latin-700-normal.woff2` | N | vendored font [M1] |
| `public/fonts/andika/andika-vietnamese-700-normal.woff2` | N | vendored font [M1] |
| `public/fonts/andika/OFL.txt` | N | SIL OFL 1.1 license (attribution gate requires it) [M1] |
| `public/attribution.json` | C | Andika collection [M1]; mascot collection [M4]; sfx entries [M9] |
| `src/lib/ui/tokens.ts` | C | `scene.{root,skyDusk,skyNight,horizonGold,horizonGoldNight,scrim,layer}`; `material.*` (board, tileFace/Hover/Press/Disabled/Focus/Correct/RevealCorrect/PickedWrong, exhibitPaper, paperSlate, goldCta, chrome); `TYPE_*_GEO`, `INK_*`, surface composites; `EXAM_DESK/SHEET/SHEET_HEADER/QNUM/OPTION_PAPER/OPTION_KEY/SELECTED_PAPER/NAV_FLAGGED/NAV_CELL_PAPER/NAV_ANSWERED_PAPER/TIMER/TIMER_URGENT/VERDICT_CORRECT/VERDICT_WRONG/PRACTICE_NEXT/RING_LABEL`; `SPELL_SLOT/_TARGET/_FILLED`, `SPELL_TILE`, `WORD_CHIP`, `GAP_INPUT_TOGGLE`, `SENTENCE_GAP`, `DRAG_GHOST`; `TRACE_*`; `FLASH_*`, `BTN_FLASH_AGAIN/KNOWN`, `CHIP_PAPER_EMERALD/SKY`; `GOLD_HAIRLINE`; `TRAIL_TILE_ARENA`; `CTA_GOLD_XL` re-materialized; `DISPLAY_GLYPH` = alias of `TYPE_HERO_GLYPH_NAVY`; `toy.tints` deleted; `HUB_ICON_TINTS` violet -> amber [M1] |
| `src/lib/ui/theme.ts` | C | `Land.horizonGlow`; city/space recolor per spec §5.1; `SceneTone`, `ScenePalette`, `SCENE_BASE`, `mixHex()`, memoized `scenePalette(land, tone)` with `?? sky`; `MASCOT_PALETTE` [M1] |
| `src/types/react-inert.d.ts` | N | `inert?: ''` augmentation (D-19) [M1] |
| `src/components/celebrations/Confetti.tsx` | C | `COLORS` drops `#a78bfa` per spec §11 [M1] |

### 3.2 Scene (B1)

| File | Kind | Change |
|---|---|---|
| `src/components/scene/LandScene.tsx` | C | composition only: `variant` (`'strip'` default), `tone`, `journey`; hero layers L0-L4; `night` prop maps to `tone='night'` [M2] |
| `src/components/scene/art/shared.tsx` | N | `Sun`, `Moon`, `Cloud`, `Hills`, `AmbientSparkles` taking palette colors [M2] |
| `src/components/scene/art/{sky,playground,town,jungle,city,space}.tsx` | N | per-land `{ Far, Mid, Near }` split of today's art; city/town/space recolor; ≤12 animated nodes [M2] |
| `src/components/scene/SceneJourneyContext.tsx` | N | context + `useSceneJourney(fraction, roundKey)` imperative setter (D-06) [M2] |
| `src/components/LandShell.tsx` | C | `tone`, `variant`, journey provider, unknown-land guard [M2] |
| `src/App.tsx` | C | `shell(node, { gradeId?, scene })` with tone by band; hero on StartBatch/Batch/Flashcards/GradeSelect/Auth; `'flashcards'` screen + lazy route (D-11); tracing submit handler [M2, M6, M8] |
| `src/components/BatchScreen.tsx` | C | `useSceneJourney(progressFraction, roundKey)`; chrome strip -> `material.chrome`; `RewardFxContext` provider; tracing chunk prefetch [M2, M6, M9] |

### 3.3 Materials, typography, board (B2, B3)

| File | Kind | Change |
|---|---|---|
| `src/components/optionButtonStyle.ts` | C | `material.tile*` state map per spec §7.2 [M3] |
| `src/components/ExtraLetterQuestion.tsx` | C | `material.tile*`; keep `tile-shake` (now reduced-motion safe) [M3] |
| `src/components/PicturePairMatchingQuestion.tsx` | C | `material.tile*`, `material.exhibitPaper` [M3] |
| `src/components/Phonics{Sound,Word,Ending,Rhyme}ChoiceQuestion.tsx` | C | tiles via `optionButtonStyle`; `TYPE_HERO_GLYPH_NAVY` without appended size (GT-14) [M3] |
| `src/components/{ImageChoice,ListeningImageChoice,CountingImage,DescribeAndChooseImage}Question.tsx` | C | `EXHIBIT` -> `material.exhibitPaper` (+ skeleton state) [M3] |
| `src/components/QuestionCard.tsx` | C | `material.board`, 2px rim, journey trail (dots + kept `question-progress` text) [M3]; perches + `feedback-sheet` testid + overhang reserve [M4]; `letter-tracing` case + `onSubmitTracing` [M6]; star-fly fire [M9] |
| `src/components/JourneyTrail.tsx` | N | stepping-stone dots (aria-hidden), collapses to `PROGRESS_TRACK` above 12 [M3] |
| `src/components/QuestionBanner.tsx` | C | `TYPE_INSTRUCTION_NAVY`; speech tail + perch padding [M4]; forwards `onInstructionSettled` to `InstructionSpeaker.onSettled` (D-15) [M4] |
| `src/components/InstructionSpeaker.tsx` | C | optional `onSettled?: (outcome: 'ended' \| 'not-played') => void`, called once per mount per the D-15 mapping (incl. `blocked`, `unavailable`, `error`, skipped key); gesture-retry behaviour unchanged [M4]; test additions in `InstructionSpeaker.test.tsx` |
| `src/components/fx/LottieBudget.tsx` | N | `LottieBudgetProvider`, `useLottieSlot(owner)`, pure `allocateLottie()` (D-20); `QuestionCard` provides it [M4] |
| `src/components/{ImageChoice,PhonicsSoundChoice,PhonicsEndingChoice,PhonicsRhymeChoice}Question.tsx` | C | prompt `EmojiVisual animated={useLottieSlot('prompt')}` (D-20) [M4] |
| `src/components/GiftBoxPicker.tsx` | C | `animated={useLottieSlot('reward')}` (D-20) [M4] |
| `src/components/EmojiLottiePlayer.tsx` | C | wrapper `data-lottie-player="emoji"` for whole-screen counting (D-20) [M4] |
| `src/components/{RoundSummary,BatchSummary}.tsx` | C | `TYPE_SECTION_NAVY` / `TYPE_HERO_NUMBER_NAVY` composites [M3]; skill counts (D-10) [M6] |

### 3.4 Mascot rig (B4)

| File | Kind | Change |
|---|---|---|
| `src/components/Mascot.tsx` | C | public API unchanged (`mood`, `size`) + `MascotMood` gains `idle`, `thinking`; wrapper keeps `data-testid="mascot"`, `role="img"`, `aria-label`, adds `data-mascot-renderer`; sizes per band [M4] |
| `src/components/mascot/MascotRig.tsx` | N | renderer decision (D-09), poster + 120 ms crossfade, session breaker [M4] |
| `src/components/mascot/MascotStaticPose.tsx` | N | SVG renderer of `poses.ts` geometry (poster / reduced motion / fallback) [M4] |
| `src/components/mascot/MascotLottie.tsx` | N | lazy chunk; `DotLottieReact` with `data`, `loop`/`loopCount` per pose, `freezeOnOffscreen`, DPR cap 2, pause on `document.hidden`; only other importer of `@lottiefiles/*` besides `EmojiLottiePlayer` [M4] |
| `src/lib/mascot/poses.ts` | N | half-body geometry per pose (ellipses + cubic paths + named groups, palette keys only) [M4] |
| `src/lib/mascot/assets.ts` | N | `MASCOT_ASSET_SOURCE`, `mascotAssetUrl(mood)`, preload sets (play: idle/happy/encouraging) [M4] |
| `src/lib/mascot/lottieFromPoses.ts` | N | pure Lottie JSON builder used by the generator script and its drift test [M4] |
| `scripts/gen-mascot-lottie.ts` | N | writes `public/mascot/be-heo-<pose>.json` for every `generated` pose (`npx vite-node scripts/gen-mascot-lottie.ts`) [M4] |
| `scripts/check-mascot-assets.mjs` | N | asset gate FF-11 [M4] |
| `public/mascot/be-heo-{idle,thinking,greeting,happy,celebrating,encouraging}.json` | N | generated Lottie assets (D-08) [M4] |
| `scripts/check-attribution.mjs` | C | inventory covers `public/mascot/` (GT-11) and checks Andika OFL [M1, M4] |
| `src/hooks/useMediaQuery.ts` | N | `useMediaQuery(query)` (perch decision `(max-height: 420px)`) [M1] |
| `src/hooks/useThinkingPose.ts` | N | D-15 [M4] |
| `src/hooks/useAudioPlayback.ts` | C | `isLoading` flag (D-15) [M4] |
| `src/components/{ListeningFillBlank,ListeningSentenceFillBlank,ListeningImageChoice,PhonicsSoundChoice,PhonicsWordChoice,PhonicsEndingChoice,PhonicsRhymeChoice}Question.tsx` | C | optional `onAudioLoadingChange(loading)` prop fed from `useAudioPlayback().isLoading` (D-15 child -> board signal) [M4] |
| `src/components/FeedbackPanel.tsx` | C | `mascotPlacement: 'inline' \| 'none'` (default `'inline'`), `headlines?` per-kind map, `pr-16/pr-14` when `none` [M4]; tracing headline [M6]; streak chip [M9] |
| `src/components/{GradeSelect,AuthScreen,StartBatchScreen,RoundSummary,BatchSummary}.tsx` | C | mascot size `block` per band (no API change); pre-round screens static per D-21 [M4] |
| `src/components/GradeSelect.tsx` (postcards) | C | each `grade-card-{id}` gets a 96 px `aria-hidden` postcard header `data-testid="grade-postcard-{id}"` rendering `<LandScene land={key} variant="strip" tone="day" />` clipped to the card radius; the local hex `LandStrip` (GT-22) is deleted; hero brand/night shell behind the list (spec §6.6) [M2]; test `GradeSelect.postcard.test.tsx` (5 postcards, `aria-hidden`, `data-tone="day"`, no hex via FF-6 scope) |
| `src/lib/mascot/assets.ts` (D-21) | C | `PRE_ROUND_MASCOT_ANIMATED = false` [M4] |

### 3.5 Exam surface (B5, C4)

| File | Kind | Change |
|---|---|---|
| `src/components/ExamScreen.tsx` | C | `EXAM_DESK` + `EXAM_SHEET` + sheet header + `EXAM_QNUM`; header mascot removed (R-v5-06); `EXAM_TIMER`/`_URGENT` (no pulse) + 5:00/1:00 sr announcements; progress ring (exam mode); strip flagged state + `exam-nav-open`; flags; review sheet replaces exam-mode confirm; verdict D2 fix; loading skeleton + paper load error; `ExamQuestionView`/`OptionButtons`/`TextInputView`/`WordOrderView` paper tokens [M5] |
| `src/components/exam/ExamProgressRing.tsx` | N | 40 px SVG ring + `EXAM_RING_LABEL`, `role="progressbar"` [M5] |
| `src/components/exam/ExamNavigatorDialog.tsx` | N | paper grid dialog, legend, `useModalBehavior` [M5] |
| `src/components/exam/ExamReviewSheet.tsx` | N | review-before-submit dialog (task brief name "ExamReviewScreen") [M5] |
| `src/components/exam/useExamShortcuts.ts` | N | `1-4`/`A-D`/arrows/`F`/`N` (D-18) [M5] |
| `src/components/ExamResult.tsx` | C | paper certificate (`EXAM_SHEET` + `GOLD_HAIRLINE`), `TYPE_HERO_NUMBER_PAPER`, review list on paper; testids unchanged [M5] |
| `src/components/icons.tsx` | C | `IconChest` (24 grid, stroke 2, round caps) [M9]. No `IconFlip`: spec §20 makes it conditional, and the flip control is the whole card with a text `aria-label`, so no glyph is needed. All other icons in the spec §20 inventory already exist (`IconEye`, `IconRefresh`, `IconPencil`, `IconCheck`, `IconFlag`, `IconHash`, `IconCheckCircle`, `IconStar`, `IconSpeaker`, `IconBook`, `IconClock`, `IconSwords`) |

### 3.6 Tracing (C1)

| File | Kind | Change |
|---|---|---|
| `src/types/index.ts` | C | `QuestionKind` + `'letter-tracing'`; `LetterTracingQuestion` (+ `grade: 1 \| 2`); `ListeningFillBlankQuestion.spell?`; `ListeningSentenceFillBlankQuestion.bank?` [M6, M7] |
| `src/data/tracing/strokes.ts` | N | 26 lowercase glyphs, polylines in 0-100 box (baseline 80, x-height 45, ascender 10) [M6] |
| `src/lib/tracing/score.ts` | N | resample-32, coverage, precision, direction, `evaluateStroke()`, tunables per grade [M6] |
| `src/lib/generators/letterTracing.ts` | N | traceable letters + example word selection (D-02) [M6] |
| `src/components/tracing/TracingCanvas.tsx` | N | SVG guide + `<canvas>` ink + pointer handling [M6] |
| `src/components/tracing/LetterTracingQuestion.tsx` | N | banner, exhibit, slate, controls, live region, submit flow (lazy chunk) [M6] |
| `src/components/DemoHint.tsx` | C | `variant: 'trace'` following stroke-1 path [M6] |
| `src/lib/practiceSession.ts` | C | `submitTracingAnswer`, `getCorrectWord` case, `CurrentAnswer.tracing`, `AnswerRecord.assisted` [M6] |
| `src/lib/batch/batchSession.ts` | C | pass `{ gradeId }` to builders; `RoundOutcome.skillCorrect/skillTotal` [M6] |
| `src/lib/rounds/types.ts` | C | `buildQuestions(seed, words, ctx?)` [M6] |
| `src/lib/rounds/round1ExtraLetter.ts` | C | G1-2 composition with 2 tracing items at indices 3/7 (D-01) [M6] |
| `src/lib/engagement/skills.ts` | C | `'letter-tracing': 'spelling'` [M6] |
| `src/lib/exam/examSession.ts`, `src/components/ExamResult.tsx` (kind switches) | C | exhaustive-switch compile fixes only if `tsc` requires (kind never reaches exam) [M6] |

### 3.7 Drag: Spell-it, Gap bank, dual input (C2)

| File | Kind | Change |
|---|---|---|
| `src/hooks/useDragTile.tsx` | C | D-05 options, transform ghost, `renderGhost` [M7] |
| `src/lib/rounds/spellEligibility.ts` | N | `spellEligibility(word, grade)`, `buildSpellTiles(word, grade, seed)` (confusable exclusion, instance ids, no in-order shuffle) [M7] |
| `src/lib/rounds/gapBankValidator.ts` | N | `norm`, `validateGapBank` V0-V7, `pickGapBank` generator walk, dev-only reason logging [M7] |
| `src/lib/rounds/gapBankTopics.ts` | N | `GAP_BANK_TOPICS` reviewed allowlist (+ optional `groups`) and `HOMOPHONE_PAIRS` [M7] |
| `src/lib/rounds/round2ListeningSentence.ts` | C | G1-2 composition (D-01); attach `bank` to eligible sentence items; Spell-it items from `generateListeningFillBlankQuestions` + `spell` [M7] |
| `src/components/drag/SpellItDrag.tsx` | N | slots + bank + tap/keyboard + live region [M7] |
| `src/components/drag/GapBankDrag.tsx` | N | sentence with `sentence-gap` + 3 chips + tap-empty-gap-to-type [M7] |
| `src/components/ListeningFillBlankQuestion.tsx` | C | renders `SpellItDrag` when `question.spell && band === 'G12'`, else today's typed form [M7] |
| `src/components/ListeningSentenceFillBlankQuestion.tsx` | C | dual input (bank/type), `gap-input-toggle`, V8 forced typing; typed path unchanged [M7] |
| `src/hooks/useGapInputMode.ts` | N | D-14 [M7] |
| `docs/content/GAP-BANK-REVIEW.md` | N | content review record for every topic entering `GAP_BANK_TOPICS` (spec §13.5 item 2) [M7] |

### 3.8 Hub IA + flashcards (C3, R-v5-12)

| File | Kind | Change |
|---|---|---|
| `src/components/StartBatchScreen.tsx` | C | G1-2 tree: top-level `arena` tile between `more` and `reward`, sections mirror G3-5 (`hub-section-arena` only with handlers, `hub-section-rank` always); `more` drops arena (3 or 4 subtiles); launch rows at `density.primaryMinH`; `flashcards-start` 4th row of English block (both bands); voice copy update [M8] |
| `src/components/ModeHub.tsx` | C | `HubTileDef.variant?: 'arena'` -> `TRAIL_TILE_ARENA` + "vs" emblem (`IconSwords` disc + aria-hidden VS badge) [M8] |
| `src/lib/flashcards/reviewStore.ts` | N | localStorage store `ea-flash-review:<gradeId>` + session-memory fallback (§6.1) [M8] |
| `src/lib/flashcards/deck.ts` | N | `buildDeck`, `deckReducer` (rate/resume/retry/exit counting) - pure [M8] |
| `src/components/flashcards/FlashcardScreen.tsx` | N | route screen: chrome, live region, end dialog, summary/empty/error panels (lazy chunk) [M8] |
| `src/components/flashcards/FlashcardDeck.tsx` | N | stack + active card + decision buttons + swipe physics [M8] |
| `src/components/flashcards/FlashcardCard.tsx` | N | one-flip-path DOM per spec §14.3 [M8] |
| `src/components/flashcards/FlashcardErrorBoundary.tsx` | N | D-11 + D-22 fresh-attempt accounting, "Tải lại trang" after 2 fresh failures [M8] |
| `src/lib/retryableLazy.ts` | N | `createRetryableLazy()` (D-22), used by the flashcard route [M8] and the tracing chunk [M6] |
| `src/components/tracing/TracingChunkBoundary.tsx` | N | D-22 tracing retry + gated "Bỏ qua câu này" [M6] |
| `src/hooks/useSwipeCard.ts` | N | direction lock, threshold 30% / 0.6 px/ms, click suppression [M8] |

### 3.9 Micro-interactions, rewards, sound (C5)

| File | Kind | Change |
|---|---|---|
| `src/hooks/usePressRelease.ts` | N | returns `{ onPointerDown, onPointerUp, onPointerCancel, onKeyDown, onKeyUp, onAnimationEnd, 'data-pressed' }`. Pointer: `pointerup` after a `pointerdown` on the same element adds `animate-press-release` (cancel adds nothing). Keyboard: Enter/Space `keydown` (non-repeat) sets `data-pressed` (CSS mirrors the `active:` sink via `data-[pressed]:` variants, because `:active` is not set for Enter in all engines); `keyup` (Space) or a 100 ms timer (Enter) clears it and adds the release class. Disabled controls: no-op. Reduced motion: never adds the release class; the shadow/base swap of `material.tilePress` still signals the press. Removes the class on `animationend` [M9] |
| press-release consumers | C | `optionButtonStyle.ts` users (`ImageChoice`, `ListeningImageChoice`, `CountingImage`, `DescribeAndChooseImage`, `PhonicsSound/Word/Ending/RhymeChoice` question tiles), `ExtraLetterQuestion.tsx`, `PicturePairMatchingQuestion.tsx`, `drag/SpellItDrag.tsx` tiles, `drag/GapBankDrag.tsx` chips (all `material.tile*`); `CTA_GOLD_XL` sites `StartBatchScreen.tsx` (`start-batch-button`), `RoundSummary.tsx`, `BatchSummary.tsx`, `flashcards/FlashcardScreen.tsx` summary CTA; `BTN_REWARD_EARNED` sites `DailyQuestCard.tsx`, `PetCard.tsx`. Exam controls excluded (spec §16.1, 1 px translate only) [M9] |
| `src/hooks/usePressRelease.test.tsx` + `pressRelease.consumers.test.tsx` | N | pointer path adds/removes class; cancel adds nothing; Enter and Space set and clear `data-pressed` then release; reduced motion adds no class; disabled no-op; consumer scan: every listed file spreads the hook props on its tile/CTA [M9] |
| `src/components/fx/RewardFxContext.tsx` | N | D-17 provider + `StarFlyLayer` [M9] |
| `src/components/fx/StreakBurst.tsx` | N | 1-3 rings in the perch layer (omitted at `max-height:420px`) [M9] |
| `src/components/LiveScore.tsx` | C | registers target, tick + reduced-motion highlight [M9] |
| `src/components/celebrations/StarRain.tsx` | C | SVG medallion stars (D4) [M9] |
| `src/components/celebrations/ChestReveal.tsx` | C | `IconChest` gold chest (D4) [M9] |
| `src/lib/sfx.ts` | C | `SfxName` + `tap/pop/flip/streak/star`; tiers (verdict interrupts, reward queued +250 ms, ui dropped while busy) [M9] |
| `src/lib/speech.ts` | C | `isAudioPlaying()` export (GT-15) [M9] |
| `public/sfx/{tap,pop,flip,streak,star}.mp3` | N | ≤20 kB each, CC0/owned [M9] |
| `DESIGN_SYSTEM.md` | C | v5 section (palette remove indigo/add orange, materials, radius/elevation, exam paper pairs, §5 "4 mode decisions + Back") [M3, M8, M9] |
| `scripts/check-bundle-budget.mjs` | C | CR-82 delta block (D-03) [M1] |
| `docs/MEMORY.md` | C | decisions + open threads (bundle debt, missing poses if any) [M1, M4, M9] |

---

## 4. Component contracts

All props are TypeScript; testids per §11. "Band" = `useViewer().band`; floors from `useViewer().density`.

### 4.1 `MascotRig` (and the unchanged `Mascot` wrapper)

```ts
export type MascotMood = 'idle' | 'thinking' | 'greeting' | 'happy' | 'celebrating' | 'encouraging';
// Mascot (public, unchanged call shape)
interface MascotProps { mood: MascotMood; size?: 'inline' | 'block' | 'companion' }
// MascotRig (internal)
interface MascotRigProps {
  mood: MascotMood;
  sizePx: number;                     // inline 32; companion 72 G12 / 56 G345; block 96 G12 / 80 G345
  onRendererChange?: (r: 'lottie' | 'static') => void;   // Mascot mirrors it to data-mascot-renderer
}
```

State: `renderer: 'static' | 'lottie-loading' | 'lottie'`; module-level `runtimeBroken` (session) and `failedPoses: Set`.
Pose change swaps the source on the same player instance via `load({ data, loop, loopCount, autoplay: true })`; loop
policy per pose: idle `loop: true, loopCount: 0`; thinking/greeting/encouraging `loop: true, loopCount: 1` (2 plays, hold);
happy/celebrating `loop: false` (one shot, hold last frame). Poster = `MascotStaticPose` in the same box; crossfade 120 ms
(opacity only) on first `render`. Error matrix in §9.4. Canvas is `aria-hidden`; label stays on the wrapper.
Budget: `MascotRig` mounts Lottie only when `useLottieSlot('mascot')` is true (D-20) and, on GradeSelect/AuthScreen/
StartBatch, only if `PRE_ROUND_MASCOT_ANIMATED` (D-21, default false). When the slot goes away mid-life (e.g. the prompt
claims it on the next question) the player is unmounted and the static pose is shown - never two players at once.

Perch contracts in `QuestionCard`:
- board perch: renders iff `!hasAnswered`; `absolute -top-9 left-4 z-10 pointer-events-none aria-hidden`; mood `idle`
  or `thinking` (`useThinkingPose`).
- sheet perch: renders iff `showFeedbackZone && perch`, where `perch = !useMediaQuery('(max-height: 420px)')`; sibling of
  `FeedbackPanel` inside the fixed wrapper (`data-testid="feedback-sheet"`, never `overflow-hidden`); mood
  `celebrating` if `correctStreak >= 3` else `happy` / `encouraging`; `FeedbackPanel mascotPlacement={perch ? 'none' :
  'inline'}`; card bottom reserve adds `2.75rem` while the perch renders (inline style, r23 rule kept).

### 4.2 `TracingCanvas` + `LetterTracingQuestion`

```ts
interface TracingCanvasProps {
  glyph: GlyphStrokes;                // from strokes.ts: { letter; strokes: Array<Array<[number, number]>> }
  grade: 1 | 2;                       // tolerances: start 18%/12%, coverage tol 14%/10%; direction check G2 only
  activeStroke: number;               // controlled by the parent
  strokeStates: ReadonlyArray<'pending' | 'active' | 'done' | 'auto'>;
  assisted: boolean;                  // tolerance x1.5 after 2 fails on the active stroke
  disabled: boolean;                  // after submit
  reducedMotion: boolean;
  onStrokeResult: (r: { index: number; pass: boolean; coverage: number; precision: number }) => void;
  onStartMiss: () => void;            // pointerdown outside start tolerance (no attempt counted)
  onDrawingChange: (drawing: boolean) => void;   // suppresses `thinking`
}
interface LetterTracingQuestionProps {
  question: LetterTracingQuestion;
  hasAnswered: boolean;
  onSubmit: (isCorrect: boolean, meta: TracingMeta) => void;
  speakerKey?: string;
}
```

Internals: SVG guide layer (`viewBox 0 0 100 100`, `aria-hidden`) with `TRACE_RULE`, `TRACE_TRACK`, `TRACE_CENTERLINE`,
`TRACE_START`, `TRACE_ARROW`, `TRACE_DONE`; `<canvas>` ink layer sized to CSS box x `min(devicePixelRatio, 2)`, redrawn
in rAF with quadratic smoothing. Pointer rules exactly spec §12.4 (`isPrimary`, touch/pen or mouse button 0,
`setPointerCapture`, `getCoalescedEvents()` when present, ≥2 px point spacing, `pointercancel`/`lostpointercapture`
discard, extra pointers ignored, `touch-action: none` on the canvas only). Parent state machine:
`attempts: number[]` per stroke; fail 1 -> fade + banner line; fail 2 -> auto-demo once + `assisted`; fail 3 ->
stroke auto-draws (`auto`). Completion: `isCorrect = strokes.every(s => passedWithin2 && !auto)`; keyboard path
"Tô tự động từng nét" animates the next stroke per Enter/Space and submits `isCorrect=true, assisted=true`.
`getContext('2d') === null` -> assisted-only mode (canvas hidden, controls remain). Scoring is pure in
`lib/tracing/score.ts` (§12.5 formulas, tunables exported for Tester calibration Q9).

`QuestionCard` integration: `case 'letter-tracing'` renders the lazy component inside `<Suspense fallback={<SlateSkeleton/>}>`;
new prop `onSubmitTracing(isCorrect, meta)`; `getCorrectWord` returns the letter; `feedbackPictureWordId` returns
`exampleWordId`; `FeedbackPanel` receives `headlines={{ correct: 'Em tô đẹp quá!', wrong: 'Em tô xong rồi - lần sau mình
tự tô hết nhé!' }}`; "Nghe mẫu" speaks `"<letter>, <exampleWord>"`.

### 4.3 `SpellItDrag`

```ts
interface SpellTile { id: string /* 'o-1' | 'x-d0' */; letter: string }
interface SpellItDragProps {
  tiles: readonly SpellTile[];         // payload `question.spell.tiles` (seeded by question.id)
  slotCount: number;                   // word length
  disabled: boolean;                   // hasAnswered
  reducedMotion: boolean;
  onSubmit: (composed: string) => void;   // -> existing onSubmitListening
}
```

State: `placement: (number | null)[]` (slot -> bank index), derived `bankFree: Set<number>`. Interactions per spec §13.3
(tap first-empty, tap slot returns, swap on filled-slot drop, drop elsewhere springs back, Backspace removes last placed,
Enter/Space on a tile places). Submit button stays `submit-answer-button`, `disabled` + `aria-disabled` + hint until all
slots are filled. Live region "Đã đặt chữ c vào ô 2". Judging is unchanged: the composed string goes through
`onSubmitListening` -> `submitListeningAnswer` -> `normalizeAnswer`.

### 4.4 `GapBankDrag` and the dual-input host

```ts
interface GapBankDragProps {
  displaySentence: string;             // contains exactly one '___'
  options: readonly [string, string, string];   // payload `question.bank.options` (seeded shuffle)
  disabled: boolean;
  reducedMotion: boolean;
  onRequestTyping: () => void;         // tap/Enter on the EMPTY sentence-gap
  onSubmit: (word: string) => void;    // -> existing onSubmitListening
}
```

Host = `ListeningSentenceFillBlankQuestion`: `mode = itemForcedType ? 'type' : (question.bank && band === 'G12' ?
useGapInputMode().mode : 'type')`. Toggle `gap-input-toggle` (`aria-pressed` = typing) renders only when a bank exists
and audio has not failed; switching clears unsubmitted state, announces, never submits; typing mode unmounts the bank and
autofocuses `answer-input`. V8: `useAudioPlayback().playbackFailed` -> `itemForcedType = true`, toggle hidden,
`AudioPlaybackWarning` shown. G3-5: unchanged typed form.

### 4.5 `FlashcardDeck` (+ `FlashcardScreen`, `FlashcardCard`)

```ts
interface FlashcardScreenProps { grade: Grade; onExit: () => void }
interface FlashcardDeckProps {
  card: DeckCard;                      // { wordId, word, emoji, imageUrl?, ipa?, explanation }
  index: number; total: number;        // "Thẻ i/N"
  band: 'G12' | 'G345';                // front/back content per spec §14.1
  reducedMotion: boolean;
  onRate: (rating: 'known' | 'again') => void;   // swipe, buttons and arrows all call this
}
interface FlashcardCardProps {
  card: DeckCard; band: 'G12' | 'G345'; face: 'front' | 'back';
  onFlip: () => void; onSpeak: () => void;
  swipe: SwipeHandlers;                // from useSwipeCard; shouldSuppressClick gates onFlip
}
```

`FlashcardScreen` owns `deckReducer` state `{ deck: DeckCard[]; cursor; ratings: Map<wordId, rating>; phase:
'loading' | 'cards' | 'summary' | 'empty' }` and focus management (spec §14.4 focus rules); the error state is owned by
`FlashcardErrorBoundary` (D-11). DOM structure is exactly spec §14.3 (one `flashcard-flip` button; `flashcard-speaker`
sibling with `onPointerDown` stopPropagation; inactive face `inert` + `aria-hidden`, unmounted under reduced motion).
Swipe (`useSwipeCard`): 10 px direction lock (`|dy| > |dx|` releases to page, `touch-action: pan-y`), follow `dx`
with `clamp(dx/20, -12deg, 12deg)` (no rotation when reduced), commit at `|dx| ≥ 0.3 x width` or `|v| ≥ 0.6 px/ms`,
fly-out 250 ms / spring-back 300 ms (transform only; fade 150 ms when reduced), drag sets suppress-click so the
trailing click never flips. Flashcards are **not judged**: no `FeedbackPanel`, no points, no quest credit (Q5b default).

### 4.6 `ExamNavigatorDialog`

```ts
interface ExamNavigatorDialogProps {
  total: number; currentIndex: number;
  answered: ReadonlyArray<boolean>; flagged: ReadonlySet<number>;
  onJump: (index: number) => void;     // jump + close
  onClose: () => void;
}
```

`role="dialog" aria-modal="true"` + `useModalBehavior` (focus trap, Escape, restore to `exam-nav-open`); paper grid
`grid-cols-5 sm:grid-cols-10 gap-2` of 48 px `EXAM_NAV_CELL_PAPER` cells (`exam-navigator-cell-{i}`, answered = icon +
`EXAM_NAV_ANSWERED_PAPER`, flagged = `IconFlag` + `EXAM_NAV_FLAGGED`, current = `aria-current="step"`), legend
(icon + text), `max-h-[70vh] overflow-y-auto relative` for 200 questions, shortcut list in the footer.

### 4.7 `ExamReviewSheet` (task brief: "ExamReviewScreen")

```ts
interface ExamReviewSheetProps {
  total: number;
  unanswered: readonly number[];       // indexes
  flagged: readonly number[];
  onJump: (index: number) => void;     // jump + close
  onBack: () => void;                  // "Quay lại làm tiếp" (first focusable -> safe default focus)
  onSubmit: () => void;                // "Nộp bài" -> submitExam
}
```

Opened by `exam-submit` in exam mode only; practice keeps `ConfirmEndDialog`. Counts line "Đã làm: x/y - Chưa làm: u -
Đã đánh dấu: f"; empty-state copy "Em đã làm hết các câu rồi."; "Nộp bài" = `BTN_PAPER_ACTION` at `min-h-[48px]
text-base` (not gold, N1). Timer expiry while open: the existing auto-submit effect runs; a new effect closes the sheet
when `exam.finishedAtMs !== null` and `begin()` resets it (same pattern as `submitConfirmOpen`).

### 4.8 Motion primitives contract

CSS-only (no GSAP/framer-motion, FF-9). Tailwind utilities `ease-out-quint|out-expo|in-out-soft|toy`,
`duration-80|160|240|400`, `animate-press-release|snap-in|streak-burst|star-fly|scene-drift-far`; JS paths branch on
`usePrefersReducedMotion()`. `ease-toy` appears only in `press-release` and `snap-in` (R-v5-05; FF-16 checks keyframe
bodies animate only `transform`/`opacity`).

### 4.9 Feedback-sheet contract (unchanged semantics)

Mechanics plug into spec §5.5 only: Spell-it/Gap submit via `onSubmitListening`; tracing via `onSubmitTracing`;
`FeedbackPanel` keeps `data-correct`, `aria-live`, verdict sfx on mount, bounded scroll; additive props only
(`mascotPlacement`, `headlines`, `streak`). Flashcards never use the sheet.

---

## 5. Question payload additions (types)

```ts
export interface LetterTracingQuestion {
  id: string; topicId: string; kind: 'letter-tracing';
  letter: string;                      // CR-82 emits 'a'..'z' only (D-02)
  exampleWordId: string;
  grade: 1 | 2;                        // D-04
  explanation: string;                 // 'Chữ "a" như trong "apple" - quả táo.'
}
// additive, optional - absent means "typed path"
interface ListeningFillBlankQuestion { /* existing */ spell?: { tiles: readonly SpellTile[] } }
interface ListeningSentenceFillBlankQuestion {
  /* existing */
  bank?: { options: readonly [string, string, string]; optionWordIds: readonly [string, string, string] };
}
export interface TracingMeta { assisted: boolean; attempts: number[] }
```

Exam bank items are untouched (`ExamQuestion` is a separate union). `questionCardFixtures.ts` gains one fixture per new
shape for component tests.

---

## 6. Data and state

### 6.1 Flashcard ratings (R-v5-11, local only)

- Key: `localStorage['ea-flash-review:<gradeId>']`.
- Schema v1: `{ "v": 1, "e": { "<wordId>": { "r": "k" | "a", "t": <epoch ms> } } }` (`k` = Em nhớ rồi, `a` = Ôn lại).
- Cap 200 entries: on write, evict smallest `t` until ≤ 200.
- Read: `JSON.parse` in `try`; wrong `v`, non-object `e`, or invalid entries -> treat as empty and rewrite on next save
  (spec "corrupt JSON is discarded and rewritten"). Never throws to the UI.
- Write failure (quota, disabled storage, private mode): ratings go to a module-level `Map<gradeId, Map<wordId, entry>>`
  for the rest of the visit; retry decks read the merged view; no message (spec §14.5).
- Deck priority: entries with `r: 'a'` first (most recent first), then seeded shuffle of the remaining eligible words;
  `N = min(10, eligibleCount)`.
- Not synced, not part of `EngagementState`, not cleared on sign-out (low-sensitivity word ids). Shared-device mixing
  across child profiles is a known limitation (§10, R-08).

### 6.2 Session flags

| Key | Storage | Values | Owner |
|---|---|---|---|
| `ea-gap-input-mode` | `sessionStorage` + module fallback | `bank` / `type` | `useGapInputMode` (D-14) |
| `ea-demo-letter-tracing`, `ea-demo-listening-fill-blank-spell`, `ea-demo-gap-bank` | `sessionStorage` (existing `useDemoHint` prefix) | `1` | `useDemoHint` |

### 6.3 Gap bank placement

- `src/lib/rounds/gapBankValidator.ts`: `norm(s)`; `validateGapBank(input: { question: ListeningSentenceFillBlankQuestion;
  answer: VocabWord; distractors: readonly VocabWord[]; audio: 'sentence' | 'none' }): { eligible: boolean; reasons:
  string[] }` implementing V0-V7 exactly as spec §13.5 (V2 calls the exported `sentencesForWord` and `blankOutWord`;
  V5 uses an inline Levenshtein; V7 = `audio === 'sentence' && norm(question.sentence) !== ''`); `pickGapBank(question,
  pool, seed)` = seeded candidate walk over same-topic words, first passing pair or `null` (never padded).
- `src/lib/rounds/gapBankTopics.ts`: `GAP_BANK_TOPICS: Readonly<Record<topicId, { groups?: readonly (readonly string[])[];
  reviewedIn: string }>>` (each entry cites its row in `docs/content/GAP-BANK-REVIEW.md`) and `HOMOPHONE_PAIRS`.
  Ships with only topics whose review row exists; the candidate list for the first review is G1-2 topics whose words
  share one sentence class (e.g. `g1-pets`, `g1-toys`, `g1-colors`, `g2-animals`, `g2-fruits`) - **candidates, not
  approvals**.
- V8 is runtime (component), not validator.

### 6.4 Database and backend - confirmed no change

- No migration, RPC, edge function, RLS or grant change. `practice.results` (`0002`) stores batch totals only; rounds
  stay 4 and 10 questions each (D-01), so `rounds_completed`, `points`, `max_points` semantics are unchanged.
- `practice.engagement_state.state` (`0008`, jsonb) keeps its shape: skill counters are still `{correct,total}`; D-10
  only changes which answers are counted.
- Flashcards: no server write (R-v5-11). Telemetry (`qb_attempt_events`) is exam-only and unchanged.
- Flag for later CR (not CR-82): server-side flashcard store (spec R-v5-11 "Tech Lead may propose").

---

## 7. Sequencing - milestones M1..M10 (a2: former M9 split into implementation M9 + final gate M10)

Each milestone is one or more commits on `main`-bound branches, must leave `npm run build`, `npm test`,
`npm run code:reliability` and the touched e2e specs green, and is independently revertible. Size: S < 1 day, M 1-3
days, L > 3 days (Developer refines in the committed implementation plan).

| # | Milestone | Scope (file map refs) | Depends on | Exit evidence | Size |
|---|---|---|---|---|---|
| M1 | Tokens + config + guards | §3.1, `useMediaQuery`, `react-inert.d.ts`, bundle delta block, attribution (Andika) | - | FF-2, FF-3, FF-5, FF-7, FF-8, FF-9, FF-15 green; only visible change = city/space recolor, hub icon tint, confetti palette (screenshot pair) | M |
| M2 | Hero scene | §3.2 | M1 | unknown-land test; ambient budget FF-13; FF-6; journey var test; 3-viewport scene screenshots dusk/night; DevTools 4x CPU trace ≥50 fps | L |
| M3 | Materials + typography + board | §3.3 (minus perch work) | M1 | tile state matrix render test; regression fixture (a) is M5, (b)(c) M8; tokens composites used, no `*_GEO` import (FF-2b) | M |
| M4 | Mascot rig + perches + Lottie budget | §3.4 incl. `LottieBudget`, `InstructionSpeaker.onSettled`, audio-loading signal | M1, M3 (board) | one-mascot matrix **stage 1** (screens that exist at M4: GradeSelect, AuthScreen, StartBatch, question unanswered, answered with sheet perch, answered at `max-height:420px`, RoundSummary, BatchSummary); `LottieBudget` + `QuestionCard.lottieBudget` tests (FF-19); `check-mascot-assets` FF-11; Lottie drift test; reduced-motion run shows `data-mascot-renderer="static"`; `emoji-visual.spec.ts` mascot/budget migration; perch scroll screenshot | L |
| M5 | Exam paper + navigator + review | §3.5 | M1 | one-mascot matrix **stage 2** (ExamIntro = 1, ExamResult = 1, exam sitting = 0; appended to `oneMascot.test.tsx` if M4 has landed, otherwise asserted in `ExamScreen.paper.test.tsx` and moved into the matrix when M4 lands); endConfirm tests migrated (D-13); review/navigator/flag/shortcut tests; regression fixture (a); exam 3-viewport screenshots | L |
| M6 | Letter tracing | §3.6 incl. `TracingChunkBoundary` + `retryableLazy` | M1, M3 (paperSlate), M4 (headline map, budget provider) | score unit tests; round1 G1-2 composition test; Playwright pass + fail traces; assisted exclusion test; retry tests (D-22); `emoji-visual.spec.ts` canvas count excludes `tracing-canvas` | L |
| M7 | Spell-it + Gap + dual input | §3.7 | M1, M3, M6 (builder ctx) | validator fixtures 1-20; coverage sweep report; spell boundary tests; Playwright drag/tap/keyboard + toggle + tap-gap | L |
| M8 | Hub IA + flashcards | §3.8 | M1, M2 (hero shell), M4 (mascot) | one-mascot matrix **stage 3** (flashcard card = 1, flashcard summary = 1); hub tests (5 first-paint controls, 3/4 subtiles, arena regions, 76 px rows); deck reducer tests; a11y face isolation; regression fixtures (b)(c); flashcard retry tests (D-22) | L |
| M9 | Micro-interactions + rewards + sfx (implementation) | §3.9 incl. press-release consumers | M3, M4, M7 (spell tiles/gap chips), M8 (flashcard summary CTA) | press-release hook + consumer tests; sfx tier unit tests; star-fly/streak reduced-motion twins; `DESIGN_SYSTEM.md` v5 | M |
| M10 | Final integration gate + evidence | no new features | **M1-M9 all** | **complete** one-mascot matrix (all 13 states, FF-1); whole-screen Lottie budget e2e (FF-19); full screenshot matrix (§11.3) incl. exam, tracing, drag/dual-input, flashcards; DevTools traces; bundle delta final (FF-10); full vitest + e2e suite green | S |

Ordering and parallelism: M1 lands every token first so later milestones only consume. After M1, two lanes can run in
parallel: **lane A** M2 and M3 (independent of each other), then M4 (needs M3), then M6 -> M7, with M8 after M2 + M4; **lane B** M5 (exam register, independent of
play surfaces; it needs nothing from M2-M4). M6 introduces the builder `ctx` that M7 reuses. M9 starts once M7 and M8
have landed (its consumers include their tiles and CTAs). M10 is the only gate that requires every milestone and is
the release evidence; no earlier milestone's exit criteria depend on a later milestone.

---

## 8. Test-impact register

### 8.1 Existing tests that must change (same commit as the behaviour change)

| Test | Milestone | Required change | Reason |
|---|---|---|---|
| `src/components/Mascot.test.tsx` | M4 | `MOODS` adds `idle`, `thinking` + their aria labels; face-structure asserts retarget `MascotStaticPose` output; add `data-mascot-renderer="static"` under jsdom (D-09) | 6 poses, static renderer |
| `src/components/QuestionCard*.test.tsx` (8 files) | M3/M4 | any class-string or mascot assertion: pre-answer mood `encouraging` -> `idle`; feedback mascot now inside `feedback-sheet`, outside `answer-feedback`; reserve style gains `+ 2.75rem` while perch renders | spec §9.3 impact note |
| `src/components/FeedbackPanel.test.tsx` | M4 | none required (`mascotPlacement` defaults to `'inline'`); add cases for `'none'` and `headlines` | additive props |
| `src/components/BatchSummary.test.tsx`, `RoundSummary.test.tsx` | M4/M6 | mood asserts unchanged; RoundSummary asserts `recordSkillAnswers` receives `skillCorrect/skillTotal` | D-10 |
| `src/components/StartBatchScreen.test.tsx` | M8 | lines 100-141: open `hub-tile-arena` directly (no `hub-subtile-arena`); G1-2 first paint expects `hub-tile-more`, `hub-tile-arena`, `hub-tile-reward` + Back + gold CTA (5 controls); `hub-subtile-*` count 3 or 4 | R-v5-12 |
| `src/components/ModeHub.test.tsx` | M8 | add `variant: 'arena'` case; existing asserts unchanged | additive |
| `src/components/ExamScreen.endConfirm.test.tsx` | M5 | exam-mode cases (lines 60-104): `end-confirm-cancel` -> `exam-review-back`, `end-confirm-ok` -> `exam-review-submit`, dialog role unchanged; add practice-mode case proving `ConfirmEndDialog` still opens | D-13 |
| `src/components/ExamScreen.markup.test.tsx`, `.realBank.test.tsx`, `.review.test.tsx`, `.arena.test.tsx` | M5 | re-run; update only class-literal assertions (none found on `rose-`/chalkboard classes in this session's grep); testids unchanged | paper tokens |
| `src/lib/colorPairingGuard.test.ts` | M1 | extend per spec §5.3 rule 3: same-element paper token + light ink literal; keep existing rule | spec |
| `src/lib/dashGuard.test.ts` | M1 | no change; must stay green (new copy, `docs/content/*.md` not in scope of the scanner but authored hyphen-only) | invariant |
| `src/lib/rounds/round1ExtraLetter.test.ts`, `round2ListeningSentence.test.ts`, `roundDefinitions.test.ts` | M6/M7 | composition asserts split by band: G3-5 unchanged counts; G1-2 per D-01; still 10 per round | D-01 |
| `src/lib/batch/batchSession.test.ts` | M6 | builders receive `{ gradeId }`; `RoundOutcome` new fields | D-04, D-10 |
| `src/lib/ui/theme.test.ts` | M1 | city/space values per spec §5.1; `horizonGlow` present for all lands | B6 |
| `e2e/utils/practice-flow.ts` `submitListeningAnswer` | M7 | if `gap-input-toggle` visible and `aria-pressed="false"`, click it first, then type (dual input makes typing a first-class path) | GT-5 |
| `e2e/utils/batch-flow.ts` (structural answer loop, line ~262) | M6/M7 | branches: `letter-tracing` -> press `tracing-auto-step` until the sheet appears; `listening-fill-blank` with `spell-bank` -> tap tiles in bank order until slots fill, then `submit-answer-button` | GT-5 |
| `e2e/round1-extra-letter.spec.ts`, `e2e/grades.spec.ts`, `e2e/guest-trial.spec.ts`, `e2e/engagement.spec.ts`, `e2e/round2-listening-sentence.spec.ts`, `e2e/batch-full-flow.spec.ts` | M6/M7 | tolerate the new G1-2 kinds via the helpers above; `round2-listening-sentence` "both kinds appeared" assertion becomes "all three G1-2 kinds appeared" for grade-1 | D-01 |
| `e2e/mascot.spec.ts` + `e2e/utils/mascot-flow.ts` | M4 | feedback mascot located within `feedback-sheet` (not `answer-feedback`); start-batch locator unchanged | GT-6 |
| `e2e/emoji-visual.spec.ts` - "mascot pig renders through EmojiVisual as a same-origin Twemoji SVG" (`:48-58`) | M4 | **superseded** (stale since CR-72). Becomes: mascot on StartBatch has `data-mascot-renderer="static"` (D-21) and its Vietnamese `aria-label`; Twemoji/EmojiVisual coverage moves to a **content** illustration - the grade-card motif or an image-choice prompt `[data-emoji-visual]` with `data-emoji-mode` `svg`/`image`, same-origin `src` and the sr-only emoji text layer | GT-23 |
| `e2e/emoji-visual.spec.ts` - "at most one Lottie canvas during a question, at most two in feedback (AC-2.9)" (`:106-145`) | M4 (+M6 canvas filter) | the `✨` accent trigger is **superseded** (accents are icons now). Becomes: reach an unanswered image-choice question whose prompt emoji has a vendored Lottie asset; count `[data-lottie-player] canvas` -> ≤1 (prompt owns the slot, mascot `data-mascot-renderer="static"`); answer it; count again -> ≤2 (sheet mascot + feedback picture, prompt static); then a non-eligible question -> exactly the mascot. Never count bare `canvas`; M6 adds an assertion that `[data-testid="tracing-canvas"]` is excluded from the count. **Retained:** the A-09 caps themselves and the race-window technique | GT-18, GT-23 |
| `e2e/emoji-visual.spec.ts` - "no Lottie player/WASM/JSON requests on pre-round screens (AC-2.5)" (`:178-193`) | M4 | **retained** (D-21 keeps AC-2.5 true); only the pig locator changes to `[data-testid="mascot"][data-mascot-renderer="static"]`; request filter adds `/mascot/` JSON | GT-19 |
| `e2e/emoji-visual.spec.ts` - "aborted Lottie JSON falls back to same-origin svg (AC-2.8)" (`:207-218`) | M4 | the `🎉` summary-accent trigger is **superseded**. Becomes two cases: abort `**/emoji/lottie/*.json` -> an eligible image-choice prompt resolves to `data-emoji-mode="svg"` with no page error (content coverage kept); abort `**/mascot/*.json` -> the board mascot resolves to `data-mascot-renderer="static"`, question still answerable | GT-23 |
| `e2e/emoji-visual.spec.ts` - same-origin request test and listening-option render test | M4 | **retained** unchanged; the request watcher additionally covers `/mascot/` and `/fonts/andika/` | constitution #4 |
| `e2e/kids-ux.spec.ts` (lines 32-55) | M8 | first paint also expects `hub-tile-arena` | R-v5-12 |
| `e2e/responsive-layout-phone.spec.ts`, `responsive-layout-tablet-and-small-phone.spec.ts` | M2/M3 | must stay green unchanged (no horizontal scroll from `inset-x-[-8%]`: scene root is `fixed overflow-hidden`); re-baseline only measured geometry that the board radius/padding legitimately moved | B1/B2 |

### 8.2 New test files

| New test | Milestone | Covers |
|---|---|---|
| `src/lib/ui/tokens.test.ts` | M1 | spec §5.3 rule 3 composite ink/size assertions; v5 tokens contain no `font-semibold`/`font-black`; `*_GEO` not imported by any component (source scan) |
| `src/lib/reducedMotionGuard.test.ts` | M1 | every class in `index.css` with an `animation:` declaration and every `animate-*` in `tailwind.config.js` is neutralized in the reduced block or paired with `motion-reduce:` at call sites; explicit asserts for `.tile-shake`, `.dart-arrow` (D3) |
| `src/lib/paletteGuard.test.ts` | M1 | no `indigo-\d` in `src/`; `violet-` only in the closed inventory (theme.ts space entries + nebula in `scenePalette`) |
| `src/lib/depsGuard.test.ts` | M1 | `package.json` `dependencies` key set equals the recorded baseline (no new runtime dep) |
| `src/lib/ui/scenePalette.test.ts` | M1 | `dusk`/`night` derivation formula; `lights` never mixed; unknown land -> sky |
| `src/components/LandShell.test.tsx` | M2 | `land={'unknown' as LandKey}` renders and resolves to sky (spec N3) |
| `src/components/scene/LandScene.test.tsx` | M2 | hero renders 5 layers, `aria-hidden`, `pointer-events-none`; ≤12 animated nodes per land (FF-13); no hex literals (FF-6 scanner) |
| `src/components/scene/SceneJourneyContext.test.tsx` | M2 | `--journey` written imperatively, reset on `roundKey` change, board not re-rendered (render counter) |
| `src/components/oneMascot.test.tsx` | M4 / M5 / M8, complete at M10 | staged parametrized one-mascot matrix: **M4** GradeSelect, AuthScreen, StartBatch, question unanswered, answered (sheet perch), answered at `max-height:420px` (inline), RoundSummary, BatchSummary; **M5** adds ExamIntro (1), ExamResult (1), exam sitting (0); **M8** adds flashcard card (1), flashcard summary (1). The complete 13-state matrix is M10 gate evidence |
| `src/components/fx/LottieBudget.test.ts` + `src/components/QuestionCard.lottieBudget.test.tsx` | M4 | allocation table rows (D-20); rendered image-choice with a Lottie-eligible emoji (mocked `hasLottie`, `matchMedia` stubbed to motion-allowed): before submit exactly one owner animated (prompt), mascot static; after submit ≤2 owners (sheet mascot + feedback picture), prompt static; reduced motion = 0 |
| `src/lib/retryableLazy.test.tsx`, `src/components/flashcards/FlashcardRoute.retry.test.tsx`, `src/components/tracing/TracingChunkBoundary.test.tsx` | M6 / M8 | D-22: fail once -> restore -> retry produces a second loader invocation and renders; two fresh failures -> flashcards "Tải lại trang" (reload spied), tracing "Bỏ qua câu này" only after invocation 2; render error after load never counts toward the skip |
| `src/hooks/useThinkingPose.test.tsx` + `InstructionSpeaker.test.tsx` additions | M4 | D-15 mapping rows, 400 ms loading debounce, reset on input, disabled for G345/drawing; `onSettled` once per status class |
| `src/components/GradeSelect.postcard.test.tsx` | M2 | 5 postcards, `aria-hidden`, `data-tone="day"`, 96 px height class, no hex (FF-6) |
| `src/hooks/usePressRelease.test.tsx` + `pressRelease.consumers.test.tsx` | M9 | pointer/keyboard/reduced-motion/disabled paths; every listed consumer wires the hook |
| `src/lib/mascot/lottieFromPoses.test.ts` | M4 | generated JSON equals committed files for `generated` poses (drift guard); frame-0 transforms identity; palette subset of `MASCOT_PALETTE`; no text/image layers, no expressions |
| `src/components/mascot/MascotRig.test.tsx` | M4 | decision table §9.4 (inline, reduced motion, missing matchMedia, `missing` source, data error -> static for pose, runtime error -> static for session) with a mocked lazy player |
| `src/components/exam/ExamReviewSheet.test.tsx`, `ExamNavigatorDialog.test.tsx`, `useExamShortcuts.test.tsx` | M5 | counts, jump+close, empty copy, focus trap/Escape/restore, time-up closes, shortcuts disabled in inputs/dialogs |
| `src/components/ExamScreen.paper.test.tsx` | M5 | regression fixture (a): G1-2 prompt inside `EXAM_SHEET` has `text-slate-900`, no `text-white`; practice-wrong verdict has no `rose-`; urgent timer has no `animate-pulse`; header has no `mascot` |
| `src/lib/tracing/score.test.ts` | M6 | pass rules (coverage ≥0.75, precision ≥0.65, G2 direction), resample-32, tolerance by grade, assisted x1.5 |
| `src/components/tracing/LetterTracingQuestion.test.tsx` | M6 | fail -> fail -> auto-demo -> auto-complete; keyboard assisted path submits `{isCorrect:true, assisted:true}`; no-canvas fallback; live region text |
| `src/lib/generators/letterTracing.test.ts` | M6 | only letters with example words; lowercase only; seeded determinism |
| `src/lib/rounds/gapBankValidator.test.ts` | M7 | fixtures 1-20 exactly as spec §13.5 table (one per rejection type) |
| `src/lib/rounds/gapBankCoverage.test.ts` | M7 | sweep over fixed seeds: every offered bank passed the validator and has 3 distinct options; prints eligible share for the design gate |
| `src/lib/rounds/spellEligibility.test.ts` | M7 | `book`, `school` instance ids; G1 6 letters -> 7 tiles; G1 `rainbow` -> typed; G2 6 -> 8 tiles; G2 7 -> typed; 8 letters typed; two-word/hyphen typed; confusable exclusion; never in-order |
| `src/components/drag/SpellItDrag.test.tsx`, `GapBankDrag.test.tsx` | M7 | tap/keyboard paths, swap, Backspace, submit gating, aria labels, live region |
| `src/components/ListeningSentenceFillBlankQuestion.dual.test.tsx` | M7 | toggle, tap-empty-gap-to-type, switching clears, V8 forced typing, ineligible = no toggle, G3-5 typed only, session flag |
| `src/hooks/useDragTile.test.tsx` | M7 | `crossNamespace` same-index drop delivered; default pair-matching semantics unchanged; transform ghost |
| `src/lib/flashcards/deck.test.ts`, `reviewStore.test.ts` | M8 | full/partial/zero exits, small deck N<10, retry deck, unrated current card, again-first priority; corrupt JSON, quota failure -> memory, 200-cap eviction |
| `src/components/flashcards/FlashcardCard.a11y.test.tsx` | M8 | inactive face `inert` + `aria-hidden`; `getByRole` on each face finds nothing from the other; tab order flip -> speaker -> Ôn lại -> Em nhớ rồi; reduced motion unmounts inactive face; speaker never flips; regression fixtures (b) G3-5 front word `text-navy-800`, (c) G1-2 back word `text-white` with `FLASH_FACE_BACK` as nearest painted ancestor |
| `src/components/flashcards/FlashcardScreen.test.tsx` | M8 | focus after flip/advance/exit; load-error focus on heading + `role="alert"`; empty vs error copy differ |
| `src/lib/sfxTiers.test.ts` | M9 | verdict interrupts ui; reward queued +250 ms; ui dropped while verdict/reward/speech playing; exam mode silent |
| `e2e/cr82-tracing.spec.ts`, `cr82-spell-gap.spec.ts`, `cr82-flashcards.spec.ts`, `cr82-exam-flow.spec.ts`, `cr82-visual.spec.ts` | M6-M9 | flows in §11.2; screenshots §11.3 |

---

## 9. Lottie asset dependency (six poses)

### 9.1 Production decision

Firm recommendation: **D-08 option D**. The Developer authors pose geometry (half-body bust: head + shoulders + two hooves,
same framing for all poses) in `src/lib/mascot/poses.ts`; `MascotStaticPose` draws it; `scripts/gen-mascot-lottie.ts`
emits Lottie JSON from the same data. A commissioned file can replace any pose later by flipping its
`MASCOT_ASSET_SOURCE` entry to `'commissioned'` (the drift test then skips that pose; FF-11 still applies).

### 9.2 Generated motion per pose (rigid group transforms only)

| Pose | Groups animated | Duration / loop |
|---|---|---|
| idle | torso scaleY 1 -> 1.02 -> 1 (breathe), eyelids scaleY 1 -> 0.1 -> 1 once | 3.2 s seamless (96 frames) |
| thinking | eyes offset up-left, hoof to chin, three dots opacity in sequence | 1.8 s, plays 2x, hold |
| greeting | right hoof rotate -8 -> 18 -> -8 deg about the shoulder pivot | 1.8 s, 2x, hold |
| happy | both hooves translateY -6, head scale 1 -> 1.06 -> 1 | 0.6 s one shot, hold |
| celebrating | hooves high, body translateY -8 -> 0, confetti specks opacity + translate | 1.2 s one shot, hold |
| encouraging | fist hoof rotate 0 -> -12 -> 0, brows translateY | 2.4 s, 2x, hold |

### 9.3 Acceptance (FF-11, `scripts/check-mascot-assets.mjs`, run in `code:reliability`)

- Exactly the six file names in spec §9.5 for poses whose source is not `missing`.
- ≤ **40 kB gzip** each (level 9, the same measurement as the bundle script).
- `w = h = 512`, `fr = 30`, `ip = 0`, `op` = pose duration x 30.
- No text layers (`ty: 5`), no image assets (`assets[].p`), no expressions (`x` keys); every fill/stroke color is in
  `MASCOT_PALETTE` (+ the confetti accents already used by `PigFace`).
- Frame 0 parity: generated poses are equal by construction (drift test); commissioned poses need a Playwright pixel
  compare of poster vs first rendered frame (≤ 2% differing pixels at 96 px) recorded in the test report.
- Provenance row in `public/attribution.json` (`owned`, generator commit hash, or commissioning record).

### 9.4 Fallback matrix (`MascotRig`)

| Condition | Renderer | Persistence |
|---|---|---|
| `size="inline"` | static | per render |
| no `window.matchMedia` (jsdom, old webview) | static | per render (D-09) |
| `prefers-reduced-motion: reduce` | static, Lottie runtime never mounted | live (media query listener) |
| source `missing` | static, no fetch | build-time |
| loading | static poster in the same box, crossfade 120 ms on first `render` | per mount |
| JSON fetch fails / `loadError` | static | that pose, rest of session |
| `renderError` / WASM failure / chunk failure | static | all poses, rest of session (breaker) |
| `document.hidden` | Lottie paused | until visible |
| otherwise | Lottie | - |

Reduced-motion single-frame behavior: the static pose IS frame 0 (identical geometry), so the still state carries the
same mood; no Lottie frame is rendered at all under reduced motion.

### 9.5 Performance rules

The screen-wide cap counts **every** Lottie player - mascot, prompt illustration, feedback picture and reward
illustration - and is enforced by the D-20 allocator (≤1 before answering, ≤2 after, ≤1 on non-question screens, 0 on
pre-round screens per D-21). The mascot uses at most one instance; a pose change = `load()` on that instance. Preload
JSON for `idle`/`happy`/`encouraging` via `fetch` with `cache: 'force-cache'` when the first question mounts (not on
StartBatch, AC-2.5); WASM is the
already self-hosted dotlottie asset in the existing async chunk; `freezeOnOffscreen: true`; DPR capped at 2.

---

## 10. Risks, failure modes, non-goals

### 10.1 Risks

| ID | Risk | Likelihood / impact | Mitigation | Verified by |
|---|---|---|---|---|
| R-01 | Hero scene jank on low-end Android (3 full-width layers + ambient loops) | M / H | transform/opacity only; `will-change` only on the 3 pan layers; no CSS filters (D7); ≤12 animated nodes; pause on hidden; near layer hidden and pan off at `max-height:420px`; `strip` variant kept as kill switch (one prop in `App.shell`) | DevTools 4x CPU trace ≥50 fps during pan + ambient (§11.3); FF-13 |
| R-02 | Entry bundle growth on an already-red gate | H / M | D-03 delta gate; tracing + flashcards lazy; mascot player in existing async chunk | FF-10 |
| R-03 | Andika fails to load | L / L | `font-display: swap`, falls back to Be Vietnam Pro; tracing guide drawn from stroke data, never the font (spec §8.3) | visual check with fonts blocked |
| R-04 | Gap bank content quality (distractors) - Workstream A F2 class | M / H | validator V0-V7 at build + V8 at play; reviewed allowlist only; ineligible items stay typed-only; Spell-it carries drag acceptance regardless (R-v5-08) | fixtures 1-20 + coverage sweep |
| R-05 | Tracing tolerance wrong for real 6-year-olds | M / M | tunables isolated in `score.ts`; assisted path guarantees completion; Tester calibration Q9 before go-live | Tester calibration log |
| R-06 | e2e churn from G1-2 mechanics on the default grade-1 flows | H / M | helper-level branching (§8.1) instead of per-spec edits; typed peer path keeps listening flows cheap | e2e suite green per milestone |
| R-07 | Generated Lottie motion judged "not wow enough" | M / L | commissioned drop-in path without code change (D-08) | human design gate |
| R-08 | Flashcard ratings mix across child profiles on a shared device | M / L | documented limitation; key per grade only per spec; revisit with a server store CR | - |
| R-09 | `inert` unsupported on old Safari | L / L | `aria-hidden` + no focusables on faces (D-19) | a11y test |
| R-10 | Perch overlaps sheet text on 320-375 px | L / M | `pr-16/pr-14` headline clearance + overhang reserve (spec §9.3) | perch scroll screenshot at 390x844 |

### 10.2 Failure-mode catalog (every external or platform dependency touched)

| Dependency | Failure mode | Symptom | Designed response |
|---|---|---|---|
| dotlottie WASM / player chunk | chunk or WASM fetch fails, `renderError` | mascot frozen/blank | static renderer for the session (breaker), poster already painted - degrade |
| Mascot JSON (`public/mascot/*.json`) | 404, parse error, `loadError` | pose missing | static for that pose for the session - degrade |
| `localStorage` (flashcards) | disabled, quota, corrupt | ratings not saved | session-memory map; corrupt discarded + rewritten - degrade silently |
| `sessionStorage` (gap mode, demos) | disabled | preference forgotten | module-level fallback - degrade |
| Web Speech / audio (sentence TTS) | `unsupported` / `error` | no sentence audio | V8: bank disabled, typing forced, `AudioPlaybackWarning` - degrade |
| Canvas 2D (`getContext`) | null | cannot ink | assisted-only tracing (keyboard path) - degrade, never dead screen |
| Pointer Events extras (`getCoalescedEvents`) | absent | coarser strokes | feature-detected; plain `pointermove` points - degrade |
| Dynamic import (`FlashcardScreen`, `LetterTracingQuestion`) | chunk load fails offline; or the browser module map caches the failed import | screen cannot render | D-22: "Thử lại" creates a new lazy type and a new `import()` call (not a remount of the cached type). Flashcards: after 2 fresh failed attempts, "Tải lại trang" (`location.reload()`). Tracing: inline paper panel "Chưa mở được bài tô chữ" + "Thử lại"; "Bỏ qua câu này" appears only after a second **fresh** attempt fails, and calls `onSubmitTracing(true, { assisted: true, attempts: [] })` so the round never stalls (assisted = excluded from skill stats, D-10); no reload mid-batch - degrade |
| Fonts (Andika woff2) | fetch fails | fallback face | swap fallback (R-03) |
| `matchMedia` | absent | - | mascot static (D-09); reduced-motion hook reads "no preference" as today |
| Supabase | none - CR-82 adds no calls | - | n/a |

`DEVIATION` note: the tracing chunk-failure "Bỏ qua câu này" control is not in the spec; it exists only because lazy
loading (D-03) introduces a failure mode the spec could not foresee. **APPROVED** by the Design Lead (§14.2), on the
condition that it appears only after two genuinely fresh failed attempts (D-22).

### 10.3 Capacity and saturation

No backend surface changes, so no RPS/pool rows apply (no new service). Client capacity targets that the Tester proves:

| Surface | Target | Saturation mode | Mitigation | Verified by |
|---|---|---|---|---|
| Hero scene | ≥50 fps at 4x CPU throttle during pan + ambient | main-thread paint storms | compositor-only motion, ≤12 nodes | DevTools performance trace |
| Tracing ink | input-to-ink ≤ 1 frame at 60 Hz on mid Android | coalesced event floods | rAF batching, ≥2 px decimation | Playwright trace + manual device check |
| Flashcard swipe | 60 fps follow | layout thrash | transform only, no layout reads during move | DevTools trace |
| Exam navigator (200 q) | open ≤ 100 ms | large grid render | plain buttons, no per-cell effects | Playwright timing |

### 10.4 Threat model (STRIDE-lite)

No auth, money, PII or admin flow changes. The only new persisted data is flashcard word ids + ratings in
`localStorage` (non-sensitive). `useDragTile` ghost no longer uses `dangerouslySetInnerHTML` (D-05), removing the one
HTML-injection surface this work touches. No new third-party origin is contacted (same-origin rule, `e2e/same-origin.spec.ts`
stays green: mascot JSON, sfx, fonts and WASM are all self-hosted).

### 10.5 Non-goals (CR-82)

- Server-side flashcard store, spaced-repetition scheduling UI, flashcard quest credit (Q5b default no).
- Per-profile persistence of the Gap input mode (Q10 default session only).
- Uppercase tracing, word tracing stretch for G2 (D-02).
- Pointer parallax (spec §6.3 P2 optional).
- Fixing the inherited entry-bundle overrun (D-03, logged as debt).
- Adaptive handwriting recognition (geometric tolerance only).
- Gap bank on items that fail the validator: they stay typed-only by design (content risk handled, not shipped).
- BatchScreen `batch-end-early` 44 px deviation (spec §14.5 logs it as outside scope; logged in MEMORY open threads).

---

## 11. Verification hooks (for the Tester)

### 11.1 Testids (keep / add)

| Area | Keep (unchanged) | Add |
|---|---|---|
| Board / sheet | `question-card` (+ `data-question-kind`), `question-progress`, `next-button`, `answer-feedback`, `data-correct`, `submit-answer-button`, `answer-input`, `play-audio-button` | `feedback-sheet`, `sheet-perch`, `board-perch`, `journey-trail` |
| Mascot | `mascot`, `data-mascot-mood` | `data-mascot-renderer` (`lottie` / `static`) |
| Lottie budget | `data-emoji-visual`, `data-emoji-mode` | `data-lottie-player` (`emoji` / `mascot`) on player wrappers (D-20) |
| GradeSelect | `grade-card-{id}`, `grade-stars-{id}` | `grade-postcard-{id}` |
| Retry panels | - | `tracing-load-error`, `tracing-load-retry`, `tracing-skip`, `flashcard-reload` |
| Scene | - | `land-scene` (`data-variant`, `data-tone`, `data-scene-paused`), `scene-layer-{far,mid,near}` |
| Tracing | - | `tracing-slate`, `tracing-canvas`, `tracing-stroke-{i}` (`data-state`), `tracing-demo`, `tracing-reset`, `tracing-auto-step`, root `data-tracing-attempts`, `tracing-live` |
| Spell / Gap | - | `spell-bank`, `spell-tile-{i}` (+ `data-tile-id`), `spell-slot-{i}`, `gap-bank`, `gap-chip-{i}`, `sentence-gap`, `gap-input-toggle` |
| Flashcards | - | `flashcard-screen`, `flashcard-card` (`data-face`), `flashcard-flip`, `flashcard-speaker`, `flashcard-known`, `flashcard-again`, `flashcard-live`, `flashcard-summary` (`data-exit`), `flashcard-next-deck`, `flashcard-resume`, `flashcard-retry-again`, `flashcard-empty`, `flashcard-error`, `flashcard-error-retry`, `flashcards-start` |
| Hub | `hub-tile-more`, `hub-tile-reward`, `hub-subtile-{english,math,science,review}`, `hub-section-*`, `start-batch-button`, `back-to-grades` | `hub-tile-arena`, `hub-panel-arena` (G1-2); `hub-subtile-arena` removed (intentional, R-v5-12) |
| Exam | `exam-screen`, `exam-timer`, `exam-submit`, `exam-nav-{i}`, `exam-progress`, `exam-elapsed`, `exam-brand`, `exam-option-{i}`, `practice-verdict`, `practice-next`, `exam-begin`, `exam-result`, `exam-score`, `exam-review`, `exam-review-toggle`, `exam-retry`, `exam-play-again`, `exam-pool-warning` | `exam-sheet`, `exam-progress-ring`, `exam-nav-open`, `exam-navigator`, `exam-navigator-cell-{i}`, `exam-flag`, `exam-review-sheet`, `exam-review-back`, `exam-review-submit`, `exam-review-jump-{i}`, `exam-timer-live` |
| Rewards | `live-score`, `star-rain` | `star-fly`, `streak-chip`, `streak-burst` |

Intentional value changes (already called out by the spec): pre-answer `data-mascot-mood` `encouraging` -> `idle`;
exam submit flow ids (D-13); `hub-subtile-arena` -> `hub-tile-arena`.

### 11.2 Playwright flows (new specs)

1. **Tracing** (`cr82-tracing.spec.ts`, grade-1): reach a `letter-tracing` item; drive `page.mouse` down/move/up along
   `strokes.ts` points mapped into the `tracing-canvas` box -> every `tracing-stroke-{i}` ends `done`, sheet shows
   "Em tô đẹp quá!"; second run with an off-path polyline -> stroke stays `active`, `data-tracing-attempts` increments,
   third failure -> `auto`; keyboard run: Tab to `tracing-auto-step`, Enter per stroke -> submits.
2. **Spell-it** (`cr82-spell-gap.spec.ts`, grade-1 and grade-2): drag tile to slot (mouse down, move >8 px, up over
   `spell-slot-{i}`); tap fallback; keyboard Enter; repeated letters (`book`/`school` fixtures via a seeded batch);
   6/7/8-letter boundaries asserted in unit tests and one e2e smoke per grade.
3. **Gap**: bank drag into `sentence-gap`; `gap-input-toggle` switches to typing and back (state cleared, announcement in
   live region); tap empty gap opens typing with focus in `answer-input`; audio stubbed to `error` -> typed forced,
   toggle hidden.
4. **Flashcards** (`cr82-flashcards.spec.ts`): open from `hub-subtile-english` -> `flashcards-start`; flip by tap and
   Enter; swipe right/left with `page.mouse`; ArrowRight/ArrowLeft; speaker click never flips; a swipe never flips;
   KẾT THÚC -> partial summary; zero-progress exit; retry deck; axe scan on each face.
5. **Exam** (`cr82-exam-flow.spec.ts`): flag two questions, open navigator, jump, open review sheet, jump from "Chưa làm",
   submit via `exam-review-submit`; time-up while review sheet open (clock mocked) -> result screen; shortcuts `1`, `→`,
   `F`, `N`.
6. **Mascot**: reduced-motion context (`page.emulateMedia({ reducedMotion: 'reduce' })`) -> every `mascot` has
   `data-mascot-renderer="static"`; default context: StartBatch -> `static` (D-21) with zero `/mascot/`, `.wasm` and
   `/emoji/lottie/` requests; first question with a non-eligible prompt -> board mascot `lottie` after load.
7. **One mascot**: count `[data-testid="mascot"]` = 1 on each screen state listed in spec §9.3; = 0 during the exam sitting.
8. **Lottie budget** (FF-19): count `[data-lottie-player] canvas` (never bare `canvas`) on an unanswered eligible
   image-choice question (≤1), after answering it (≤2), on a tracing item (tracing canvas excluded, ≤1), and on
   StartBatch/RoundSummary/BatchSummary (StartBatch 0; others ≤1, BatchSummary with gift ≤2).
9. **Lazy retry** (FF-20): abort the flashcard chunk once via `page.route`, restore, click `flashcard-error-retry`,
   assert `flashcard-card`.

### 11.3 Redesign evidence (screenshot pairs)

Viewports **390x844, 844x390, 1280x800**, each in default and `reducedMotion: 'reduce'`, each paired side-by-side with the
v4 screenshot captured from the pre-M1 commit (Tester stores both under `docs/test-evidence/cr82/`):
G1 question (dusk), G4 question (night), feedback sheet with streak chip, feedback sheet with a long scrolled explanation
(perch fixed and unclipped), 844x390 sheet (inline mascot, one node), tracing mid-stroke + complete, Spell-it dragging,
Gap bank + typing mode, flashcard front/back/summary (G1 and G4), exam sheet, navigator dialog, review sheet, ExamResult,
GradeSelect hero, StartBatch G1-2 hub (5 first-paint controls). Plus: DevTools performance trace of BatchScreen hero
at 4x CPU throttle (pan + ambient) with fps summary; computed-contrast check on one element per new composite (spec
§5.3 matrix rows), compositing gradient stops per CONVENTIONS "measure contrast on the rendered element".

---

## 12. Fitness functions (executable; each fails the build or review)

| ID | Dimension | Check | Enforcement |
|---|---|---|---|
| FF-1 | One mascot | `oneMascot.test.tsx` parametrized counts (staged M4/M5/M8, complete at M10) | vitest |
| FF-2 | Type pairing | `tokens.test.ts` composite ink/size rules + no `*_GEO` imports in components | vitest |
| FF-3 | Surface pairing | `colorPairingGuard.test.ts` same-element paper token + light ink | vitest |
| FF-4 | Copy | `dashGuard.test.ts` | vitest |
| FF-5 | Reduced motion | `reducedMotionGuard.test.ts` | vitest |
| FF-6 | No hex in scene/mascot components | scanner in `LandScene.test.tsx` over `src/components/scene/**`, `src/components/mascot/**`, `Mascot.tsx`, `GradeSelect.tsx` (postcards, GT-22) | vitest |
| FF-7 | Violet closed inventory | `paletteGuard.test.ts` | vitest |
| FF-8 | Indigo purge | `paletteGuard.test.ts` | vitest |
| FF-9 | No new runtime deps (no GSAP/framer-motion) | `depsGuard.test.ts` | vitest |
| FF-10 | Bundle delta + lazy chunk caps | `check-bundle-budget.mjs` CR-82 block (D-03) | post-build script in Developer DoD |
| FF-11 | Mascot asset contract | `check-mascot-assets.mjs` | `code:reliability` |
| FF-12 | Attribution | `check-attribution.mjs` incl. `public/mascot/`, Andika OFL, sfx | `audit:attribution` |
| FF-13 | Ambient budget | `LandScene.test.tsx` ≤12 animated nodes per land hero | vitest |
| FF-14 | sfx size | each `public/sfx/*.mp3` ≤ 20 kB (attribution script) | `audit:attribution` |
| FF-15 | Font size | each `public/fonts/andika/*.woff2` ≤ 60 kB | `audit:attribution` |
| FF-16 | Compositor-only motion | keyframes in `tailwind.config.js` + `index.css` animate only `transform`/`opacity`; `ease-toy` only in `press-release`/`snap-in` | `reducedMotionGuard.test.ts` |
| FF-17 | Gap bank honesty | coverage sweep: every offered bank passes the validator, 3 distinct options | vitest |
| FF-19 | Whole-screen Lottie budget (constitution #5 / C5, AC-2.9, AC-2.5) | `LottieBudget.test.ts` + `QuestionCard.lottieBudget.test.tsx` (unit) and `emoji-visual.spec.ts` counting `[data-lottie-player] canvas` pre/post submit and on pre-round screens (e2e) | vitest + Playwright |
| FF-20 | Real lazy retry | `retryableLazy.test.tsx` asserts a second loader invocation after retry | vitest |
| FF-18 | Lottie isolation | `@lottiefiles/*` imported only by `EmojiLottiePlayer.tsx` and `mascot/MascotLottie.tsx`; existing "entry chunk lottie-runtime-free" check stays OK | `depsGuard.test.ts` + bundle script |

---

## 13. Canonical references (per load-bearing decision)

- Pointer Events, capture, coalesced events (D-05, §4.2): https://developer.mozilla.org/docs/Web/API/Pointer_events,
  https://developer.mozilla.org/docs/Web/API/PointerEvent/getCoalescedEvents
- WCAG 2.2 SC 2.5.7 Dragging Movements, 2.5.2 Pointer Cancellation (drag/swipe alternatives):
  https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements
- WAI-ARIA APG modal dialog pattern (navigator, review sheet): https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- `inert` (D-19): https://developer.mozilla.org/docs/Web/HTML/Global_attributes/inert
- dotLottie web player API (D-08, D-09): installed typings `node_modules/@lottiefiles/dotlottie-web/dist/index.d.ts`
  (v0.80.0) and https://developers.lottiefiles.com/docs/dotlottie-player/dotlottie-web/
- Lottie JSON format (generator): https://lottiefiles.github.io/lottie-docs/
- Compositor-only animation (R-01): https://web.dev/articles/animations-guide
- Tailwind theme extension (M1): https://v3.tailwindcss.com/docs/theme#extending-the-default-theme

---

## 14. Handoffs, deviations and rulings index

### 14.1 Handoffs (non-blocking unless stated)

| ID | To | Item |
|---|---|---|
| H-1 | BA | confirm D-01 G1-2 round mix and whether G1-2 Round 1 title changes |
| H-2 | BA | confirm D-02 lowercase-only tracing for CR-82 |
| H-3 | BA | PRD + `DESIGN_SYSTEM.md` §5 wording "≤4 mode decisions + Back" (spec Q3b) |
| H-4 | Content reviewer | `docs/content/GAP-BANK-REVIEW.md` rows before any topic enters `GAP_BANK_TOPICS` (M7 gate for shipping banks, not for shipping M7 code) |
| H-5 | Tester | tracing tolerance calibration with real G1/G2 traces (spec Q9) before go-live |
| H-6 | Content | sfx sourcing in one key (spec Q8) - M9 may ship with existing two files if new files are not cleared; ui/reward tiers then no-op silently |
| H-7 | Design Lead | ~~acknowledge the `DEVIATION` items below~~ - **closed**: all four APPROVED in `docs/reviews/TECH-LEAD-v5-review.md` |
| H-8 | Human / BA | optional amendment of PRD AC-2.5 to allow the animated greeting mascot on pre-round screens (D-21 option B). Until ruled, D-21 option A ships (compliant) |

### 14.2 Deviations from the spec - Design Lead rulings (recorded from `docs/reviews/TECH-LEAD-v5-review.md`)

| # | Deviation | Ruling | Condition carried into this document |
|---|---|---|---|
| 1 | D-16 flashcard-card mascot perch placement (fills a gap between §9.3 and §14.3) | **APPROVED** | decorative `aria-hidden` wrapper kept; small-screen clearance verified in the M8 screenshots |
| 2 | §10.2 tracing chunk-failure "Bỏ qua câu này" escape | **APPROVED** | assisted-stat exclusion kept (D-10); shown only after two genuinely fresh failed attempts (D-22) |
| 3 | D-12 Andika 700 only | **APPROVED** | - |
| 4 | D-13 review sheet testids beyond `exam-review-submit` | **APPROVED** | exam-mode endConfirm test migration stays mandatory (§8.1) |

D-21 (pre-round mascot static) is not a spec deviation in effect: spec §9.2 lists `greeting` for those screens, and the
static `greeting` pose is the spec's own fallback renderer; it is recorded so the Design Lead sees that the greeting
wave on GradeSelect/AuthScreen/StartBatch is still unless H-8 is ruled.

### 14.3 Rulings index (this document)

| ID | Ruling | Status |
|---|---|---|
| D-01 | G1-2 R1: 6 extra-letter + 2 image-choice + 2 tracing (idx 3, 7); G1-2 R2: 3 image-choice + 4 sentence (Gap/typed) + 3 Spell-it; G3-5 unchanged; backfill keeps 10 | Tech Lead, reversible; BA confirm (H-1) |
| D-02 | Lowercase-only tracing in CR-82 | Tech Lead; BA confirm (H-2) |
| D-03 | Bundle delta gate (+20 kB JS / +4 kB CSS gzip) + lazy chunk caps; inherited overrun logged as debt | Tech Lead |
| D-04 | Grade-specific behaviour baked into payloads; `buildQuestions(seed, words, ctx?)` | Tech Lead |
| D-05 | Generalize `useDragTile` (crossNamespace, onDropOutside, renderGhost, transform ghost) | Tech Lead |
| D-06 | Imperative `SceneJourneyContext`; `--pan: 0` via CSS media for reduced motion + short landscape | Tech Lead |
| D-07 | Scene art split into per-land `{Far, Mid, Near}`; palette-only fills | Tech Lead |
| D-08 | Lottie = geometry-shared generated JSON; commissioned drop-in via `MASCOT_ASSET_SOURCE` | Tech Lead (firm) |
| D-09 | Mascot Lottie requires `matchMedia` + no reduced motion; jsdom static by construction | Tech Lead |
| D-10 | `onSubmitTracing(isCorrect, meta)`; assisted excluded from skill stats via `RoundOutcome.skillCorrect/skillTotal` | Tech Lead |
| D-11 | Lazy `FlashcardScreen` route + error boundary = load-error state; retry per D-22 | Tech Lead (a2 amended) |
| D-12 | Andika 700 latin + vietnamese vendored (~27.8 kB) | Tech Lead (resolves spec Q6) |
| D-13 | Review sheet testids; exam-mode endConfirm tests updated | Tech Lead |
| D-14 | `useGapInputMode` sessionStorage + module fallback | Tech Lead |
| D-15 | `thinking`: 12 s idle from `InstructionSpeaker.onSettled` (status mapping table) + audio loading > 400 ms via `onAudioLoadingChange`; board-owned; G1-2 only | Tech Lead (a2 amended) |
| D-16 | Flashcard-card companion perch | Tech Lead; **APPROVED** by Design Lead |
| D-17 | `RewardFxContext` star-fly from focused element to LiveScore | Tech Lead |
| D-18 | Exam flags/shortcuts are UI state only | Tech Lead |
| D-19 | `inert=""` type augmentation | Tech Lead |
| D-20 | One board-level Lottie allocator (`LottieBudgetProvider` in `QuestionCard`): pre-answer 1 slot = prompt if Lottie-eligible else mascot; post-answer 2 slots = sheet mascot + feedback picture, prompt static; suppressed illustrations keep their static twin | Tech Lead (a2) |
| D-21 | Pre-round screens (GradeSelect, AuthScreen, StartBatch) render the static `greeting` pose; first Lottie request on the first question (PRD AC-2.5) | Tech Lead default (a2); human may amend AC-2.5 (H-8) |
| D-22 | `createRetryableLazy`: new lazy type + new `import()` per attempt; fresh-vs-cached failure accounting; flashcards offer `location.reload()` after 2 fresh failures; tracing skip only after 2 fresh failures, never reload mid-batch | Tech Lead (a2) |
| Q11 | dotlottie plays plain Lottie JSON (`data` prop) - no `.lottie` packaging | Resolved (GT-7) |

---

## 15. Phase status

- Lead review: a1 reviewed (`docs/reviews/TECH-LEAD-v5-review.md`, APPROVE_WITH_CHANGES); a2 applies the 5 must-fix
  findings - reviewer confirmation of a2 pending.
- Developer may start M1 on approval. After M1, lane B (M5) runs in parallel with lane A (M2/M3 -> M4 -> M6 -> M7, M8
  after M2 + M4); M9 after M7 + M8; M10 is the final gate (§7).
- `docs/MEMORY.md` entries: a1 (D-01, D-03, D-08, bundle debt) and a2 (D-20, D-21, D-22).

---

## 16. Changelog

### a2 - Tech Lead review must-fix findings (`docs/reviews/TECH-LEAD-v5-review.md`)

| Finding | Fix in this revision |
|---|---|
| 1 Lottie players: count all, not only the mascot | GT-18/GT-19; **D-20** board-level allocator with per-state ownership table (prompt / mascot / feedback / reward) and static twins; **D-21** pre-round screens stay Lottie-free (AC-2.5); caller file changes (`ImageChoice`, `PhonicsSound/Ending/RhymeChoice`, `FeedbackPanel`, `GiftBoxPicker`, `MascotRig`, `EmojiLottiePlayer` `data-lottie-player`); §4.1 budget note; §9.5 rewritten; FF-19; unit + e2e player-count tests pre/post submit |
| 2 Lazy-load retry rethrows the cached rejection | GT-20; **D-22** `createRetryableLazy` (new lazy type + new `import()` per attempt), fresh-vs-cached failure accounting, reload fallback for flashcards only, tracing skip gated on 2 fresh failures; D-11 and §10.2 amended; `retryableLazy`, `FlashcardRoute.retry`, `TracingChunkBoundary` tests + e2e smoke; FF-20 |
| 3 File-map gaps | (a) GradeSelect 96 px day-tone postcards replacing the hex `LandStrip` [M2] + test, FF-6 scope widened; (b) `usePressRelease` contract incl. keyboard (Enter/Space via `data-pressed`) and reduced motion, plus every consumer file (`material.tile*` tiles, `CTA_GOLD_XL` sites, `BTN_REWARD_EARNED` sites) [M9] + tests; (c) `InstructionSpeaker.onSettled` prop, full instruction-status -> idle-clock mapping (ended, blocked, unavailable, error, dropped-for-content, skipped key), and the `onAudioLoadingChange` child -> board signal owned by `QuestionCard` (D-15 rewritten) + tests |
| 4 `e2e/emoji-visual.spec.ts` missing from §8 | GT-23; five register rows: superseded (Twemoji pig, `✨`/`🎉` accent triggers) vs retained (A-09 caps, AC-2.5 pre-round, same-origin, listening options) with their replacements; canvas counting via `[data-lottie-player] canvas`, tracing canvas excluded |
| 5 Forward milestone dependencies | one-mascot matrix staged (M4 / M5 / M8, complete at M10); former M9 split into M9 implementation (deps M3, M4, M7, M8) and **M10** final gate (deps M1-M9); parallel-lane prose and §15 reconciled |
| Design Lead deviation rulings | all four APPROVED, recorded in the header, §14.1 (H-7 closed) and §14.2 with their carried conditions |
