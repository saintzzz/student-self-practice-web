# GAP-BANK-REVIEW - CR-82 gap word-bank topic review record

CR-82 (DESIGN-SPEC-v5 s13.5, ARCHITECTURE-v5 s6.3, handoff H-4): a topic
enters `GAP_BANK_TOPICS` (`src/lib/rounds/gapBankTopics.ts`) only after a
content review row exists here. The review checks the two halves of the
spec's content rule:

- *Plausible in isolation*: every same-topic distractor must read as a
  correct, natural sentence in the displayed stem - the V2 frame match
  (sentence class + article rule) plus the reviewed semantic group do the
  heavy lifting, and this table records WHY each topic is uniform enough
  for that to be safe.
- *Contradicted by the spoken sentence*: the item always plays the
  sentence audio (V7); V4/V5 keep out lookalike/soundalike options.

Reviewed: 2026-03 (M7). Reviewer discipline: same as Workstream A2
content review - read the actual word lists, check sub-field mixing,
record the decision. Coverage is reported by
`src/lib/rounds/gapBankCoverage.test.ts` (no minimum share required;
Spell-it carries the CR-82 drag acceptance).

| Row | Topic id | Decision | Rationale |
|-----|----------|----------|-----------|
| R-01 | `g2-animals` | ALLOW (no groups) | One semantic field (animals). All countable object nouns on the countable frame set; the article() rule splits "a cat" from "an owl/elephant" inside V2, so cross-article banks can never form. Canonical id also covers the shared G1 pets words (pick() keeps g2-animals topicIds). |
| R-02 | `g2-toys`, `g1-toys` | ALLOW (no groups) | One semantic field (toys/playthings). `drum` lives here rather than instruments but is still a holdable object in the same frame class - acceptable as a peer option. `yo-yo` (g1-toys) is hyphenated; legal for gap banks (V0-V7 pass normally). |
| R-03 | `g2-colors`, `g1-colors` | ALLOW (no groups) | Colour adjectives share the identical frame set ("I like ___", "I can see ___", "It is ___") so any same-topic pair is frame-valid; homophone `blue/blew` is in HOMOPHONE_PAIRS (blew is not in this topic, the pair is listed defensively). `pink` (g1-colors) is the only g1-canonical colour. |
| R-04 | `g2-food` | ALLOW (no groups) | One semantic field (food/drink). Mixes countable (egg, cake) and mass nouns (bread, rice, milk) - V2's frame match separates "I have a ___" from "I want some ___" so mass answers only ever pair with mass distractors. That IS the plausible-in-isolation rule working as designed. The G1 food unit is a pure pick() of g2-food (no g1-canonical ids). |
| R-05 | `g2-fruits` | ALLOW (no groups) | One semantic field (fruits). Countable nouns on countable frames; `pear` is protected by the `pear/pair` homophone pair and article() handles `an apple` correctly. |
| R-06 | `g2-numbers` | ALLOW (no groups) | Cardinal numbers share the single "I can count to ___" frame. Homophones four/for, two/too/to, eight/ate are listed; the non-number halves are outside the topic so banks remain fair. The G1 numbers unit is a pure pick() of g2-numbers (no g1-canonical ids). |
| R-07 | `g2-kitchen` | ALLOW with `groups` | The spec s13.5 worked example: utensils (`spoon`, `teapot`, `chopsticks`, `jar`, `sponge`) vs foods (`salt`, `butter`, `ice`) are different sub-fields - groups enforce same-field banks. `chef` is deliberately ungrouped (it is a person, never a fair gap option; V2's occupation frames already reject it). |
| R-08 | `g1-family`, `g2-family` | DEFER | Family terms share frames but carry parent/sibling semantics that are near-synonyms for young listeners (dad/father-style pairs); needs a dedicated pass to enumerate safe groups. Deferred - no bank ships from these topics. |
| R-09 | `g1-body`, `g2-body-parts` | DEFER | Body parts read naturally in "This is my ___" frames but singular/plural pairs (foot/feet irregulars, ear/ears) sit inside the topic; V4 covers declared plurals but irregulars need review. Deferred. |
| R-10 | `g2-feelings` | REJECT | Feelings are adjectives on "I am/feel ___" frames - distractors like happy/sad are plausible but semantically opposed in a way that invites guessing rather than listening comprehension at G1-2. Out of scope for the first review. |

## Notes

- Shared vocabulary keeps the canonical (earliest) `topicId`
  (`src/data/vocabulary/shared.ts`): the G1 unit words reused in G1
  topics carry `g2-*` ids, which is why the allowlist is mostly `g2-*`.
  Only `g1-toys` and `g1-colors` own canonical words today (`yo-yo`,
  `pink`); the other G1 units are pure pick() files.
- Adding a topic = a new row in this file + a `GAP_BANK_TOPICS` entry
  citing the row. A topic with semantic sub-fields MUST declare
  `groups`; ungrouped words in a grouped topic can never form a bank.
