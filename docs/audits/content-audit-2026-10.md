# Content Audit 2026-10 - English Arena

Scope: all vocabulary banks (569 words, g1-g5), sentence/question banks
(reading, reorder, grammar, science, IOE), ipaMap, generators, audio assets
(7,967 texts in ea-audio bucket).

## Method

- 4 exhaustive content audits (subagents, no sampling) covering every bank file.
- ipaMap + generators audit.
- Bucket coverage: HEAD all 7,967 sha1 urls.
- Audio integrity: STT-verify sample mp3s through production practice-transcribe.

## Results

### Audio assets
- Coverage: 7,967/7,967 exist (0 missing, 0 failed).
- Integrity sample: verified verbatim after fixes; `pepper.mp3` was a bad
  TTS render (STT heard "papapa") - regenerated via edge-tts and
  re-uploaded; prod STT now returns "Pepper".
- STT chain fixed: all 6 Gemini vault keys were pinned to retired model
  `gemini-2.5-flash-lite` (404) - `gemini_model` secret updated to
  `gemini-2.5-flash`. Intermittent 502s observed are free-tier RPM
  saturation, not content defects.

### Remediation status (all applied 2026-10-13)
- Vocab: bodyParts/weather countability + plurals, emoji fixes
  (post office 🏤, supermarket 🏪, scooter 🛵, wizard 🧙‍♂️, sale 💸),
  glosses (school festival, bandage), harbour spelling, people-word
  countable convention unified, g2 baseline amended for the 9 corrected
  entries, sanctioned same-emoji pairs updated.
- scienceQuestions: subject/article helpers (`a`/`an` by sound, proper
  nouns, mass nouns, pre-articled members), fill-in restricted to <=3-word
  answers with article/digit variants; permanent invariant tests added
  (scienceQuestions.test.ts).
- wordOrder: `acceptedWordOrders` covers adjunct fronting, medial-adverb
  fronting, subject-aux inversion (wh-guarded), conjunct swap; 10 new
  tests. qb/bank.ts scramble gained the rotation fallback.
- examSession.normalize: strips punctuation/hyphens, folds number words
  (four=4), so "hotdog"/"hot dog" both score.
- LSFB: article() sound-aware; new 'place-bare' (school/church/hospital)
  and 'routine-action' (brush teeth) classes.
- countingImageDistractors: prefers different-emoji distractor words.
- initialSounds: exceptions for christmas/thailand/giant/geography/
  cinema/cycle/photography/photographer + first-token lookup.
- finalSounds: exceptions autumn/headache + ey-words (key/hockey/honey/
  money/monkey -> 'e').
- ipaMap: 60 entries corrected/added via OVERRIDES table now baked into
  scripts/gen-ipa.py (reproducible).

### Round-2 remediation (lead-review follow-up, 2026-10-13)
- wordOrder hardening: forward inversion limited to be/modals at
  positions 1-2 with a pronoun/determiner subject (have/do-as-main-verb
  and subordinate-clause aux no longer invert); de-inversion requires a
  real `?`; conjunct swap restricted to bare nouns and skips fixed
  phrases/place names; adjunct fronting blocked inside noun phrases
  (determiner before head) and for be-complements unless passive/
  progressive ("was born in 2015" still fronts); medial-adverb list
  narrowed to usually/often/sometimes.
- Scramble free-point guard: wordOrder generators and qb/bank.ts retry
  while tiles land on ANY accepted order, not only the authored one.
- scienceQuestions: sun/moon moved out of MASS_NOUNS into THE_NOUNS
  ("The sun is a thing in the sky."), skin added to MASS_NOUNS.
- scienceQuestions.test: /i flag added, plus explicit assertions for bare
  sun/moon/sky subjects and mass-noun articles.
- examSession: text-answer keeps punctuation/number folding; listening +
  missing-letter now use normalizeSpelling (space/punct-insensitive, no
  number folding); practiceSession.normalizeAnswer aligned.
- LSFB: place-bare uses "I am in hospital."; routine-action keeps only
  routine-label frames ("It's time to brush teeth."); school-festival
  routed to the-noun.
- describeAndChooseImage negation: correct option must have a different
  emoji from the negated target.
- initialSounds: exceptions extended (celebrate, cyprus, genie, georgia,
  germany, gibraltar, ginger, phone, rhinoceros, wrestling, knot, euro,
  ufo, unicorn, x-ray); hourglass excluded from phonics entirely (no
  letter key carries its /au/ onset).
- finalSounds: -ey words reverted to 'y' (consistency with the -y group:
  baby/candy/turkey); added comb, sigh, tongue, mosque, martinique,
  mozambique, synagogue, chile.
- ipaMap: jersey -> ˈʤərzi, kiribati -> first-syllable stress (ˈkɪrɪbæs).
- Scope note: people-word countable convention unification and nurse
  removal from health/futureJobs picks are deliberate content decisions
  recorded here; g2 baseline snapshot amended for the 9 corrected rows
  only.

### Definite content defects (must fix)

Vocabulary:
1. bodyParts.ts:8-17 - all 7 body parts wrongly `countable:false`, no plural
   (eyes/ears/hands/feet/noses/mouths/legs are countable). Systematic.
2. insects.ts:18 - grasshopper uses cricket emoji 🦗 (teaches wrong insect).
3. weather.ts:10,13 - cloud, rainbow wrongly `countable:false`.
4. sports.ts:19 - `skateboard` (equipment) in sports-name topic; should be
   `skateboarding` or moved.
5. g3/sportsGames.ts:14 - `football` countable:true while sibling sports are
   all false (sport names don't pluralize).
6. g3/jobs.ts + g3/family.ts + g1/family.ts + g3/bodyParts.ts - countable
   inconsistency inside topics (picked shared words false, new words true).
7. g5/specialDays.ts:10 - `school festival` glossed "Hội trường" (means
   assembly hall). Fix: "Ngày hội trường".
8. g5/health.ts:17 - `bandage` glossed "Băng cá nhân" - nonstandard. Fix:
   "Băng gạc (băng dán)".
9. g5/places.ts:21 - `harbor` US spelling while bank is British (Global
   Success uses British). Fix: harbour/harbours.
10. Emoji mapping errors: post office 📮 (postbox) → 🏤; supermarket 🛒
    (cart) → 🏪; scooter 🛴 (kick scooter) → 🛵 motor scooter; palace 🏯
    (Japanese castle) vs castle 🏰 same topic; witch/wizard gender variants
    🧙‍♀️/🧙; nurse/dentist gender variants; g3/rooms.ts topic-name mismatch
    (8/11 entries are furniture, not rooms).

Question banks:
11. scienceQuestions.ts:75,91 - "Which one is a animal?" / "Which is NOT a
    insect?" - article hard-coded "a" for vowel-initial class labels.
12. scienceQuestions.ts:104-126 - "A ${member} is a ${label}" generates
    dozens of broken strings: "A Earth is a planet.", "A the Moon is a
    planet.", "A ant is a insect.", "A water is a liquid.", etc.
13. scienceQuestions.ts:57 - text-answer accepts exact string only: `the Sun`
    rejects `sun`; `four` rejects `4`.
14. scienceQuestions.ts fill-ins near-untypeable ("a round bright moon",
    "job that helps people").
15. reorderBank - ~27/32 sentences accept only authored order; valid
    alternates ("Usually, I get up...", "In the library she is reading...")
    marked WRONG. Systemic scoring defect in isWordOrderCorrect.
16. ioeBanks.ts:14,19,25 - spelling masks c_ _s / r_ _d / w_ _ter have 2-3
    valid completions among the options (cats/cuts/cots, read/reed/raid,
    winter/waiter).
17. ioeBanks.ts:60 - `dictation` option: letter T appears twice with
    different sounds - ambiguous pronunciation question.
18. grammarBank.ts:63 - "We ___ a picnic next weekend" - distractor `have`
    is valid English (scheduled future). Double correct answer.
19. grammarBank.ts:87 - `July` used as a girl's name - meant `Julie`.
20. scienceBank.ts:106 - clown/pirate as nonMembers of "job that helps
    people" - they are jobs.
21. scienceBank.ts:115 - `smoke` as gas member - aerosol, not gas.
22. scienceBank.ts:59 - `oxygen` distractor for plant gas question - plants
    do respire oxygen. Replace with nitrogen.
23. commonEnglishWords.ts - contains misspelling `alot` (ambiguity oracle can
    flag wrong).
24. qb/bank.ts:250 - reorder scramble can serve already-correct order after
    3 attempts (free point).

### Lower-priority / polish
- weather.ts sun/wind fine; furniture toilet gloss vs 🚽 emoji nuance;
  lamp 🪔, pumpkin 🎃 connotations; avocado/tomato in vegetables (standard);
  g3/g5 emoji near-duplicate pairs (bed/bedroom, fish/goldfish, tram/train);
  g5/stories topic-name covers non-characters; g5/tet festival 🎏 koinobori;
  g4/shopping sale 🈹 kanji button; stale comment in readingBank header
  (2 statements vs 3 for g45 passages).
- AC-6.3 emoji uniqueness passes; countable<->plural coherence passes;
  no en/em dashes; all glosses otherwise correct.

### ipaMap defects
25. ipaMap wrong IPA: read(red/past), kangaroo(missing r), spring(extra
    schwa), museum(wrong stress), myanmar, sri lanka(gibberish "ES-RA-I"),
    mauritius, lesotho, burundi, palau, kiribati("Kiribas"), "the dr congo"
    (DR expanded to "doctor"), english(missing g), tomato/vase(British under
    American header).
26. ipaMap malformed stress placement mid-cluster: swimming, swimsuit,
    snowboard, snowman, switzerland, sweden, smiling cat, music, confused,
    furious, slovakia, slovenia, guatemala, guadeloupe, bedroom, statue,
    potato.
27. ipaMap double-primary-stress: baseball, sightseeing, engineer, atm, cd,
    videotape, dna, ok sign/badge, taiwan.
28. ipaMap coverage gaps: nauru, niue, tokelau, czechia, tuk-tuk,
    pufferfish, mooncake, tempura, mahjong, pickaxe, sparkler, notepad,
    pinata, hina dolls, Faroe Islands, Aland, hibiscus, Jersey.
    "the DR Congo" key mismatch.

### Generator defects
29. describeAndChooseImage + listeningSentenceFillBlank article() is
    letter-based -> wrong articles in generated text: "an unicorn", "an
    UFO", "an euro", "a X-ray", "a hourglass", "a herb" (US pronunciation).
30. countingImageDistractors - ball/football share ⚽: distractor can render
    identical emoji to the prompt (2 correct answers, or unsolvable
    negation tile).
31. initialSounds.ts INITIAL_SOUND_EXCEPTIONS stale: Christmas→ch (=/k/),
    Thailand→th (=/t/), giant/genie/geography→g (=/dʒ/), cinema/cycle→c
    (=/s/), phone/photography/photographer→p (=/f/), wrestling→w (=/r/),
    knot→k (=/n/), hourglass→h (silent), unicorn/UFO→u (=/juː/), X-ray→x
    (=/ɛ/). Wrong "correct" answers AND soundalike distractors.
32. finalSounds.ts silent-letter misses: autumn(-mn→/m/), comb(-mb→/m/),
    sigh(-igh→/aɪ/), headache(-ache→/k/).
33. practiceSession answer match is strict - "hotdog" marked wrong vs
    "hot dog" (kids). Needs punctuation/hyphen/space normalization.
34. LSFB: "I go to the school/church" non-idiomatic; "I can brush teeth"
    should be "brush my teeth".

### Verified clean
- Bucket coverage 7967/7967; duration scales with text length (no blob
  swap). STT spot-check 12/13 verbatim correct; pepper.mp3 anomalous
  ("papapa" x2) - regenerate.
- imageChoice/listeningImageChoice/picturePairMatching distractor logic.
- phonicsDeep rhyme distractors, blends (wr/kn/gn correctly absent),
  rhymes overrides. count/negation There-is/are agreement.
- PronunciationRecordingQuestion/scoring target consistency.
- pairMatchingBoard state machine.

### Systemic finding
35. Prod STT provider chain is fragile: gemini key quota-exhausted (429),
    several keys pinned to retired model gemini-2.5-flash-lite (404),
    OpenRouter 402 no credit, OpenAI no credit. One key still works but
    margin is thin - unrelated to audio content.

## CR-82 - qb_questions ambiguity quarantine (2026-10-14)

Trigger: user hit "My mother is working on ___ -> Tuesday" with
Sunday/Wednesday/Monday as choices in advanced practice - a generator
family where multiple choices are simultaneously correct.

### Method

`scripts/qb-ambiguity-classify.mjs` - deterministic rule classifier over
4,000+ cloze candidates in 13 lexicon sets (animal, color, day, family,
food, job, misc, month, prep, room, season, sport, subject). Zero-error
doctrine: keep only when the prompt supplies a provable unique selector
(fact, agreement, sequence arithmetic, fixed collocation, asset marker,
or context-forced semantics); reject otherwise. False rejects accepted.

Iterated ~8 fix rounds on both keep-side and reject-side samples.
Notable correctness bugs fixed along the way:

- `pl.includes(a)` substring restatement matched 'in'/'on'/'at' inside
  "running", "watching", "badminton" -> false keeps. Now word-boundary.
- Blank formats ("___", " ______ ", "....") normalized to `_B_` before
  rule matching.
- `/after/` matched inside "afternoon" -> false keeps on "on ___ afternoon"
  items.
- Same-lemma verb-form branch returned early `false`, masking the
  progressive be-form agreement rule ("she ___ buying -> is").
- Generic a/an rule: "wants ___ engineer -> an" rejected by design - `the`
  and `some` are also grammatical completions.
- Gerund-unique rule required all-verb choices (kills "like ___? [book,
  flower, music, swimming]" false keeps).
- Copula `-ing` keep guarded by `to + base` rival presence.

### Results

| set | keep | reject |
|---|---|---|
| animal | 60 | 30 |
| color | 248 | 255 |
| day | 180 | 90 |
| family | 56 | 38 |
| food | 52 | 47 |
| job | 32 | 18 |
| misc | 509 | 898 |
| month | 200 | 18 |
| prep | 255 | 628 |
| room | 101 | 56 |
| season | 40 | 3 |
| sport | 23 | 7 |
| subject | 88 | 14 |
| **total** | **1,844** | **2,102** |

### Applied quarantine

Two batches, both `review_status='rejected'` + publication_policy flags
all false, idempotent (`!= 'rejected'` guard):

- Batch 1 (prep + lexical sets): 1,187 rows.
- Batch 2 (misc delta): 915 rows.
- Total unique rejected ids: 2,101 (reject-ids.json had 1 dup).

Verification (all green):

- DB rejected count = 2,101 = unique(reject-ids.json). 0 missing, 0 extra.
- `fetch_questions_public` mode=practice g1/g2/g3/g5: 200 served each,
  0 rejected leaked. mode=mock g3: 200 served, 0 leaked.
- No rejected row retains any `*Eligible` flag true (policy leak = 0).
- Workplace-prep items the user reported are in the rejected set.

### Remaining known gaps

- Reading/writing/reorder passages not yet run through this classifier
  (different shape - no MC answer key to adjudicate against).
- `g5-english-tpl-*` and `*-gs-*-cloze-*` families partially swept;
  template-level review pending.
- Explanation text (`explanation_vi`/`explanation_en`) not audited
  against final answers - separate check needed.

## Full-bank classifier sweep (96,910 rows)

`scripts/audit-qb.mjs` (repeatable gate, `--emit-sql` for quarantine
chunks, `--json` for the machine report) over `docs/qa/qb-export.json`:

- `selector()` extended from ~1,600 to ~3,700 lines: universal
  grammar/fact rules (agreement, tense cues, quantifiers, comparative/
  superlative, progressive, offspring tables, taxonomy, materials,
  job<->action/workplace/object maps, weather-wear, body-function,
  vehicle verbs/speed, measurements, VN landmarks/translations,
  gloss definitions, fixed collocations).
- Set-block ordering fix: `set === 'day'/'job'/...` rules no longer
  hard-return `false` before universal rules - decided-wrong answers
  still reject, undecidable stems fall through.
- All keep-rules gated on provably-unique choice (exactly-one-hit);
  doctrine rejects preserved (multi-ability animals, multi-emotion
  blanks, some/any, a/an/the ambiguity, image/count-dependent items).

Latest run: `pending-quarantine: 3,780 unique ids` (from ~8,434 first
count), `dup-choice: 9` (data bugs, need source fix),
`exact-dup: 1,243` warnings. Remaining pending sample = mostly genuine
open-cloze ambiguity (image-dependent, any-fits blanks) - correctly
held for quarantine.

### Final refinement + apply (completed)

Classifier rounds continued to pending `3,780 -> 3,869` net before
apply: batch-19 keep-rules (very-adj, coordinated adjectives,
environmental gloss `keep X clean` -> `not litter`, location->activity,
modal base-verbs minus irregular-past distractors) were offset by
rival-detection fixes that REJECTED previously-kept ambiguous items:

- `_B_ a game`: `watching/making/winning a game` now count as rivals
  (was only `play*`).
- PHYS table: `dog`/`cat` can `swim` - `My dog can ___ fast` with
  run/swim correctly rejects (canonical doctrine case).
- ROOM_ACT: `watch TV`/`movie` accept `bedroom` as rival - `watch TV
  in the ___` with living-room+bedroom choices rejects.
- Singular rule (`a _B_`): every rival must be a plural form -
  `a ___ flower` with `reddish`/`redly` rejects.
- Article rule now requires `a|an` ADJACENT to the blank (was firing
  on any `a`/`an` anywhere in the prompt - `wearing a shirt ___ the
  party` no longer keeps `for`).
- `is/looks _B_` emotion rule: non-EMO adjective rivals (e.g. `short`
  vs `proud`) count, so `My mom is ___` rejects.
- Food-object rule: eat-family verbs (`eating`, `making`, ...) are
  rivals, so `is ___ dinner` rejects.
- Wearable rows (OBJ_CTX + verb-object table) now include singular
  forms (`glove`, `boot`, `sandal`, ...) so `wearing a ___` rejects.
- `_B_ and <adj>`: -ing/-ed adjectives (exciting, tired, bored, ...)
  count as rivals.
- School-day rules treat Saturday as a plausible school day (VN
  context) - `go to school on ___` with Mon+Sat rejects.
- VEH table: animate subjects removed (dog/cat/baby/birds can do many
  generic actions - always ambiguous).

Quarantine applied to live DB (`scripts/qb-quarantine-apply.mjs
--apply`, chunk-verified, one retry-exhausted id re-patched manually):

- reject-ids.json = 3,869 pending ids; applied 3,869/3,869
  (0 missing, 1 transient patch failure re-applied: 204).
- DB `review_status='rejected'` total: **5,970** (2,101 earlier +
  3,869 new).
- `fetch_questions_public`: practice g1-5 english+math 500 rows, mock
  g1/g3/g5 180 rows - 0 rejected-id leaks. 0 rejected rows retain any
  `*Eligible` flag.
- The 9 dup-choice data defects fixed in DB (answer indices
  preserved): plural rows `cars.`/`boats.`/`dogs.`/`kites.`/`dolls.`/
  `balls.`/`planes.` trailing-dot dups replaced with possessive/`a X`
  distractors; `salad.`/`salad!`/`salad?` replaced with
  `salads`/`a salad`/`rice`; `although` (lowercase dup of `Although`)
  replaced with `But`.

Post-apply gate re-run on fresh export (93,041 published rows):
`pending-quarantine: 0`, `dup-choice: 0`, `exact-dup: 1,213` warnings
remaining (true duplicate rows - deletion is destructive and needs a
separate decision).

### Exact-dup resolution (completed)

1,213 exact-dup groups (same grade+prompt+choices+answer, different
ids) resolved by keeping one row per group (prefer `approved` status,
then earliest id) and soft-quarantining the 1,458 extras via the same
`qb-quarantine-apply.mjs --apply` path (reversible, no hard delete):

- `docs/qa/flagged/exact-dup-keep.json` = retained ids (1,213)
- `docs/qa/flagged/exact-dup-drop.json` = quarantined ids (1,458)
- apply result: 1,458/1,458, 0 missing, 0 failed
- Final audit on re-export (91,583 rows): **all checks clean** -
  0 dup-choice, 0 exact-dup, 0 pending-quarantine, 0 policy-leak.

### Sequence-rule sweep (completed during CR-82 external review)

The r34-r38 external review rounds added a `seqExpected` sequence-completion
rule to `scripts/qb-ambiguity-lib.mjs`. Re-auditing the published bank surfaced
28 new pending ids - single-anchor relative-position cloze items the run-based
rule could not prove. A follow-up `relExpected` pass (anchor+-1 before/after,
next-unit, ordinal position incl. VN school-week Mon..Fri, between-count, and a
single-category-member rule) rescued 23 with provably unique answers; the
remaining 5 are genuinely ambiguous (image-dependent `How many ___?` counts and
week-convention `first/last day` with both convention rivals among choices) and
were quarantined the same way (5/5, 0 missing, 0 failed).

- Re-export: 91,578 published rows - audit: **all checks clean**.
- Kept examples: "The day before Tuesday is ___" -> Monday, "The second month"
  -> February, "first day of the school week" -> Monday, "There are ___ days
  between Monday and Friday" -> three.
- Rejected (ambiguous): "The first/last day of the week" where Sunday+Monday or
  Saturday+Sunday coexist as convention rivals; "How many ___?" without image.

### Scene-grounding sweep (r41, after user-reported wrong answers)

Production report: "Is she swimming now?" marked "No, she isn't." wrong;
"Which picture shows 'goal'?" rendered with word options. Root cause was two
distinct defects:

1. The audit gate only adjudicated cloze (`___`) rows - non-cloze MCQs were
   never passed through the ambiguity classifier, so ~1.5k polar yes/no
   coin-flips (picture/scene-dependent prompts with both a grammatical Yes and
   No among choices) and picture/scene-dependent WH questions stayed published.
   Fix: new `sceneDependent()` gate in qb-ambiguity-lib.mjs covering bare
   picture refs, polar yes/no with non-generic subjects (deictic / pronoun /
   personal / definite-scene NP), wh-questions over deictic or scene subjects,
   bare "how many X" with no container, and "count the X" with no countable
   symbols. Exceptions preserved: annotated image stand-ins, quoted text,
   world-fact generics ("Is the sky blue?"), function/anatomy/conventional
   clauses, arithmetic riddles, emoji-count prompts, bounded how-many.
   Applied via qb-quarantine-apply: **3,133 ids quarantined, 0 missing, 0
   failed**. Re-export: 88,445 rows - audit **all checks clean**.
   RPC sweep (6 grade/mode draws, 1,200 served rows): 0 banned-id leaks.

2. `word-to-image-mcq` rows render choices as text when `asset_paths.length
   !== 4` - but qb_question_assets links extra distractor assets (e.g. 7 join
   rows for 4 options), so ~993 published w2i rows degraded to word buttons.
   Fix in `src/lib/qb/bank.ts`: `resolveOptionImages()` maps each choice's
   `assetId` to its file path by id stem (order-independent); positional
   fallback kept for legacy 4-string-choice rows. Data check: 0 approved
   image-type rows have missing choice assets - no quarantine needed.
