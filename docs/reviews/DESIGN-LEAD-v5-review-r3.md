# Design Lead review - v5 revision 3

APPROVE_WITH_CHANGES

**Requested vocabulary: APPROVED_WITH_FIXES.**

Independent cross-model Design Lead review (GPT). Artifact: `docs/design/v5/DESIGN-SPEC-v5.md`, revision 3, 1,903 lines. Scope: design contract, not implementation acceptance. Human design approval remains a separate gate.

## Ordered findings

### R3-1 [FE] Align validator fixtures with the exact generated frame

**Location:** spec §13.5 lines 1160-1161 and 1188, 1196; `src/lib/generators/listeningSentenceFillBlank.ts:66-70,423-424`.

V2 requires exact membership in the blanked output of `sentencesForWord(d)`. Fixture 1 nevertheless expects `cat` with `dog`/`bird` in **“I see a ___.”** to be eligible. The existing countable templates are **“I have a ...”**, **“I can see a ...”**, and **“This is a ...”**. They do not generate “I see a ...”. Dog and bird are countable words (`src/data/vocabulary/animals.ts:9,11`). Thus a conforming V2 rejects this required positive fixture. Fixture 9 also uses the nonexistent frame, so it could pass its rejection assertion for the wrong reason instead of testing the article mismatch.

**Fix:** use **“I can see a ___.”** in fixtures 1 and 9 (and corresponding spoken sentences), or another actual generated frame. Keep exact frame matching; do not weaken V2 just to satisfy the fixture. This is a bounded test-contract correction, not a remaining plausibility loophole.

## Requested verification

### 1. F2 / V0-V8 - r2 loopholes CLOSED, fixture correction above required

The new content rule at lines 1129-1136 requires every distractor to be **“plausible in isolation yet contradicted by the spoken sentence”**, with **“same grammatical form (article, countable/mass, verb form) and same reviewed semantic group”**. It explicitly says **“Topic equality alone is NOT enough.”**

Relevant executable predicates:

- **V0, lines 1152-1154:** **“`distractors.length === 2` exactly”**; each normalized distractor must be nonempty. Rejects undersized, oversized and punctuation-only banks.
- **V2, lines 1158-1163:** **“`sentencesForWord(d).map(s => blankOutWord(s, d.word))` contains `question.displaySentence` exactly.”** This replaces topic-only plausibility with the existing class/article-aware generator boundary. Chef/utensil, mass/countable and owl/article counterexamples from r2 no longer pass on the cited frames.
- **V3, lines 1164-1165:** the topic must be reviewed/allowlisted; **“if that entry declares `groups`, the answer and both distractors belong to the same group.”** Optional groups do not mean unchecked topics: lines 1145-1147 require content review before allowlisting. Together with V2 this closes the specifically reported same-topic loophole; it is not a claim that generic topic metadata proves semantics.
- **V4, lines 1166-1170:** **“for every pair among {answer, d1, d2}: `norm` values differ”**, with plural and homophone exclusions. Unlike r2, this includes distractor versus distractor: dog/dog and normalized Dog/dog. cannot pass.
- **V5, lines 1171-1173:** Levenshtein distance at least two against the answer **and between distractors**.
- **V1/V6/V7, lines 1155-1157,1174-1177:** audio identity, no stem leak, listening/audio requirement. Silent context-only recognition cannot masquerade as uniquely keyed listening.
- **V8, lines 1178-1180:** playback unsupported/error disables the bank and forces typing; build validation does not pretend to prove audio playback.

Lines 1148-1149 prohibit padding/partial banks, and lines 1181-1182 make V0-V7 failure typed-only. Fixtures 3-20 cover short banks, category/article/mass mismatches, duplicates and other rejection families. Lines 1209-1214 retain the coverage sweep, Spell-it acceptance fallback and the separation from `audit-qb.mjs`. These close R2-1 at design level, subject to correcting the fixture mismatch in R3-1 and implementing/testing the promised validator.

### 2. Flashcard entry and §14 floors - FIXED

Lines 1306-1312 explicitly give `flashcards-start` **`density.primaryMinH` = 76px G1-2 / 64px G3-5**, classify it as standalone, and migrate sibling standalone launchers too.

The §14 sweep at lines 1450-1457 covers start/resume/retry/exit, decisions and all panel actions at 76/64, overriding the paper button's default 48px. Speaker and chrome KẾT THÚC are explicitly 48px non-standalone controls; flip covers the card. No sub-floor control remains specified in §14. The existing BatchScreen 44px deviation is explicitly outside this flashcard contract, not silently adopted.

### 3. Type split - FIXED

- Tracing now uses `TYPE_INSTRUCTION_NAVY` at line 955. Bare `TYPE_INSTRUCTION` remains only in historical explanations/changelog, not as a live usage.
- Lines 322-366 define separately sized geometry and named surface composites, including `TYPE_IPA_NAVY` and card/letter variants. The former IPA geometry-plus-literal-color usage is gone; flashcard usages at lines 1264-1268 import the composites.
- Lines 371-375 ban appended size/color utilities on composites and delimit component-token coexistence. Historical geometry references in the scale table are definitions, not component imports.
- Lines 376-384 bind pairing to the **nearest painted background**, explicitly permitting the navy flashcard back inside a paper card. The blanket ancestor-containment prohibition is removed.
- Lines 385-395 narrow the static enforcement claim and require rendered regression coverage; §23 lines 1789-1791 repeats that gate. This no longer claims a same-element scanner proves descendant contrast.

### 4. Đấu trường IA and control budget - CONSISTENT WITH HUMAN RULING

The binding tree at lines 1284-1302 places Arena directly between Luyện thêm and Phần thưởng; rewards remain rewards-only. Luyện thêm now has 3 subjects or 3 subjects + Review (3/4); English has four launch actions; other subjects have three. Region/conditional handling and test migrations are explicit at lines 1323-1339.

There are honestly **five interactive first-paint controls**, not four. Under the expressly accepted R-v5-14 rationale, that is **four mode decisions + Back navigation**, as recorded at lines 1328-1334 and ruling table line 1851. Therefore it does not violate the revised decision budget. It would violate the old all-controls count, which the spec explicitly supersedes rather than pretending to preserve. Root DESIGN_SYSTEM/PRD wording updates remain recorded cascade work, not permission for Developer to invent a different tree. Existing Arena challenge-list tap-budget exceptions remain unchanged.

### 5. Regression judgment

No additional verified blocking design defect found in the revised contracts. R3-1 is the sole required correction from this pass. Prior F1/F3-F8 closures are not reopened; Lottie approval and the standalone Arena human ruling are respected. This is not certification that an unimplemented validator or UI already passes acceptance.

## Review basis and limits

Read framework CONVENTIONS, Design Lead reviewer skill, prior r1/r2 reports, project constitution, CR-82, root DESIGN_SYSTEM, MEMORY and revision 3; inspected the actual generator helpers/templates and vocabulary for the frame finding. Text scans confirmed zero em/en dashes and no live legacy tracing token usage. Findings cite revision-3 artifact lines unless an implementation file is named.

No application code changed; no build, unit suite or browser acceptance run. Implementation still owes §23 tests, contrast/render checks, real-flow verification, asset/performance evidence and the human design gate. Review mechanism: direct independent reviewer, not a claimed CLI/Cloud dispatch.
