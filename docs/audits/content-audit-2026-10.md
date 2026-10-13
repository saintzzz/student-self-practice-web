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
