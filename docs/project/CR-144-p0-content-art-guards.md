# CR-144 - P0 Content + Art Guards

**Status:** shipped - review loop CLOSED (r224 CLEAN)
**Sources:** `docs/reviews/REVIEW-SYNTHESIS.md` (PM triage of teacher + designer + game-PO audits)
**Directive:** user approved full 4-CR plan ("làm hết đi")

## Scope

Cheap, high-stakes guards so children never hit an unanswerable question,
a wrong model sentence, or answer-leaking art. All size-S changes.

## Defect register

| ID | Source | Root cause | Fix |
|---|---|---|---|
| G1 | teacher C1 | `piñata`/`Åland` keep `ñ`/`Å` through `normalizeAnswer` -> typed "pinata" can never be correct | `TYPEABLE_WORD` regex guards both listening typing generators (`listeningFillBlank`, `listeningSentenceFillBlank`); `missingLetter` already ASCII-only |
| G2 | teacher C2 + PO G-2 | flagged vocab (`liar`, `villain`, `crazy`, `woozy`, `kiss`, `santa-claus`, `billiards`, `pinata`, `aland`, 4 badges) enters `gameWordPool` -> games generate "I want to be a liar" | `GAME_BLOCKED_WORDS` in `src/games/sources.ts` filters at the single pool entry point |
| G3 | teacher C2 | occupation/number template misfires: "I want to be a liar", "I can count to infinity/zero/hundred", "I am from the European Union", badge labels | `SENTENCE_BLOCKED_WORDS` (12 ids) -> `templatesForWord` returns [] -> cascades to `sentencesForWord` shared by listening fill-blank, word-order, missing-letter |
| G4 | teacher H8 | flag regions produce "I am from Taiwan/Hong Kong/Macau" | overrides -> `place-bare` frames ("I go to Taiwan"); Santa -> `sport` frames ("I like Santa Claus", no "He is a Santa Claus") |
| G5 | teacher H4 | `BLEND_EXCEPTIONS` empty: `two`->tw, `sword`->sw, `science`/`scissors`->sc asked as blends | exceptions -> null in `src/lib/phonics/blends.ts` |
| G6 | teacher H5 | silent-e rule strips PE->'p', karate->'t' (both end /i/) | `FINAL_SOUND_EXCEPTIONS` gains `pe`/`karate` -> 'e' (same vowel-ending convention as `chile`) |
| G7 | designer F-01 | 120 v6 science/math webp are placeholder cards with baked-in English labels that leak answers | `toExamQuestion` filters `v6/(science|math)/` asset paths -> text fallback; `v6/math-vi` SVG schematics kept (real diagrams) |
| G8 | designer F-02 | `PromptLine` `<img>` had no `onError` -> broken image icon above the question | hide image on error, fall back to text (mirrors `OptionImg`) |
| G9 | designer F-03 | per-option `getWordVisual` resolution -> 3 kawaii + 1 Twemoji mixed in one question | all-or-nothing hoist in `EmojiChoiceField` (mechanics.tsx) and `OddOneOut` - same law as `ListeningImageChoiceQuestion` |
| G10 | designer F-05/F-09 | TreasureChest renders toolbox emoji; FeedThePig renders generic pig while bespoke art exists | `games/treasure-chest.webp` + mascot poses `be-heo-idle`/`be-heo-celebrating` wired via `EmojiVisual imageUrl` |

## Files touched

- `src/games/sources.ts` (+ test)
- `src/lib/phonics/blends.ts`, `src/lib/phonics/finalSounds.ts` (+ tests)
- `src/lib/generators/listeningFillBlank.ts`, `listeningSentenceFillBlank.ts` (+ tests)
- `src/lib/qb/bank.ts` (+ test)
- `src/components/ExamScreen.tsx` (PromptLine)
- `src/games/mechanics.tsx`, `src/games/games/OddOneOut.tsx`
- `src/games/games/TreasureChest.tsx`, `src/games/games/FeedThePig.tsx`

## Out of scope (next CRs)

- CR-145: counting art wiring, image-choice art, emoji bypasses, 31MB dup cleanup
- CR-146: "Đường đèn lồng" core loop + star shop + pet stages
- CR-147: 3 new games (counting shop, rhyme, flag train - gated on topic fixes)

## Verification

- `tsc --noEmit` clean; `npm run build` green
- New pin tests: blend exceptions, PE/karate, TYPEABLE_WORD filter,
  sentence blocklist + flag/place-bare/Santa frames, v6 quarantine,
  game-pool blocklist
- External review loop: closed - r224 CLEAN
