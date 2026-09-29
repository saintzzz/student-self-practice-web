# Test Report — EmojiVisual & Research-Grounded Content (PRD r3)

**Phase:** 6 (Tester) · **Base commit:** `ebd58a5` (working tree carries the feature changeset; 83 files touched) · **Date:** 2026-09-29 · **Environment:** Windows 11, Node 22, Chromium (Playwright 1.47.2), dev server `npm run dev` on :5173.

## Gate results

| Gate | Command | Result |
|---|---|---|
| Unit (Vitest) | `npm test` | **552/553 pass, 68/69 files — sole failure is the pre-existing baseline** `PronunciationRecordingQuestion > mic-permission-denied` (debt register, discovery-baseline.md; unrelated to this feature — confirmed at baseline `ebd58a5` before any change). Fork pool capped at 4 (`vite.config.ts` `poolOptions.forks`) — unbounded workers starved long component tests of the lazy Lottie player chunk and timed them out under load |
| Typecheck + build | `npm run build` | **Pass** — tsc clean, Vite 5.4.21 production build OK |
| Attribution | `node scripts/check-attribution.mjs` | **Pass** — 324 svg / 121 lottie / 0 images, all files manifest-covered |
| Bundle budget | `node scripts/check-bundle-budget.mjs` | **Pass** — see below |
| E2E (Playwright) | `npm run test:e2e` | **49/49 pass** (3 workers, ~6-8 min; per-test timeout 90 s). A full run under concurrent reviewer load produced 4 `page.goto`-style timeouts (dev-server starvation); the same 16 specs re-ran 16/16 green with the machine idle |

## AC-2.10 bundle measurement (vs baseline)

| Asset | Baseline (ebd58a5) | This change | Cap | Verdict |
|---|---|---|---|---|
| Entry JS (gzip) | 84.46 kB | 88.14 kB | 94.5 kB | OK (+3.68 kB) |
| Entry CSS (gzip) | 3.96 kB | 4.16 kB | 5.0 kB | OK (+0.20 kB) |
| Lottie player chunk (gzip) | n/a | 34.80 kB lazy-only | n/a | async chunk, never in entry |
| dotLottie WASM | n/a | 1.24 MB asset | n/a | lazy-fetch on first player mount |

Entry chunk additionally verified **free of `dotlottie` runtime code and `.wasm` references** (check inside `check-bundle-budget.mjs`, AC-2.5/C4 build-side gate).

## E2E coverage added this feature

- `e2e/emoji-visual.spec.ts` (11 tests): mascot SVG path, image-choice prompt mode vs `lottieKeys.generated.json` (strict AC-2.4/9.4), all-4 listening option visuals (AC-5.4), live canvas caps measured inside a real Lottie state (AC-2.9), inline picture inside the answer line within line-height bounds (AC-10.2), zero lottie traffic on pre-round screens (AC-2.5 runtime half), route-aborted JSON and WASM fallbacks with pageerror sweep (AC-2.8), zero lottie traffic + zero canvases across a full reduced-motion Round 1 (AC-2.7).
- `e2e/same-origin.spec.ts` (2 tests): every request across Grade → Credits → full 4-round Batch → summary is same-origin (C4 runtime gate), plus zero `pageerror`/`console.error` across the full journey.
- `e2e/credits.spec.ts` (4 tests): credits entry point, collections + plain-text license URLs, keyboard navigation Tab+Enter open/close with `focus:ring-4` ring assertions (AC-7.10), back navigation (AC-7.x).

## Unit coverage added this feature

- `EmojiVisual.test.tsx` (15): fallback chain, breaker, timeout, reduced-motion incl. mid-play.
- `ListeningImageChoiceQuestion.test.tsx` (+1): all-or-nothing photo group fallback (AC-5.3) — regression for the round-1 review blocker.
- `FeedbackPanel.test.tsx` (+3): DOM contract for AC-10.6/A-13 — byte-identical baseline class string on the no-picture path, conditional tag rule, picture inside the answer line (AC-10.2).
- `QuestionCard.feedbackPicture.test.tsx` (10, new): per-kind picture mapping incl. `optionWordIds[correctIndex]` mutation guards (AC-10.1).
- `imageChoice.test.ts` (+2): no shared-emoji distractor across the full bank + explicit sad/cry 😢 regression (AC-9.3/BR-15).
- `questionWordIds.test.ts` (7, new): every emitted `wordId`/`optionWordIds`/`promptWordId`/pair `wordId` resolves to a real bank word and matches the shown emoji (AC-5.8).
- `ImageChoiceQuestion.test.tsx` (+1): photo lookup keyed by wordId not emoji (AC-5.1/AC-5.6).
- `listeningSentenceFillBlank.classes.test.ts` (+3): bank-wide invariants — unique ids, terminal punctuation, `blankOutWord` ⇄ `displaySentence` (AC-11.7).
- `src/data/vocabulary/bank.test.ts` (9, new): PRD §7.1 normative table verbatim vs the bank, 326-word/28-topic counts, bank-wide shared-emoji set, countable⇄plural coherence, generator smoke over the enlarged bank, exact slide/skate sentences, all 283 baseline words diffed field-for-field against `bank.baseline.json` (produced by `scripts/dump-word-baseline.mjs` at ebd58a5), flagged §7.3 words absent (AC-6.1..AC-6.9).
- `src/lib/dashGuard.test.ts` (2, new): no U+2013/U+2014 in any file under `src/` or `e2e/`, in `index.html`, or in `public/attribution.json` (AC-7.9/F-12); the four pre-existing test files that asserted `not.toContain('—')` were rewritten to `String.fromCodePoint(0x2014)` so the strict all-files invariant holds.
- `Mascot.test.tsx` (+1 it.each×4): mood → Vietnamese aria-label contract (AC-1.9).
- `questionWordIds.test.ts` strengthened: every kind now asserts the resolved word's `word`/`emoji` matches what the question displays, not just id presence (AC-5.8).
- `imageChoice.test.ts` strengthened: AC-9.3 lookup keyed by `wordId`, non-vacuous `sadTargets`/`cryTargets` assertions in both directions.
- `BatchScreen.test.tsx` + `batchSession.test.ts` helpers: `answerCurrentQuestion`/`completeActiveRound` gained the missing `image-choice`/`listening-image-choice`/`counting-image` branches (the missing branches were an infinite-loop hang, not a flake) plus a 20-iteration guard so future unhandled kinds fail loudly.

## AC coverage map

| AC | Evidence | Status |
|---|---|---|
| AC-1.1 hidden text layer | `EmojiVisual.test.tsx` | auto |
| AC-1.2 one text node per repeat | `EmojiVisual.test.tsx`, `CountingImageQuestion.test.tsx` | auto |
| AC-1.3 toBeVisible preserved | `EmojiVisual.test.tsx` + unchanged existing visibility tests | auto |
| AC-1.4 all emoji via EmojiVisual | code scan (no raw emoji JSX left outside EmojiVisual/Mascot paths) + component tests asserting `data-emoji-*` | verified (scan) |
| AC-1.5 test contract survives | full suite 552/553 (sole failure = pre-existing baseline) | auto |
| AC-1.6 bundled SVG per emoji | `emojiAssets.test.ts` fitness over the bank + `emoji-visual.spec.ts` | auto |
| AC-1.7 missing/failed SVG → native | `EmojiVisual.test.tsx` fallback tests | auto |
| AC-1.8 size matches glyph | `EmojiVisual.test.tsx` size-class assertions | auto |
| AC-1.9 mascot accessible names | `Mascot.test.tsx` it.each×4 | auto |
| AC-1.10 no OS font dependence | `emoji-visual.spec.ts` asserts rendered modes are img/lottie/svg, never native-font text | auto |
| AC-2.1 animated single-image | `EmojiVisual.test.tsx`, `emoji-visual.spec.ts` | auto |
| AC-2.2 no animation → static, no probing | `renderMode.test.ts` + `emojiAssets.test.ts` | auto |
| AC-2.3 grids/repeats never animated | `renderMode.test.ts` | auto |
| AC-2.4 image-choice prompt animated | `emoji-visual.spec.ts` vs `lottieKeys.generated.json` | auto |
| AC-2.5 player lazy-loaded | `emoji-visual.spec.ts` pre-round traffic + `check-bundle-budget.mjs` entry scan | auto |
| AC-2.6 self-hosted WASM | `same-origin.spec.ts` full journey | auto |
| AC-2.7 reduced motion | `emoji-visual.spec.ts` reduced-motion round + `EmojiVisual.test.tsx` | auto |
| AC-2.8 lottie failure → static | `emoji-visual.spec.ts` JSON+WASM aborts, `EmojiVisual.test.tsx` | auto |
| AC-2.9 player cap | `emoji-visual.spec.ts` canvas counts in real lottie state | auto |
| AC-2.10 bundle budget | `check-bundle-budget.mjs` (numbers above) | auto |
| AC-3.1 same pig every mood | `Mascot.test.tsx` | auto |
| AC-3.2 animated sparkle on correct | `Mascot.test.tsx`, `mascot.spec.ts` | auto |
| AC-3.3 summaries celebrate | `Mascot.test.tsx`, `mascot.spec.ts` | auto |
| AC-3.4 no accent → no player | `Mascot.test.tsx` (no-accent moods render no EmojiVisual) | auto |
| AC-4.1 license/safety filter | script `fetch-vocab-images.mjs` | manual/deferred |
| AC-4.2 allow-list discard | script `fetch-vocab-images.mjs` | manual/deferred |
| AC-4.3 staging-only writes | script `fetch-vocab-images.mjs` (staging dir, gitignored) | manual/deferred |
| AC-4.4 normalization | script `fetch-vocab-images.mjs` (sharp ≤512px/≤80KB) | manual/deferred |
| AC-4.5 TASL records | script `fetch-vocab-images.mjs` + `attribution.json` schema | manual/deferred |
| AC-4.6 rate limits/resume | script `fetch-vocab-images.mjs` (20/min, 200/day, resume) | manual/deferred |
| AC-4.7 coverage report | `docs/image-bank-coverage.md` written on fetch | manual/deferred |
| AC-4.8 third-party text sanitized | `fetch-vocab-images.mjs` control-char strip | manual/deferred |
| AC-4.9 published bank consistent | `check-attribution.mjs` exits 0 (324 svg/121 lottie/0 images) | auto (gate) |
| AC-4.10 offline deterministic build | `npm run build` + all assets same-origin in `public/` | auto |
| AC-4.11 publish human gate | `publish-vocab-images.mjs` requires `--approved` flag + reviewStatus field; never run (0 images staged) | manual/deferred |
| AC-4.12 emoji asset coverage/gap report | `fetch-emoji-assets.mjs` ran → 324 svg/121 lottie + `emojiAssets.test.ts` | auto |
| AC-5.1 photo wins in prompt | `ImageChoiceQuestion.test.tsx` wordId-keyed photo test | auto |
| AC-5.2 chain order | `EmojiVisual.test.tsx` | auto |
| AC-5.3 photo failure → chain | `ListeningImageChoiceQuestion.test.tsx` all-or-nothing | auto |
| AC-5.4 options photos all-or-nothing | `emoji-visual.spec.ts` + unit test above | auto |
| AC-5.5 repeated/pair contexts: no photos | `renderMode.test.ts` (count>1 → static); components never look up photos in those contexts | auto (partial) + by construction |
| AC-5.6 resolution by wordId | `ImageChoiceQuestion.test.tsx`, `questionWordIds.test.ts` | auto |
| AC-5.7 photo presentation | style contract in `EmojiVisual` (square, rounded); exercised in e2e | manual (visual) |
| AC-5.8 word identity fields | `questionWordIds.test.ts` (content-match per kind) | auto |
| AC-5.9 word visual module | `wordVisual.test.ts` | auto |
| AC-6.1..AC-6.9 bank invariants | `bank.test.ts` + `bank.baseline.json` (ebd58a5) | auto |
| AC-7.1 entry point only on GradeSelect | `credits-link` exists solely in `GradeSelect.tsx`; `credits.spec.ts` asserts it there | verified (scan) + auto |
| AC-7.2 open and leave Credits | `credits.spec.ts` open + `credits-back` test | auto |
| AC-7.3 emoji collections credited | `credits.spec.ts` cards + `CreditsScreen.test.tsx` | auto |
| AC-7.4 approved photo credited (tent, modified note) | `CreditsScreen.test.tsx` photo-card test | auto |
| AC-7.5 no outbound links for children | `credits.spec.ts` zero-anchor assertion | auto |
| AC-7.6 empty photo list | `CreditsScreen.test.tsx` empty-message test | auto |
| AC-7.7 attribution load failure | `CreditsScreen.test.tsx` fetch-failure test | auto |
| AC-7.8 Credits is data-driven | `CreditsScreen.test.tsx` "Test Set" extra-collection test | auto |
| AC-7.9 no dashes in shipped copy | `dashGuard.test.ts` | auto |
| AC-7.10 Credits keyboard accessible | `credits.spec.ts` Tab+Enter open/close + `focus:ring-4` assertions | auto |
| AC-7.11 asset dirs covered | `check-attribution.mjs` exit 0 | auto (gate) |
| AC-8.1 production healthy | Deployer phase (Phase 7) | deferred |
| AC-8.2 production same-origin | Deployer phase | deferred |
| AC-8.3 quality gate before deploy | Deployer phase | deferred |
| AC-8.4 human go-live | process gate — pending human confirmation | deferred |
| AC-9.1 Round 1 composition | `round1ExtraLetter.test.ts` (s1..s40 per A-12) | auto |
| AC-9.2 topic-balanced slices | `round1ExtraLetter.test.ts` | auto |
| AC-9.3 exactly one correct option | `imageChoice.test.ts` (bank-wide + 😢 regression both directions) | auto |
| AC-9.4 single-image prompt position-agnostic | `emoji-visual.spec.ts` | auto |
| AC-9.5 image-choice counts toward score | `batchSession.test.ts` + `round1-extra-letter.spec.ts` (mixed pool) | auto |
| AC-9.6 tests updated per allowlist | T-5 allowlist honored; reviewer verified diffs | process |
| AC-10.1 listed kinds only | `QuestionCard.feedbackPicture.test.tsx` | auto |
| AC-10.2 picture on the answer line | `FeedbackPanel.test.tsx` + `emoji-visual.spec.ts` | auto |
| AC-10.3 picture may animate/reduced motion | `EmojiVisual.test.tsx`, `emoji-visual.spec.ts` reduced-motion | auto |
| AC-10.4 revealed-word extraction | `practice-flow.ts` `extractRevealedWord` used across e2e specs | auto |
| AC-10.5 picture full fallback chain | `FeedbackPanel.test.tsx`, `EmojiVisual.test.tsx` | auto |
| AC-10.6 baseline DOM without picture | `FeedbackPanel.test.tsx` byte-identical class string | auto |
| AC-11.1..AC-11.4 sentence classes | `listeningSentenceFillBlank.classes.test.ts` | auto |
| AC-11.5/11.6 baseline snapshot | `listeningSentenceFillBlank.classes.test.ts` vs `*.baseline.json` (833 questions) | auto |
| AC-11.7 bank-wide invariants | `listeningSentenceFillBlank.classes.test.ts` + `bank.test.ts` | auto |
| AC-11.8 existing generator tests | all pass unchanged in suite | auto |

"manual/deferred" for AC-4.x means: the maintainer pipeline runs only when curated photos are staged for human approval; the image bank is currently 0 images by design, so these paths were code-reviewed but not executed. The publish gate (AC-4.11) is a human-review control that cannot be automated.

## Timings (E2E, representative, 3-worker run)

| Screen/action | Time |
|---|---|
| Grade → Start Batch → Q1 render | ~2 s |
| Round 1 full round (10 mixed questions) | ~5–9 s |
| Round 2 full round | ~9–18 s |
| Round 4 describe/board | ~13–34 s |
| Full 4-round journey (same-origin spec) | ~16–39 s |

## Known issues / deferred (all recorded, none blocking)

- `PronunciationRecordingQuestion.test.tsx > mic-permission-denied` — pre-existing baseline failure (jsdom mock), debt register.
- `AC-2.5` e2e asserts on the dev server (Playwright `webServer: npm run dev`); the production-build half of AC-2.5 is covered by the entry-chunk check inside `check-bundle-budget.mjs` and the budget numbers above.
- AC-10.2 height bound is asserted on the default desktop viewport; the tighter 3-viewport line-height sweep is noted as residual risk (picture is inline `1em` by construction).
- CR backlog: CR-01 pair-matching emoji dedupe, CR-02 accessible names for image options, CR-03 phonics Round 3 (`docs/sdlc/cr-backlog.md`).
- Amendments awaiting human confirmation at PM finalization: A-12 (AC-9.1 seed range s1..s40), A-13 (AC-10.6 conditional `<p>`→`<div>`).
