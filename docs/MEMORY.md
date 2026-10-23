# Project Memory - English Arena / student-self-practice-web

> Committed memory across phases and sessions. Append-only: new entries go at
> the bottom of the right section, in the same commit as the artifact that
> produced them. Intake and every phase reads this file before working.
> Chat recall is not memory - if it isn't here, it doesn't persist.

## Decisions & rulings
- 2026-02 | CR-69 | Destructive-action confirm = centered dialog (`ConfirmEndDialog`), not inline | Human gate choice | Reversible via CR
- 2026-02 | CR-69 | Deferred: StartBatchScreen restructure, detector cosmetics, signup/forgot-PIN, read-aloud grade-1 | Scope control | Re-entered via kids-UX redesign intent
- 2026-02 | STT | `gemini_model` vault -> `gemini-2.5-flash-lite`; OpenRouter audio hard-requires >=$0.50 balance even on :free | Live incident fix | Vault-level, reversible
- 2026-02 | intake | Fidelity level = token-faithful; no Figma source exists | config default | Standing
- 2026-10 | CR-82-B/C | Design spec v5 drafted (luxury language + mechanics) - `docs/design/v5/DESIGN-SPEC-v5.md`: "Chân trời vàng" hero land scene (dusk G1-2 / night G3-5, journey pan), material.* soft-3D tokens, TYPE_* scale + Andika letter-level G1-2, 6-pose Bé Heo perch, exam paper sheet + navigator/review-before-submit, tracing/spell/gap/flashcards; rulings R-v5-01..09 (R-v5-02 mascot rig + OM-1..6 pending human gate) | pipeline Designer phase | Pending design gate
- 2026-10 | CR-82-B/C | Design spec v5 rev 2 after Design Lead REJECT (F1-F8, N1-N3 fixed). Human rulings: OM-1 B dusk/night, OM-2 A+B Andika, OM-3 Lottie JSON now (R-v5-02 approved; static SVG pose = poster/reduced-motion/missing-asset fallback, missing poses logged here, build not blocked), OM-4 A paper exam (R-v5-03 approved), OM-5 G1-2 Gap = word bank + peer typing toggle (R-v5-10), OM-6 A orange city + closed violet inventory. New: R-v5-11 flashcards local-only, R-v5-12 G1-2 hub tree T-A pending BA, R-v5-13 type geometry/ink split | Human + Design Lead review | Pending BA (R-v5-12) + Design Lead re-review
- 2026-10 | CR-82-B/C | Design spec v5 rev 3 after Design Lead r2 (R2-1..R2-3). Human ruling resolves R-v5-12: G1-2 Đấu trường is its own top-level hub tile (not under Phần thưởng - rewards are outcomes, not a subject); Luyện thêm = 3 subjects + Ôn tập; flashcards in Tiếng Anh at 76px G1-2. Added R-v5-14 (4 mode decisions + Back), R-v5-15 (gap validator V0-V8, exactly 3 options, frame match), R-v5-16 (effective-surface pairing) | Human + Design Lead r2 | Pending Design Lead r3 + human design gate

- 2026-10 | CR-82-B/C | Tech Lead architecture `docs/design/v5/ARCHITECTURE-v5.md` a1: M1-M9 milestones; D-01 G1-2 round mix carries Spell-it (R2: 3 img-choice + 4 sentence + 3 spell) and tracing (R1: 2 items at idx 3/7) because `listening-fill-blank` had no play-path carrier; D-03 bundle measured as CR-82 delta (+20 kB JS / +4 kB CSS gzip) since the absolute gate is already red; D-08 mascot Lottie = geometry-shared generated JSON, commissioned art drop-in; no DB change | Tech Lead phase | Pending Tech Lead review + BA confirm H-1/H-2

- 2026-10 | CR-82-B/C | ARCHITECTURE-v5 a2 after Tech Lead review (APPROVE_WITH_CHANGES, 5 must-fix applied): D-20 board-level Lottie allocator (≤1 pre-answer = prompt if eligible else mascot; ≤2 post = sheet mascot + feedback picture); D-21 pre-round screens static mascot to keep PRD AC-2.5 (amendment = H-8); D-22 retryable lazy factory (React.lazy caches rejection on the type); milestones now M1-M10 (M10 = final gate). Design Lead APPROVED all 4 deviations (D-16 perch, tracing skip, Andika 700-only, review testids) | Tech Lead review | Pending reviewer confirmation of a2

## Conventions learned (project-local)
- Vietnamese copy: hyphen `-` only; enforced by `dashGuard.test.ts` + `colorPairingGuard.test.ts` source scanners.
- Playwright browser revision mismatch on this machine: run with `channel: 'chromium'` or installed revision env, not default bundle path.
- JSDOM `HTMLMediaElement.play` throws - app code catches; test stderr noise is expected.

## Lessons from reviews & incidents
- `speech.ts` cached audio must settle+cleanup listeners per replay and only evict if `audioCache.get(text) === audio` (lead review finding).
- Modal `aria-modal` without focus trap/Escape/restore fails review - `ConfirmEndDialog` is the reference implementation.
- Stale confirm state: clear dialog flags on finish AND on new-run `begin()`.
- Multi-key STT fallback exists in `practice-transcribe` edge fn (CR-62); new Gemini keys = new vault secret `gemini_api_key_N`, no migration needed.

## Context that must survive a context reset
- Prod: https://ea.vieschool.com (Vercel `ioe-leduyminh`, team `linhld7s-projects`, Git auto-deploy on `main` push; registry at `deployments/registry.json`).
- Supabase project `cxjpgfhqchjoernfmcra`; audio assets in `ea-audio` bucket serve `Cache-Control: no-cache` (client cache in `speech.ts` mitigates).
- AI/STT keys live in Supabase Vault, read via `get_ai_configs`; never in repo.
- SDLC docs under `docs/sdlc/`; CRs as `CR-NN-*.md`; external review rounds r1-r17 done.
- DESIGN_SYSTEM.md exists at repo root - design law for the navy/gold VieSchool shell; CR-69 noted exam surfaces diverge deliberately (IOE-clone).

## Open threads / deferred work
- Kids-UX redesign + parent-conversion surface (this intent) supersedes the CR-69 deferred list.
- Pronunciation transcription depends on live provider quota; OpenRouter dead for audio; Groq route proposed, not built.
- Detector warnings (gray-on-color, ai-color-palette, side-tab, bounce-easing) deferred to this redesign.
- 2026-10 | CR-82 | Inherited debt: `check-bundle-budget.mjs` already fails on main before CR-82 (entry JS 224.55/121 kB, CSS 13.08/10 kB gzip). CR-82 uses a delta gate (ARCHITECTURE-v5 D-03); root cause (eager vocabulary bank, advisory A-28) needs its own CR.
- 2026-10 | CR-82 | BatchScreen `batch-end-early` is 44px (below the 48px kid floor) - pre-existing, logged by DESIGN-SPEC-v5 §14.5, outside CR-82 scope.
- 2026-02-16 | BA gate | OM-1=B pricing+manual transfer; OM-2=A in-app report only (remote view CR-70); OM-3=C exam hybrid; OM-4=C illustrated pig mascot; OM-5=B both drops same run | Human-approved options | Standing
- 2026-02-16 | Design gate | Concept "Một con đường vàng" approved; constitution amended (mascot/payment/andika dirs + owned-license class, audience G1-5); transfer note = CR-60 'VS <sdt> <goi>'; Andika letter-level G1-2; timer kept | Human-approved | Standing
- 2026-02-16 | Tech gate | Vercel Hobby confirmed (rollback=prev deploy only, main frozen 48h post-drop); plan codes MUATHI/NAMHOC/FOUNDING; rewards keyed by run seed; instruction autoplay once/round; mascot Lottie=JSON; R0 sync-forward-compat ships before Drop-1 | Human-approved | Standing
- 2026-10-14 | Deploy gate | kids-UX "Một con đường vàng" deployed (commit 233853d, Vercel hpf9cz749); migration 0039 applied prod + smoke-tested; external review loop r18 CLEAN after 4 rounds (fixes in commit 233853d) | Human-approved deploy | Done
- 2026-10 | CR-82 M4 | Deviation: instruction-settled reaches QuestionCard through a module-level subscription in `InstructionSpeaker` (`subscribeInstructionSettled`), not prop threading through every question component - same D-15 semantics, no new props on 12+ question bodies | Developer phase | M4 implementation
- 2026-10 | CR-82 M4 | `useThinkingPose` fires only after instruction settle OR 12s fallback timer from question mount (when no InstructionSpeaker exists on the screen, e.g. no `prompt` prop); audio-loading>400ms also triggers thinking; reset on question id / answered / drawing | Developer phase | M4 implementation
- 2026-10 | CR-82 M4 | e2e `emoji-visual.spec.ts` migrated: stale `[data-emoji-visual="🐷"]` and `✨`/`🎉` accent assertions replaced by mascot-rig (`data-mascot-mood`/`data-mascot-renderer`) + D-20 budget (`[data-lottie-player] canvas` scope per GT-8); `/mascot/` traffic added to zero-lottie filters | Developer phase | M4 implementation
- 2026-10 | CR-82 M4 | `StartBatchScreen.test.tsx` CTA assert updated `bg-amber-400` -> gradient ramp `from-amber-300`/`text-amber-950` (CTA_GOLD_XL folded into `material.goldCta` in M3 token migration) | Developer phase | M4 implementation
- 2026-10 | CR-82 M4 | `check-bundle-budget.mjs` AC-2.5 scan refined: Vite emits lazy-chunk asset FILENAMES ("assets/dotlottie-player-*.js") in the entry's module-preload manifest - a filename is the lazy seam, not runtime code. Checker now strips `assets/*.js|css|wasm|json` literals before the dotlottie/.wasm scan | Developer phase | M4 implementation
- 2026-10 | CR-82 M5 | Exam paper register DONE: `ExamScreen` split by examMode - timed sittings get `EXAM_*` desk/sheet tokens, `ExamProgressRing`, `ExamNavigatorDialog` (grid-cols-5 sm:grid-cols-10, 48px cells, legend + shortcut footer), `ExamReviewSheet` (D-13 testids, Back-first DOM order for safe default focus), `useExamShortcuts` (1-4/A-D/arrows/F/N; inert while dialogs open or focus is in input/textarea/contenteditable), flags as Set<number> UI-only state reset on begin/finish (D-18). Untimed drill keeps `ConfirmEndDialog` + gold `practice-next`; `practice-verdict` uses slate not rose (D2 fix). `ExamResult` = paper certificate w/ EXAM_SHEET + GOLD_HAIRLINE; zero mascot in sitting header (R-v5-06), exactly 1 on Intro/Result | Developer phase | M5 implementation
- 2026-10 | CR-82 M5 | Deviation: `useExamShortcuts` answer-key branch must check exact single chars 'a'-'d'/'1'-'4', not lexicographic range - 'ArrowRight' lowercase-compares inside a-d range and swallowed the key (found by shortcut tests) | Developer phase | M5 implementation
- 2026-10 | CR-82 M5 | Deviation: play-again enters a sitting directly (no `exam-begin` intro) - stale-flag regression test corrected to assert the actual rerun path; `oneMascot` fixture needed `savePracticeResult` in the partial service mock | Developer phase | M5 implementation
- 2026-10 | CR-82 M5 | Gates: `npm test` 160 files / 1363 tests green; build green; delta +9.75 kB JS / +1.98 kB CSS (caps +20/+4); new `e2e/exam-paper.spec.ts` 2/2 green (real hub flow: flag via F, navigator via N, review-before-submit -> paper result, drill verdict never rose) | Developer phase | M5 implementation
- 2026-10 | CR-82 M6 | Letter tracing DONE: `data/tracing/strokes.ts` (26 lowercase glyphs, 0-100 box, baseline y=80), `lib/tracing/score.ts` (32-pt resample, coverage/precision/direction, G1 vs G2 tunables, pass >=0.75 cov + >=0.65 prec), `lib/generators/letterTracing.ts` (seeded, example word starts with target letter + usable visual), 'letter-tracing' kind + `LetterTracingQuestion` type, `buildQuestions(seed, words, ctx?)` optional ctx, G1-2 Round 1 = 6 extra-letter + 2 image-choice + 2 tracing at idx 3/7 (D-01), `submitTracingAnswer` + `TracingMeta {assisted, attempts}`, `skillCorrect`/`skillTotal` on RoundOutcome exclude assisted (D-10), engagement map letter-tracing->spelling, `TracingCanvas` (SVG guide + ink canvas, primary-pointer only, pointer capture, coalesced events, dpr cap 2, context-fallback to assisted-only), `LetterTracingQuestion` lazy chunk (12.11 kB), `createRetryableLazy` + `TracingChunkBoundary` (fresh lazy type per attempt; skip only after 2 fresh load failures; render errors post-load never count - D-22), DemoHint 'trace' variant, QuestionCard tracing branch + per-kind verdict headlines, BatchScreen prefetch on rounds containing tracing | Developer phase | M6 implementation
- 2026-10 | CR-82 M6 | Deviation: TracingCanvas ink clear on failed stroke implemented as immediate `clearInk()` when `reducedMotion`, else a 300ms canvas-opacity fade via inline style (spec s12.5 asks for a fade); pass clears immediately - the emerald done-guide provides the crossfade. Simpler than a second ink buffer; visual parity acceptable | Developer phase | M6 implementation
- 2026-10 | CR-82 M6 | e2e: `practice-flow.ts` RoundQuestionKind + `batch-flow.ts` gained `answerTracingAutoStep` (keyboard path, reads revealed letter from feedback) and G12/G345 Round-1 count assertions; `round34-flow.ts` correct-option emoji scrape moved off `innerText` first-char (post-answer buttons lead with the CR-02 'Đáp án: ' verdict label - pre-existing bug surfaced by M6 run, not a regression) to the aria-hidden visual span; new `e2e/cr82-tracing.spec.ts` 3/3 (faithful trace->'Em tô đẹp quá!', 3x off-path->stroke auto + gentle verdict, Enter on auto-step->assisted correct) | Developer phase | M6 implementation
- 2026-10 | CR-82 M6 | Test fixture fallout fixed: batchSession/BatchScreen/grades answer helpers gained letter-tracing branches (assisted submit); grades wordId leakage check now collects `exampleWordId`; App.test Round-1 kind set + tracing branch; TracingChunkBoundary.test mock typed to `{default: ComponentType<any>}` | Developer phase | M6 implementation
- 2026-10 | CR-82 M6 | Gates: tsc clean; focused unit 46/46; full npm test + Playwright full suite + build + bundle delta (JS +12.42/+20, CSS +2.12/+4, tracing chunk 4.86/12, lottie-runtime-free entry OK) | Developer phase | M6 gate
- 2026-10 | CR-82 M6 | e2e suite hardening surfaced by the first full-suite run under tracing: `mascot-flow.findExtraLetterOutcome` + `engagement`/`guest-trial` answer loops gained tracing branches; `points-scoring` Round-1 sampler accepts letter-tracing; `guest-trial` self-skips when `.env.local` is absent (same env gate as auth.spec - env-free boot has no guest-button); `round3` mic-denied stub now deletes MediaRecorder too (real CR-17 fallback takes over on 'not-allowed' in headless Chromium's fake mic - pre-existing stale stub); `exam-paper` drill loop handles word-order tiles + no exam-next in practice mode; `expectFullyInViewport` measures from scroll-0 (Chromium scroll anchoring leaves ~0.03px fractional offsets after question transitions, tripping ratio:1 by 0.0004) | Developer phase | M6 implementation
- 2026-10 | CR-82 M7 | Spell-it + Gap bank + dual input DONE: `useDragTile` generalized in place (D-05) - `crossNamespace` delivers same-index drops across bank/slot namespaces, `onDropOutside` fires over no target, `renderGhost` replaces the innerHTML clone (dangerouslySetInnerHTML gone), ghost rides translate3d on a fixed node (transform/opacity only, motion-reduce keeps direct tracking). `spellEligibility` (G1/G2 <=6 letters, phrases/hyphenated typed-only, +1/+2 confusable-but-not-in-word distractors, instance ids letter-N vs letter-dN, never-in-order shuffle). `gapBankValidator` V0-V7 + `pickGapBank` deterministic walk (V8 runtime audio handled by components), `gapBankTopics` reviewed allowlist, `useGapInputMode` session key `ea-gap-input-mode` (module fallback only on storage throw, D-14), `SpellItDrag`/`GapBankDrag` (tap + pointer-drag + Backspace/Enter keyboard paths, submit gated until filled), G1-2 Round 2 = 3 img + 4 sentence + 3 spell with sentence backfill (D-01) | Developer phase | M7 implementation
- 2026-10 | CR-82 M7 | Deviation: `g1-food`/`g1-numbers` dropped from `GAP_BANK_TOPICS` - both G1 units are pure pick() files with zero canonical words (shared vocab keeps the earliest topicId), so the entries could never fire. Allowlist now covers only topics that own words (incl. `g1-toys`/`g1-colors` for `yo-yo`/`pink`). Coverage measured: grade-1 12/32 sentence items bank-eligible (38%), grade-2 4/32 (13%) - low by design (R-v5-08: banks only on validator-clean items; Spell-it is the guaranteed drag surface) | Developer phase | M7 implementation
- 2026-10 | CR-82 M7 | Deviation/fix: `answerSpellItTap` e2e helper cannot rely on shuffled bank order for a guaranteed-wrong answer - the first N tap-order letters CAN spell the word (observed: q5 marked correct). Helper now taps a distractor tile (`data-tile-id*="-d"`) first, which is structurally wrong (letter absent from target). `submitGapAwareListeningAnswer` checks `aria-pressed` before toggling - the session-persisted type mode (D-14) would otherwise flip back to bank | Developer phase | M7 implementation
- 2026-10 | CR-82 M7 | Test fallout fixed: `App.test.tsx` answerCurrentQuestion gained listening-fill-blank (spell-tile tap loop) + gap-bank (chip tap) branches and Round-2 kind set includes listening-fill-blank (3x 90s timeouts -> 6/6 green); `generateListeningFillBlankQuestions` signature widened to readonly VocabWord[] (sibling generators already readonly); e2e `batch-flow.ts`/`practice-flow.ts` gained listening-fill-blank kind, spell/gap answer helpers, 3-kind kindCounts; round2-listening-sentence/image-choice + batch-full-flow + round-timer + round1 specs updated to the 3-kind allowlist; new `e2e/cr82-spell-gap.spec.ts` 2/2 (spell tap-submit, gap chip+toggle with 3-batch retry for the ~38% bank-offer rate) | Developer phase | M7 implementation
- 2026-10 | CR-82 M7 | Gates: tsc clean; focused M7 unit 94/94 (spellEligibility 23, gapBankValidator 24, gapBankCoverage 2, round2 18, drag components 13, dual-input 9, useDragTile); build green; bundle delta JS +16.83/+20, CSS +2.13/+4, lottie-runtime-free entry OK; full Playwright 69 passed + 5 env-skips, 0 fail | Developer phase | M7 gate
- 2026-10 | CR-82 M8 | Hub IA + flashcards DONE: `TRAIL_TILE_ARENA`/`TRAIL_TILE_ARENA_SM` tokens (orange identity surface, not gold); `HubTileDef.variant:'arena'` (48px navy disc + IconSwords + VS badge, replaces rotating tint chip); G1-2 arena promoted to top-level hub tile between Luyện thêm and Phần thưởng (sections form, arena section conditional on handlers); `flashcards-start` = 4th row of the English program block only, BTN_DRILL family at band floor; `reviewStore` (ea-flash-review:<gradeId>, schema v1, 200-cap oldest-evict, corrupt->empty, session-memory spill on write failure); `deck.ts` buildDeck (again-first MRU then seeded shuffle, DECK_MAX 10, emoji|imageUrl eligibility) + deckReducer (rate/endEarly/resume/retryAgain, exit kinds full/partial/zero, resume -> first unrated); `useSwipeCard` (10px lock, |dy|>|dx| releases to page, commit >=30% width or >=0.6px/ms flick, trailing-click suppression shared w/ flip, detail===0 passes); `FlashcardScreen` (chrome strip Thẻ k/N + KẾT THÚC confirm, loading/empty/error/summary panels, G1-2 front=picture back=word+meaning, G3-5 reversed, per-rating localStorage save, no points/quest credit); `FlashcardDeck` (stack +2 behind, mascot perch happy/encouraging 600ms, arrows=buttons=swipe per WCAG 2.5.7); `FlashcardErrorBoundary` (createRetryableLazy twin of tracing boundary, reload affordance after 2 fresh failures); App 'flashcards' Screen inside PRE_ROUND_SLOTS + grade hero shell | Developer phase | M8 implementation
- 2026-10 | CR-82 M8 | Deviation/finding: Chromium caches a FAILED module fetch per exact URL - a second import() of the same specifier rejects from the module map without a network request (verified by harness: abort -> fail -> fail, ?x=1 -> ok). So "Thử lại" on a chunk-failure boundary can only recover from non-fetch errors (eval, transient transform); a genuine network outage still requires the reload affordance. Applies to TracingChunkBoundary too (inherited pattern) - the reload button after 2 fresh failures is the real escape | Developer phase | M8 implementation
- 2026-10 | CR-82 M8 | Test/e2e updates: StartBatchScreen.test migrated to 5 launchpad elements + top-level hub-tile-arena (hub-panel-* prefix - top-level tiles use panel, not section, ids); new reviewStore.test 9, deck.test 18, useSwipeCard.test 9, FlashcardScreen.test 10, FlashcardErrorBoundary.test 4; new e2e/cr82-flashcards.spec.ts 4/4 (hub IA, full deck -> summary -> retry-again -> exit, ArrowRight keyboard rate, chunk-failure panel -> reload affordance -> exit); kids-ux spec title updated to 3 hub tiles | Developer phase | M8 implementation
- 2026-10 | CR-82 M8 | Gates: tsc clean; full npm test 177 files / 1537 tests green; build green; bundle delta JS +18.34/+20, CSS +2.24/+4, FlashcardScreen chunk 5.39/12, lottie-runtime-free entry OK; full Playwright 73 passed + 5 env-skips, 0 fail; exam-paper F-shortcut flake fixed (per-run seed can put an autofocused free-text input at q0 - spec parks focus on exam-progress-ring first, shortcut correctly inert while typing) | Developer phase | M8 gate
- 2026-10 | CR-82 M9 | Micro-interactions + rewards + sfx DONE: `usePressRelease` (data-pressed on pointerdown/Enter/Space, release class cleared on animationend, reduced-motion resolves static), `data-[pressed]` mirrors on tactile tokens, `PressableOptionButton` shared option tile; tiered `sfx.ts` (verdict correct .6 / gentle-wrong .35, ui .25, reward .5; legacy `playSfx('correct'|'wrong')` preserved; single cached element + `stopSfx()`; reward requests queue behind an in-flight verdict); `isAudioPlaying()` in speech.ts so rewards never talk over instruction audio; `RewardFxContext` + `StarFlyLayer` (LiveScore chip origin) + `StreakBurst` (streak>=3) all reduced-motion-static; `IconChest` added and `StarRain`/`ChestReveal` moved off EmojiVisual to deterministic SVG; FeedbackPanel owns verdict sfx + streak beat, QuestionCard supplies streak + reward origin; consumers wired across option/phonics/extra-letter/pair tiles, spell+gap drag tiles (drag capture still owns pointer lifecycle, no stray click), CTAs, flashcards, daily-quest, pet; ExamScreen keeps legacy verdict sfx only (no ui/reward tiers on the exam route) | Developer phase | M9 implementation
- 2026-10 | CR-82 M9 | Bundle fix: first post-M9 budget run failed JS delta +20.47 vs +20 cap (0.47 over). Fix = `ExamRouteBoundary` (`src/components/exam/ExamRouteBoundary.tsx`) - `createRetryableLazy` twin of the flashcard/tracing boundaries (Suspense loading, Thử lại, reload affordance after 2 fresh failures, exit, density-aware min heights); App.tsx drops the eager `ExamScreen` import. ExamScreen now a 12.60 kB gzip lazy chunk | Developer phase | M9 implementation
- 2026-10 | CR-82 M9 | Test notes: jsdom lacks `e.animationName` on synthetic animationend - hook guards the read; fake-timer press tests wrap `vi.advanceTimersByTime` in `act()`; exam sfx assertion narrowed to allow the intentional legacy verdict API while banning ui/reward-tier calls. Focused M9 suite 6 files / 58 tests green | Developer phase | M9 implementation
- 2026-10 | CR-82 M9 | Gates: tsc clean (npm run build); full npm test 183 files / 1595 tests green (pre-boundary run) + App/exam-route tests re-run 22/22 green post-boundary; build green; bundle delta JS +10.03/+20, CSS +2.58/+4, tracing chunk 4.90/12, flashcard chunk 5.44/12, lottie-runtime-free entry OK; relevant Playwright 22/22 green (exam-paper 2, points-scoring 4, batch-full-flow 1, round-live-score 2, emoji-visual 9 incl. reduced-motion specs, engagement 2); legacy absolute budgets still red (inherited debt, delta gate is the CR-82 contract); DESIGN_SYSTEM.md gains §15 v5 interaction/reward-FX layer | Developer phase | M9 gate
- 2026-10 | CR-82 M10 | External review loop r34-r38 (codex exec, real runs): r34 full-tree split review (1.35MB > 1MB cap -> 2 parts, intent-to-add for untracked files) produced 13 findings - ALL triaged: 11 fixed (LiveScore callback-ref chip registration; MascotLottie player-after-data apply path; tracing assisted-flag pass-through on auto-step + glow-timer cancel on reset/unmount; QuestionCard render-epoch replay of a mount-time instruction settle; InstructionSpeaker claims lastInstruction at mount regardless of autoplay eligibility; useDemoHint module-listener rearm notifies mounted consumers; lottieFromPoses one-gr-per-painted-shape + regenerated assets; reviewStore merges fallback spill before persist + caps spill; audit-qb tolerant j() + {boolean} answers; quarantine-apply repairs dirty eligibility on rejected rows + nonzero exit on PATCH failure; cr82-spell-gap deterministic dev-only __batchSeedForTesting seed 'e2e-seed-0') + 1 documented deferral (translation/spelling unconditional accepts are by-design self-answer detection, not semantic verification). r35-r37 iterated the seqExpected sequence-completion proof (repeated-member occurrences, cyclic-only wrap, post-blank run continuation); r38 CLEAN. Record: docs/reviews/EXTERNAL-REVIEW-r34.md | External review loop | Done
- 2026-10 | CR-82 M10 | Final gates on post-review tree: tsc clean; full npm test 184 files / 1603 tests green; build green; bundle delta JS +10.21/+20, CSS +2.58/+4, tracing chunk 4.96/12, flashcard chunk 5.47/12, lottie-runtime-free entry OK; full Playwright 73 passed + 5 env-skips, 0 fail; audit-qb over real 91,583-row export runs to completion (28 pending-quarantine = pre-existing DB state, gate correctly flags) | Deployer phase | M10 gate
- 2026-10 | CR-82 milestone table | M1 tokens/config/guards DONE | M2 hero scene (LandScene/variants/LandShell/postcards) DONE | M3 materials+typography+board+trail DONE | M4 mascot rig (poses/Lottie/perches/D-20/D-21) DONE | M5 exam paper (EXAM_*/ring/navigator/review/shortcuts/flags/result) DONE | M6 letter tracing (strokes/score/canvas/lazy/telemetry/R1) DONE | M7 spell-it+gap-bank+dual-input (R2) DONE | M8 hub IA+flashcards DONE | M9 micro-interactions+rewards+sfx (+lazy exam boundary) DONE | M10 final gate+review loop CLEAN DONE | Deployer phase | CR-82 B+C complete - worktree uncommitted per instruction

## Machine handoff (2-machine workflow: Windows PC <-> iMac)
- Protocol doc: `docs/setup-second-machine.md`. Secrets/state chuyen qua private repo `saintzzz/handoff-vault` (`secrets-context.tar.enc`, AES-256 - passphrase hoi lai may Windows, khong commit); `scripts/machine-import.sh` tu decrypt. `scripts/machine-export.ps1` + local `machine-transfer/` van dung duoc cho LAN/USB nhung GitHub la kenh chinh.
- LLM channel `scripts/llm-channel.mjs`: codex CLI primary -> gemini.google.com web profile fallback (`gemini-login.mjs` one-time per machine). Cross-platform (`codex.cmd` win / `codex` posix).
- Per-machine state that does NOT transfer: running background jobs (restart on other machine - DB progress is shared in Supabase), gemini-web Chromium profile (re-login per machine), playwright browsers.
- `Session state` block below is rewritten at each machine switch / session end - always read it first on the receiving machine.

### Session state - 2026-10-22 late (Windows PC -> iMac handoff, HEAD 917d257 + WIP commit)

- CR-101 moat wave 1: SHIPPED. Per-IP+per-uid+global rate limits on
  fetch/score RPCs (migrations 0044-0045, remote-applied + verified).
  50:50 hint adopted in 11 games (12/15 total incl. QuizShow lifeline).
- CR-102 server-side scoring: SHIPPED (0a75341). strip_bank_row removes
  answer+explanation_vi from all fetch surfaces; score_bank_attempts
  oracle grades in Postgres; bank questions render keyless (pending
  until server verdict; reorder keeps key by design). Review r99 2
  rounds -> APPROVE.
- CR-103 deferred sweep: SHIPPED (48a89ec). Per-IP XFF caps (0049);
  vocab/IPA/common-word lazy split via src/lib/content/contentBank.ts
  (index 623->437.8KB eager). r100 caught a strip regression, fixed.
- CR-104 bank integrity + quality wave: SHIPPED (917d257). Answer-option
  display shuffle (bankOptionOrder, uniform via mulberry32 - the old
  hash-per-position only reached 12/24 perms, r102 major caught it);
  migration 0050 do/does repair (155 rows); e2e/a11y.spec.ts axe gate
  (3 real violations fixed); combo meter in all 15 games; landscape
  next-button fold fix; reloadPageOnce bounds bank-fail reload loops;
  .perf-budgets.json + rebased budget anchors.
- Local verify at push: tsc clean, 208 files / 1750 tests, e2e 79
  pass + 7 env-skips, all preflight gates PASS, CI 39768300333 green.
- WIP committed separately: scripts/check-rtm.mjs stub-aware AC
  tracking (todo/skip ACs no longer count as covered; rtm still PASS).
- Codex CLI on Windows: auth fixed but usage quota out until 2026-10-27
  - `npm run review:external` routes to gemini-web fallback; reviewer
  subagents (reviewer-gpt) used for second rounds.
- Content pipeline: G5 eligible ~6.6-6.9k/7000 and G5 exam pool ~540-560/800
  still the gap - needs G5 wave biased to exam-scorable kinds (MCQ/TF/fill).
  iMac runs the pipeline; check DB counts first.
  2026-10-22 VERIFIED CLOSED: mock-pool filter (0043 mint-form: canonical +
  mockEligible + approved-tier + non-CR/speaking + dedup variant_group)
  counts g5 english = 2,327 distinct pools (raw 2,471), every grade x
  subject >= ~2,300. Exam-ready >=800/grade met on all axes; only the
  5% human spot-check remains manual.
- Next designed items (CR-104 deferred section): promoted to CRs
  2026-10-22 - CR-106 Teach-me lessons (teach_bank_question RPC +
  taught marks so disclosure never re-scores), CR-107 adaptive
  difficulty fetch (ZPD-biased variant), CR-108 Turnstile (BLOCKED:
  needs manual Cloudflare signup). Bundle debt -> CR-105 (delta gate
  green; re-anchor recommended over byte-shaving).
- Session 2026-10-22 cont. (iMac): CR-105 selftest landed
  (tests/bundle-budget.selftest.mjs, AC-105.1-3, rtm PASS). CR-107
  adaptive difficulty IMPLEMENTED: migration 0051
  fetch_questions_adaptive(+__impl) remote-applied via MCP - ZPD bias
  from last-30 per-skill qb_attempt_events (baseline band 3; <0.5->2,
  >=0.85->4; in-band-first then nearest, distinct-on group dedup).
  Live-verified: anon 401, rows keyless, cold-start d3. bank.ts routes
  authenticated practice calls to adaptive with fetch_questions
  fallback (429 surfaces - shared fq_* budget is terminal either
  way). Scanner fix: ea-classes dollar-tag-aware body capture +
  __impl delegation resolution (the old $$-only regex swallowed
  $function$-tagged defs into phantom bodies).
  tests/adaptive-fetch.selftest.mjs + bank.test.ts AC-107.x cover the
  contract; rtm PASS. External review r104 (reviewer-gpt; Codex quota
  still out): 1 major - adaptive charged parallel fqa_* buckets
  (cross-RPC budget-split bypass); fixed in db8e410 by charging the
  shared fq_* buckets + remote-verified. r105 fix-scoped: APPROVE/
  CLEAN. Deployed db8e410 (Vercel success).
- Remaining open items: CR-106 Teach-me (real cost is lesson content
  pipeline, not plumbing), CR-108 Turnstile (BLOCKED on manual
  Cloudflare signup), small leftovers (BatchScreen 44px button, Groq
  STT proposal). CR-68 deferred as ever.
- `scripts/machine-sync.ps1`: one-command handoff - exports secrets,
  re-encrypts vault bundle, commits+pushes handoff-vault.
- Demo PINs in `~/.config/devin/secrets/ea_demo_creds.json` (inside
  handoff-vault encrypted bundle).
- Eastgate GitLab repos: removed from handoff scope per user request.
- exam-ready gate: exam pool >=800/grade + 5% human spot-check.

## 2026-10-23 - CR-106 Teach-me CLOSED (prod-verified)

- Shipped qua 002a879 + fix chain (507caf1, e05c03b). Migrations
  0052 (teach_bank_question + taught_marks + skill_lessons seed G1-G2
  EN), 0053, 0054 (restore IP rate-limit block 0049 vao
  score_bank_attempts - r-round bat regression).
- ExtRev loop 5 rounds -> r110 CLEAN (Codex CLI). Findings da fix:
  teach binding theo question_id, honorTaught default FALSE chi opt-in
  o mode==='practice' (exam/assignment/form/review khong bao gio honor),
  examRef sync guard, concurrent-teach + finish race guards.
- Prod verify (ea.vieschool.com, deploy e05c03b): Lop 2 -> Luyen them
  -> Luyen de -> "Day toi" tren cau bank that -> lesson "Doc hieu" hien
  dung KHONG lo dap an -> tra loi -> verdict "Da hoc cau nay - khong
  tinh diem". DB: practice.taught_marks co row moi (account demo,
  question g2-english-bulk-*). 1766 tests xanh.
- OPEN con lai: CR-108 Turnstile (BLOCKED - Cloudflare signup la buoc
  thu cong cua human, khong provision duoc bang API), Groq STT proposal
  (chi la de xuat, chua co CR), CR-68 deferred. Content: G5 pool da dat
  nguong, chi con 5% human spot-check.

## 2026-10-23 - CR-108 Turnstile guest gate IMPLEMENTED

- PO cung cap Cloudflare Turnstile keys (site 0x4AAAAAAFisJ_...g - public,
  secret -> vault `turnstile_secret`). Blocking canh guest fetch, khong
  cong doan authed.
- Kien truc: edge fn `practice-turnstile` (verify_jwt=false, CORS
  allowlist) verify siteverify -> mint ticket HMAC
  `b64url(v1|ip|exp|nonce).hex` (TTL 600s, bind IP cuoi XFF - cung quy
  uoc practice.client_ip). RPC `fetch_questions_public` them
  `p_guest_ticket`; anon khong ticket -> PT401 guest_challenge_required.
  Migration 0055 da apply prod + verify: anon no-ticket tra PT401.
- Client `src/lib/qb/turnstile.ts`: lazy script load (khong vao entry
  chunk), appearance='interaction-only' (vo hinh voi user thuong), cache
  ticket den ~60s truoc het han, retry 1 lan khi PT401.
- Vault: `turnstile_secret` + `guest_ticket_secret` (khong commit).
  Edge fn doc qua `practice.get_turnstile_config` (service_role-only).
  Fail closed khi thieu config -> 503 challenge_unavailable.
- ExtRev loop: r111 (a11y container, timeout, error copy) -> r112
  (script-load bound) -> r113 (fetch body-read deadline) -> r114 CLEAN.
- Commit: 49c0cbe (impl) + ff0c6ef + 236bdcd + ccc2c95 (review fixes) +
  bbe2ac5 (artifact). Tests 1770 xanh, build xanh.
- robots.txt + X-Robots-Tag noai cung da deploy cung dot (lop 1 CR-109).
- Viec con lai cho human: Vercel WAF AI-bots -> deny (MCP token khong co
  project scope); Turnstile widget hostname phai cover ea.vieschool.com.
