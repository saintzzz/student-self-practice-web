# Product Requirements Document - Visual Content Upgrade (P0 + P1 + P2 + SGK vocab + D-1/D-6 expansions)

- **Project:** student-self-practice-web (brownfield, strangler-fig per discovery-baseline "Strategy ruling")
- **Phase:** BA (PM -> **BA** -> Designer -> Tech Lead -> Dev -> Tester -> Deployer -> PM)
- **Date:** 2026-09-29. **Revision:** r3 (r2 applied human rulings D-1, D-2, D-6, the A-06 amendment and reviewer findings 1-5; r3 applies human reversals of D-10 and D-11 and aligns with advisory A-09).
- **Inputs (binding):** `docs/sdlc/constitution.md`, `docs/sdlc/advisory-log.md` (A-01..A-08, A-06 as amended 2026-09-29), `docs/sdlc/project-plan.md`, `docs/sdlc/discovery-baseline.md`, `docs/research-visual-content.md`
- **Companion artifact:** `docs/sdlc/cr-backlog.md` (approved CRs kept out of this run).
- **Fidelity:** `reference-only`. **Review mode:** `ai`.
- **Artifact language:** English. Vietnamese UI strings are quoted exactly and are normative. This document contains no em-dash or en-dash characters (constitution #8).

### Revision r2 change log

| Change | Source | Sections |
|--------|--------|----------|
| D-1 ruled "all three": photos all-or-nothing in ListeningImageChoice (B), `image-choice` wired into live Round 1 (D), correct-word picture in FeedbackPanel (C). Explicit scope expansion. | Human ruling 2026-09-29 | 1, 4, 5, 6 (US-5, US-9, US-10), 12 |
| D-2 ruled A (static 🐷 + Lottie ✨/🎉). | Human ruling 2026-09-29 | 4, US-3 |
| D-6 ruled "fix in-run": topic-aware sentence templates; all 43 words stay. O-3 resolved in scope. | Human ruling 2026-09-29 | 4, 5, 6 (US-11), 7, 12 |
| A-06 amended: emoji assets resolve by emoji key; photos resolve by word identity carried in minimal additive payload fields + a wordId-keyed module. | Reviewer finding 1 + human | 4, BR-05, AC-5.6, AC-5.8, AC-5.9, 9.1 |
| Photos never in PicturePairMatching recorded as a ruled decision; project-plan WBS P2d to be narrowed by PM. | Reviewer finding 2 + human | 4 (D-9), BR-09, AC-5.5 |
| `review` renamed `reviewStatus` everywhere. | Reviewer finding 3 | BR-12, US-4, 9.2 |
| `[D-6]` tags removed; totals 43 / 326 confirmed. | Reviewer finding 4 | 7, G-4 |
| New executable bundle-budget AC-2.10. | Reviewer finding 5 | US-2, NFR-1 |
| O-5, O-6, P3 moved to approved CR backlog; image-only words stay a non-approved future note. | Human ruling 2026-09-29 | 4, 7.3, 10, cr-backlog.md |
| r3: D-10 reversed to A (image-choice shuffled into Round 1); allowlist category T-5 added; AC-9.1, AC-9.4, AC-9.5, AC-9.6 made position-agnostic. | Human ruling 2026-09-29 | 3 (F-13), 4, 6.0, US-9, 11, 13 |
| r3: D-11 reversed (FeedbackPanel picture may show photos, full chain); `picture?: { emoji; imageUrl? }` prop; additive `DescribeAndChooseImageQuestion.optionWordIds` and `CountingImageQuestion.promptWordId`. | Human ruling 2026-09-29 | 4, BR-05, BR-09, US-5, US-10, 9.1, 13 |
| r3: player cap per A-09 (<= 1 before answering, <= 2 after). | Advisory A-09 | G-2, AC-2.9, NFR-1 |
| Script names aligned with project-plan / constitution C3 (`scripts/fetch-vocab-images.mjs`, `scripts/check-attribution.mjs`); e2e same-origin flow includes Credits (constitution C4); D-7 superseded by A-05. | Consistency pass | US-4, US-7, US-8, 4 |

---

## 1. Overview

Today every "picture" in the app is a native Unicode emoji glyph whose look depends on the OS font (discovery-baseline D1). This feature:

1. Renders every vocabulary/mascot emoji through one shared component, **EmojiVisual**, backed by bundled **Twemoji** SVGs (CC-BY 4.0), keeping the emoji character in an accessible hidden text layer (A-04 Ruling B).
2. Adds an **animated layer** (Google Noto Animated Emoji Lottie, CC-BY 4.0, played by `@lottiefiles/dotlottie-react`) in single-image contexts only (A-03). The mascot stays a static 🐷; its ✨ and 🎉 accents animate (D-2).
3. Adds a curated **image bank** (Openverse CC0 / CC BY photos, human-reviewed, bundled in `public/images/vocab/`) with optional `imageUrl` on `VocabWord` and the fallback chain `imageUrl -> animated emoji -> static SVG emoji -> native glyph`. Photos render in the ImageChoice prompt and, all-or-nothing, in ListeningImageChoice options (D-1 B).
4. **Wires `image-choice` into live Round 1** (D-1 D) so the single-image prompt (animated or photo) is actually seen during a `Batch`.
5. **Shows the correct word's picture in FeedbackPanel** (D-1 C), inline on the "Từ đúng là:" line.
6. Adds 43 new `VocabWord` entries from the SGK Tiếng Anh 2 gap analysis (research doc 2.3).
7. Makes Round 2 sentence templates **topic-aware** (D-6) so feelings, occupations and other non-mass words get grammatical sentences.
8. Adds a **Credits** surface satisfying CC-BY attribution.
9. Deploys to Vercel at pipeline end (human go-live gate, strict mode).

### 1.1 Goals and success metrics

| ID | Metric | Target | Verified by |
|----|--------|--------|-------------|
| G-1 | Emoji pictures in the render sites (F-1) + Mascot + FeedbackPanel picture come from bundled assets, not the OS font | 100% of those EmojiVisual roots have `data-emoji-mode` in {`svg`,`lottie`,`image`} under normal network | AC-1.4, AC-1.6 |
| G-2 | Animated emoji only in single-image contexts | 0 Lottie players inside any grid / repeated context; at most 1 per screen before answering, 2 after (A-09) | AC-2.3, AC-2.9 |
| G-3 | Every bundled asset has a license record + UI Credits entry | 100% (`node scripts/check-attribution.mjs` exit 0) | AC-4.9, AC-7.11 |
| G-4 | New vocabulary passes bank invariants | 43 new entries, 326 words, 28 topics, all guards green | AC-6.1..AC-6.9 |
| G-5 | Single-image prompt and photos are visible in a live `Batch` | Every Batch Round 1 contains 3 image-choice questions, shuffled among the 7 extra-letter questions | AC-9.1, AC-9.5 |
| G-6 | Round 2 sentences are grammatical for every topic class defined in 5.1 | 71 existing words change exactly as listed; all other existing words unchanged | AC-11.5, AC-11.6 |
| G-7 | No unintended regression | `npm test`, `npm run build`, `npm run test:e2e` green; only allowlisted deliberate test updates (6.0) | AC-1.5, AC-8.3 |
| G-8 | Live on Vercel | `GET /` = 200 and asset probes = 200 after human go-live | AC-8.1 |

### 1.2 Ubiquitous language (constitution glossary, used verbatim)

| Term | Meaning in this PRD |
|------|---------------------|
| `VocabWord` | One entry of the vocabulary bank (`src/types/index.ts`). |
| `Batch` | One practice session of 4 `Round`s. |
| `Round` | One question type block inside a `Batch`. |
| `EmojiVisual` | The single shared component that renders the picture for one emoji char. |
| image bank | The curated, human-approved photo set in `public/images/vocab/` + its records in `public/attribution.json`. |

Derived terms (defined here, used identically downstream):

| Term | Definition |
|------|------------|
| single-image context | Exactly one picture of one word/character: ImageChoiceQuestion prompt, FeedbackPanel correct-word picture, Mascot glyph and accents (StartBatch, FeedbackPanel, RoundSummary, BatchSummary). |
| grid context | 2+ pictures side by side as answer options or tiles: ListeningImageChoice options, PicturePairMatching picture tiles, CountingImage options. |
| repeated context | The same emoji N times to express a count: CountingImage prompt (`image-to-count`) and options (`count-to-image`), DescribeAndChooseImage options. |
| render mode | Value of `data-emoji-mode` on an EmojiVisual root: `image`, `lottie`, `svg`, `native`. |
| emoji key | Twemoji file name for an emoji (BR-06). Emoji-char assets (svg, lottie) resolve by emoji key only. |
| word visual module | A module built once from `ALL_WORDS` mapping `VocabWord.id -> { emoji, imageUrl? }` (BR-05). |
| sentence class | The template family chosen for a word in the listening-sentence generator (5.1). |
| curator | The person (parent/teacher or maintainer acting for them) who reviews image bank candidates. |

---

## 2. Stakeholders and roles

| Role | Interest | Stories |
|------|----------|---------|
| **học sinh lớp 2** (7-8 years old, primary user) | Clear, consistent pictures; one meaning per picture; correct English sentences; no distraction while answering | US-1, US-2, US-3, US-5, US-6, US-9, US-10, US-11 |
| **phụ huynh/giáo viên** | Safe, license-clean content; visible sources; app reachable online | US-4, US-7, US-8 |
| Content maintainer (operates scripts for phụ huynh/giáo viên) | Repeatable asset pipeline, coverage visibility | Actor inside US-4 (no login, not an app role) |
| Asset licensors (Twemoji contributors, Google Noto, Openverse creators) | Correct CC-BY attribution | US-7 |

`Ruling: N/A - no regulated roles or permissions in scope` for the CONVENTIONS Role & Responsibility matrix (no backend, no accounts).

---

## 3. Verified as-is facts that constrain this PRD

Checked directly in code or at the source on 2026-09-29.

| # | Fact | Evidence | Consequence |
|---|------|----------|-------------|
| F-1 | Emoji render sites: `ImageChoiceQuestion.tsx:21`, `ListeningImageChoiceQuestion.tsx:54`, `CountingImageQuestion.tsx:36,51`, `DescribeAndChooseImageQuestion.tsx:60`, `PicturePairMatchingQuestion.tsx:87` (picture tiles only), `Mascot.tsx:68-69`. | grep `src/components` | Swap targets (discovery D4). FeedbackPanel picture is a new 7th site (US-10). |
| F-2 | No Round generates `image-choice` or `counting-image` today: `round1ExtraLetter.ts:21`, `round2ListeningSentence.ts:40-41`, `round3Pronunciation.ts:20`, `round4DescribeAndChooseImage.ts:41-42`. `QuestionCard.tsx` already routes `image-choice` to `ImageChoiceQuestion`, and `submitOptionAnswer` (`practiceSession.ts`) already scores it. | grep | Wiring image-choice into Round 1 needs no new UI or scoring code (US-9). |
| F-3 | Noto Animated set: 881 entries; 126 of 279 distinct bank emoji animated; 🐷 (U+1F437) absent, ✨ 🎉 present. | Noto `api.json` | D-2 ruling A. |
| F-4 | Noto keys sometimes keep `fe0f`, use `_`. | same | BR-06. |
| F-5 | dotLottie fetches its WASM (~500 KB compressed) from jsdelivr/unpkg unless `setWasmUrl()` is called. | LottieFiles docs, dotlottie-web wiki | BR-07, AC-2.6. |
| F-6 | Openverse anonymous: 20 req/min, 200 req/day, `page_size` <= 20; sensitive results excluded unless `unstable__include_sensitive_results=true`. | Openverse issue #5315, API docs | AC-4.1, AC-4.6. |
| F-7 | Tests depend on emoji text: `ImageChoiceQuestion.test.tsx:21`, `CountingImageQuestion.test.tsx:39,56-57`, `DescribeAndChooseImageQuestion.test.tsx:46-57`, `ListeningImageChoiceQuestion.test.tsx:26`, e2e `mascot-flow.ts:24-33`, `pair-matching-flow.ts:67`. testing-library `getByText` matches an element's own text nodes. | grep | BR-02, AC-1.2, AC-1.3. |
| F-8 | 283 words; 4 emoji shared across topics: 😢 (cry, sad), 🏊 (swim, swimming), 😴 (sleep, tired), 📖 (book, read). | script over data | BR-05, BR-10, CR-01 (pair-matching dedupe). |
| F-9 | Sentence templates today: countable "I have a X." / "I can see a X." / "This is a X."; non-countable "I like X." / "I want some X." / "I can see X."; `g2-actions` "I can X." / "I like to X." (`listeningSentenceFillBlank.ts:22-46`). Unit test fixtures use topic ids `t-animals`, `t-colors` and `ACTIONS_TOPIC_ID` (`listeningSentenceFillBlank.test.ts:9-38`). | code | D-6 fix keyed on real `g2-*` ids and word ids leaves existing unit tests unaffected (US-11). |
| F-10 | Baseline entry bundle: JS 269.86 kB (84.46 kB gzip), CSS 17.00 kB (3.96 kB gzip). | `npx vite build` at `ebd58a5` | NFR-1, AC-2.10. |
| F-11 | Playwright: Chromium only; `E2E_BASE_URL` override. | `playwright.config.ts` | AC-8.2. |
| F-12 | Zero U+2013 / U+2014 in `src/`, `e2e/`, `index.html`. | grep | AC-6.5, AC-7.9. |
| F-13 | Many tests assume the **first** Round 1 question is extra-letter: `App.test.tsx:106,195`, `BatchScreen.test.tsx:72`, `batchSession.test.ts:239`, e2e `batch-full-flow.spec.ts:46`, `points-scoring.spec.ts:36`, `responsive-layout-phone.spec.ts:44,60`, `responsive-layout-tablet-and-small-phone.spec.ts:36,49`, `round-live-score.spec.ts:32,50`, `round-timer.spec.ts:43,72`, `round1-extra-letter.spec.ts:37`. Tests that iterate **every** Round 1 question as extra-letter: `round1ExtraLetter.test.ts:7-11,39-62`, `App.test.tsx:116`, `e2e/utils/batch-flow.ts:96-117` (`runExtraLetterRound`), `e2e/utils/mascot-flow.ts:43-81`. | grep | Round 1 shuffles image-choice among extra-letter questions (D-10, human ruling), so question 1 may be image-choice for some seeds. Both groups of tests are updated deliberately under allowlist categories T-1, T-2 and T-5 (6.0). |
| F-14 | `generateImageChoiceQuestions` excludes distractors by word text only (`imageChoice.ts:19-25`). Drawn from `ALL_WORDS`, a 😢 prompt for "sad" could list "cry" as a distractor (two correct answers). | code + F-8 | Distractors must also exclude words sharing the target emoji (AC-9.3). |
| F-15 | FeedbackPanel `answer-feedback` testid is deliberately absent for `image-choice` (`FeedbackPanel.test.tsx:36-41`). e2e extracts the revealed word as the longest ASCII token (`practice-flow.ts:159-168`). | code | e2e for image-choice reads the headline text; FeedbackPanel testid list stays unchanged. EmojiVisual text layer must contain only the emoji (no ASCII). |
| F-16 | For `picture-pair-matching`, FeedbackPanel `correctWord` is `"cat - 🐱, dog - 🐶, ..."` (`practiceSession.ts` `getCorrectWord`). | code | Inline emoji inside feedback **text strings** stay native (BR-01 exception). |

---

## 4. Advisory: Objections, Options Matrices, Rulings

All material decisions are now ruled. Human rulings are dated 2026-09-29.

### D-1: Where do photos and animated word prompts become visible? (O-1)

Options presented in r1: A keep dormant; B photos all-or-nothing in ListeningImageChoice; C correct-word picture in FeedbackPanel; D wire image-choice into a Round.

- **Ruling (human, 2026-09-29): B + C + D all approved. Explicit scope expansion.** Specified as: B -> BR-09, AC-5.4; D -> US-9 (placement D-10, shuffled); C -> US-10 (photos allowed per D-11).

### D-2: Mascot animation when 🐷 has no Noto animation (O-2)

- **Ruling (human, 2026-09-29): A** - 🐷 static Twemoji SVG with existing CSS keyframes; ✨ (happy) and 🎉 (celebrating) accents play Noto Lottie. ACs: AC-3.1..AC-3.4.

### D-3: Credits entry point and external-link safety

- **Ruling: BA provisional A, not overridden at gate** - button "Nguồn hình ảnh" on GradeSelect only, in-app Credits screen, URLs as plain text (constitution #1). ACs: AC-7.1..AC-7.11.

### D-4: Image bank coverage reporting

- **Ruling: BA provisional A, not overridden** - `docs/image-bank-coverage.md` + console summary, no coverage gate. AC-4.7.

### D-5: Placement of new vocabulary

- **Ruling: BA provisional A, not overridden** - 4 SGK topics (`g2-party`, `g2-seaside`, `g2-kitchen`, `g2-camping`), append to `g2-actions` and `g2-feelings`, existing words untouched. Note: project-plan WBS 8 mentions fixing the thin `g2-places` topic "if an opportunity arises"; with image-choice drawing distractors from `ALL_WORDS` (US-9), `g2-places` thinness no longer blocks image-choice, so no places words are added and the 43-word scope is kept.

### D-6: Ungrammatical Round 2 sentences (O-3)

- **Ruling (human, 2026-09-29): fix in-run.** The listening-sentence generator becomes topic-aware (5.1, US-11). All 43 new words stay. O-3 is resolved within scope; no CR.

### D-7: Meaning of "offline-first"

- **Superseded by advisory A-05** (constitution #4 as amended): same-origin assets, zero third-party runtime dependency; service worker is out of scope. PRD keeps graceful degradation to the native glyph (BR-04). ACs: AC-1.7, AC-2.6, AC-2.8, AC-5.3, AC-8.2.

### D-8: How `imageUrl` gets onto `VocabWord`

- **Ruling: delegated to Tech Lead ADR** (hand-edited field vs generated module merged into `ALL_WORDS`). Invariants any choice must meet: AC-4.9, BR-05.

### A-06 amendment (human, 2026-09-29): photo resolution model

- **Objection (reviewer finding 1):** r1 BR-05 required word identity, but A-06 (original) forbade payload/generator changes and proposed a `(topicId, emoji)` registry. A registry cannot work once `image-choice`, ListeningImageChoice and FeedbackPanel draw from `ALL_WORDS` across topics (question `topicId` is the target's topic, distractor options come from other topics; emoji are not globally unique, F-8).
- **Ruling (A-06 amended; human updates advisory-log):**
  1. Emoji-char assets (svg, lottie) resolve by **emoji key only** (BR-06); no word identity needed.
  2. Photo resolution needs word identity, carried by **minimal additive payload fields**, not a registry lookup: `ImageChoiceQuestion.wordId`, `ListeningImageChoiceQuestion.optionWordIds` (parallel to `options`), `PairMatchingPair.wordId`. Existing fields are unchanged.
  3. EmojiVisual takes an optional `imageUrl` prop; components resolve `wordId -> imageUrl` via the **word visual module** built once from `ALL_WORDS`.
- **BA addition derived from D-1 C + D-11 (within the amended model):** FeedbackPanel shows the correct word's full visual (photo or emoji), so QuestionCard needs the correct answer's word id for every "yes" kind in US-10. Additive fields beyond the three above: `ExtraLetterQuestion.wordId`, `ListeningSentenceFillBlankQuestion.wordId`, `DescribeAndChooseImageQuestion.optionWordIds` (parallel to `options`, same pattern as ListeningImageChoice), `CountingImageQuestion.promptWordId`. The shared `CountingImageOption` type is not changed. `Ruling: BA, derived necessity of human rulings D-1 C and D-11; same additive-only rule as the A-06 amendment.`
- Effect on project-plan: WBS P2a ("registry `(topicId, emoji)`, KHÔNG đổi question payloads") is superseded by this amendment; PM aligns project-plan.

### D-9: Photos in PicturePairMatching (reviewer finding 2)

- **Finding:** project-plan WBS P2d lists pair-matching tiles as a photo context; r1 BR-09 excluded them without a ruling.
- **Evidence:** pair tiles are small-class tiles (`PicturePairMatchingQuestion.tsx` tile rendering) where photo detail is unreadable for a 7-year-old; each board draws 4 words via `stratifiedSample` across topics, so all-4-covered boards would be rare; mixed photo/SVG within one board breaks research 5.2 (one style per view).
- **Ruling (human, 2026-09-29): pair-matching tiles keep Twemoji SVG; photos never render in PicturePairMatching.** Twemoji still delivers the consistency fix there. PM narrows WBS P2d accordingly (this PRD references that narrowing; project-plan is not edited by BA). BR-09, AC-5.5.

### D-10: Placement of image-choice inside Round 1 (new, from D-1 D)

| Option | Strengths | Weaknesses | Risk |
|--------|-----------|------------|------|
| **A. Shuffle 7 extra-letter + 3 image-choice with the seeded RNG (Round 2/Round 4 pattern)** | Consistent with other mixed Rounds; image-choice position unpredictable for the student | Tests that assume question 1 is extra-letter (F-13) must be updated deliberately (allowlist T-5) | Medium churn, bounded by 6.0 |
| B. Extra-letter block first (questions 1-7), then an image-choice block, no shuffle | Fewer test updates | Predictable position; inconsistent with other mixed Rounds | Low |
| C. Put image-choice in Round 4 instead | Round 4 is "choose picture" themed | Round 4 already mixes 2 kinds; image-choice is picture-to-word, the reverse of Round 4 | Medium |

- **Ruling (human, 2026-09-29): A (shuffled)**, reversing the BA provisional B. Counts: `ROUND_1_EXTRA_LETTER_COUNT = 7`, `ROUND_1_IMAGE_CHOICE_COUNT = 3`, `ROUND_1_QUESTION_COUNT` stays 10; order via `seededShuffleIndices(10, 'round1-mix-{seed}')`. No new Round, no scoring change. Round 1 title "Vòng 1: Bắn chữ cái thừa" and `roundType: 'extra-letter'` stay (same convention as Round 2). ACs: AC-9.1..AC-9.6; allowlist T-5.

### D-11: Photos inside the FeedbackPanel picture (new, from D-1 C)

- **Ruling (human, 2026-09-29): photos allowed**, reversing the BA provisional call. The FeedbackPanel picture follows the same fallback chain as other single-image contexts: approved photo -> lottie -> svg -> native (BR-04, BR-09). QuestionCard resolves the correct answer's word id (US-10 table) and passes `picture: { emoji, imageUrl? }`. ACs: AC-10.1..AC-10.6.

### O-4 (r1 D-7): superseded by A-05 (see D-7).

### Approved CRs (moved out of this run, see `docs/sdlc/cr-backlog.md`)

- CR-01 pair-matching emoji dedupe (was O-5), CR-02 accessible option names (was O-6), CR-03 phonics round (P3). **Ruling (human, 2026-09-29): approved as separate backlog items.**
- Image-only vocabulary words (section 7.3 note): **Ruling (human, 2026-09-29): not approved;** future note only, no CR.

### Already ruled (applied as-is)

A-01, A-02, A-03, A-04 (Ruling B confirmed in AC-1.1..AC-1.3), A-05 (constitution #4), A-06 (as amended above), A-07 (visual assets only in `public/emoji/svg/`, `public/emoji/lottie/`, `public/images/vocab/`), A-08.

---

## 5. Business rules

| ID | Rule | Conditions / actions | Exceptions |
|----|------|----------------------|------------|
| BR-01 | **Single render path.** Every emoji picture in the render sites (F-1), Mascot, and the FeedbackPanel picture is rendered by EmojiVisual. | Vocabulary emoji, mascot glyph, mascot accents, feedback picture. | (a) UI chrome in button labels ("🔊 Nghe", "🔁 Nghe lại", "←", "→"); (b) emoji inside feedback text strings such as the pair-matching `correctWord`/`explanation` (F-16). Both stay native text (Ruling: BA, per project-plan WBS 1). |
| BR-02 | **Text layer (A-04 B).** EmojiVisual always renders the emoji string in exactly one text node inside an element using the `sr-only` clip technique; images/players are `aria-hidden="true"` with `alt=""`. Repeated render of N copies: the text node holds `emoji.repeat(N)`. The text layer contains only emoji characters (no ASCII, F-15) and never uses `display:none`, `visibility:hidden`, `opacity:0` or `hidden`. | All modes except `native`, where the same text node becomes visible. | None. |
| BR-03 | **Animation eligibility (A-03).** `animated` defaults to `false`. Only single-image contexts pass `animated={true}`. Lottie plays only if `animated`, a Noto Lottie exists for the emoji key (known without a network probe), and `prefers-reduced-motion` is not `reduce`. | Otherwise mode falls to `svg`. | None. |
| BR-04 | **Fallback chain.** `image` (only where BR-09 permits and an `imageUrl` prop is given) -> `lottie` (BR-03) -> `svg` -> `native`. A load error advances to the next step. | Never an empty or broken picture. | None. |
| BR-05 | **Resolution model (A-06 amended).** Emoji-char assets resolve by emoji key only. Photos resolve by `VocabWord.id`: question payloads carry word ids in additive fields (9.1); components call the word visual module (`wordId -> { emoji, imageUrl? }`, built once from `ALL_WORDS`) and pass `imageUrl` to EmojiVisual. No lookup by emoji or by `(topicId, emoji)`. | `ImageChoiceQuestion.wordId`, `ListeningImageChoiceQuestion.optionWordIds`, `PairMatchingPair.wordId`, `ExtraLetterQuestion.wordId`, `ListeningSentenceFillBlankQuestion.wordId`, `DescribeAndChooseImageQuestion.optionWordIds`, `CountingImageQuestion.promptWordId`. | None. |
| BR-06 | **Emoji key.** One key per emoji = Twemoji file name (lowercase hex codepoints joined by `-`, FE0F handled exactly as Twemoji names files). Noto Lottie stored under the same key (the fetch script maps Noto `_`-joined codepoints, with or without `fe0f`). | `public/emoji/svg/{key}.svg`, `public/emoji/lottie/{key}.json` (A-07). | None. |
| BR-07 | **Same-origin runtime (constitution #4, A-05).** No runtime request leaves the app origin. dotLottie WASM is self-hosted via `setWasmUrl` before any player mounts. Download scripts run only on a maintainer machine; `npm run build` makes no network fetch; generated assets are committed. | Includes Vercel build. | Browser speech APIs (not page requests). |
| BR-08 | **License allow-list.** CC0, CC BY (any version), OFL-1.1, MIT only. CC BY-SA/NC/ND, PDM-only, "personal use only", Pixabay Content License (until a Ruling with key) are rejected. | Script re-verifies each Openverse `license`. | None. |
| BR-09 | **Photo contexts.** Photos render only in (a) the ImageChoice prompt, (b) the FeedbackPanel correct-word picture (Ruling D-11) and (c) ListeningImageChoice options when all 4 option words have an approved photo (else all 4 are SVG). Photos never render in repeated contexts, PicturePairMatching (Ruling D-9, WBS P2d narrowed) or Mascot. Photos are static. | | |
| BR-10 | **Vocabulary uniqueness.** New ids globally unique; new emoji unused by any other word. | | 4 pre-existing shared emoji (F-8) allowlisted, not extended. |
| BR-11 | **One picture, one meaning.** A candidate word is added only if one emoji depicts it unambiguously and is not bound to another word; otherwise it is flagged (7.3). `VocabWord.emoji` stays mandatory. | Constitution fault class. | None. |
| BR-12 | **Human review gate for photos.** No photo is published without `reviewStatus: "approved"`, `reviewedBy`, `reviewedAt` set by the curator. Scripts never write `reviewStatus: "approved"`. Unreviewed files never enter `public/` (constitution SAFE). | | None. |
| BR-13 | **Attribution completeness.** Every file in the 3 asset directories is covered by `public/attribution.json`, checked both ways by `node scripts/check-attribution.mjs` (constitution C3); Credits renders from that file only. | | None. |
| BR-14 | **No dashes.** No U+2013/U+2014 in `src/` or `public/attribution.json` (third-party titles sanitized to `-`). | Constitution #8. | None. |
| BR-15 | **Image-choice distractors.** For an image-choice target word, distractors exclude words with the same word text and words with the same emoji as the target. | Generator runs over `ALL_WORDS`. | None. |
| BR-16 | **Sentence class precedence.** For each word: (1) word-id override (5.1 table B), else (2) `g2-actions` -> action, else (3) topic class (5.1 table A), else (4) `countable ? countable : mass`. Classes `countable`, `mass`, `action` keep today's exact templates. | Listening-sentence generator only. | None. |

### 5.1 Sentence classes (normative for US-11)

Templates use `{a}` = existing `article(word)` ("a"/"an"). All templates keep the blank-recovery invariant.

| Class | Templates (exact) | Status |
|-------|-------------------|--------|
| `countable` | "I have {a} X." / "I can see {a} X." / "This is {a} X." | unchanged |
| `mass` | "I like X." / "I want some X." / "I can see X." | unchanged |
| `action` | "I can X." / "I like to X." | unchanged |
| `feeling` | "I am X." / "I feel X." | new |
| `occupation` | "He is {a} X." / "I want to be {a} X." | new |
| `family` | "This is my X." / "I love my X." | new |
| `body-part` | "This is my X." / "Touch your X." | new |
| `color` | "I like X." / "I can see X." / "It is X." | new |
| `number` | "I can count to X." | new |
| `the-noun` | "I like the X." / "I can see the X." | new |
| `sport` | "I like X." / "Do you like X?" | new |

**Table A - topic classes:** `g2-feelings` -> feeling; `g2-occupations` -> occupation; `g2-family` -> family; `g2-body-parts` -> body-part; `g2-colors` -> color; `g2-numbers` -> number; `g2-weather` -> the-noun; `g2-sports` -> sport. Every other topic uses the default (step 4).

**Table B - word-id overrides:** `chef` -> occupation (lives in `g2-kitchen`); `moon` -> the-noun (`g2-camping`); `ocean` -> the-noun, `fire` -> the-noun (`g2-nature`); `skateboard` -> countable (object noun; `countable` flag stays `false`, so counting generators are unaffected).

Occupation form: "He is {a} X." is the single third-person form (compatible with `policeman`); the neutral "I want to be {a} X." is the second template to avoid a gendered-only presentation. `Ruling: BA, satisfies the human "He/She is a X., pick one consistent form" instruction.`

**Existing words whose sentence set changes (exactly 71; every other existing word is byte-identical):**

| Topic | Words | New class |
|-------|-------|-----------|
| g2-colors (9) | red, orange, yellow, green, blue, purple, black, white, brown | color ("I want some X." removed, "It is X." added) |
| g2-family (7) | mom, dad, grandma, grandpa, sister, brother, baby | family |
| g2-feelings (6) | happy, sad, angry, scared, tired, surprised | feeling |
| g2-body-parts (7) | eye, ear, hand, foot, nose, mouth, leg | body-part |
| g2-numbers (10) | one, two, three, four, five, six, seven, eight, nine, ten | number |
| g2-occupations (11) | doctor, teacher, farmer, policeman, firefighter, pilot, astronaut, artist, builder, mechanic, scientist | occupation |
| g2-sports (13) | basketball, tennis, badminton, volleyball, golf, bowling, boxing, surfing, table tennis, baseball, hockey, swimming (sport); skateboard (override -> countable) | sport / countable |
| g2-weather (6) | sun, rain, cloud, snow, wind, rainbow | the-noun |
| g2-nature (2) | ocean, fire | the-noun (override) |

Rationale per group: each listed word produced at least one ungrammatical sentence under F-9 (for example "I want some doctor.", "I like eye.", "I can see sun.", "I want some basketball."). Words whose current sentences are all grammatical keep them: food/vegetable mass nouns, `water`, clothes plural-only nouns (`pants`, `glasses`, `sunglasses`), `scissors`, all countable nouns, all actions.

Accepted residual (grammatical but semantically plain, recorded): "I can count to one.", "I can see the wind.".

---

## 6. User stories and acceptance criteria

Conventions:
- EmojiVisual root exposes `data-emoji-visual="<emoji>"` and `data-emoji-mode="image|lottie|svg|native"` (normative test hooks).
- "in the browser" = Playwright Chromium against `vite preview` (production build) unless stated; "unit" = vitest + testing-library in jsdom with the Lottie player mocked.
- Reduced motion = `page.emulateMedia({ reducedMotion: 'reduce' })`.

### 6.0 Deliberate test update allowlist (constitution #2, #7)

Existing tests may change **only** in these categories. The Dev report lists every changed test with file:line and category.

| Cat. | What may change | Known sites |
|------|-----------------|-------------|
| T-1 | Round 1 composition: assertions that every Round 1 question is extra-letter, and Round 1 AC23 topic-spread assertions, become per-slice (Round 2 test pattern) | `src/lib/rounds/round1ExtraLetter.test.ts:7-11,39-62`; `src/App.test.tsx:116` |
| T-2 | e2e helpers that iterate every Round 1 question learn to answer `image-choice` (click `option-0`, read outcome from the FeedbackPanel headline "Chính xác! Giỏi quá!" / "Chưa đúng rồi, cố lên nhé!") and to skip it when searching extra-letter outcomes | `e2e/utils/batch-flow.ts:96-117`; `e2e/utils/mascot-flow.ts:43-81`; any spec calling `runExtraLetterRound` inherits the helper change |
| T-3 | Test fixtures of question objects gain the new additive fields (9.1); no assertion lines change | `src/components/questionCardFixtures.ts` and inline fixtures in generator/component tests |
| T-4 | New tests (additions), including new shared helpers such as "advance to the first Round 1 question of kind X" | any |
| T-5 | Tests that assume Round 1 question 1 (or any fixed Round 1 position) is extra-letter, broken by the shuffled Round 1 (D-10 A). Allowed fixes only: (a) advance to the first question of the needed kind with a T-4 helper, answering intervening questions structurally; (b) pin a documented seed whose needed position has the needed kind (seed choice commented with the reason); (c) branch on `data-question-kind`. The test's original assertion target (layout, timer, live score, scoring, feedback) must stay the same; weakening or removing an assertion is not allowed. | `src/App.test.tsx:106,195`; `src/components/BatchScreen.test.tsx:72`; `src/lib/batch/batchSession.test.ts:232-240`; e2e `batch-full-flow.spec.ts:46`, `points-scoring.spec.ts:36`, `responsive-layout-phone.spec.ts:44,60`, `responsive-layout-tablet-and-small-phone.spec.ts:36,49`, `round-live-score.spec.ts:32,50`, `round-timer.spec.ts:43,72`, `round1-extra-letter.spec.ts:37` |

Category IDs T-1..T-3 are kept stable (AC-1.5 references them); the first-question category is therefore T-5. Nothing else in an existing test file may be modified or deleted.

### US-1 [High] Consistent pictures on every device

**As a** học sinh lớp 2, **I want** every picture to look the same and sharp on any device, **so that** I recognize the word without confusion.
**Business value:** fixes D1. **Effort:** 5 SP.

```gherkin
Scenario: AC-1.1 Static render keeps the emoji as hidden text (A-04 Ruling B)
  Given EmojiVisual is rendered with emoji "🐱" and animated false
  When the component mounts
  Then the root has data-emoji-visual "🐱" and data-emoji-mode "svg"
  And it contains exactly one img with alt "" and aria-hidden "true" whose src is the same-origin Twemoji SVG for key "1f431"
  And it contains exactly one element with class "sr-only" whose only text node is "🐱"

Scenario: AC-1.2 Repeated render keeps one text node for the whole count
  Given EmojiVisual is rendered with emoji "🐱" and count 3
  When the component mounts
  Then it contains exactly 3 img elements with the same src
  And screen.getByText("🐱🐱🐱") resolves to the single sr-only element

Scenario: AC-1.3 Text layer is never hidden in a way that breaks toBeVisible
  Given any EmojiVisual in any render mode
  When its text-layer element is inspected
  Then it has no "hidden" attribute and does not set display none, visibility hidden, or opacity 0
  And its text contains no ASCII letters
  And the existing assertions getByText("🐱").toBeVisible() and getByText("🐱🐱🐱").toBeVisible() pass unchanged

Scenario: AC-1.4 All emoji pictures go through EmojiVisual
  Given ImageChoiceQuestion, ListeningImageChoiceQuestion, CountingImageQuestion (both directions), DescribeAndChooseImageQuestion, PicturePairMatchingQuestion, Mascot and FeedbackPanel (with a picture) are rendered with fixture data
  When every text node containing an Extended_Pictographic or keycap emoji is collected, excluding the BR-01 exceptions ("🔊 Nghe", "🔁 Nghe lại", arrows, and FeedbackPanel correctWord/explanation text)
  Then each such text node is inside an element with a data-emoji-visual attribute
  And PicturePairMatching word tiles render plain text while picture tiles render EmojiVisual

Scenario: AC-1.5 Existing test contract survives except allowlisted updates
  Given the test files that existed at commit ebd58a5
  When "npm test" and "npm run test:e2e" run after the change
  Then all pass
  And every modified line in those files belongs to a category T-1, T-2, T-3 or T-5 of section 6.0, and no test case is deleted

Scenario: AC-1.6 Every bank and mascot emoji has a bundled SVG (fitness test)
  Given the set of distinct emoji in ALL_WORDS plus "🐷", "✨", "🎉"
  When the asset fitness unit test maps each emoji to its key (BR-06)
  Then public/emoji/svg/{key}.svg exists for every emoji
  And the set includes "🐿️", "✈️", "1️⃣", "🔟", "🧑‍⚕️" and "🧑‍🍳"
  And the test fails listing every missing emoji otherwise

Scenario: AC-1.7 Missing or failed SVG degrades to the native glyph
  Given the request for an EmojiVisual SVG returns 404 or a network error
  When the img error event fires
  Then data-emoji-mode becomes "native", the img is removed and the emoji text is visible at the container font size
  And no broken-image icon is shown and the option stays clickable

Scenario: AC-1.8 Picture size matches the glyph it replaces
  Given in the browser an ImageChoice prompt (text-8xl; text-6xl when viewport height <= 420 px, Ruling DS-4), ListeningImageChoice option (text-6xl), CountingImage prompt (text-6xl) and DescribeAndChoose option (text-4xl)
  When each EmojiVisual img bounding box is measured
  Then its height equals the container computed font-size within 2 px (96 or 60 at short heights, 60, 60, 36 px)
  And repeated pictures wrap inside the option without horizontal overflow at 390 px viewport width

Scenario: AC-1.9 Mascot accessible names are unchanged
  Given Mascot in moods greeting, happy, encouraging, celebrating
  When its accessible name is queried
  Then it is exactly "Heo con vẫy chào", "Heo con vui mừng", "Heo con động viên", "Heo con ăn mừng"
  And data-testid "mascot" and data-mascot-mood are present as before

Scenario: AC-1.10 Rendering does not depend on OS emoji fonts
  Given in the browser the page font stack is overridden to a font without emoji glyphs
  When any question screen with emoji renders
  Then every EmojiVisual img has naturalWidth greater than 0 and data-emoji-mode is not "native"
```

### US-2 [High] Moving pictures where they help, calm pictures where I choose

**As a** học sinh lớp 2, **I want** the single big picture to move a little but answer choices to stay still, **so that** it is fun without distracting me.
**Business value:** P1 within A-03 and constitution #5/#6. **Effort:** 5 SP.

```gherkin
Scenario: AC-2.1 Animated render in a single-image context
  Given motion is allowed, EmojiVisual has emoji "🐶" and animated true, and a Noto Lottie exists for its key
  When it mounts in the browser
  Then data-emoji-mode is "lottie" with exactly one dotLottie canvas inside the root
  And the source is the same-origin file public/emoji/lottie/{key}.json, autoplaying and looping
  And the sr-only text node "🐶" is still present

Scenario: AC-2.2 No animation available means static, with no probing request
  Given EmojiVisual with animated true for "🧁" (not in the Noto set)
  When it mounts
  Then data-emoji-mode is "svg"
  And no request goes to any /emoji/lottie/ URL and the player code is not loaded because of this component

Scenario: AC-2.3 Grid and repeated contexts are never animated
  Given ListeningImageChoiceQuestion, CountingImageQuestion, DescribeAndChooseImageQuestion and PicturePairMatchingQuestion are rendered
  When all EmojiVisual roots inside them are inspected
  Then none has data-emoji-mode "lottie" and those components contain zero dotLottie canvases

Scenario: AC-2.4 ImageChoice prompt is an animated single-image prompt
  Given ImageChoiceQuestion with emoji "🐶", motion allowed, no approved photo for its wordId
  When it renders in the browser
  Then the prompt EmojiVisual has data-emoji-mode "lottie"
  And the 4 text option buttons are unchanged

Scenario: AC-2.5 Player is lazy-loaded
  Given a fresh browser session on the production build
  When the GradeSelect and StartBatch screens are shown
  Then no request is made for the dotLottie player chunk, any .wasm file, or any /emoji/lottie/ file
  And the entry JS chunk from "npm run build" does not contain the string "dotlottie"
  And the first such requests happen only after the first EmojiVisual with data-emoji-mode "lottie" mounts

Scenario: AC-2.6 WASM renderer is self-hosted
  Given a full Batch is played in the browser with motion allowed
  When all network requests are recorded
  Then the WASM renderer is fetched from the app origin
  And zero requests go to cdn.jsdelivr.net, unpkg.com or any other non-app origin

Scenario: AC-2.7 Reduced motion disables Lottie entirely
  Given the browser emulates prefers-reduced-motion reduce
  When ImageChoiceQuestion, FeedbackPanel (correct answer, with picture), RoundSummary and BatchSummary render
  Then every EmojiVisual has data-emoji-mode "svg" or "image"
  And no player chunk, .wasm or /emoji/lottie/ request is made
  And Mascot keeps "motion-reduce:animate-none"

Scenario: AC-2.8 Lottie failure falls back to static
  Given the .wasm or lottie JSON request is forced to fail
  When an animated EmojiVisual mounts
  Then within 3000 ms data-emoji-mode becomes "svg" and the Twemoji img is visible
  And no uncaught error or unhandled rejection is logged
  And the question remains answerable

Scenario: AC-2.9 Player cap per screen (advisory A-09)
  Given every screen of the live Batch flow, including an unanswered and an answered image-choice question and an unanswered and an answered extra-letter question
  When dotLottie canvases are counted
  Then before the question is answered there is at most 1 (the single-image prompt)
  And after answering there are at most 2 (reward moment: FeedbackPanel picture or image-choice prompt, plus the happy mascot accent)
  And on non-question screens (StartBatch, RoundSummary, BatchSummary, Credits) there is at most 1

Scenario: AC-2.10 Entry bundle budget is enforced (fitness check)
  Given "npm run build" has produced dist/
  When "node scripts/check-bundle-budget.mjs" runs
  Then it locates the entry JS and CSS files referenced by dist/index.html, gzips each with zlib level 9, and prints both sizes in kB
  And it exits 0 when entry JS gzip is at most 94.5 kB and entry CSS gzip is at most 5.0 kB, and exits 1 otherwise naming the file and excess
  And the Tester report records the measured sizes next to the baseline 84.46 kB / 3.96 kB
```

### US-3 [Medium] A mascot that celebrates with me (D-2 ruled A)

**As a** học sinh lớp 2, **I want** the pig mascot to look the same everywhere and to celebrate with sparkles and confetti, **so that** I feel rewarded.
**Business value:** reward loop (research 5.5). **Effort:** 3 SP.

```gherkin
Scenario: AC-3.1 Pig stays the same character in every mood
  Given Mascot renders in any mood
  When the pig glyph is inspected
  Then it is an EmojiVisual for "🐷" with data-emoji-mode "svg"
  And the Mascot root keeps its existing mood animation class (animate-mascot-wave, animate-mascot-pop, animate-mascot-calm, animate-mascot-celebrate) plus "motion-reduce:animate-none"
  And e2e mascot.spec.ts passes unchanged

Scenario: AC-3.2 Correct answer shows an animated sparkle without adding a row
  Given a correct answer so FeedbackPanel shows Mascot mood happy with size inline
  When it renders in the browser at 390x844 and 844x390
  Then the "✨" accent is an EmojiVisual with data-emoji-mode "lottie" sized to the inline mascot font size
  And the mascot and "Chính xác! Giỏi quá!" share one line (bounding boxes overlap vertically)
  And the existing responsive-layout e2e specs pass unchanged

Scenario: AC-3.3 Round and Batch summaries celebrate with animated confetti
  Given RoundSummary or BatchSummary is shown with motion allowed
  When it renders in the browser
  Then the "🎉" accent is an EmojiVisual with data-emoji-mode "lottie"

Scenario: AC-3.4 Moods without accents have no player
  Given Mascot in mood greeting or encouraging
  When it renders
  Then there is no accent element and no dotLottie canvas inside the Mascot
```

### US-4 [Medium] Safe, licensed real photos for the image bank

**As a** phụ huynh/giáo viên, **I want** every real photo to be checked by a person and to carry a free license with its author recorded, **so that** my child only sees appropriate pictures and creators are respected.
Actor: maintainer runs scripts; curator approves. **Effort:** 8 SP.

Normative commands (aligned with project-plan P2b and constitution C3): `npm run assets:emoji` -> `scripts/fetch-emoji-assets.mjs`; `npm run assets:images` -> `scripts/fetch-vocab-images.mjs` (stage 1); `npm run assets:images:publish` -> `scripts/publish-vocab-images.mjs` (stage 2); `node scripts/check-attribution.mjs` (C3). Staging directory `image-staging/` is git-ignored. Note for PM: project-plan P2b says the fetch script writes to `public/images/vocab/`; this PRD stages outside `public/` because constitution SAFE forbids unreviewed images there.

```gherkin
Scenario: AC-4.1 Openverse query is license- and safety-filtered
  Given the maintainer runs "npm run assets:images" for word "tent"
  When the script calls Openverse
  Then the request is GET https://api.openverse.org/v1/images/ with q "tent", license "cc0,by", page_size at most 20
  And there is no unstable__include_sensitive_results parameter and no API key
  And a User-Agent header names the project

Scenario: AC-4.2 Results outside the allow-list are discarded
  Given a result whose license is not "cc0" or "by", or whose license is "by" with an empty creator
  When the script processes results
  Then it is not downloaded, not written to image-staging/candidates.json, and counted as "rejected-license"

Scenario: AC-4.3 Stage 1 writes only to staging
  Given an accepted candidate for word id "tent"
  When stage 1 completes
  Then image-staging/tent.webp exists and image-staging/candidates.json has a record with reviewStatus "pending", reviewedBy null, reviewedAt null
  And nothing under public/ has changed

Scenario: AC-4.4 Images are normalized
  Given any file written by stage 1
  When inspected
  Then it is WebP, longer edge at most 512 px, size at most 80 KB, no EXIF or XMP metadata

Scenario: AC-4.5 Records carry full TASL attribution
  Given any record in candidates.json or in public/attribution.json images
  When validated against schema 9.2
  Then wordId, word, file, title, creator, license, licenseVersion, licenseUrl, sourceUrl, provider, openverseId, modified and reviewStatus are present
  And creator may be "unknown" only when license is "cc0"

Scenario: AC-4.6 Rate limits and resume
  Given HTTP 429 or rate headers showing 0 available
  When the script continues
  Then it waits per Retry-After or the rate headers, never exceeding 20 requests per minute
  And on re-run it skips word ids already in candidates.json and the summary counts each word once

Scenario: AC-4.7 Coverage report is written (D-4)
  Given stage 1 or stage 2 finishes
  When the report step runs
  Then docs/image-bank-coverage.md lists total words and, per topic: words, candidates found, approved, rejected, pending, no result, errors
  And it lists every word id without an approved photo, and the console prints the same totals

Scenario: AC-4.8 Third-party text is sanitized
  Given an Openverse title or creator containing U+2014, U+2013 or control characters
  When the record is written
  Then dashes become "-" and control characters are removed

Scenario: AC-4.9 Published image bank is consistent
  Given the committed repository
  When "node scripts/check-attribution.mjs" and the image bank unit test run
  Then every VocabWord with imageUrl points to an existing file under public/images/vocab/
  And that file has exactly one record with reviewStatus "approved", reviewedBy and reviewedAt set, license "cc0" or "by"
  And there are no orphan files and no orphan records, and the script exits 0 (non-zero with a list otherwise)

Scenario: AC-4.10 Build is offline and deterministic
  Given network access to api.openverse.org and fonts.gstatic.com is blocked
  When "npm run build" runs
  Then it succeeds and makes no request to those hosts

Scenario: AC-4.11 Publish enforces the human review gate
  Given candidates.json has records with reviewStatus "pending", "rejected" and "approved" (with and without reviewedBy/reviewedAt)
  When "npm run assets:images:publish" runs
  Then only reviewStatus "approved" records with reviewedBy and reviewedAt are copied to public/images/vocab/{wordId}.webp and appended to public/attribution.json
  And no script ever writes reviewStatus "approved"

Scenario: AC-4.12 Emoji asset script covers the bank and reports gaps
  Given the maintainer runs "npm run assets:emoji"
  When it finishes
  Then public/emoji/svg/ has one SVG per distinct bank and mascot emoji
  And public/emoji/lottie/ has one JSON per emoji present in the Noto set, keyed per BR-06, each at most 120 KB (larger files skipped and reported)
  And the console lists emoji without a Noto animation (about 150 of the 279 pre-existing emoji as of 2026-09-29)
```

### US-5 [Medium] Real photos when they exist, emoji when they do not

**As a** học sinh lớp 2, **I want** to see a real, clear photo of a word when the app has one, **so that** I connect the English word to the real object.
**Business value:** makes P2 visible (D-1 B + D). **Effort:** 5 SP.

```gherkin
Scenario: AC-5.1 Photo wins in the ImageChoice prompt
  Given word id "tent" has an approved imageUrl and an ImageChoiceQuestion has wordId "tent" and emoji "⛺"
  When it renders
  Then the prompt EmojiVisual has data-emoji-mode "image" with img src equal to that imageUrl
  And the sr-only text "⛺" is present and no dotLottie canvas is created for the prompt

Scenario: AC-5.2 Chain order without a photo
  Given a word without imageUrl
  When its single-image EmojiVisual renders with motion allowed
  Then data-emoji-mode is "lottie" if a Noto Lottie exists for its key, otherwise "svg"

Scenario: AC-5.3 Photo load failure advances the chain
  Given the imageUrl request fails
  When the img error fires
  Then the EmojiVisual continues with "lottie" or "svg" per BR-04 without leaving an empty box

Scenario: AC-5.4 Listening options use photos all-or-nothing
  Given a ListeningImageChoiceQuestion whose 4 optionWordIds all have approved imageUrl
  When it renders
  Then all 4 option EmojiVisuals have data-emoji-mode "image"
  Given instead that at least one of the 4 optionWordIds has no approved imageUrl
  When it renders
  Then all 4 option EmojiVisuals have data-emoji-mode "svg"
  And in both cases each option's textContent is still its emoji

Scenario: AC-5.5 Repeated contexts and pair-matching never show photos (Ruling D-9)
  Given every word in a fixture has an approved imageUrl
  When CountingImageQuestion, DescribeAndChooseImageQuestion and PicturePairMatchingQuestion render (question body only, FeedbackPanel excluded; see AC-10.5)
  Then no EmojiVisual inside them has data-emoji-mode "image"

Scenario: AC-5.6 Photo resolution uses the payload word id, not the emoji
  Given words "sad" and "cry" share "😢" and only "cry" has an approved imageUrl
  When an ImageChoiceQuestion with wordId "sad" and emoji "😢" renders
  Then its prompt shows no photo
  When an ImageChoiceQuestion with wordId "cry" and emoji "😢" renders
  Then its prompt shows the "cry" photo
  And no component resolves imageUrl by emoji or by topicId plus emoji (code check: the word visual module exposes only a wordId-keyed lookup)

Scenario: AC-5.7 Photo presentation
  Given any EmojiVisual in mode "image"
  When measured in the browser
  Then the img occupies the same square box as the SVG it replaces (AC-1.8 sizes), uses object-fit contain, has alt "" and aria-hidden "true"
  And the ImageChoice prompt and the FeedbackPanel picture load eagerly while ListeningImageChoice option photos use loading "lazy"

Scenario: AC-5.8 Questions carry word identity in additive fields
  Given generateImageChoiceQuestions, generateListeningImageChoiceQuestions, generatePicturePairMatchingBoards, generateExtraLetterQuestions, generateListeningSentenceFillBlankQuestions, generateDescribeAndChooseImageQuestions and generateCountingImageQuestions run over ALL_WORDS
  When every generated question is inspected
  Then each ImageChoiceQuestion.wordId, each entry of ListeningImageChoiceQuestion.optionWordIds, each PairMatchingPair.wordId, each ExtraLetterQuestion.wordId, each ListeningSentenceFillBlankQuestion.wordId, each entry of DescribeAndChooseImageQuestion.optionWordIds and each CountingImageQuestion.promptWordId is the id of an existing VocabWord
  And that VocabWord's emoji equals the emoji shown for it (ImageChoice emoji, options[i] or options[i].emoji, pair emoji, prompt.emoji) and its word equals the question's word text where one exists
  And all pre-existing fields (options, correctIndex, emoji, word, pairs, tiles, sentence, displaySentence, prompt, descriptionType, id) are unchanged versus commit ebd58a5 for the same input words

Scenario: AC-5.9 Word visual module
  Given the word visual module built from ALL_WORDS
  When getWordVisual(wordId) is called for every VocabWord id
  Then it returns that word's emoji and its imageUrl only when the word has an approved photo
  And it returns undefined for an unknown id, and the module is built once (no rebuild per render)
```

### US-6 [High] New words from my school textbook

**As a** học sinh lớp 2, **I want** to practice words from my SGK units, **so that** practice matches school.
**Business value:** SGK Tiếng Anh 2 alignment. **Effort:** 3 SP.

```gherkin
Scenario: AC-6.1 Exactly the specified new entries exist
  Given ALL_WORDS
  When compared to the table in section 7.1
  Then all 43 rows exist with identical id, topicId, word, plural (absent when "-"), emoji, countable and explanation
  And no other new ids exist beyond the 283 words present at commit ebd58a5, for 326 words total

Scenario: AC-6.2 New topics are registered
  Given TOPICS and getTopicsByGrade("grade-2")
  When inspected
  Then they include g2-party "Tiệc sinh nhật", g2-seaside "Bãi biển", g2-kitchen "Nhà bếp", g2-camping "Cắm trại"
  And getTopicsByGrade("grade-2") returns 28 topics and every new topic has at least 4 words

Scenario: AC-6.3 No new emoji collisions anywhere in the bank
  Given ALL_WORDS
  When emoji are grouped across all topics
  Then the only emoji used by more than one word are exactly "😢" (cry, sad), "🏊" (swim, swimming), "😴" (sleep, tired), "📖" (book, read)

Scenario: AC-6.4 Countable data is coherent
  Given every new entry
  When checked
  Then every countable true entry has a non-empty plural and every countable false entry has no plural field

Scenario: AC-6.5 No dashes in explanations
  Given ALL_WORDS
  When every explanation is scanned
  Then none contains U+2014 or U+2013

Scenario: AC-6.6 Generators accept the enlarged bank
  Given ALL_WORDS including the new entries
  When every Round pool generator runs (extra-letter, image-choice, listening sentence, listening image-choice, pronunciation, describe-and-choose, pair-matching)
  Then none throws and all generator and Round unit tests pass
  And every new countable true word is eligible for describe-and-choose count questions (countable gate)

Scenario: AC-6.7 New verbs use verb sentences
  Given the new words "slide" and "skate"
  When generateListeningSentenceFillBlankQuestions runs on them
  Then their sentences are exactly "I can slide." / "I like to slide." and "I can skate." / "I like to skate."

Scenario: AC-6.8 Existing words are not moved or changed
  Given the 283 words at commit ebd58a5
  When compared after the change
  Then each keeps its id, topicId, word, plural, emoji, countable and explanation

Scenario: AC-6.9 Flagged words are not added
  Given the flagged list in section 7.3
  When new entries are searched by word text
  Then none of the flagged words appears
```

### US-7 [Medium] Credits for images

**As a** phụ huynh/giáo viên, **I want** a page listing where pictures come from and their licenses, **so that** I trust the content and creators are credited.
**Business value:** CC-BY compliance (constitution #3, discovery D3). **Effort:** 3 SP. Entry point per D-3.

Exact UI copy (normative):

| Element | Vietnamese string |
|---------|-------------------|
| Entry button on GradeSelect | "Nguồn hình ảnh" |
| Credits heading (h1) | "Nguồn hình ảnh và giấy phép" |
| Intro paragraph | "Ứng dụng dùng hình ảnh miễn phí từ các nguồn dưới đây. Cảm ơn các tác giả!" |
| Back button | "← Quay lại" |
| Section heading, collections | "Bộ biểu tượng cảm xúc" |
| Section heading, photos | "Ảnh chụp trong kho ảnh" |
| Collection line | "{title} của {author}, giấy phép {licenseLabel}" |
| Photo line | "Ảnh \"{title}\" của {creator} cho từ \"{word}\", giấy phép {licenseLabel}, nguồn {provider}" |
| Modified marker (appended when modified true) | " (đã thay đổi kích thước)" |
| Unknown creator (cc0 only) | "không rõ tác giả" |
| Plain-text URL labels | "Giấy phép: {licenseUrl}" and "Nguồn: {sourceUrl}" |
| Empty photos state | "Chưa có ảnh chụp nào trong kho ảnh." |
| Load error | "Không tải được danh sách nguồn hình ảnh. Vui lòng thử lại sau." |

License labels: `cc0` -> "CC0 1.0"; `by` + version -> "CC BY {version}"; collections use their stored `licenseLabel`.

```gherkin
Scenario: AC-7.1 Entry point only on GradeSelect
  Given the GradeSelect screen
  When it renders
  Then a button "Nguồn hình ảnh" with data-testid "credits-link" is visible below the grade cards
  And no element with data-testid "credits-link" exists on StartBatchScreen, BatchScreen, any question, RoundSummary or BatchSummary

Scenario: AC-7.2 Open and leave Credits
  Given the GradeSelect screen
  When "Nguồn hình ảnh" is clicked
  Then the Credits screen shows h1 "Nguồn hình ảnh và giấy phép" and the intro paragraph
  When "← Quay lại" (data-testid "credits-back") is clicked
  Then GradeSelect is shown again

Scenario: AC-7.3 Emoji collections are credited
  Given public/attribution.json with collections "twemoji" and "noto-animated-emoji"
  When Credits renders
  Then under "Bộ biểu tượng cảm xúc" each shows "{title} của {author}, giấy phép CC BY 4.0", "Giấy phép: https://creativecommons.org/licenses/by/4.0/" and "Nguồn: {sourceUrl}" as text

Scenario: AC-7.4 Each approved photo is credited
  Given an image record with reviewStatus "approved" for word "tent" with modified true
  When Credits renders
  Then under "Ảnh chụp trong kho ảnh" a line matching the Photo line template for "tent" ends with " (đã thay đổi kích thước)"
  And license and source URLs are plain text

Scenario: AC-7.5 No outbound links for children
  Given the Credits screen
  When all anchors are collected
  Then none has an href to an origin other than the app origin, and every URL is non-interactive text

Scenario: AC-7.6 Empty photo list
  Given attribution.json has an empty images array
  When Credits renders
  Then "Chưa có ảnh chụp nào trong kho ảnh." is shown under the photos heading

Scenario: AC-7.7 Attribution file fails to load
  Given the request for /attribution.json fails
  When Credits renders
  Then "Không tải được danh sách nguồn hình ảnh. Vui lòng thử lại sau." is shown and "← Quay lại" still works

Scenario: AC-7.8 Credits is data-driven
  Given a test attribution.json with an extra collection titled "Test Set"
  When Credits renders
  Then a line for "Test Set" appears without code change

Scenario: AC-7.9 No dashes anywhere in shipped copy
  Given all files under src/ and public/attribution.json
  When scanned by the dash guard unit test
  Then no file contains U+2014 or U+2013

Scenario: AC-7.10 Credits is keyboard accessible
  Given GradeSelect
  When the user tabs to "Nguồn hình ảnh" and presses Enter, then tabs to "← Quay lại" and presses Enter
  Then Credits opens and closes, and both buttons show the existing focus:ring-4 style

Scenario: AC-7.11 Every asset directory is covered (constitution C3)
  Given the committed public/ directory
  When "node scripts/check-attribution.mjs" runs
  Then public/emoji/svg/ is covered by collection "twemoji", public/emoji/lottie/ by "noto-animated-emoji", and each file in public/images/vocab/ by an image record
  And it exits non-zero if any file lacks a record, any record points to a missing file, or any visual asset exists under src/assets (A-07)
```

### US-8 [High] Use the app online

**As a** phụ huynh/giáo viên, **I want** the upgraded app published at a public URL, **so that** my child can practice on any browser.
**Effort:** 2 SP.

```gherkin
Scenario: AC-8.1 Production is healthy and serves assets with correct types
  Given the human has confirmed go-live at the deploy gate
  When the build is deployed to Vercel production
  Then GET / returns 200
  And /attribution.json returns 200 application/json, one /emoji/svg/*.svg returns 200 image/svg+xml, one /emoji/lottie/*.json returns 200 application/json, the WASM renderer returns 200 application/wasm, and (if any photo is published) one /images/vocab/*.webp returns 200 image/webp

Scenario: AC-8.2 Production makes no third-party requests (constitution C4)
  Given E2E_BASE_URL is the production URL
  When an e2e flow runs GradeSelect -> Credits -> back -> Batch (all 4 Rounds) -> RoundSummary -> BatchSummary with network recording
  Then every request URL has the production origin
  And "grep -rE https?:// src/" hits only comments, attribution/copy string data, or explicitly allowlisted files

Scenario: AC-8.3 Quality gate before deploy
  Given the commit to be deployed
  When the deploy gate is evaluated
  Then "npm test", "npm run build", "node scripts/check-bundle-budget.mjs", "node scripts/check-attribution.mjs" and "npm run test:e2e" are green on that commit and the Tester report (with NFR-1 measurements) is attached

Scenario: AC-8.4 No go-live without human confirmation
  Given the human has not confirmed go-live
  When the Deployer phase runs
  Then only a preview deployment may be created and production is unchanged
```

### US-9 [High] Picture questions in my real practice (D-1 D)

**As a** học sinh lớp 2, **I want** to see a big picture and choose its English word during my practice, **so that** I learn words from pictures, not only from spelling.
**Business value:** makes the single-image prompt (animated/photo) visible in every Batch. **Effort:** 3 SP. Placement: D-10 A (human ruling, shuffled).

Implementation shape (normative, mirrors `buildRound2Questions` in `round2ListeningSentence.ts:39-52`): `buildRound1Questions(seed)` builds the extra-letter pool (`generateExtraLetterQuestions([...ALL_WORDS])`) and the image-choice pool (`generateImageChoiceQuestions([...ALL_WORDS])`), draws `ROUND_1_EXTRA_LETTER_COUNT = 7` via `stratifiedSample(..., 'round1-{seed}')` and `ROUND_1_IMAGE_CHOICE_COUNT = 3` via `stratifiedSample(..., 'round1-imgchoice-{seed}')`, concatenates, and orders them with `seededShuffleIndices(10, 'round1-mix-{seed}')` from `src/lib/prng.ts`. `ROUND_1_QUESTION_COUNT` stays 10 (`round1ExtraLetter.ts:7`); `batchSession.ts:102` already builds each Round via `definition.buildQuestions(seed)` with the Batch seed, so no batch, timer, round-definition, UI-routing (`QuestionCard.tsx` already handles `image-choice`) or scoring (`submitOptionAnswer` already scores it) change is needed. Return type becomes `Round1Question = ExtraLetterQuestion | ImageChoiceQuestion`.

```gherkin
Scenario: AC-9.1 Round 1 composition
  Given buildRound1Questions(seed) for any seed
  When the result is inspected
  Then it has exactly 10 questions: 7 of kind "extra-letter" and 3 of kind "image-choice", in an order produced by seededShuffleIndices(10, "round1-mix-{seed}")
  And ROUND_1_EXTRA_LETTER_COUNT is 7, ROUND_1_IMAGE_CHOICE_COUNT is 3, ROUND_1_QUESTION_COUNT is 10
  And the same seed yields the same 10 questions in the same order, different seeds vary selection and positions
  And across seeds "s1" to "s40" image-choice questions occur at more than one position, including at least once at position 1 (no fixed block). (Amended A-12, 2026-09-29: the original "s1 to s20" range was unverifiable - the seeded shuffle never places an image-choice at index 0 for s1..s20; s24 and s33 do. Seed range widened, intent unchanged.)

Scenario: AC-9.2 Each slice is topic-balanced (AC23 per slice)
  Given seeds "s1" to "s5"
  When buildRound1Questions runs
  Then the extra-letter slice spans at least min(eligible topics, 7) distinct topicIds and the image-choice slice spans at least min(eligible topics, 3)
  And the extra-letter slice keeps its sampling seed "round1-{seed}" and the image-choice slice uses "round1-imgchoice-{seed}"

Scenario: AC-9.3 Image-choice has exactly one correct option
  Given generateImageChoiceQuestions([...ALL_WORDS])
  When every question is inspected
  Then its 4 options are distinct word texts, exactly one equals the target word, and no distractor word has the same emoji as the target (BR-15)
  And for target "sad" no generated question lists "cry" as an option, and vice versa

Scenario: AC-9.4 Live image-choice prompt is a single-image context (position-agnostic)
  Given a live Batch in the browser with motion allowed, played through Round 1 by reading data-question-kind on each question
  When any Round 1 question with data-question-kind "image-choice" renders
  Then its prompt EmojiVisual has data-emoji-mode "image" if its wordId has an approved photo, else "lottie" if a Noto Lottie exists, else "svg"
  And exactly 3 of the 10 Round 1 questions have data-question-kind "image-choice"

Scenario: AC-9.5 Answering image-choice in a live Batch counts toward scores (position-agnostic)
  Given a live Batch playing all 10 Round 1 questions, answering extra-letter by letter-tile-0 and image-choice by option-0
  When each image-choice question is answered
  Then FeedbackPanel shows "Chính xác! Giỏi quá!" or "Chưa đúng rồi, cố lên nhé!" matching whether option-0 was correct, and live-score updates the same way as for other kinds
  And after the 10th question round-score-summary shows a correct count equal to the tallied outcomes of all 10 questions
  And clicking "Vòng tiếp theo →" on the RoundSummary advances the Batch to Round 2 as before

Scenario: AC-9.6 Tests are updated only as allowlisted
  Given the change is complete
  When the diff of existing test files is reviewed
  Then Round 1 related edits are limited to categories T-1, T-2 and T-5 of section 6.0, each listed in the Dev report with file:line
  And no Round 1 related test case is deleted, and every updated test still verifies its original behavior (e.g. a responsive-layout test that needs an extra-letter question advances to the first extra-letter question instead of assuming question 1)
```

### US-10 [Medium] See the picture of the right word after I answer (D-1 C)

**As a** học sinh lớp 2, **I want** to see a small picture next to the correct word after I answer, **so that** I link the word and its meaning even in spelling and listening questions.
**Business value:** reinforcement for text-only Rounds. **Effort:** 3 SP. Photos allowed: D-11 (human ruling 2026-09-29).

Picture source per kind (normative). QuestionCard resolves the correct answer's `wordId`, then calls `getWordVisual(wordId)` (word visual module, BR-05) to get `{ emoji, imageUrl? }`:

| Question kind | Picture shown | Correct-answer wordId |
|---------------|---------------|-----------------------|
| extra-letter | yes | `question.wordId` (additive, 9.1) |
| listening-sentence-fill-blank | yes | `question.wordId` (additive, 9.1) |
| listening-image-choice | yes | `question.optionWordIds[question.correctIndex]` (additive, 9.1) |
| describe-and-choose-image | yes | `question.optionWordIds[question.correctIndex]` (additive, 9.1; same parallel-array pattern as listening-image-choice) |
| counting-image | yes | `question.promptWordId` (additive, 9.1) |
| image-choice | no (the prompt already shows the same picture; keeps the A-09 cap) | - |
| picture-pair-matching | no (no single correct word) | - |
| pronunciation-recording | no (own feedback panel, no FeedbackPanel) | - |
| listening-fill-blank (legacy, not in a Round) | no | - |

Props: FeedbackPanel gains optional `picture?: { emoji: string; imageUrl?: string }`. FeedbackPanel stays presentational: it renders `<EmojiVisual emoji={picture.emoji} imageUrl={picture.imageUrl} animated />` inside the "Từ đúng là:" paragraph and does no lookup. When `picture` is absent, FeedbackPanel renders exactly as today. The picture follows the full single-image fallback chain (BR-04): approved photo -> lottie -> svg -> native.

```gherkin
Scenario: AC-10.1 Picture appears for the listed kinds only
  Given QuestionCard with an answered question of each kind in the table
  When FeedbackPanel renders
  Then for the 5 "yes" kinds a FeedbackPanel EmojiVisual exists whose data-emoji-visual equals getWordVisual(correct-answer wordId).emoji, and that emoji equals the emoji the question showed for the correct answer (where it showed one)
  And no FeedbackPanel EmojiVisual exists for image-choice, picture-pair-matching and listening-fill-blank

Scenario: AC-10.2 Picture sits on the "Từ đúng là:" line without a new row
  Given in the browser an answered extra-letter question with FeedbackPanel open at viewports 375x667, 320x568 and 844x390
  When the "Từ đúng là:" paragraph is measured
  Then the picture EmojiVisual is inside that paragraph, after the correct word span
  And its rendered height is at most the paragraph computed font-size (20 px, 16 px when max-height is 420 px)
  And the paragraph height is the same as without the picture within 2 px (no extra line)
  And responsive-layout-phone.spec.ts and responsive-layout-tablet-and-small-phone.spec.ts pass unchanged

Scenario: AC-10.3 Picture may animate, and respects reduced motion
  Given motion is allowed, the correct word has no approved photo and its emoji has a Noto Lottie
  When FeedbackPanel renders
  Then the picture has data-emoji-mode "lottie"
  Given instead prefers-reduced-motion reduce
  Then the picture has data-emoji-mode "image" (approved photo) or "svg", and no player request is made

Scenario: AC-10.4 Revealed-word extraction is unaffected
  Given an answered extra-letter question with the picture shown
  When the e2e helper extractRevealedWord reads answer-feedback text
  Then it returns the same word as without the picture

Scenario: AC-10.5 FeedbackPanel picture follows the full fallback chain (Ruling D-11, human)
  Given the correct word has an approved imageUrl
  When FeedbackPanel renders its picture
  Then data-emoji-mode is "image" with img src equal to that imageUrl, object-fit contain, inside the same inline box as AC-10.2
  Given instead the correct word has no approved imageUrl
  Then data-emoji-mode is "lottie" if a Noto Lottie exists and motion is allowed, else "svg"
  Given instead the photo request fails
  Then the picture advances to "lottie" or "svg", and to "native" if the SVG also fails, never leaving an empty box

Scenario: AC-10.6 Existing FeedbackPanel behavior is unchanged without a picture
  Given FeedbackPanel rendered without the picture prop
  When compared with commit ebd58a5
  Then its DOM and the answer-feedback testid rule are identical and FeedbackPanel.test.tsx passes unchanged, except that a line's tag may be <div> instead of <p> exactly when an EmojiVisual inside that line may mount its Lottie layer (headline when the happy accent is present, correct-word line when a picture is present) - required because DotLottieReact renders a block-level canvas wrapper that is invalid inside <p> (amendment A-13, 2026-09-29)
```

### US-11 [High] Sentences I hear are correct English (D-6)

**As a** học sinh lớp 2, **I want** every listening sentence to be correct English, **so that** I do not learn wrong grammar.
**Business value:** resolves fault class "câu hỏi vô lý" (constitution fault catalog). **Effort:** 3 SP.

```gherkin
Scenario: AC-11.1 Sentence class resolution follows BR-16
  Given the class tables in section 5.1
  When the generator resolves the class for every word in ALL_WORDS
  Then word-id overrides win, then g2-actions, then topic classes, then countable/mass
  And "chef", "moon", "ocean", "fire", "skateboard" resolve to occupation, the-noun, the-noun, the-noun, countable

Scenario: AC-11.2 Feelings produce "I am" sentences
  Given every word in g2-feelings (happy, sad, angry, scared, tired, surprised, excited, sick, cold, hot)
  When sentences are generated
  Then each word yields exactly "I am X." and "I feel X."

Scenario: AC-11.3 Occupations produce "He is a" sentences
  Given every word in g2-occupations plus "chef"
  When sentences are generated
  Then each yields exactly "He is {a} X." and "I want to be {a} X." with correct article ("an astronaut", "an artist")

Scenario: AC-11.4 Other new classes use their exact templates
  Given "mom" (family), "nose" (body-part), "red" (color), "seven" (number), "sun" (the-noun), "tennis" (sport), "moon" (override), "skateboard" (override)
  When sentences are generated
  Then they are exactly: "This is my mom." / "I love my mom."; "This is my nose." / "Touch your nose."; "I like red." / "I can see red." / "It is red."; "I can count to seven."; "I like the sun." / "I can see the sun."; "I like tennis." / "Do you like tennis?"; "I like the moon." / "I can see the moon."; "I have a skateboard." / "I can see a skateboard." / "This is a skateboard."

Scenario: AC-11.5 Unchanged words keep byte-identical sentences
  Given a snapshot of generateListeningSentenceFillBlankQuestions output for the 283 words at commit ebd58a5
  When the generator runs after the change on the same 283 words
  Then every word not in the 71-word change list of section 5.1 produces exactly the same questions (id, sentence, displaySentence)

Scenario: AC-11.6 The changed set is exactly the documented list
  Given the same snapshot comparison
  When the words whose question set differs are collected
  Then they are exactly the 71 words listed in section 5.1, no more and no fewer

Scenario: AC-11.7 Invariants hold for every sentence
  Given the generator output over ALL_WORDS
  When inspected
  Then blanking the word out of each sentence yields its displaySentence, all ids are unique, and every sentence ends with "." or "?"

Scenario: AC-11.8 Existing generator tests pass unchanged
  Given listeningSentenceFillBlank.test.ts (fixtures use topicIds "t-animals", "t-colors" and ACTIONS_TOPIC_ID)
  When "npm test" runs
  Then it passes with no modified lines
```

---

## 7. Content requirements: new vocabulary

Source: research doc 2.3, SGK Tiếng Anh 2 unit map. Explanation pattern: `<Vietnamese meaning> tiếng Anh là "<word>".` **43 new entries**; totals after change: **326 words, 28 topics**. All 43 are in scope (D-6 resolved; no conditional rows).

New topic declarations (D-5):

| File | Export names | Topic object |
|------|--------------|--------------|
| `src/data/vocabulary/party.ts` | `PARTY_TOPIC`, `PARTY_WORDS` | `{ id: 'g2-party', gradeId: 'grade-2', name: 'Tiệc sinh nhật' }` (SGK Unit 1) |
| `src/data/vocabulary/seaside.ts` | `SEASIDE_TOPIC`, `SEASIDE_WORDS` | `{ id: 'g2-seaside', gradeId: 'grade-2', name: 'Bãi biển' }` (SGK Unit 3) |
| `src/data/vocabulary/kitchen.ts` | `KITCHEN_TOPIC`, `KITCHEN_WORDS` | `{ id: 'g2-kitchen', gradeId: 'grade-2', name: 'Nhà bếp' }` (SGK Unit 7) |
| `src/data/vocabulary/camping.ts` | `CAMPING_TOPIC`, `CAMPING_WORDS` | `{ id: 'g2-camping', gradeId: 'grade-2', name: 'Cắm trại' }` (SGK Unit 16) |

Registered in `TOPICS` and `WORDS_BY_TOPIC` (`src/data/vocabulary/index.ts`, after `PLACES_TOPIC`); the "24 curated topics" doc comment becomes 28.

### 7.1 New entries (normative for AC-6.1)

`plural` "-" means the field is omitted. Column `class` is the resulting sentence class (5.1).

| # | id | topicId | word | plural | emoji | countable | explanation | class |
|---|----|---------|------|--------|-------|-----------|-------------|-------|
| 1 | present | g2-party | present | presents | 🎁 | true | Món quà tiếng Anh là "present". | countable |
| 2 | cupcake | g2-party | cupcake | cupcakes | 🧁 | true | Bánh nướng nhỏ tiếng Anh là "cupcake". | countable |
| 3 | lollipop | g2-party | lollipop | lollipops | 🍭 | true | Kẹo mút tiếng Anh là "lollipop". | countable |
| 4 | ribbon | g2-party | ribbon | ribbons | 🎀 | true | Cái nơ ruy băng tiếng Anh là "ribbon". | countable |
| 5 | pasta | g2-party | pasta | - | 🍝 | false | Mì Ý tiếng Anh là "pasta". | mass |
| 6 | pie | g2-party | pie | pies | 🥧 | true | Bánh nướng có nhân tiếng Anh là "pie". | countable |
| 7 | hot-dog | g2-party | hot dog | hot dogs | 🌭 | true | Bánh mì kẹp xúc xích tiếng Anh là "hot dog". | countable |
| 8 | bubble-tea | g2-party | bubble tea | - | 🧋 | false | Trà sữa trân châu tiếng Anh là "bubble tea". | mass |
| 9 | island | g2-seaside | island | islands | 🏝️ | true | Hòn đảo tiếng Anh là "island". | countable |
| 10 | seal | g2-seaside | seal | seals | 🦭 | true | Con hải cẩu tiếng Anh là "seal". | countable |
| 11 | jellyfish | g2-seaside | jellyfish | jellyfish | 🪼 | true | Con sứa tiếng Anh là "jellyfish". | countable |
| 12 | coral | g2-seaside | coral | - | 🪸 | false | San hô tiếng Anh là "coral". | mass |
| 13 | umbrella | g2-seaside | umbrella | umbrellas | ⛱️ | true | Cái ô che nắng tiếng Anh là "umbrella". | countable |
| 14 | swimsuit | g2-seaside | swimsuit | swimsuits | 🩱 | true | Đồ bơi tiếng Anh là "swimsuit". | countable |
| 15 | bucket | g2-seaside | bucket | buckets | 🪣 | true | Cái xô tiếng Anh là "bucket". | countable |
| 16 | palm-tree | g2-seaside | palm tree | palm trees | 🌴 | true | Cây cọ tiếng Anh là "palm tree". | countable |
| 17 | goggles | g2-seaside | goggles | - | 🥽 | false | Kính bơi tiếng Anh là "goggles". | mass |
| 18 | coconut | g2-seaside | coconut | coconuts | 🥥 | true | Quả dừa tiếng Anh là "coconut". | countable |
| 19 | spoon | g2-kitchen | spoon | spoons | 🥄 | true | Cái thìa tiếng Anh là "spoon". | countable |
| 20 | teapot | g2-kitchen | teapot | teapots | 🫖 | true | Ấm trà tiếng Anh là "teapot". | countable |
| 21 | chopsticks | g2-kitchen | chopsticks | - | 🥢 | false | Đôi đũa tiếng Anh là "chopsticks". | mass |
| 22 | jar | g2-kitchen | jar | jars | 🫙 | true | Cái lọ thủy tinh tiếng Anh là "jar". | countable |
| 23 | salt | g2-kitchen | salt | - | 🧂 | false | Muối tiếng Anh là "salt". | mass |
| 24 | sponge | g2-kitchen | sponge | sponges | 🧽 | true | Miếng bọt biển rửa bát tiếng Anh là "sponge". | countable |
| 25 | butter | g2-kitchen | butter | - | 🧈 | false | Bơ làm từ sữa tiếng Anh là "butter". | mass |
| 26 | ice | g2-kitchen | ice | - | 🧊 | false | Đá lạnh tiếng Anh là "ice". | mass |
| 27 | chef | g2-kitchen | chef | - | 🧑‍🍳 | false | Đầu bếp tiếng Anh là "chef". | occupation (override) |
| 28 | tent | g2-camping | tent | tents | ⛺ | true | Cái lều tiếng Anh là "tent". | countable |
| 29 | torch | g2-camping | torch | torches | 🔦 | true | Đèn pin tiếng Anh là "torch". | countable |
| 30 | compass | g2-camping | compass | compasses | 🧭 | true | La bàn tiếng Anh là "compass". | countable |
| 31 | map | g2-camping | map | maps | 🗺️ | true | Bản đồ tiếng Anh là "map". | countable |
| 32 | wood | g2-camping | wood | - | 🪵 | false | Gỗ, củi tiếng Anh là "wood". | mass |
| 33 | lantern | g2-camping | lantern | lanterns | 🏮 | true | Đèn lồng tiếng Anh là "lantern". | countable |
| 34 | moon | g2-camping | moon | - | 🌙 | false | Mặt trăng tiếng Anh là "moon". | the-noun (override) |
| 35 | boot | g2-camping | boot | boots | 🥾 | true | Giày bốt tiếng Anh là "boot". | countable |
| 36 | canoe | g2-camping | canoe | canoes | 🛶 | true | Chiếc xuồng tiếng Anh là "canoe". | countable |
| 37 | fishing-rod | g2-camping | fishing rod | fishing rods | 🎣 | true | Cần câu cá tiếng Anh là "fishing rod". | countable |
| 38 | slide | g2-actions | slide | - | 🛝 | false | Chơi cầu trượt tiếng Anh là "slide". | action |
| 39 | skate | g2-actions | skate | - | ⛸️ | false | Trượt băng tiếng Anh là "skate". | action |
| 40 | excited | g2-feelings | excited | - | 🤩 | false | Háo hức tiếng Anh là "excited". | feeling |
| 41 | sick | g2-feelings | sick | - | 🤒 | false | Bị ốm tiếng Anh là "sick". | feeling |
| 42 | cold | g2-feelings | cold | - | 🥶 | false | Cảm thấy lạnh tiếng Anh là "cold". | feeling |
| 43 | hot | g2-feelings | hot | - | 🥵 | false | Cảm thấy nóng tiếng Anh là "hot". | feeling |

Per-theme counts: party 8, seaside 10, kitchen 9, camping 10, playground actions 2, feelings 4. Countable true 26, false 17.

Content notes:
- `countable` reasoning follows existing comments: mass nouns and plural-only nouns false; people follow the occupations convention (false); verbs and feelings false; `moon` follows `sun`.
- `torch` is the Cambridge (British) form; `butter` says "Bơ làm từ sữa" to disambiguate from `avocado` ("quả bơ"); `umbrella` uses ⛱️ deliberately.
- Unicode 14/15 emoji (🪼, 🪸, 🫙, 🛝) are safe because EmojiVisual renders bundled Twemoji; AC-1.6 blocks the build if an SVG is missing.
- Accepted residual ambiguity: in ListeningImageChoice (distractors from `ALL_WORDS`), "cold" may co-occur with ❄️, "hot" with 🔥, "skate" with 🛹; emoji are distinct and the probability of such a pair per question is below 1.5%.
- New entries in `actions.ts` and `feelings.ts` are appended under `// SGK Tiếng Anh 2 gap additions (docs/sdlc/prd.md section 7).`

### 7.2 Gap-list words already covered (not re-added)

| Word (research 2.3) | Existing entry |
|---------------------|----------------|
| balloon | `toys.ts` 🎈 |
| cake | `food.ts` 🎂 |
| candle | `furniture.ts` 🕯️ |
| beach | `places.ts` 🏖️ |
| shell | `nature.ts` 🐚 |
| sun | `weather.ts` ☀️ |
| sea | covered by `ocean` 🌊 (`nature.ts`) |
| swim, run, climb | `actions.ts` |
| happy | `feelings.ts` |

### 7.3 Flagged words (constitution fault class "1 hình 1 nghĩa"; not added, BR-11)

| Word | Theme | Reason |
|------|-------|--------|
| party | party | 🎉 means "party popper" and is the Mascot celebrating accent; 🥳 reads as a happy face |
| birthday | party | Only representation is 🎂, bound to `cake` |
| confetti | party | 🎊 reads as a ball |
| clown | party | 🤡 carries a mocking connotation (content safety) |
| card / invitation | party | 💌 means love letter |
| gift | party | Synonym of `present` with the same 🎁 |
| sand | seaside | No emoji; 🏖️ bound to `beach` |
| wave (noun) | seaside | 🌊 bound to `ocean`; homonym of action `wave` 👋 |
| starfish | seaside | No emoji (⭐ is `star`) |
| sandcastle | seaside | 🏰 is a generic castle |
| cup | kitchen | ☕ reads as coffee/hot drink |
| plate | kitchen | 🍽️ shows three objects |
| fork | kitchen | 🍴 shows fork + knife |
| knife | kitchen | 🔪 weapon connotation (content safety) |
| bowl | kitchen | 🥣 includes a spoon (clashes with `spoon`) |
| pot | kitchen | 🍲 bound to `soup` |
| pan | kitchen | 🍳 bound to action `cook` |
| stove, fridge, kettle, oven | kitchen | No emoji |
| bottle | kitchen | 🍼 is a baby bottle |
| glass | kitchen | 🥃 alcohol connotation; 🥛 bound to `milk` |
| campfire | camping | 🔥 bound to `fire` |
| backpack | camping | 🎒 bound to `bag` |
| sleeping bag, binoculars | camping | No emoji |
| hut | camping | 🛖 "túp lều" too close to `tent` "cái lều" |
| swing | playground | No emoji |
| jump | playground | Existing ruling `actions.ts:10-11` |
| kick | playground | 🦵 bound to `leg` |
| throw, catch | playground | 🤾 ambiguous between the two |
| ride | playground | 🚴 reads as "bike/cycling", colliding with `bike` 🚲 |
| hungry | feelings | 😋 reads as "yummy" |
| thirsty | feelings | No emoji |
| sleepy | feelings | 😪 too close to `tired` 😴 |
| bored | feelings | 🥱 ambiguous (bored or sleepy) |
| shy, worried | feelings | No unambiguous face |
| funny | feelings | 😂 bound to action `laugh` |

Future note only (Ruling, human 2026-09-29: **not approved**, no CR): an "image-only word" model could someday relax BR-11 for flagged nouns with a clear photo.

---

## 8. Non-functional requirements

| ID | Requirement | Threshold / rule | ACs |
|----|-------------|------------------|-----|
| NFR-1 Performance | Entry bundle | Entry JS gzip <= 94.5 kB (baseline 84.46 + 10), entry CSS gzip <= 5.0 kB (baseline 3.96); enforced by `scripts/check-bundle-budget.mjs` | AC-2.10 |
| | Lazy player | dotLottie JS + WASM (~500 KB compressed) outside the entry chunk, loaded on first `lottie` mount | AC-2.5, AC-2.7 |
| | Per-asset size | SVG <= 20 KB; Lottie JSON <= 120 KB (else not bundled); photo WebP <= 80 KB, <= 512 px | AC-4.4, AC-4.12 |
| | Render time | `vite preview` local: from question container attached to all its EmojiVisual imgs `complete` with `naturalWidth` > 0, p95 <= 1000 ms across Round 1, Round 2 and Round 4 of one Batch | Tester perf report |
| | Animation start | First Lottie frame <= 2000 ms cold (incl. WASM), <= 500 ms warm, locally | Tester perf report |
| | Concurrency | <= 1 player per screen before answering, <= 2 after (A-09); one SVG request per distinct emoji per page load | AC-2.9 |
| NFR-2 Motion | `prefers-reduced-motion: reduce` | No players, no player downloads; Mascot `motion-reduce:animate-none` kept | AC-2.7, AC-3.1, AC-10.3 |
| NFR-3 Same-origin (A-05) | Zero third-party runtime requests; failures end at `svg` or `native` | AC-1.7, AC-2.6, AC-2.8, AC-5.3, AC-8.2 |
| NFR-4 License-clean | BR-08; BR-13; Twemoji source (`jdecked/twemoji` maintained fork or `twitter/twemoji`, both CC-BY 4.0 graphics) and version recorded in the collection record | AC-4.2, AC-4.5, AC-4.9, AC-7.11 |
| NFR-5 Attribution mechanism | `public/attribution.json` single source; Credits renders it; URLs plain text | AC-7.3..AC-7.8 |
| NFR-6 Content safety | No sensitive-results parameter; human review gate; single-meaning rule; one correct option per image-choice | AC-4.1, AC-4.11, AC-6.9, AC-9.3 |
| NFR-7 Accessibility | BR-02 text layer; Mascot names unchanged; picture sizes >= replaced glyph (prompt 96 px; 60 px when height <= 420 px per DS-4); Credits keyboard operable | AC-1.1..AC-1.3, AC-1.8, AC-1.9, AC-7.10 |
| NFR-8 Copy | No U+2013/U+2014 in `src/`, `public/attribution.json` | AC-6.5, AC-7.9 |
| NFR-9 Testability / TDD | RED before GREEN per AC; only allowlisted test edits (6.0); jsdom mocks the player; Playwright verifies real rendering | AC-1.5, AC-8.3, AC-9.6 |
| NFR-10 Maintainability | One component (BR-01); fitness checks fail on drift (AC-1.6, AC-2.10, AC-4.9, AC-7.11) | same |
| NFR-11 Language correctness | Round 2 sentences grammatical per 5.1; unchanged words byte-identical | AC-11.2..AC-11.7 |

---

## 9. Data contracts

### 9.1 Type changes (additive only; existing fields unchanged)

```ts
export interface VocabWord {
  // existing fields unchanged
  imageUrl?: string;   // NEW: "/images/vocab/{id}.webp", only for approved photos (AC-4.9); population mechanism per D-8
}

export interface ImageChoiceQuestion {
  // existing fields unchanged (id, topicId, kind, emoji, options, correctIndex, explanation)
  wordId: string;      // NEW: target VocabWord.id (photo resolution, AC-5.1)
}

export interface ListeningImageChoiceQuestion {
  // existing fields unchanged
  optionWordIds: readonly [string, string, string, string];  // NEW: parallel to options (AC-5.4)
}

export interface PairMatchingPair {
  word: string;
  emoji: string;
  wordId: string;      // NEW: identity only; photos never render in pair-matching (Ruling D-9); also enables CR-01
}

export interface ExtraLetterQuestion {
  // existing fields unchanged
  wordId: string;      // NEW: FeedbackPanel picture lookup (US-10)
}

export interface ListeningSentenceFillBlankQuestion {
  // existing fields unchanged
  wordId: string;      // NEW: FeedbackPanel picture lookup (US-10)
}

export interface DescribeAndChooseImageQuestion {
  // existing fields unchanged (options stay CountingImageOption[4])
  optionWordIds: readonly [string, string, string, string];  // NEW: parallel to options; FeedbackPanel picture (US-10)
}

export interface CountingImageQuestion {
  // existing fields unchanged
  promptWordId: string;  // NEW: VocabWord.id of prompt; FeedbackPanel picture (US-10)
}
```

The new fields are required in the types; existing fixtures gain them additively (category T-3). `CountingImageOption`, `PronunciationRecordingQuestion`, `PicturePairMatchingQuestion.tiles` are unchanged. `ListeningImageChoiceQuestion.optionWordIds` also serves the FeedbackPanel picture (`optionWordIds[correctIndex]`).

Word visual module (location per Tech Lead): `getWordVisual(wordId: string): { emoji: string; imageUrl?: string } | undefined`, built once from `ALL_WORDS` (AC-5.9). EmojiVisual props (normative behavior): `emoji: string`, `count?: number` (default 1), `animated?: boolean` (default `false`), `imageUrl?: string`; size follows the container font size (1em box).

### 9.2 `public/attribution.json`

```json
{
  "version": 1,
  "collections": [
    {
      "id": "twemoji",
      "title": "Twemoji",
      "author": "Twitter, Inc and other contributors",
      "license": "CC-BY-4.0",
      "licenseLabel": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
      "sourceUrl": "https://github.com/jdecked/twemoji",
      "version": "<exact release used>",
      "paths": ["/emoji/svg/"],
      "modified": false
    },
    {
      "id": "noto-animated-emoji",
      "title": "Noto Emoji Animation",
      "author": "Google",
      "license": "CC-BY-4.0",
      "licenseLabel": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
      "sourceUrl": "https://googlefonts.github.io/noto-emoji-animation/",
      "version": "<download date YYYY-MM-DD>",
      "paths": ["/emoji/lottie/"],
      "modified": false
    }
  ],
  "images": [
    {
      "wordId": "tent",
      "word": "tent",
      "file": "/images/vocab/tent.webp",
      "title": "<sanitized Openverse title>",
      "creator": "<sanitized creator, or 'unknown' only when cc0>",
      "creatorUrl": "<url or null>",
      "license": "cc0 | by",
      "licenseVersion": "<e.g. 1.0, 2.0, 4.0>",
      "licenseUrl": "<Openverse license_url>",
      "sourceUrl": "<Openverse foreign_landing_url>",
      "provider": "<Openverse provider>",
      "openverseId": "<uuid>",
      "modified": true,
      "reviewStatus": "approved",
      "reviewedBy": "<curator name>",
      "reviewedAt": "<ISO 8601 date>"
    }
  ]
}
```

`image-staging/candidates.json` uses the same image record shape with `reviewStatus` in {`pending`,`approved`,`rejected`}; `reviewedBy`/`reviewedAt` are null until the curator sets them. `public/attribution.json` contains only `reviewStatus: "approved"` image records.

### 9.3 Asset layout (BR-06, BR-07, A-07)

| Path | Content | Committed | Deployed |
|------|---------|-----------|----------|
| `public/emoji/svg/{key}.svg` | Twemoji SVG | yes | yes |
| `public/emoji/lottie/{key}.json` | Noto Lottie | yes | yes |
| `public/images/vocab/{wordId}.webp` | approved photos only | yes | yes |
| `public/attribution.json` | records | yes | yes |
| WASM renderer | self-hosted copy of `dotlottie-player.wasm` emitted by the build (not a visual asset; A-07 does not apply) | via build | yes |
| `image-staging/` | candidates + pending/rejected files | no (git-ignored) | no |
| `docs/image-bank-coverage.md` | coverage report | yes | no |
| `src/assets/` | forbidden for visual assets (A-07) | - | - |

---

## 10. Out of scope and CR backlog

Out of scope for this run:
- GIPHY rewards, backend, accounts (constitution intake ruling).
- Offline PWA / service worker (A-05).
- Pixabay source (A-02: later, key + Ruling).
- UI chrome emoji and emoji inside feedback text strings (BR-01 exceptions).
- Photos in PicturePairMatching and repeated contexts (Ruling D-9, BR-09).
- Image-only vocabulary words (not approved; future note in 7.3).

CR backlog (approved by human 2026-09-29, tracked in `docs/sdlc/cr-backlog.md`, not part of this run):
- CR-01 pair-matching emoji dedupe (was O-5).
- CR-02 accessible names for picture option buttons (was O-6).
- CR-03 phonics round (P3).

Absorbed into this run (no CR): topic-aware sentence templates (D-6, US-11); wiring `image-choice` into a Round (D-1 D, US-9).

## 11. Assumptions, dependencies, risks

| ID | Item | Mitigation / owner |
|----|------|--------------------|
| AS-1 | Noto Lottie downloadable from `fonts.gstatic.com/s/e/notoemoji/latest/{codepoint}/lottie.json` at maintainer time | Assets committed (BR-07) |
| AS-2 | Twemoji covers Unicode 15 (🪼) | AC-1.6 blocks build; fallback: drop the word with a Ruling |
| DEP-1 | Runtime dependency `@lottiefiles/dotlottie-react` (MIT code) | Tech Lead pins version |
| DEP-2 | Image processing devDependency (e.g. `sharp`) | Tech Lead ADR |
| DEP-3 | PM aligns project-plan WBS P2a (A-06 amended), P2b (staging outside `public/`), P2d (no pair-matching photos) | PM, before Tech Lead phase |
| RK-1 | Anonymous Openverse quota makes a full run span 2+ days | Resume (AC-4.6) |
| RK-2 | Low photo coverage makes all-or-nothing ListeningImageChoice photos rare | Coverage report prioritizes curation; ImageChoice prompt shows photos per word |
| RK-3 | `sr-only` 1x1 px text relies on Playwright treating it as visible | BR-02, AC-1.3 |
| RK-4 | 4 new topics shift `stratifiedSample` distribution | Accepted (D-5); AC23 tests stay green |
| RK-5 | `public/` grows ~6-9 MB | Within Vercel static limits; Tester reports total |
| RK-6 | Shuffled Round 1 (D-10 A) breaks tests that assume a fixed Round 1 position | Bounded by allowlist T-5 (6.0); AC-9.6 requires each updated test to keep its original assertion target |
| RK-8 | FeedbackPanel photo is small (inline, <= line font size) | Accepted by human ruling D-11; photo uses object-fit contain in the same inline box (AC-10.5) |
| RK-7 | 71 existing words get new sentences; any external content relying on old sentences changes | Exact list in 5.1; AC-11.5/11.6 snapshot guard |

---

## 12. RTM seed (AC -> scope item)

Scope items: S1 EmojiVisual + Twemoji + text layer; S2 animated layer; S3 image bank + fallback chain (incl. D-1 B); S4 vocabulary additions; S5 Credits; S6 Vercel deploy; S7 image-choice in live Round 1 (D-1 D); S8 FeedbackPanel correct-word picture (D-1 C); S9 topic-aware sentence templates (D-6).

| AC | Scope | Constitution / advisory | NFR | Story |
|----|-------|-------------------------|-----|-------|
| AC-1.1 | S1 | #2, A-04 | NFR-7 | US-1 |
| AC-1.2 | S1 | #2, A-04 | NFR-7 | US-1 |
| AC-1.3 | S1 | #2, #7, A-04 | NFR-7, NFR-9 | US-1 |
| AC-1.4 | S1, S8 | C2, discovery D4 | NFR-10 | US-1 |
| AC-1.5 | S1, S7 | #2, #7 | NFR-9 | US-1 |
| AC-1.6 | S1 | #3, #4 | NFR-10 | US-1 |
| AC-1.7 | S1 | #4, A-05 | NFR-3 | US-1 |
| AC-1.8 | S1 | #1 | NFR-7 | US-1 |
| AC-1.9 | S1 | #2 | NFR-7 | US-1 |
| AC-1.10 | S1 | discovery D1 | - | US-1 |
| AC-2.1 | S2 | A-01, A-03 | - | US-2 |
| AC-2.2 | S2 | #5 | NFR-1 | US-2 |
| AC-2.3 | S2 | #5, A-03, C5 | NFR-1 | US-2 |
| AC-2.4 | S2, S7 | A-03 | - | US-2 |
| AC-2.5 | S2 | #5, C5 | NFR-1 | US-2 |
| AC-2.6 | S2 | #4, C4 | NFR-3 | US-2 |
| AC-2.7 | S2, S8 | #6, C6 | NFR-2 | US-2 |
| AC-2.8 | S2 | #4, A-05 | NFR-3 | US-2 |
| AC-2.9 | S2, S7, S8 | #5, C5, A-09 | NFR-1 | US-2 |
| AC-2.10 | S2 | #5 | NFR-1 | US-2 |
| AC-3.1 | S2 | D-2, #2, #6 | NFR-2 | US-3 |
| AC-3.2 | S2 | D-2, #5 | NFR-1 | US-3 |
| AC-3.3 | S2 | D-2 | - | US-3 |
| AC-3.4 | S2 | D-2, #5 | NFR-1 | US-3 |
| AC-4.1 | S3 | #1, #3, A-02 | NFR-6 | US-4 |
| AC-4.2 | S3 | #3 | NFR-4 | US-4 |
| AC-4.3 | S3 | #1, SAFE | NFR-6 | US-4 |
| AC-4.4 | S3 | #5 | NFR-1 | US-4 |
| AC-4.5 | S3 | #3 | NFR-4, NFR-5 | US-4 |
| AC-4.6 | S3 | project-plan R4 | - | US-4 |
| AC-4.7 | S3 | project-plan R1, D-4 | - | US-4 |
| AC-4.8 | S3 | #8 | NFR-8 | US-4 |
| AC-4.9 | S3 | #3, C3, D-8 | NFR-4, NFR-10 | US-4 |
| AC-4.10 | S3, S6 | #4 | NFR-3 | US-4 |
| AC-4.11 | S3 | #1, SAFE | NFR-6 | US-4 |
| AC-4.12 | S1, S2 | #3, #4 | NFR-1, NFR-10 | US-4 |
| AC-5.1 | S3, S7 | fallback chain, A-06 amended | - | US-5 |
| AC-5.2 | S3, S2 | fallback chain | - | US-5 |
| AC-5.3 | S3 | #4, A-05 | NFR-3 | US-5 |
| AC-5.4 | S3 | D-1 B, A-03 | - | US-5 |
| AC-5.5 | S3 | D-9, research 5.2 | - | US-5 |
| AC-5.6 | S3 | A-06 amended, fault catalog | - | US-5 |
| AC-5.7 | S3 | #1 | NFR-1, NFR-7 | US-5 |
| AC-5.8 | S3, S7, S8 | A-06 amended | NFR-9 | US-5 |
| AC-5.9 | S3, S8 | A-06 amended | - | US-5 |
| AC-6.1 | S4 | Domain Pack (SGK), D-5, D-6 | - | US-6 |
| AC-6.2 | S4 | D-5 | - | US-6 |
| AC-6.3 | S4 | fault catalog, CR-01 | - | US-6 |
| AC-6.4 | S4 | fault catalog (countable) | - | US-6 |
| AC-6.5 | S4 | #8 | NFR-8 | US-6 |
| AC-6.6 | S4, S7 | #7, C9 | NFR-9 | US-6 |
| AC-6.7 | S4, S9 | fault catalog | NFR-11 | US-6 |
| AC-6.8 | S4 | discovery strategy ruling | - | US-6 |
| AC-6.9 | S4 | fault catalog | NFR-6 | US-6 |
| AC-7.1 | S5 | D-3, #1 | - | US-7 |
| AC-7.2 | S5 | #9 | - | US-7 |
| AC-7.3 | S5 | #3 | NFR-5 | US-7 |
| AC-7.4 | S5 | #3 | NFR-5 | US-7 |
| AC-7.5 | S5 | #1, D-3 | NFR-6 | US-7 |
| AC-7.6 | S5 | - | - | US-7 |
| AC-7.7 | S5 | #4, A-05 | NFR-3 | US-7 |
| AC-7.8 | S5 | #3 | NFR-5 | US-7 |
| AC-7.9 | S5 | #8 | NFR-8 | US-7 |
| AC-7.10 | S5 | #1 | NFR-7 | US-7 |
| AC-7.11 | S5, S1, S2, S3 | #3, C3, A-07 | NFR-4, NFR-10 | US-7 |
| AC-8.1 | S6 | intake ruling (Vercel) | - | US-8 |
| AC-8.2 | S6 | #4, C4 | NFR-3 | US-8 |
| AC-8.3 | S6 | #7 | NFR-1, NFR-9 | US-8 |
| AC-8.4 | S6 | strict mode go-live | - | US-8 |
| AC-9.1 | S7 | D-1 D, D-10 | - | US-9 |
| AC-9.2 | S7 | AC23 (topic balance) | - | US-9 |
| AC-9.3 | S7 | fault catalog (1 hình 1 nghĩa), BR-15 | NFR-6 | US-9 |
| AC-9.4 | S7, S2, S3 | A-03, BR-09 | - | US-9 |
| AC-9.5 | S7 | #7 | NFR-9 | US-9 |
| AC-9.6 | S7 | #2, #7 | NFR-9 | US-9 |
| AC-10.1 | S8 | D-1 C, A-06 amended | - | US-10 |
| AC-10.2 | S8 | #1, FeedbackPanel v9 constraint | NFR-7 | US-10 |
| AC-10.3 | S8, S2 | #5, #6 | NFR-2 | US-10 |
| AC-10.4 | S8 | #2 | NFR-9 | US-10 |
| AC-10.5 | S8, S3 | D-11, BR-04, BR-09 | NFR-3 | US-10 |
| AC-10.6 | S8 | #2, #7 | NFR-9 | US-10 |
| AC-11.1 | S9 | D-6 | NFR-11 | US-11 |
| AC-11.2 | S9 | D-6, fault catalog | NFR-11 | US-11 |
| AC-11.3 | S9 | D-6 | NFR-11 | US-11 |
| AC-11.4 | S9 | D-6 | NFR-11 | US-11 |
| AC-11.5 | S9 | #7 | NFR-11 | US-11 |
| AC-11.6 | S9 | #7 | NFR-11 | US-11 |
| AC-11.7 | S9 | - | NFR-11 | US-11 |
| AC-11.8 | S9 | #7 | NFR-9 | US-11 |

Coverage check (an AC may cover several scope items): S1 = 12, S2 = 19, S3 = 23, S4 = 9, S5 = 11, S6 = 5, S7 = 12, S8 = 11, S9 = 9. 89 ACs, 89 RTM rows (script-verified 1:1); every AC maps to exactly one story.

---

## 13. Rulings summary (all resolved)

| Decision | Outcome | Ruling |
|----------|---------|--------|
| D-1 Photo/animation visibility | B + C + D all approved (scope expansion) | Human, 2026-09-29 |
| D-2 Mascot animation | A (static 🐷 + Lottie ✨ 🎉) | Human, 2026-09-29 |
| D-3 Credits entry point | A (GradeSelect button, plain-text URLs) | BA provisional, not overridden |
| D-4 Coverage reporting | A (`docs/image-bank-coverage.md`, no gate) | BA provisional, not overridden |
| D-5 Vocabulary placement | A (4 SGK topics + append actions/feelings) | BA provisional, not overridden |
| D-6 Sentence grammar | Fix in-run (topic-aware templates, 5.1) | Human, 2026-09-29 |
| D-7 Offline meaning | Superseded by A-05 | Advisory A-05 |
| D-8 imageUrl population | Tech Lead ADR | Delegated |
| A-06 | Amended: emoji key for assets; additive word-id payload fields for photos | Human, 2026-09-29 |
| D-9 Pair-matching photos | Never; Twemoji only; WBS P2d narrowed by PM | Human, 2026-09-29 |
| D-10 Image-choice placement in Round 1 | A (7 extra-letter + 3 image-choice, seeded shuffle); allowlist T-5 | Human, 2026-09-29 (reversed BA provisional B) |
| D-11 FeedbackPanel photos | Allowed; full chain photo -> lottie -> svg -> native | Human, 2026-09-29 (reversed BA provisional) |
| A-09 Player cap | <= 1 per screen before answering, <= 2 after (AC-2.9) | Human (advisory A-09) |
| CR-01, CR-02, CR-03 | Approved as backlog items | Human, 2026-09-29 |
| Image-only words | Not approved; note only | Human, 2026-09-29 |

## 14. CR-03 delta: Phonics round (approved 2026-09-29)

CR-03 was approved for implementation in a follow-up CR run. Human
rulings at the requirements gate (all 2026-09-29):

| Decision | Outcome |
|----------|---------|
| D-Ph1 Data model | `initialSound` as derived phonics dimension (rule + exceptions table; no VocabWord field, baseline fixtures untouched) |
| D-Ph2 Question forms | Both directions: word->sound (`phonics-sound-choice`) and sound->word/picture (`phonics-word-choice`) |
| D-Ph3 Placement | Mixed into Round 4's pool (4 describe + 3 pair-matching + 2 sound-choice + 1 word-choice out of ~10), same pattern as D-10 |

### Phonics ACs (CR-03)

- AC-Ph1: `getInitialSound(word)` maps every bank word to a sound group
  key (`a`-`z` or digraph `ch`/`sh`/`th`), with an exceptions table for
  spelling-vs-sound mismatches (chef->sh, giraffe->j, circle->s,
  write->r, one->w; wh- collapses to w). Vowel-initial words are grouped
  by letter (eye->e, eight->e, umbrella->u) - the group key is a
  grouping label, and teaching vowel phoneme detail is out of scope.
  Distinct keys sharing one phoneme (c/k, both /k/) must be treated as
  equivalent in distractor logic via `soundsSharePhoneme`.
- AC-Ph2: phonics-sound-choice shows the word + picture + TTS and offers
  4 distinct sound options; the correct one equals getInitialSound(word);
  distractor sounds always exist in the bank; no distractor may share a
  phoneme with the answer (c/k equivalence).
- AC-Ph3: phonics-word-choice shows/speaks the sound (utterance
  "key, as in example-word" so TTS does not read a bare letter name) and
  offers 4 picture options of which exactly one word starts with that
  sound or an equivalent phoneme; all 4 option emojis are distinct;
  optionWordIds parallel options (AC-5.8 pattern).
- AC-Ph4: Round 4 draws 2 sound-choice + 1 word-choice per Batch
  alongside 4 describe + 3 pair-matching, topic-stratified and seeded.
- AC-Ph5: Both kinds answer via the shared option-submit path, show
  FeedbackPanel with the correct word picture, and announce picture
  options via emoji aria-label (CR-02 pattern); phonics-word-choice reuses
  the all-or-nothing photo group (AC-5.2/5.3).

## 15. CR-06 delta: Phonics nang sau - final sounds, blends, rhyming (intake 2026-09-29)

CR-06 extends the phonics dimension (CR-03, section 14) with three new
phonics skills. Human request 2026-09-29: "trien khai CR: phonics nang
sau (am cuoi/blend/rhyming)". BA analysis below; rulings marked.

### 15.1 Data model (derived dimensions, same D-Ph1 pattern)

No VocabWord field changes; the bank and baseline fixtures stay
untouched. Three new pure-derivation modules under `src/lib/phonics/`:

- `finalSounds.ts` -> `getFinalSound(word)`: the last sounded
  consonant/digraph of the word's final token. Default rule = last
  letter; silent-e endings strip the trailing 'e' and re-derive
  (cake->k, five->v, slide->d, grape->p, kite->t); ending digraphs win
  over single letters (sh, ch, th, ng, ck->k); doubled endings collapse
  to the single letter (-ll->l, -ss->s, -ff->f, -zz->z). Exceptions
  table for the bank's remaining spelling-vs-sound mismatches
  (mouse->s, juice->s, house->s via the -se/-ce->s rule; giraffe->f;
  orange->j). Vowel-final words group by the final vowel letter, same
  grouping-label convention as AC-Ph1.
- `blends.ts` -> `getInitialBlend(word)`: the leading consonant cluster
  of the first token (2- or 3-letter), or null. Bank audit 2026-09-29:
  61 of 326 words carry a blend across 21 clusters: bl, br, cl, cr, dr,
  fl, fr, gl, gr, pl, pr, sc, sk, sl, sn, sp, st, str, sw, tr, tw.
- `rhymes.ts` -> `getRhymeGroup(word)`: the rime family the word belongs
  to, keyed by its spelled ending (e.g. 'ake', 'ook', 'at', 'uck'), or
  null when no other bank word shares it. Rhyming is sound-based, so a
  corrections table removes spelling-matches that do not rhyme
  (juice -/-> dice/rice; mountain -/-> rain/train; scared -/-> red/bed)
  and an explicit family list may merge differently-spelled true rhymes
  if the bank contains any (none found in the 2026-09-29 audit beyond
  the corrections above). Bank audit: 58 families with >= 2 words
  (-ake snake/cake/pancake/cupcake, -all, -ear, -ook, -ite, -ree,
  -ket, -oon, -uck, -eep, -oat, -en, -ed, -oot, -at cat/hat, -og,
  -ish, -ant, -ger, -key, -olf, -use, -rot, -own, -ad, -her, -and,
  -ice dice/rice, -ain rain/train, -ing, -ock, -ion, -ter, -ple, -ar,
  -der, -nge, -rry, -ach...).

`Ruling: BA provisional - final-sound and blend/sound groups stay at
letter level (spelling-with-exceptions), consistent with AC-Ph1's
grouping-label convention; voiced/unvoiced pairs (-se as s not z) are
accepted residual at this level.` Human may override at gate.

### 15.2 Question kinds (additive)

- `phonics-final-choice`: prompt word + picture + TTS (speaks the word);
  4 text options, correct = getFinalSound(word); distractors from the
  bank's final-sound universe, none sharing a phoneme with the answer
  (same-phoneme exclusion reused from CR-03: a 'c' option can never
  appear beside a 'k' answer and vice versa; -ck->k words make 'k'
  answers common). UI = PhonicsSoundChoiceQuestion layout, prompt
  "Tu nay ket thuc bang am nao?".
- `phonics-blend-choice`: same layout; 4 blend options, correct =
  getInitialBlend(word); only generated for blend words; distractors
  are other blends present in the bank (never bare single letters -
  the skill is isolating the cluster). Prompt
  "Tu nay bat dau bang cum am nao?".
- `phonics-rhyme-choice`: prompt word + picture + TTS; 4 WORD-text
  options, exactly one shares the target's rhyme group; distractor
  words carry optionWordIds (AC-5.8 pattern) for the FeedbackPanel
  picture of the correct rhyming word. Options exclude the target word
  itself and any word sharing the target's emoji (BR-15-style: pictures
  are not the answer surface but identical emoji would confuse the
  feedback picture). Prompt "Nghe roi chon tu co van giong nhe!".

`Ruling: BA provisional - rhyme options are text words, not pictures:
rhyming is a sound+spelling skill for grades 2-3 and picture options
would hide the rime ending the child must compare.` Human may override.

### 15.3 Round 4 composition (options matrix)

| Option | Mix | Strengths | Weaknesses |
|--------|-----|-----------|------------|
| A | 3 describe + 3 pair + 4 phonics (1 sound + 1 word + 1 final + 1 blend-or-rhyme picked by seed parity) | Keeps 10 questions; all new kinds appear; describe share drops 4->3 | Blend vs rhyme alternates per Batch |
| B | 4 describe + 3 pair + 3 phonics drawn from all 5 kinds | Minimal change | A kind can vanish for a whole Batch |
| C | Bump Round 4 to 11-12 questions | Nothing lost | Breaks the ~10-question convention everywhere |

`Ruling: BA provisional A - every phonics skill surfaces in every
Batch and the total stays 10; describe drops to 3 (it is the kind
with the most per-question interaction cost already).` Human may
override at gate.

### 15.4 ACs (CR-06)

- AC-Pd1: getFinalSound maps every bank word to a final-sound key
  (letter or digraph) per the rule + exceptions; silent-e words resolve
  to the preceding sounded letter; -ck->k; -ng stays 'ng'; doubled
  endings collapse; a bank-wide test lists every exception-table word.
- AC-Pd2: getInitialBlend returns the cluster for all 61 blend words
  and null for non-blend words; bank-wide test proves the full list.
- AC-Pd3: getRhymeGroup partitions the bank into families; every word
  in a family rhymes in pronunciation (corrections table enforced:
  juice does not group with dice/rice, mountain not with rain/train);
  every >= 2 family is listed in the test.
- AC-Pd4: phonics-final-choice emits 4 distinct options, correct =
  getFinalSound(word), distractors exist in the bank's final-sound
  universe and none share a phoneme with the answer.
- AC-Pd5: phonics-blend-choice emits 4 distinct blend options for every
  blend word and none for non-blend words.
- AC-Pd6: phonics-rhyme-choice emits 4 word options where exactly one
  rhymes with the target, none is the target itself, optionWordIds
  resolve (AC-5.8 parity) and the FeedbackPanel picture is the correct
  rhyming word's.
- AC-Pd7: Round 4 draws 3 describe + 3 pair-matching + 4 phonics per
  ruling 15.3 A, topic-stratified and seeded; blend/rhyme slot
  alternates by seed so both appear across batches.
- AC-Pd8: all new kinds answer via the shared option-submit path, show
  FeedbackPanel with the correct word picture (final/blend: the
  prompt word's; rhyme: the correct option word's), and TTS drives the
  prompt (word for final/blend/rhyme; no bare-letter utterances -
  final-sound prompts read the WORD, not the sound key).
- AC-Pd9: e2e helper coverage for the three new kinds; no regression in
  the 588-test unit suite or the 49-test e2e suite.
