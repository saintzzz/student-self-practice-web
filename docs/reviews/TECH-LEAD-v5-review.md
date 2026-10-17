# Tech Lead v5 cross-model review

**Verdict: APPROVE_WITH_CHANGES**

Requested artifact status: **APPROVED_WITH_FIXES**. **5 must-fix findings** (ordered below).

Reviewed `docs/design/v5/ARCHITECTURE-v5.md` against `DESIGN-SPEC-v5.md` revision 3, `docs/sdlc/constitution.md`, project `AGENTS.md`, framework `CONVENTIONS.md`, and the Tech Lead reviewer skill. Mechanism: independent cross-model API reviewer; repository reads and deterministic greps, not a dispatched CLI review. No implementation changes, build, or browser validation claimed. Approval is conditional on correcting the architecture before the affected milestones proceed.

## Must-fix findings

### 1. [FE] High - Account for all Lottie players, not only the mascot

**Locations:** architecture §4.1 (lines 463-475), §9.5 (835-837), §3.3 (339); constitution non-negotiable 5 and C5; `src/components/ImageChoiceQuestion.tsx:41-46`, `src/components/FeedbackPanel.tsx:125`.

The unanswered board mounts a non-inline Lottie mascot, while the existing image-choice prompt independently requests animated `EmojiVisual`. This permits two players before answering, against the constitution's maximum of one. After answering, the prompt remains mounted and the feedback picture can animate alongside the sheet mascot, permitting three rather than two. The claim "one player instance per screen (follows the one-mascot rule)" only counts the mascot and does not resolve this integration.

**Required correction:** specify animation ownership across prompt, mascot, and feedback, with file-level changes to the affected `EmojiVisual` callers or a shared allocation mechanism. Preserve a visible static twin for whichever illustration is suppressed. If both pre-answer animations are desired, obtain an explicit constitution amendment instead of silently exceeding the cap. Add whole-screen player-count tests using an animated-eligible prompt, both before and after submission. Do not count tracing canvases as Lottie players.

### 2. [FE] High - Lazy-load retry does not retry the cached rejection

**Locations:** architecture D-11, lines 228-232; §10.2, line 867. Verification: `node_modules/react/cjs/react.development.js:1354-1395` (`lazyInitializer`).

The proposed flashcard retry remounts the same `React.lazy` route with a key bump. React stores the rejected promise/error on the lazy type, not on the mounted component. Resetting an error boundary or changing its child key therefore rethrows the same rejection even after connectivity recovers. The tracing fallback similarly relies on remounting, then interprets a second failure as grounds to offer a skip; this can be the same cached failure rather than a second load attempt.

**Required correction:** define an actual retry strategy for both routes, including how the lazy type/import attempt is renewed and what happens if the browser module loader caches the failed import (a deliberate reload recovery is an acceptable documented fallback). Add tests that fail one load, restore availability, then activate retry and verify a new attempt and successful recovery. Distinguish a fresh failed attempt from a repeated cached exception before enabling the tracing skip.

### 3. [FE] Medium - The file map is not yet complete for specified UI and interaction work

**Locations:** spec §6.5 route table, line 599; §16.1, lines 1537-1539; architecture §3.2-§3.4, lines 323-364; §3.9, line 430; D-15, lines 261-267.

Three concrete implementation-path gaps remain:

- The spec requires a 96px day-tone land-strip postcard on each GradeSelect grade card. The architecture assigns GradeSelect only a hero shell and mascot sizing; no file-map task or test covers the individual card thumbnails.
- `usePressRelease.ts` is planned, but there are no consumer tasks for the required `material.tile*`, `CTA_GOLD_XL`, and `BTN_REWARD_EARNED` controls. Defining a hook and animation alone does not apply the spec's press-release behavior to those surfaces. Gold CTAs also occur outside QuestionCard.
- D-15 introduces an `InstructionSpeaker` completion callback, but `InstructionSpeaker.tsx` is absent from the file map. Its current props (`src/components/InstructionSpeaker.tsx:35-42`) have no such callback, and its statuses come from the instruction API, not `SpeechPlaybackStatus` (`src/lib/speech.ts:535-540`). The connection from question audio-loading state to the board-owned thinking pose is likewise not assigned to a component contract.

**Required correction:** assign files, milestone ownership, and tests for these paths. For thinking, define the instruction-status mapping (including blocked/unavailable/cancelled or skipped autoplay) and the child-to-board audio-loading signal so the developer does not invent a second audio/state channel. For press-release, include keyboard activation and reduced-motion behavior, not only `pointerup`.

### 4. [FE] Medium - §8 misses existing mascot integration tests that will fail

**Locations:** architecture §8.1, lines 730-752; `e2e/emoji-visual.spec.ts:48-58,106-145,178-193,207-218`.

`emoji-visual.spec.ts` is absent from the register despite directly asserting that the mascot is a Twemoji pig, that feedback contains its animated sparkle accent, that the summary contains its confetti accent, and that pre-round screens make no Lottie/WASM requests. Those assumptions are deliberately invalidated by the new pose renderer and the planned animated StartBatch mascot. Updating only `mascot.spec.ts` and `mascot-flow.ts` cannot fix them. The same file's canvas-count assertion also needs to distinguish Lottie from the new tracing canvas.

**Required correction:** add this file to M4/M6's register, identify which historical mascot assertions are superseded, and replace them with pose-renderer/fallback assertions while retaining emoji-renderer coverage on actual content illustrations. Retain same-origin and whole-screen player-budget checks rather than deleting the protections. No additional verified exam-submit or hub test omission emerged from the targeted grep; the named component tests are covered by the register.

### 5. [FE] Medium - Milestone gates contain forward dependencies

**Locations:** architecture §7, lines 713-723; §8.2 one-mascot row, line 765; §15, line 1057.

M4's one-mascot exit test is specified to cover the flashcard card and summary, which do not exist until M8, and exam sitting with zero mascots, whose header removal is assigned to M5. Consequently M4 cannot satisfy its stated gate independently, even though M6 depends on M4. M9 declares dependencies only on M3/M4, yet its mandatory full screenshot matrix includes exam, tracing, drag/dual-input, and flashcard surfaces from M5-M8. Calling M9 "last" in prose does not make the dependency table correct for parallel execution.

**Required correction:** stage the one-mascot matrix: M4 covers screens already changed, M5 adds exam states, M8 adds flashcards; require the completed matrix at the final gate. Add M5-M8 dependencies to M9 (or split implementation from final integration/evidence). Reconcile the closing statement that M5 can run after M1 with the prose implying it waits for M2-M4. The core M1 -> M6 builder-context -> M7 ordering is otherwise sound.

## Design Lead deviation rulings

These rulings cover design intent only; they do not waive the fixes above.

| Deviation | Ruling | Rationale |
|---|---|---|
| D-16 mascot perched outside flashcard stack | **APPROVED** | Satisfies spec §9.3's one-mascot requirement without adding an interaction target or obscuring the flip/speaker DOM; retain the stated decorative wrapper and verify small-screen clearance. |
| Tracing load-failure "Bỏ qua câu này" after two failures | **APPROVED** | A bounded assisted escape prevents a broken chunk from trapping a child; retain assisted-stat exclusion and make retry attempts real per finding 2. |
| D-12 Andika 700-only | **APPROVED** | All planned letter composites consume 700, and spec Q6 explicitly allows a 700-only delivery; unused 400 assets add no visible capability. |
| D-13 extra review-sheet testids | **APPROVED** | Additive automation hooks do not change the design or collide with ExamResult's `exam-review`; exam-mode test migration remains mandatory. |

## Spec fidelity coverage

| Feature | Planned implementation path | Assessment |
|---|---|---|
| Scene layers/pan/tone/pause | §3.1-3.2: theme/tokens, scene art, LandScene/LandShell, journey context, BatchScreen/App | Covered except GradeSelect postcard task (finding 3). |
| Materials and geometry/ink type split | §3.1/3.3: tokens, option styles, question components, summaries, pairing guards and render fixtures | Covered. |
| Mascot Lottie/static/error/reduced-motion fallback | §3.4, §4.1, §9 | Covered subject to player allocation, audio wiring and test fixes. |
| Exam paper/navigator/flags/review/timer | §3.5, §4.6-4.7 | Covered. |
| Tracing/assisted mastery exclusion | §3.6, §4.2, D-10 | Covered; pure scoring module and calibration handoff appropriate. |
| Spell-it/Gap validator/dual input | §3.7, §4.3-4.4, §6.2-6.3 | Covered; V0-V8 and seeded eligibility have owners. |
| Flashcard IA/deck/local ratings/a11y/failures | §3.8, §4.5, §6.1 | Covered; genuine chunk retry needs correction. |
| Micro-interactions/rewards/sound | §3.9, D-17 | Covered except press-release consumer integration (finding 3). |
| Reduced-motion twins | §3.1, component contracts, §8/§11/§12 | Broadly covered; retain interaction-specific tests, not just CSS scanning. |

## Claims checked against code

- **Sentence exports: true.** `src/lib/generators/listeningSentenceFillBlank.ts:423,438` exports `sentencesForWord` and `blankOutWord`. `WORD_ID_OVERRIDES` exists at line 267 and is consulted at line 400; `sentencesForWord` retains that classification path.
- **Plain Lottie JSON: true.** `EmojiLottiePlayer.tsx:35-42,84-87` parses JSON and supplies `data` to `DotLottieReact`; installed dotlottie-web typings accept `data` (line 923). The existing module self-hosts WASM through `setWasmUrl` at lines 8-13.
- **Same-number drag slot: true.** `useDragTile.tsx:111` excludes `dest === source`; ghost uses `left/top` and HTML injection at lines 149-150. Existing pair namespaces tolerate this; independent bank/slot indices require D-05.
- **Progress and sheet ownership: true.** BatchScreen owns `progressFraction` at line 108; QuestionCard's fixed feedback wrapper is at line 363, wrapping FeedbackPanel and Next.
- **Exam testid migration: true.** Existing exam confirmation tests use `end-confirm-*`; ExamResult already owns `exam-review`. D-13's distinct ids are appropriate.
- **Bundle numbers:** the current script's absolute limits are 121/10 KiB gzip (`scripts/check-bundle-budget.mjs`, constants `JS_MAX_KB`/`CSS_MAX_KB`). The architecture's 224.55/13.08 baseline was not independently reproduced here. Re-measure a pinned pre-M1 source commit; this review does not certify those measurements.

## D-01 round-mix ruling

**Sane and implementable, retaining H-1 BA acknowledgment.** Current R1 is 7 extra-letter + 3 image-choice (`round1ExtraLetter.ts:15-16,28-44`); current R2 is 5 image-choice + 5 sentence-fill (`round2ListeningSentence.ts:20-21,38-50`). Neither currently carries tracing or standalone listening-fill-blank. Both stratify kind pools then seeded-shuffle, so the proposed slices and round-union extensions are localized changes.

G1-2 R1 totals 6 + 2 + 2 = 10, tracing at 1-based positions 4/8 after shuffling other items. R2 totals 3 + 4 + 3 = 10; eligibility-filtered Spell-it finally has a carrier. Preserve G3-5 counts, topic stratification, deterministic seeds, non-first tracing, small-pool backfill tests, and four rounds. Do not promise three Spell-it items for deficient/custom pools when D-01 explicitly permits backfill. The G1-2 Round 1 title remains a named BA decision, not a developer copy choice.

## Integration risks and acceptance notes

- **Scene performance:** R-01 already addresses filters, promoted pan layers, ambient cap, hidden pause, short-landscape fallback and 4x CPU tracing. Full-viewport SVG layers still consume GPU texture memory; CPU-throttled desktop results do not prove low-memory Android compositing. Record viewport/DPR and inspect raster/compositor behavior on the target device before go-live. Transform-only CSS does not by itself prove 50fps.
- **Bundle realism:** +20 KiB JS/+4 KiB CSS is a proposed cap, not a demonstrated estimate. Eager scene geometry, static mascot geometry, dialogs and validators compete for that headroom. Measure the transitive entry graph and feature chunks after extraction so shared chunks cannot escape accounting. Generated JSON/WASM remain separate network costs. No evidence here proves the cap impossible; keep it as a measured gate rather than relaxing it preemptively.
- **Lottie authoring:** shared shape-data generation with rigid transforms is feasible without a new runtime dependency. JSON drift/frame-zero checks do not prove correct pivots, clipping, z-order or blink motion. Browser-render all six poses with the installed player, including finite-loop holds and static parity; retain the human visual gate.
- **Tracing determinism:** pure scoring and guide resampling are planned. Pin coordinate normalization, duplicate/zero-length segment handling, and the input polyline used for precision versus smoothed display ink. Replay identical normalized traces with different event batching/DPR in unit tests. Real-child tolerance calibration remains spec Q9, not a substitute for defined geometric edge behavior.
- **Flashcard a11y:** single flip button, sibling speaker, inert inactive face, role queries and focus tests address the main risks. Check browser axe/keyboard behavior during transitions too; prevent duplicate ratings while fly-out is pending. Pointer cancellation must restore the current card without rating it (spec §18).
- **Dual input:** §4.4 specifies clearing on switch and forced typing after audio failure. Call the hook unconditionally, rather than copying the conditional `useGapInputMode()` expression literally. Keep session preference separate from per-item forced mode; lock forced typing for that item even if later playback clears `playbackFailed`, reset on a new question, and ignore old-item audio callbacks. Test bank -> type -> bank, audio failure with a placed chip, post-submit toggle attempts, and storage failure.

## Verification scope

Targeted greps covered source/e2e tests referencing mascot, exam submit, feedback and hub identifiers. Examples checked beyond the register include `e2e/emoji-visual.spec.ts`, `round-live-score.spec.ts`, and `round-topic-spread.spec.ts`; only concrete required migrations are reported. No backend schema/API changes are required by this plan. No build/browser pass is claimed for an architecture-only review. Only this report was written; pre-existing working-tree changes were left untouched.
