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
| CR-06 | Phonics nang sau: am cuoi / blends / rhyming | human request 2026-09-29 | resolved |
| CR-07 | Full elementary coverage: grades 1-5 | human request 2026-09-29 | intake - pending rulings |
| CR-08 | Admin accounts + class enrollment + per-class RBAC | human request 2026-09-29 | intake - pending rulings |
| CR-09 | Designer-led UI/UX refresh (designer phase never ran for app-level look) | human request 2026-09-29 | resolved (deployed 5ae3bc2) |

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

---

## CR-06: Phonics nang sau - am cuoi / blends / rhyming - INTAKE

- **What changes:** extend the phonics dimension beyond initial sounds
  (CR-03) with three new phonics skills: (a) final/ending sounds
  (cat -> t, dog -> g), (b) consonant blends (bl-, st-, tr-, fl-...),
  (c) rhyming / word families (-at: cat, hat, bat; -og: dog, frog).
- **Why:** SGK Tiếng Anh ties each unit to phonics; deeper phonics is the
  natural next layer after CR-03's initial sounds and differentiates the
  product vs plain vocabulary apps.
- **Scope sketch:** new derived dimensions in `src/lib/phonics/` (final
  sound rule + exceptions; blend detection; rhyme-group map); new
  question kinds (TTS-driven, same shared option-submit path +
  FeedbackPanel picture pattern as CR-03); Round 4 pool re-composition
  or a dedicated phonics mix; full test + e2e coverage.
- **Impact assessment:**
  - Modules: `src/lib/phonics/*` (new files), `src/lib/generators/phonics.ts`,
    `src/types/index.ts` (new question kinds), `QuestionCard.tsx` routing,
    `round4DescribeAndChooseImage.ts` composition, component + e2e tests.
  - Data model: additive only (derived fields, same D-Ph1 pattern - no
    VocabWord field changes, baseline fixtures untouched).
  - RBAC matrix: none (no accounts yet).
  - Existing features: Round 4 ratios rebalance; phonics option-distractor
    rules (no same-phoneme distractors, distinct emoji) carry over.
  - Timeline: medium (1 phase run: BA -> Designer(light) -> Tech Lead ->
    Dev -> Tester).
- **Open rulings:** question-type set per skill (word->sound vs
  sound->word vs pick-the-rhyme); placement (extend Round 4 vs new
  phonics-only mode); grade-1 minimal-reading variant if CR-07 lands.
- **Resolution (2026-09-29):** implemented per PRD section 15 +
  design-spec section 13 + architecture section 9. New modules
  `src/lib/phonics/{finalSounds,blends,rhymes}.ts`,
  `src/lib/generators/phonicsDeep.ts`, components
  `PhonicsEndingChoiceQuestion` (final+blend) and
  `PhonicsRhymeChoiceQuestion`; Round 4 mix = 3 describe + 3 pair +
  4 phonics (sound/word/final + alternating blend-or-rhyme). Rhyme
  model is spelled-rime + audit-driven overrides (splits like
  mountain/rain, merges like two/shoe/blue->u-long) with containment
  exclusion. Unit suite 660/660, e2e 49/49, typecheck/build/
  attribution/bundle green; deployed via commit 996b801 (registry
  updated, production GET / -> 200 serving index-BhcXqFf2.js).
  Playwright pinned 1.55.0 for headless-shell-1187 on mac12 (A-22).

## CR-07: Full elementary coverage - grades 1-5 - INTAKE

- **What changes:** `GRADES` expands from `[grade-2]` to grade-1..5;
  vocabulary banks, topics and per-grade question pools for all five
  grades; batch generation scoped to the selected grade's words.
- **Why:** human requirement - the product must serve the whole primary
  cycle, not only lớp 2.
- **Scope sketch (research-grounded):** SGK Tiếng Anh Global Success
  (bộ sách phổ biến nhất): G1 ~16 units x 3-4 từ (~60 từ), G2 done (326
  từ, superset), G3 Starter + 20 units ~160-200 từ, G4 20 units ~200 từ,
  G5 20 units ~200 từ. New topic files per grade; per-grade pool wiring
  in round builders + createBatch; GradeSelect shows 5 cards.
- **Impact assessment:**
  - Modules: `src/data/vocabulary/*` (many new files), `index.ts`
    (GRADES, WORDS_BY_TOPIC), every `buildRound*` (pool param instead of
    global ALL_WORDS), `createBatch`, `GradeSelect`, `App.tsx`,
    bank/baseline tests, e2e helpers.
  - Content quality gates carried over: 1 hình 1 nghĩa emoji rule,
    countable->plural coherence, no dashes, topic-aware sentence classes
    (new topics need class entries in 5.1-equivalent tables).
  - Grade-1 caveat: ages 6-7, minimal reading - may need a lighter round
    mix (picture-first, no spelling rounds) - Designer/BA decision.
  - RBAC: interacts with CR-08 (per-class grade/topic assignment).
  - Timeline: large - content authoring is the bulk; recommend staged
    delivery (G1+G3 first or all-at-once per human ruling).
- **Open rulings:** textbook series (Global Success recommended vs
  Friends Plus vs theme-agnostic Cambridge); per-grade word counts;
  grade-1 round-mix simplification; reuse of existing topics across
  grades (e.g. g2-animals also serves grade-3) vs strict per-grade banks.

## CR-08: Admin accounts + class enrollment + per-class RBAC - INTAKE

- **What changes:** adds a backend + auth + admin console: admin creates
  student accounts, creates classes, enrolls students, and assigns
  content scope (grade/topics) per class; students log in and only see
  content assigned to their class.
- **Why:** human requirement - real deployment per class/teacher and a
  precondition for selling to schools.
- **Scope sketch:** Supabase (Auth + Postgres + RLS) recommended;
  username+password accounts for kids (admin-issued, no email);
  roles admin/teacher?/student; admin screens (users, classes,
  enrollment, content assignment); login gate before GradeSelect;
  GradeSelect filtered by assigned scope; progress tracking is NOT in
  this CR (separate CR if approved).
- **Impact assessment:**
  - Constitution amendment needed: non-negotiable #4 ("same-origin, zero
    third-party runtime") must be relaxed for Supabase API calls
    (auth + REST). Needs explicit human ruling.
  - Modules: new `src/lib/supabase/*`, auth screens, admin screens,
    router/screens in App.tsx, per-account content filter in
    getTopicsByGrade/round pools, env vars (VITE_SUPABASE_URL/ANON_KEY),
    Supabase migrations + RLS policies + seed.
  - Security: default-deny RLS; server-side role checks; child-safe
    login (no email, no PII beyond display name); secrets via env, never
    committed.
  - Existing features: unchanged for logged-out? (ruling needed:
    practice without login allowed or login required).
  - Timeline: largest CR (new subsystem + admin UI + security review).
- **Open rulings:** backend (Supabase vs other); roles matrix
  (admin+student only, or +teacher); login UX for kids (username+PIN);
  guest/anonymous practice allowed?; progress data collected now or later.

## CR-09: Designer-led UI/UX refresh - INTAKE

- **What changes:** run the missing Designer phase for the whole app
  look (the previous design-spec only covered EmojiVisual internals),
  produce a design brief + tokens + per-screen specs covering current
  screens and the new ones (login, admin), then apply to all screens.
- **Why:** human request - the app never got an app-level design pass;
  needed before marketing.
- **Scope sketch:** kid-friendly visual language anchored on
  Khan Academy Kids / Duolingo ABC (domain pack); design tokens
  (palette, type scale, spacing, radii, button/card patterns); screen
  specs: GradeSelect, StartBatch, question chrome, FeedbackPanel,
  summaries, Credits, plus new login/admin surfaces from CR-08.
- **Impact assessment:**
  - Modules: `src/components/*` (class restyling), `index.css`,
    `tailwind.config.js` (tokens), possibly `App.tsx` shells.
  - Tests: DOM contracts mostly styling-class based; snapshot-heavy
    tests may need allowlisted updates; a11y contrast checks.
  - Sequencing: design brief can run early (covers target state incl.
    CR-07/08 screens); applying it to current screens is cheapest after
    major features land to avoid double work - human ruling on timing.
  - Timeline: medium.
- **Open rulings:** timing (apply now vs after CR-07/08); keep 🐷 mascot
  and palette family vs full rebrand; any new illustration/mascot assets
  (license-clean sources only).

### CR-09 pipeline record (2026-09-30)

- BA delta: PRD section 16 (goals, non-goals, R-UI1..7, AC-UI1..6).
- Designer: design-spec section 14 (tokens, 8 screen specs, states,
  motion rules, a11y invariants, G1 readiness notes, rulings DS-U1..4).
- Tech Lead: architecture section 10 (token module, tailwind additions,
  font vendoring, file-by-file map, verification plan).
- Dev: tokens module + font + all screens restyled; fetch-emoji-assets
  extended (UI chrome emoji enumeration, foreign-collection preserve).
- Tester: 660/660 unit, gates green, visual QA found+fixed one
  portrait wrap defect; e2e record in test-report CR-09 section.
