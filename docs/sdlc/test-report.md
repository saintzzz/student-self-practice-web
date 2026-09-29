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

- `PronunciationRecordingQuestion.test.tsx > mic-permission-denied` — RESOLVED (A-20): stale test mocked `getUserMedia` reject, but production fires denial via SpeechRecognition `onerror 'not-allowed'`; test now mocks that path. Suite fully green.
- `AC-2.5` e2e asserts on the dev server (Playwright `webServer: npm run dev`); the production-build half of AC-2.5 is covered by the entry-chunk check inside `check-bundle-budget.mjs` and the budget numbers above.
- AC-10.2 height bound is asserted on the default desktop viewport; the tighter 3-viewport line-height sweep is noted as residual risk (picture is inline `1em` by construction).
- CR backlog: CR-01 pair-matching emoji dedupe, CR-02 accessible names for image options, CR-03 phonics Round 3 (`docs/sdlc/cr-backlog.md`).
- Amendments awaiting human confirmation at PM finalization: A-12 (AC-9.1 seed range s1..s40), A-13 (AC-10.6 conditional `<p>`→`<div>`).

## CR-06 gate results (phonics nang sau, 2026-09-29)

- Unit suite: **660/660 passed** (79 files), including the previously-failing
  mic-permission test.
- New coverage: `finalSounds.test.ts` (11), `blends.test.ts` (7),
  `rhymes.test.ts` (9 incl. bank-wide symmetry + false-positive splits),
  `phonicsDeep.test.ts` (12 incl. exactly-one-rhyme and c/k-equivalence
  guards), `PhonicsEndingChoiceQuestion.test.tsx` (7),
  `PhonicsRhymeChoiceQuestion.test.tsx` (4); extended
  `questionWordIds` (+3 bank-id cases), `feedbackPicture` (+3 picture
  kinds), `round4` composition (+alternation invariants), batch/App
  answer dispatch (+3 kinds).
- E2E: **49/49 passed** (2.1m, chromium headless-shell-1187 via
  `@playwright/test@1.55.0` - mac12 pin, advisory A-22).
- Checks: `tsc -b` clean, `vite build` clean, `check-attribution` OK
  (324 svg / 121 lottie), `check-bundle-budget` OK (JS 90.88 kB <= 94.5,
  CSS 4.18 kB <= 5, entry lottie-free).
- Dash guard: no U+2013/U+2014 in `src/` or `e2e/` (rg scan clean).

---

## CR-09 verification record (2026-09-30, Designer-led UI refresh)

Scope: app-level design system (design-spec s14, architecture s10) -
token module, Baloo 2 self-hosted display font, page gradient, scene
cards, unified play-chrome header strip (round chip + progress track +
score/timer chips), restyled options/buttons/feedback/summaries/credits.

### Unit / component

- `npm test`: 79 files, **660/660 green** (one test updated for the
  restyled timer urgent state - RoundTimer rose chip + pulse replaces
  the old `text-red-600` class assertion; one CreditsScreen test updated
  for the renamed collections section heading).
- `npx tsc --noEmit`: clean. `npm run build`: clean.

### Gates

- `check-attribution`: OK - 325 svg (+1 vendored 23f1.svg for the timer
  chip), 121 lottie, 3 collections (baloo-2 OFL entry added). The
  fetch-emoji-assets script now preserves foreign collections instead of
  clobbering them (bug found + fixed during this CR).
- `check-bundle-budget`: JS 91.76 kB OK (max 94.5). CSS re-based per
  AC-UI6 justification: new baseline 5.20 kB, max 6.25 kB (font-face +
  token utilities), measured 5.23 kB OK.

### E2E

- Full suite run during dev: 48/49 (one failure: timer chip emoji had
  no vendored Twemoji svg -> rendered native, caught correctly by the
  reduced-motion spec's asset-missing signal). Fixed by enumerating UI
  chrome emoji in fetch-emoji-assets and vendoring 23f1.svg.
- emoji-visual.spec.ts re-run in isolation: 11/11 green.
- One CR-06-era spec debt surfaced by a seed-dependent flake:
  round3-pronunciation-recording.spec.ts kept a stale local
  ROUND4_KINDS allow-list missing the CR-06 phonics kinds; updated to
  the full 7-kind list (test-only fix).
- Final clean full-suite run: **49/49 passed (2.5m)**.

### Visual QA (Playwright browser walkthrough)

Screens reviewed live at desktop 1280x, portrait 390x844, landscape
667x375 and 844x390: GradeSelect, StartBatch, active question + feedback,
Credits. Portrait defect found and fixed during the pass: header chips
wrapped vertically on 390px (chip nowrap + stacked strip layout on
narrow widths). Landscape compact contract preserved (title drops,
chips single row, Next reachable).

### Residual / deferred

- Prompt emoji size on image-choice prompts is unchanged (existing
  EmojiVisual sizing); larger hero picture sizing is a candidate
  follow-up, not in CR-09 scope.

## CR-07 gate results (grades 1-5 content, 2026-09-30)

| Gate | Command | Result |
|---|---|---|
| Unit (Vitest) | `npx vitest run` | **686/686 pass**, 80/80 files (+26 over CR-09 baseline) |
| Typecheck | `npx tsc --noEmit` | **Pass** |
| Build | `npm run build` | **Pass** (Vite 5.4.21) |
| Attribution | `node scripts/check-attribution.mjs` | **Pass** - 520 svg / 166 lottie / baloo-2 font preserved |
| Bundle budget | `node scripts/check-bundle-budget.mjs` | **Pass** - JS 101.07 kB (re-based, see advisory A-24), CSS 5.23 kB |
| Dash guard | `src/lib/dashGuard.test.ts` + manual sweep of new vocab files | **Pass** |
| E2E (Playwright) | `npx playwright test` | **55/55 pass** (49 prior + 6 new grades.spec.ts) |
| Visual QA | playwright-mcp manual pass | GradeSelect 5 cards OK desktop + 390px portrait; grade-1 batch renders real content |

### CR-07 coverage added

- `src/data/vocabulary/grades.test.ts` (26, new): GRADES registry, topic-to-grade assignment (79 topics all registered), per-grade pool invariants (dedupe, bank-resident, >= 60/300/130/120/110), shared-word same-object identity across grades, createBatch per grade + determinism per seed, cross-grade word-set divergence, **no-leakage sweep: all question wordIds across a full 4-round batch stay inside the selected grade's pool, for all 5 grades**.
- `bank.test.ts`: AC-6.1 re-scoped to 524 words + non-baseline words must live under `g{1,3,4,5}-*` topics; AC-6.3 sanctioned shared-emoji list extended 4 -> 7 pairs; AC-6.6 grade sweep added (all 4 round builders over every grade pool).
- `App.test.tsx`: AC1 updated for CR-07 (5 grade cards).
- `e2e/grades.spec.ts` (6, new): all 5 cards visible; per-grade card -> start batch -> real Round 1 question -> revealed-answer feedback for each grade.
- `index.test.ts`: existing per-topic invariants (>= 4 words, unique emoji within topic, unique ids) now cover all 79 topics unchanged - green with zero edits.

### Content counts

| Grade | Topics | Words | New (non-shared) |
|---|---|---|---|
| grade-1 | 8 | 65 | ~5 (pink, friend, yo-yo + shared core) |
| grade-2 | 28 | 326 | baseline unchanged |
| grade-3 | 15 | 147 | ~40 new |
| grade-4 | 15 | 135 | ~75 new |
| grade-5 | 13 | 123 | ~70 new |
| **total** | **79** | **524 unique** | |

### Emoji/vendor assets

- 520 distinct emoji keys vendored (`npm run assets:emoji`), incl. emoji-14/15 glyphs (🫅 🩷 🪈 🫗); `fetch-emoji-assets.mjs` now recurses grade subfolders (was silently skipping them).
- 166 Noto lottie keys within the 120 KB cap.

### AC map

| AC | Evidence | Status |
|---|---|---|
| AC-G1 | grades.test.ts GRADES registry + e2e/grades.spec.ts | auto |
| AC-G2 | 524 total; pools 65/326/147/135/123 vs >= 55/130 floors (G2 unchanged at 326 superset) | auto |
| AC-G3 | 686/686 unit | auto |
| AC-G4 | 55/55 e2e incl. per-grade traversal spec | auto |
| AC-G5 | check-attribution 520 svg/166 lottie; budget re-based w/ advisory A-24 | auto |
| R-G4 generator minimums | bank.test AC-6.6 grade sweep (all builders x 5 pools) | auto |
| AC-G6 no leakage | grades.test.ts full-batch wordId sweep per grade | auto |

## CR-08 gate results (accounts + RBAC on Supabase, 2026-10-01)

| Gate | Command | Result |
|---|---|---|
| Unit (Vitest) | `npx vitest run` | **692/692 pass**, 82/82 files (+6: GradeSelect scope, practiceAuth, env gate) |
| Typecheck | `npx tsc --noEmit` | **Pass** |
| Build | `npm run build` | **Pass** - entry JS 104.90 kB gzip (+3.83 app code), supabase-js isolated in a 59.26 kB async chunk |
| Bundle budget | `node scripts/check-bundle-budget.mjs` | **Pass** - max 111.1 kB unchanged |
| E2E (Playwright) | `npx playwright test` | **58/58 pass** (55 prior + 3 new auth.spec.ts, real backend) |
| Visual QA | playwright script | login screen + admin console render per DS 15.x |

### Backend verification (real project cxjpgfhqchjoernfmcra, schema `practice`)

- Schema applied via `execute_sql` (record: `supabase/migrations/0001_practice_schema.sql`); `pgrst.db_schemas = 'public, practice'` + config reload.
- **RLS proofs (AC-A1):**
  - student JWT `GET accounts` returns only own row (admin row invisible).
  - student JWT `POST classes` -> `42501 new row violates row-level security policy`.
  - anon `GET accounts` -> `42501 permission denied for schema practice` (no grants at all).
  - student JWT `practice-admin` -> `{"error":"forbidden"}`.
- **Edge function (AC-A2):** `practice-admin` v1 deployed, verify_jwt ON; admin JWT `create-account` returned accountId + accounts row; `delete-account` removed the test student; last-admin guard in code.
- **Bootstrap:** admin auth user `33eb3ad4-...` (email `admin@students.ioe-practice.example`) created via GoTrue admin API; PIN stored locally at `~/.config/devin/secrets/practice_admin_credentials.json` (chmod 600, not committed).
- **E2E auth.spec.ts (3):** guest path -> 5 grade cards + zero supabase.co REST/auth traffic; admin login -> create student -> create class -> enroll -> scope grade-1+3 -> sign out -> student login shows exactly 2 cards -> grade-1 batch starts -> cleanup deletes both; wrong PIN shows VN error.
- **AC-A6 env-absent:** `isSupabaseConfigured()` force-false under `MODE=test`; full suite network-free.

### AC map

| AC | Evidence | Status |
|---|---|---|
| AC-A1 | SQL/REST probes above | verified |
| AC-A2 | edge fn calls above | verified |
| AC-A3 | auth.spec.ts login/error/signout + session reload path | auto |
| AC-A4 | auth.spec.ts full journey | auto |
| AC-A5 | auth.spec.ts guest test (network assertion) | auto |
| AC-A6 | client.test.ts + 692/692 + 58/58 (gotoApp guest bypass) | auto |
| AC-A7 | this table | auto |

### Deployment note

Vercel env vars `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
are required on the `ioe-leduyminh` project to enable auth in
production; values are publishable by design. Until set, production
runs the identical guest-only experience (no login surface).


## CR-10 gate results (visual identity + engagement, 2026-10-01)

| Gate | Command | Result |
|---|---|---|
| Unit (Vitest) | `npx vitest run` | **712/712 pass**, 84/84 files (+20: engagement store 17, theme map 3) |
| Typecheck | `npx tsc --noEmit` | **Pass** |
| Build | `npm run build` | **Pass** - entry JS 111.63 kB, CSS 6.70 kB gzip |
| Bundle budget | `node scripts/check-bundle-budget.mjs` | **Pass** - re-based (A-28), entry lottie-runtime-free |
| Attribution | `node scripts/check-attribution.mjs` | **Pass** - 520 svg / 166 lottie / font (no new sources; scenes are own SVG) |
| Dash guard | manual sweep of all new files | **Pass** |
| E2E (Playwright) | `npx playwright test` | **60/60 pass** (~3 min after beheo-force-guest infra fix) |
| Visual QA | playwright-mcp + temp traversal spec | journey map desktop + 390px portrait, sky/playground lands, confetti burst, 3-star rain, chest reveal + sticker chips, album panel |

### Coverage added
- `store.test.ts` (17): star boundaries 49/50/74/75/99/100, sticker
  idempotence, streak same/next/gap day, storage-error resilience.
- `theme.test.ts` (3): all 5 grades map to distinct lands, sky
  fallback, every land descriptor complete.
- `engagement.spec.ts` (2 e2e): map chips + album panel; full Round 1
  with deterministic correct answers -> star rain -> banked stars +
  streak visible on the map.
- `client.ts` gained `beheo-force-guest` escape hatch (see A-28).
- `auth-flow.ts gotoApp` sets the flag via addInitScript.

### AC map
| AC | Evidence | Status |
|---|---|---|
| AC-T1 | store.test.ts | auto |
| AC-T2 | theme.test.ts | auto |
| AC-T3 | engagement.spec t1 + visual QA | auto |
| AC-T4 | engagement.spec t2 + screenshots (star rain / chest) | auto |
| AC-T5 | engagement.spec t2 | auto |
| AC-T6 | reduced-motion media block in index.css disables all new keyframes | manual |
| AC-T7 | gates above | auto |
