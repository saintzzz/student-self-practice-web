# CR-15 - Vocabulary bank expansion to ~2000 words

## Request

User ask: "claim '3000+' từ mở rộng ngân hàng từ bám SGK, Global Success..."

## Impact assessment / calibration

Bank invariants (bank.test.ts AC-6.x) make a literal 3000 unique-word
expansion infeasible at quality:

- Every word needs a clear, common, single-emoji representation; emoji are
  globally unique except sanctioned pairs (AC-6.3).
- The grade-2 bank is frozen (R-G2); additions must live under
  g1/g3/g4/g5 topics.
- FLAGGED_WORDS (words without a clean emoji) may never be added.

Realistic supply of emoji-representable primary vocabulary:

- Global Success G1-G5 core: ~600-700 words (bank already holds 524).
- Cambridge Starters/Movers/Flyers wordlists union: ~1400.
- Emoji glyph supply usable for kid vocabulary: ~1000-1200 distinct,
  plus ~190 country flags and 24 clock faces.

Decision (user, via Q&A): expand as far as quality allows (~2000 target),
claim the actual count - "2000+".

## Scope

- New helper `xp.ts`: compact tuple authoring
  `[id, word, plural, emoji, vnNoun, countable]` -> VocabWord with the
  standard explanation pattern, validating unique id/emoji at build time.
- New topic files under g1/g3/g4/g5 dirs (topicId `g[1345]-xp-*`),
  ~10-20 words per topic.
- index.ts registration of new topics.
- bank.test.ts AC-6.1 length assertion updated to the new count;
  AC-6.3 shared-emoji map must stay identical (all new emoji unique).
- Landing claim updated to the verified final count.
- Sales deck regenerated.

## Sources

- Global Success remaining words, Cambridge Starters/Movers/Flyers
  concrete vocabulary, country names (flags), times of day/clock faces,
  extended concrete nouns (animals, foods, objects, transport, roles,
  sports, clothes, nature, tech, furniture, signs).

## Acceptance

- `ALL_WORDS` length: expand as far as quality allows; landing claim set
  to `N+` with N = actual count (rounded down to the nearest hundred).
  Original target ">= 1500" was amended at ship time - see Result.
- All bank invariants green; no emoji collision outside sanctioned map;
  no FLAGGED_WORDS; every new topicId matches ^g[1345]-.
- tsc/lint/build/unit green; spot e2e unaffected.

## Result (ship review)

Final verified count: **1190 words** (524 baseline + 666 xp entries,
XP unique ids after dedup; landing claim "1100+").

Why not 1500/2000: the baseline bank already covered nearly all
emoji-representable primary vocabulary (animals, food, jobs, sports,
instruments, objects, transport, weather, clothes, tech). After two
authoring waves, the remaining usable emoji supply is exhausted -
further entries would be near-duplicates (same concept, variant glyph)
or words children cannot picture, exactly the "padding" the user
forbade. The emoji-unique invariant (AC-6.3) is the binding constraint.

What landed:

- 27 xp topics: animals, nature, objects (G1); animals, food, feelings,
  people/characters, sports, places, transport (G3); objects, tech,
  health, gestures, signs, clock faces incl. all 12 "half past",
  nature/weather, Europe flags (G4); Asia/Americas/Africa/Oceania flags
  covering every remaining UN member + major territories, advanced
  vocab (G5).
- Sentence classes extended: `time` class + templates, 30+ word
  overrides (verbs -> action, "a/an" misfires like UFO/euro/X-ray ->
  the-noun, female-coded roles -> countable to avoid "He is a
  policewoman", golfer -> occupation, hundred/zero/infinity -> number).
- fetch-emoji-assets.mjs now parses xp() tuples (both quote styles) and
  filters non-emoji captures; 1183/1183 word emojis vendored as
  self-hosted Twemoji SVGs, attribution.json regenerated.
- Wave-2 audit caught and fixed: duplicate ids (reunion -> reunion-island,
  dropped `family` dup), gloss errors (knot, ballet, bolt, lotion,
  party popper), `poo` removed (age-inappropriate), like/dislike ->
  thumbs up/down noun forms, all sign words reworded as countable
  "... sign" nouns, falafel plural/countable fixed.

Gates: 715/715 unit, tsc clean, vite build green, emoji assets
1183/1183 SVG. Spot e2e unaffected (new topics reuse existing kinds).
