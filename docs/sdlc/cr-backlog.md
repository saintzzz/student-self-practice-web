# CR Backlog - approved, not in the current run

- **Source:** human rulings of 2026-09-29 at the PRD gate (see `docs/sdlc/prd.md` section 4, section 10).
- **Status meaning:** `approved-backlog` = approved to exist as a separate change request; each CR enters the CR workflow (impact assessment -> estimate -> approval -> re-enter at BA) when scheduled. None is part of the visual content upgrade run.
- This file contains no em-dash or en-dash characters (constitution #8).

| ID | Title | Origin | Status |
|----|-------|--------|--------|
| CR-01 | Pair-matching emoji dedupe | PRD O-5 | approved-backlog |
| CR-02 | Accessible names for picture option buttons | PRD O-6 | approved-backlog |
| CR-03 | Phonics round (P3) | constitution intake ruling, research doc 2.2 / 6 | approved-backlog |

---

## CR-01: Pair-matching emoji dedupe

- **Problem:** 4 emoji are shared across topics: 😢 (cry, sad), 🏊 (swim, swimming), 😴 (sleep, tired), 📖 (book, read). `generatePicturePairMatchingBoards` draws 4 words via `stratifiedSample` (`src/lib/generators/picturePairMatching.ts:45`) without excluding duplicate emoji, so one board can show two identical picture tiles whose matches are indistinguishable.
- **Evidence:** PRD F-8; vocabulary scan at commit `ebd58a5`.
- **Proposed direction (for CR analysis, not decided):** exclude words whose emoji is already on the board when sampling pairs (same approach as `listeningImageChoice.ts:18-29`, which already excludes by emoji). `PairMatchingPair.wordId` added in the current run (PRD 9.1) gives the identity needed for tests.
- **Guard already in the current run:** PRD AC-6.3 prevents any new shared emoji beyond the 4 allowlisted pairs.
- **Domain fault class:** "1 hình 1 nghĩa" (constitution Domain Pack).

## CR-02: Accessible names for picture option buttons

- **Problem:** ListeningImageChoice option buttons contain only an `aria-hidden` span (`src/components/ListeningImageChoiceQuestion.tsx:53-55`), so screen readers announce no name. The current run keeps the EmojiVisual text layer inside that aria-hidden span (A-04 Ruling B), which neither worsens nor fixes this.
- **Evidence:** PRD O-6.
- **Proposed direction (for CR analysis, not decided):** give each option button an accessible name that does not reveal the answer in a listening question (for example a neutral "Hình 1".."Hình 4" label) and review the same pattern for PicturePairMatching picture tiles and DescribeAndChooseImage options.
- **Constraint:** must not break the DOM-text contract (constitution #2) or leak the answer word into accessible text.

## CR-03: Phonics round (P3)

- **Problem / opportunity:** each SGK Tiếng Anh 2 unit is tied to one phonics sound; the app has no phonics dimension.
- **Evidence:** research doc 2.2 ("Mỗi unit gắn 1 âm phonics"), 2.3 ("Phonics words theo chữ cái mở đầu"), 6 (P3 row); constitution intake ruling (P3 out of this run).
- **Proposed direction (for CR analysis, not decided):** an `initialSound` (or word -> phonics letter map) data dimension plus either a new Round kind or an extension of the extra-letter Round.
- **Dependencies:** benefits from the EmojiVisual layer and the SGK vocabulary added in the current run.

---

## Explicitly not in this backlog

| Item | Disposition |
|------|-------------|
| Topic-aware sentence templates (was PRD O-3) | Absorbed into the current run by human ruling D-6 (PRD US-11). No CR. |
| Wiring `image-choice` into a live Round | Absorbed into the current run by human ruling D-1 (PRD US-9). No CR. |
| Image-only vocabulary words (PRD 7.3 note) | Not approved (human, 2026-09-29). Future note only; no CR. |
| GIPHY rewards | Out of scope per constitution intake ruling; not requested as a CR. |

## CR-04: Vercel ignored build step for metadata-only commits

- **Problem:** every push to `main` auto-deploys, so commits that touch
  only docs/registry files burn a production build and churn deployment
  IDs (registry entry always lags the live one by design).
- **Evidence:** DevOps Lead review (Phase 7), minor finding 1.
- **Proposed direction (for CR analysis, not decided):** Vercel Project
  Settings -> Git -> Ignored Build Step:
  `git diff --quiet HEAD^ HEAD ./src ./public ./index.html package.json`

## CR-05: Branch protection + PR preview discipline

- **Problem:** dashboard import wired `main` directly to production; no
  staging/preview gate before merges.
- **Evidence:** DevOps Lead review (Phase 7), staging-first assessment.
- **Proposed direction (for CR analysis, not decided):** protect `main`,
  route changes through feature branches and Vercel Preview deployments
  for QA sign-off before merge.
