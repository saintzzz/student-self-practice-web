# External Review - Round 241 (codex)

Reviewer: codex (real external run). Scope: commit 23649f7, HEAD=23649f7.

1. [severity major] src/games/sources.ts:323 - Initial-sound matching compares keys instead of phonemes, marking valid answers wrong. G1 seed `audit76`, L2: target “cake”; both “kite” and “crayon” start /k/, but only “crayon” scores - Use `soundsSharePhoneme` for both mate and distractor selection; test exactly one valid answer.

2. [severity major] src/games/sources.ts:322 - Rhyme matching bypasses `rhymesWith` and its compound-containment guard. G1 seed `audit0`, L1 generates “notebook” → “book”, explicitly forbidden by the existing phonics rules and CR-147 - Use `rhymesWith` for mates while keeping same-family compounds out of distractors.

3. [severity major] src/games/sources.ts:343 - Territory exclusion is incomplete despite CR-147’s explicit gate. Actual pools still include `isle-of-man`, `jersey-island`, `puerto-rico`, `greenland`, `guam`, and `french-polynesia` - Use an audited eligibility allowlist or classification covering the entire flag bank; test all excluded territories.

4. [severity major] src/games/games/CountingShop.tsx:107 - The only counting prompt has alt text “Khay 1” / “Khay 2”; screen-reader users receive no object or quantity information and must guess - Provide equivalent accessible tray descriptions or individually exposed countable objects, and verify the complete flow with a screen reader.

