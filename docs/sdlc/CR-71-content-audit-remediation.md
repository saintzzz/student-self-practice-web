# CR-71: Content audit remediation - vocabulary, question banks, scoring

Date: 2026-10-13
Origin: user request "verify lại toàn bộ chất lượng của nội dung, không bao
giờ được nhầm lẫn như vậy nữa. kể cả nội dung các câu đọc viết" after a
production incident where STT mishearing and content errors surfaced.

## Scope

Full-repo content verification (audit doc: docs/audits/content-audit-2026-10.md)
plus remediation of every confirmed defect:

- Vocabulary banks: countability correctness, emoji fidelity, glosses,
  spelling (harbour), topic consistency.
- Question banks: grammar/ioe/science answer-key defects, ambiguous
  spelling masks, dictation duplicates.
- Scoring: word-order alternates (adjunct fronting, inversion, conjunct
  swap), text-answer normalization, spelling-precision kinds.
- Generators: article selection by sound, emoji-collision guards,
  LSFB sentence classes, negation distractor uniqueness.
- Phonics: initial/final sound exception tables, hourglass exclusion.
- ipaMap: corrected entries + reproducible OVERRIDES in gen-ipa.py.
- Audio: pepper.mp3 regenerated; STT provider model fixed
  (gemini-2.5-flash-lite retired -> gemini-2.5-flash).

## Requirement-impact callouts (approval needed)

1. People-word countability unified to `countable:false` (friend, aunt,
   uncle, cousin, nurse, soldier, singer, football) to match the existing
   bank convention - "identities/roles are not counted" - which already
   governs the frozen g2 baseline rows.
2. `nurse` removed from g5/futureJobs and g5/health question picks where
   its emoji duplicated `doctor`/`dentist` visuals (same-emoji distractor
   defect). The word stays in the bank for non-image questions.
3. `school festival` re-glossed "Ngày hội trường"; `bandage` re-glossed
   "Băng gạc (băng dán)"; `harbor` respelled to British `harbour`.
4. g2 baseline snapshot amended for the 9 corrected rows only.

## Impact

- All content surfaces: practice rounds 1-4, exam pools, listening,
  phonics, reorder scoring, science/classification questions.
- Baseline snapshot amended; deterministic generators unchanged in seed
  contract except where the fix requires it (scramble free-point guard).

## Estimate

Done (retroactive CR per review-gate request). Reviewed through 3 lead
rounds; final round APPROVE after corpus sweep over 2,970 sentences.

## Verification

- tsc -b clean; npm run build green.
- 139 test files / 1,173 tests green including new invariant sweeps.
- Prod STT re-verified on regenerated pepper.mp3 ("Pepper").
