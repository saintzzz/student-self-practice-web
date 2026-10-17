# Design Lead review - v5 revision 2

REJECT

**Requested vocabulary: REJECTED.** Independent cross-model Design Lead review (GPT). Scope: design, not implementation acceptance. Locations below refer to `docs/design/v5/DESIGN-SPEC-v5.md` (1,757 lines), unless otherwise stated.

Most corrections are substantive. F2 remains incomplete; three bounded fixes are required before handoff. Lottie human approval is accepted, not reopened. R-v5-12 may remain explicitly BA-gated.

## Ordered must-fix findings

### R2-1 [FE] F2: validator does not enforce plausible, distinct banks

**Location:** §13.5 lines 1087-1125; §13.4 line 1077.

The content rule correctly requires coherent, plausible distractors, but V2 checks only `topicId`. The claim at 1095-1096 that this guarantees coherence is false for existing data: `src/data/vocabulary/kitchen.ts:9-19` puts spoon, salt, butter and **chef** together. The generator already recognizes this distinction with an occupation override for chef (`src/lib/generators/listeningSentenceFillBlank.ts:262-268`). Chef with spoon/salt distractors passes topic equality but recreates category-based guessing.

Topic equality also does not prove grammatical substitution: animals include cat, dog and owl (`src/data/vocabulary/animals.ts:8-24`), but owl is not a plausible substitution in “I have a ___” without changing the article. V1 validates only the answer sentence.

V3 compares distractors with the answer, not each other. For audio “I see a cat.”, stem “I see a ___.” and distractors dog/dog, all written V1-V5 predicates pass. A deterministic Python predicate check confirmed that counterexample. No validator rule requires exactly two nonempty distractors either. This is verification of the written contract, not a claim an unimplemented validator was tested.

**Fix:** use reviewed substitution groups or sentence-class/grammatical-form metadata, including article compatibility, rather than topic equality alone. Require exactly two nonempty, normalized pairwise-distinct distractors; apply the bank equivalence/homophone policy across options. Add within-topic category mismatch, article mismatch, duplicate and short-bank fixtures. Retain typed-only rejection and Spell-it acceptance fallback. Audio-based uniqueness itself is a sound correction.

### R2-2 [FE] Flashcard entry violates the retained G1-2 floor

**Location:** §14.2 lines 1211-1213; §18 line 1498; §3 lines 204-205.

The G1-2 flashcard launch row is explicitly `min-h-[64px]`, described as a “paper secondary row floor.” The retained floors are **76px G1-2 standalone**, 64px G3-5 standalone and 48px non-standalone. A row launching a practice screen is not an embedded control merely because it sits on paper. CR-82 Constraints preserve those floors; §18 repeats the erroneous unconditional 64px.

**Fix:** specify `density.primaryMinH` (76/64) for `flashcards-start` in the IA and accessibility inventory. Existing sibling sizing is not an exception authorization.

### R2-3 [FE] Type split still contains undefined/forbidden usages

**Location:** §5.3 lines 312, 342, 352-357, 375; §12.3 line 915.

- Tracing still imports `TYPE_INSTRUCTION` (915); the new table defines only `TYPE_INSTRUCTION_NAVY` (345), with no legacy alias.
- IPA explicitly uses `TYPE_CAPTION_GEO font-mono text-sky-200` (375), contradicting geometry “only inside composites” (312) and the no-geometry-plus-separate-color rule (352-353).
- The blanket ban on navy ink **inside** `material.paperSlate` (353-354) conflicts with the intentional navy flashcard back nested inside that paper card (1261-1280). Pairing must follow the nearest painted surface, not any ancestor.

**Fix:** migrate the tracing reference, export a named navy IPA composite, and scope containment rules to the effective painted surface. Define size replacements without conflicting utilities (the hero geometry is `text-7xl`, but its paper composite is specified “at text-6xl,” 316/342). The same-element literal-class guard at 355-357 cannot alone catch the original child-composite-on-paper defect: require that regression fixture or narrow the enforcement claim.

## F1-F8 closure, section by section

| ID | Status | Fixed text / evidence |
|---|---|---|
| F1 [FE] | **FIXED** (original contrast defect) | §5.3 333-344 defines paper ink and composites; 367/372 maps exam prompt to slate-900/slate-50 and flashcard front to navy-800/amber-50. §10.1 807-810 uses `TYPE_PROMPT_PAPER` for both bands; §14.1 1180 uses `TYPE_HERO_GLYPH_PAPER`. No parent-color override assumption remains. Migration consistency is separately R2-3. |
| F2 [FE] | **NOT-FIXED** (partial correction) | §13.5 1081-1085 retracts the old mixed-category rule and audit claim. 1097-1115 specifies a round-build validator and typed-only failure, with audio-selected weekday fixtures. However, V2 does not enforce the promised plausibility boundary and structure is unchecked: R2-1. |
| F3 [FE] | **FIXED**, BA-gated | §14.2 1197-1208 gives exact T-A tree: Luyện thêm **3/4** controls, English **4**, Rewards **2** subtiles. 1216-1220 preserves conditional regions and mounted empty targets. 1226-1228 prohibits Developer-invented grouping if BA rejects relocation. The English-row-only fallback adds no controls at the overflowing level; pre-existing Review overflow is honestly logged. Sizing is R2-2. |
| F4 [FE] | **FIXED** | §9.3 698-725 moves perch to a “sibling layer in QuestionCard’s fixed sheet wrapper,” mandates visible overflow, retains panel scrolling, defines 44px overhang, headline clearance and bottom reserve. 726-731 unmounts board companion and selects inline fallback in JS at height ≤420px. |
| F5 [FE] | **FIXED** | §14.3 1261-1271 gives inactive faces `inert` + `aria-hidden`, puts the speaker outside the sole flip button. §14.4 1295-1316 assigns native Enter/Space only to that button, suppresses trailing drag clicks, stops speaker pointerdown and defines focus after flip/advance/summary. Inactive reduced-motion content is unmounted. |
| F6 [FE] | **FIXED** | §14.2 1238-1241 defines `N = min(10, eligibleCount)`, small and retry decks. §14.5 1332-1340 provides full/partial/zero copy, `rated = known + again`, and says the current unrated card is “not counted, not saved” and resumes first. Remains unscored. |
| F7 [FE] | **FIXED** | §13.4 1049-1075 specifies G1/G2 **2-6 letters**, one/two distractors, seven/eight tiles maximum, otherwise typed. Occurrence IDs handle repeated letters; book/school and 6/7/8-letter tests are explicit. |
| F8 [FE] | **FIXED** | §14.5 1327-1331 distinguishes empty, load error, unreadable store, offline chunk absence and save failure. Error heading “Chưa mở được bộ thẻ,” retry/back at density floors and heading focus are explicit. §14.2 1243-1247 chooses local-only ratings with session-memory fallback, not assumed server persistence. |

F5 mechanism is sound for the original issue: inert affects inactive descendants, not the parent flip button; no speaker lives inside either face. Only one native flip activation path remains. Runtime browser/AT checks are still required; a design review is not that evidence.

## N1-N3 and rulings

| Item | Status | Evidence |
|---|---|---|
| N1 | **FIXED** | §3 202-203 and §10.1 800-802 scope no-gold-fill to timed sitting; §10.2 829 explicitly excludes practice-next from timed sitting. |
| N2 | **FIXED** | §17 1453-1457: drift 60s, land drift 9/14s, sway 6s, twinkle/sparkle 6.5/7s, rocket 7s. §9.2 677-678 explicitly scopes the ≥6s promise to scene ambience, not character loops. |
| N3 | **FIXED** | §6.2 496-508 retracts the false existing `getLand` guarantee and requires guarded override lookup plus scenePalette/LandScene sky defaults and a unit test. |
| OM-3 / R-v5-02 | **Applied** | §2 124-129 explicitly records human **B - Lottie JSON NOW**, overriding SVG recommendation; §9.2/9.5 specifies Lottie primary and poster/reduced-motion/missing-asset fallback. Rulings table 1710 marks human-approved. |
| OM-4 / R-v5-03 | **Applied** | Rulings table 1711 marks paper exam human-approved; §10 implements it. |
| OM-5 / R-v5-10 | **Applied** | §13.7 1149-1165: bank primary, peer toggle, empty-gap tap/Enter to type, bank unmounted while typing, cleared unsubmitted draft, one submit callback, session preference and typed-only eligibility fallback. G3-5 stays typed; Spell-it has no toggle. |
| OM-6 / R-v5-04 | **Applied** | §5.1 270-275 and §11 874-877 agree on orange city and closed violet space inventory, including the map card. |
| R-v5-12 | **Honestly pending** | Table 1720 and §24 1689-1691 require BA confirmation for relocation. Not an additional rejection reason. |

The rulings table now distinguishes human approvals, Designer decisions and pending BA work. OM-3 option A still says “recommended now” (120), but the immediately following human override is unambiguous; editorial cleanup only.

## Remaining-section consistency sweep

- §§0-4: binding scope/contracts and human exceptions are explicit; floors remain binding (R2-2).
- §§5-8: paper contrast correction succeeds; named scene palettes, unknown-land behavior, ambient timings and Andika loading are specified. Type migration needs R2-3.
- §§9-11: perch ownership, Lottie fallback, paper exam, gold scope and violet inventory align.
- §12: tracing intent retained; stale banner token is R2-3.
- §13: tile cap and dual-input surface are implementable; eligibility needs R2-1. V6 is correctly playback-time, not a claim round-build proves playback success. Audio failure forces typing plus the existing warning.
- §14: counts, persistence, face isolation and load failures are explicit. Entry sizing needs R2-2.
- §§15-17: navigator/review-submit, rewards and motion twins remain specified; no additional confirmed must-fix in this pass.
- §§18-23: inventories must follow R2-2/R2-3. Quality scores are labeled targets, not demonstrated browser/child/performance results.
- §§24-26: approvals and pending status are transparent; the changelog claim that F1-F8 are fixed is not independent acceptance while R2-1 remains open.

## Verification and limits

Read prior review, revised artifact, CR-82, root DESIGN_SYSTEM, MEMORY, framework CONVENTIONS and Design Lead reviewer skill. Inspected current vocabulary, sentence generator, types and listening-gap component to verify counterexamples and integration assumptions. Searched type references artifact-wide. Unicode scan: **zero em/en dashes**. Verified validator counterexample with deterministic predicates; no validator implementation is claimed to exist.

No implementation changes, build, unit suite or browser acceptance run. Those remain implementation gates. Require R2-1 through R2-3 corrections, retain the explicit BA relocation gate, then proceed to normal human design approval.
