# CR Backlog - approved, not in the current run

- **Source:** human rulings of 2026-09-29 at the PRD gate (see `docs/sdlc/prd.md` section 4, section 10).
- **Status meaning:** `approved-backlog` = approved to exist as a separate change request; each CR enters the CR workflow (impact assessment -> estimate -> approval -> re-enter at BA) when scheduled. None is part of the visual content upgrade run.
- This file contains no em-dash or en-dash characters (constitution #8).

| ID | Title | Origin | Status |
|----|-------|--------|--------|
| CR-01 | Pair-matching emoji dedupe | PRD O-5 | resolved |
| CR-02 | Accessible names for picture option buttons | PRD O-6 | resolved |
| CR-03 | Phonics round (P3) | constitution intake ruling, research doc 2.2 / 6 | resolved |
| CR-04 | Vercel ignored build step | DevOps review Phase 7 | resolved |
| CR-05 | Branch protection + PR preview discipline | DevOps review Phase 7 | user-action-required |

---

## CR-01: Pair-matching emoji dedupe — RESOLVED

- **Problem:** 4 emoji are shared across topics: 😢 (cry, sad), 🏊 (swim, swimming), 😴 (sleep, tired), 📖 (book, read). `generatePicturePairMatchingBoards` draws 4 words via `stratifiedSample` without excluding duplicate emoji, so one board can show two identical picture tiles whose matches are indistinguishable.
- **Resolution (2026-09-29):** `pickBoardWords()` in `src/lib/generators/picturePairMatching.ts` checks the 4 drawn words for emoji collisions; on a collision it redraws deterministically from the full stratified order and keeps the first 4 unique-emoji words. Boards without a collision keep the original `stratifiedSample` output, so existing question pools are unchanged. Coverage: `picturePairMatching.test.ts` proves 4 distinct picture tiles per board on a collision fixture and on the full `ALL_WORDS` bank.
- **Guard already in the current run:** PRD AC-6.3 prevents any new shared emoji beyond the 4 allowlisted pairs.
- **Domain fault class:** "1 hình 1 nghĩa" (constitution Domain Pack).

## CR-02: Accessible names for picture option buttons — RESOLVED

- **Problem:** ListeningImageChoice option buttons contain only an `aria-hidden` span (`src/components/ListeningImageChoiceQuestion.tsx:53-55`), so screen readers announce no name.
- **Resolution (2026-09-29):** picture-bearing buttons now announce the *visible content* via `aria-label` - `ListeningImageChoiceQuestion` options announce their emoji, `DescribeAndChooseImageQuestion` options announce `emoji.repeat(count)`, and `PicturePairMatchingQuestion` picture tiles announce their emoji. This is the information-equivalent of what a sighted user sees, and since every option announces equally, nothing about the correct answer is leaked and the answer word never appears in an accessible name. This deliberately supersedes the "neutral Hình 1..4" proposal in the original analysis: neutral labels would leave screen-reader users with zero information and an unplayable task.
- **Coverage:** CR-02 tests in `ListeningImageChoiceQuestion.test.tsx`, `DescribeAndChooseImageQuestion.test.tsx`, `PicturePairMatchingQuestion.test.tsx`.

## CR-03: Phonics round (P3) — RESOLVED

- **Problem / opportunity:** each SGK Tiếng Anh 2 unit is tied to one phonics sound; the app has no phonics dimension.
- **Evidence:** research doc 2.2 ("Mỗi unit gắn 1 âm phonics"), 2.3 ("Phonics words theo chữ cái mở đầu"), 6 (P3 row); constitution intake ruling (P3 out of this run).
- **CR workflow:** entered the CR workflow after Phase 8 close; BA analysis plus human rulings D-Ph1..D-Ph3 (PRD section 14 delta) — derived `initialSound` dimension, both directions (word->sound and sound->word/picture), mixed into the Round 4 pool.
- **Resolution (2026-09-29):** `src/lib/phonics/initialSounds.ts` (rule + exceptions table, keys `a`-`z` plus digraphs `ch`/`sh`/`th`), `src/lib/generators/phonics.ts` (`buildPhonicsSoundChoice`, `buildPhonicsWordChoice`), components `PhonicsSoundChoiceQuestion` / `PhonicsWordChoiceQuestion`, and Round 4 composition now 4 describe + 3 pair-matching + 2 sound-choice + 1 word-choice (topic-stratified, seeded). Both kinds flow through the shared option-submit path and the all-or-nothing photo group pattern.
- **Coverage:** `initialSounds.test.ts`, `phonics.test.ts` (generators), `PhonicsSoundChoiceQuestion.test.tsx`, `PhonicsWordChoiceQuestion.test.tsx`, `QuestionCard.feedbackPicture.test.tsx` (AC-10.1 for both kinds), updated `round4DescribeAndChooseImage.test.ts` and `questionWordIds.test.ts` (AC-5.8 parity for phonics options).
- **Review:** lead review round 1 APPROVE_WITH_CHANGES (one->w exception; c/k same-phoneme equivalence via `soundsSharePhoneme`; utterance "c, as in cat"; small-pool null guard; QuestionCard coverage), round 2 APPROVE - see advisory A-19.

---

## Explicitly not in this backlog

| Item | Disposition |
|------|-------------|
| Topic-aware sentence templates (was PRD O-3) | Absorbed into the current run by human ruling D-6 (PRD US-11). No CR. |
| Wiring `image-choice` into a live Round | Absorbed into the current run by human ruling D-1 (PRD US-9). No CR. |
| Image-only vocabulary words (PRD 7.3 note) | Not approved (human, 2026-09-29). Future note only; no CR. |
| GIPHY rewards | Out of scope per constitution intake ruling; not requested as a CR. |

## CR-04: Vercel ignored build step for metadata-only commits — RESOLVED

- **Problem:** every push to `main` auto-deploys, so commits that touch
  only docs/registry files burn a production build and churn deployment
  IDs (registry entry always lags the live one by design).
- **Resolution (2026-09-29):** `commandForIgnoringBuildStep` set on the
  `ioe-leduyminh` Vercel project via REST API (CLI token):
  `git diff --quiet HEAD^ HEAD -- src public index.html package.json
  package-lock.json vite.config.ts tsconfig.json tailwind.config.js
  postcss.config.js` — pushes touching only docs/registry/e2e files now
  skip production builds.

## CR-05: Branch protection + PR preview discipline

- **Problem:** dashboard import wired `main` directly to production; no
  staging/preview gate before merges.
- **Evidence:** DevOps Lead review (Phase 7), staging-first assessment.
- **Proposed direction (for CR analysis, not decided):** protect `main`,
  route changes through feature branches and Vercel Preview deployments
  for QA sign-off before merge.
