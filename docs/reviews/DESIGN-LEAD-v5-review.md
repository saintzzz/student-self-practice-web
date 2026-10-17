# Design Lead review - DESIGN-SPEC v5

REJECT

**Overall verdict (requested reporting vocabulary): REJECTED.**
**Reviewer:** independent cross-model Design Lead (GPT). Scope: CR-82 B/C design artifact, not implementation acceptance.

Retain the direction, but revise before Developer handoff. All B1-B6 and C1-C5 have substantive sections. The rejection concerns concrete accessibility, content-contract and interaction defects, not lack of ambition. Human design approval is a separate gate.

## Rubric scores

| Axis | Score | Justification |
|---|---:|---|
| Requirements coverage | 4/5 | Every B/C item is designed; flashcard entry and failure/partial states remain unresolved. |
| Token integrity | 3/5 | Real exports and new layers are generally distinguished, but paper usages contradict otherwise-correct contrast tables. |
| Convention compliance | 3/5 | Hyphen-only copy, band floors, motion twins and one-mascot intent are explicit; surface pairing and sheet placement need fixes. |
| Conflict handling | 4/5 | R-v5-01/02/03 address depth, Lottie and exam interior; Lottie correctly remains pending human authorization. |
| Implementability | 3/5 | Strong pointer/state/timing detail, but IA, accessibility isolation and edge-case behavior still require interpretation. |
| Kid-app quality bar | 4/5 | Illustrated journey, physical materials, perched character and paper exam materially exceed v4; visual success is not yet demonstrated. |

## Must-fix findings (8, ordered by impact)

### F1 - [FE] Bind paper typography to paper-safe tokens (blocking accessibility)
**Location:** `docs/design/v5/DESIGN-SPEC-v5.md` sections 5.3, 10.1, 14.1 and 14.3.

G1-2 exams explicitly use `TYPE_PROMPT`, which includes `text-white`, inside the slate-50 sheet. G3-5 flashcard fronts explicitly use `TYPE_HERO_GLYPH`, which includes `text-amber-100`, inside the amber-50 front. Parent dark text cannot override a child's explicit light text. Calculated ratios: white/slate-50 **1.05:1**, amber-100/amber-50 **1.07:1**. Both fail even large-text contrast.

**Change:** define paper twins or separate typography geometry from semantic color; specify the exact token per register/face. Do not stack conflicting text classes. Add actual usages to the contrast matrix and correct the blanket all-pairs-pass claim.

### F2 - [FE/BE] Replace the contradictory gap distractor rule and define the validation boundary
**Location:** spec section 13.5 and R-v5-08; CR-82 Workstream A1 F2/F3; `scripts/audit-qb.mjs:100-170`.

The spec requires distractors from a different grammatical slot or semantic set, giving weekday-versus-non-weekday as an example. That deliberately creates the mixed-category distractors CR-82 F3 identifies as defective. Avoiding other weekdays does not prove the stem is sound. The current audit consumes bank-row JSON and checks ambiguity only for published `question_type === 'mcq'` rows without context; it is not a runtime validator for generated listening gap banks.

**Change:** require coherent plausible distractors and stem/audio/context uniquely selecting the answer. Specify a reviewed bank or generation-to-validator adapter, eligibility/failure rules, and mixed-category/mutually-valid fixtures. Alternatively explicitly retain typed Gap and ship Spell-it under R-v5-08; CR-82 accepts at least one new drag surface.

### F3 - [FE] Resolve flashcard entry without exceeding the G1-2 control budget
**Location:** spec section 14.2 and section 24 Q3; `src/components/StartBatchScreen.tsx:74-78,258-308`.

Luyện thêm already expands to three programs plus Arena and conditional Review: **4 or 5** controls. Adding the specified flashcard subtile produces **5 or 6**, not at most four. Q3 delegates a checkable IA conflict.

**Change:** specify the revised G1-2 tree, with flashcards reachable and at most four new controls per expansion in Review-present/absent states. Preserve conditional region/aria-controls behavior. Obtain BA confirmation if approved IA changes; Developer must not invent the grouping.

### F4 - [FE] Put the feedback perch outside the scrolling panel
**Location:** spec sections 5.5 and 9.3; `src/components/FeedbackPanel.tsx` root class with `relative ... overflow-y-auto`; `src/components/QuestionCard.tsx:357-378`.

The spec puts a companion at `absolute -top-10 left-3` in FeedbackPanel while retaining its bounded scroll container. Protruding art is clipped or scrolls with content; absolute positioning alone does not provide a visible sheet-edge perch. QuestionCard owns the non-scrolling fixed sheet wrapper.

**Change:** specify a non-clipping sibling layer in that wrapper, separate from the bounded panel. Define overlap/clearance, preserve scrolling, the short-landscape inline fallback and the board-companion unmount rule.

### F5 - [FE] Isolate inactive flashcard faces from assistive technology
**Location:** spec sections 14.3-14.5.

Faces are absolute layers hidden only with CSS backface visibility. That does not hide reverse-face content from the accessibility tree or prevent its speaker receiving keyboard focus. A focusable group handles Enter/Space while an inner flip button also exists, with event ownership unspecified.

**Change:** make the inactive face inert and aria-hidden, or unmount it. Define focus after flip/advance, one real flip activation path, and speaker placement outside the flip button. Prevent speaker pointer/keyboard events from flipping. Verify Tab and screen-reader navigation expose only active content.

### F6 - [FE] Specify honest partial and small-deck completion
**Location:** spec sections 14.2 and 14.5.

End early routes to deck complete with partial counts, but the only completion headline says the child has viewed all ten cards. No rule covers fewer than ten eligible words or whether a flipped but unrated card counts as reviewed.

**Change:** parameterize actual deck/classified counts; define full, partial and zero-progress exit copy. Specify handling of the current unrated card, review saving, small decks and retry decks. Keep this mode unscored.

### F7 - [FE] Reconcile Spell-it's tile cap by grade
**Location:** spec section 13.4, tile-set rules.

Word letters plus two distractors for G2, maximum eight tiles, and typed fallback only above seven letters are incompatible: seven letters in G2 require nine tiles.

**Change:** define a deterministic cap (for example G1 up to seven letters, G2 up to six, otherwise typed), or explicitly reduce distractors. Specify per-instance IDs for repeated letters; test repeated letters and six/seven/eight-letter boundaries.

### F8 - [FE] Add flashcard load-failure/retry states
**Location:** spec section 14.5 and section 21's all-states-specified claim.

Loading and empty are specified, but deck-load failure is not. A failed fetch must not say there are no cards for this grade. Q5's unresolved review store also prevents assuming persistence behavior.

**Change:** specify load-error copy, retry/back, focus and band floors; distinguish usable offline cache from no cached deck. Define review-save failure behavior if persistence is selected, or explicitly choose local-only behavior. Correct the completeness claim.

## Nice-to-have corrections (3)

1. **N1 [FE] Scope the gold prohibition:** sections 10.1/19 say no exam gold fills, while 10.2 defines gold `EXAM_PRACTICE_NEXT` and 10.4 includes intro/result gold. Distinguish timed sitting from practice/intro/result or remove practice gold.
2. **N2 [FE] Align motion mitigation:** OBJ-1 promises ambient periods at least six seconds; section 17 retains 2.6/3.4-second twinkles and five-second rocket motion. Narrow the promise or align timings. Reduced-motion twins themselves are well specified.
3. **N3 [FE] Correct unknown-land fallback:** section 6.2 says an unknown land key falls back via `getLand`. `src/lib/ui/theme.ts:130-134` accepts a grade ID; `LandShell.tsx` directly indexes `LANDS[land]` for an override. Add a runtime guard or remove the claimed existing guarantee.

## Existing-code claim audit

Confirmed: four mascot moods/three sizes; component hex colors; city/space indigo/violet; DISPLAY_GLYPH font-black; absent Andika assets; existing BatchScreen progressFraction; rose practice-wrong; tile-shake/dart-arrow absent from the reduced-motion block.

Feedback is already fixed at all heights (`QuestionCard.tsx:357-378`), despite older root design-law sticky prose. V5 correctly follows current code here.

Factually wrong/overstated: unknown-land fallback guarantee (N3), and implication that the current audit directly validates generated listening gap banks (F2).

No invented current imports found among inspected references: scene/toy, exam and option-state tokens, named icons and hooks exist. New material/TYPE/paper/scenePalette exports are clearly proposed additions. Rename OBJ-1's `SCENE_SCRIM` to proposed `scene.scrim` for consistency.

## Six design options

| Option | Decision classification | Recommendation |
|---|---|---|
| OM-1 dusk/night | Safe within approved B1; normal visual gate, not separate scope approval. | **B**, dusk G1-2/night G3-5. Validate the phone frame as well as desktop. |
| OM-2 typography | Safe; Andika is already a standing approved ruling, not a new permission question. | **A+B**, retain Baloo/Be Vietnam and add letter-level Andika. Fix F1. |
| OM-3 mascot rig | **Genuine human decision:** changes standing Tech-gate Lottie JSON ruling. | **C**, SVG now/Lottie later, conditional on explicit R-v5-02 approval. Recommendations alone are not authorization. |
| OM-4 exam paper | Safe under newer approved CR-82 B5, which directly requests paper. | **A**, paper on desk; confirm R-v5-03 at design gate and fix text bindings. |
| OM-5 gap recognition | **Genuine pedagogy decision:** BA/human should ratify recall-to-recognition, not Developer. | **A only with a coherent prevalidated bank** after F2; otherwise ship Spell-it and retain typed Gap under R-v5-08, which satisfies CR acceptance. |
| OM-6 recolor | Safe within B6, palette amendment confirmed at normal gate. | **A**, orange/navy city, tightly bounded violet space. Reconcile section 5.1's violet map cards with section 11's narrower violet inventory. |

All three requested historical conflicts have explicit rulings: R-v5-01 (CR-79 depth), R-v5-02 (Lottie), R-v5-03 (exam interior). R-v5-06 additionally records removal of the sitting mascot, R-v5-04 the palette change. Their presence does not make pending human exceptions approved. Section 24 Q1's blanket permission to proceed on recommendations must respect that distinction.

## Verification and limits

Read the requested spec, CR-82, root design law, MEMORY, tokens/theme/Tailwind, scene/mascot/exam/feedback code and targeted mechanics/IA/audit implementations. Read framework CONVENTIONS and Design Lead reviewer skill.

Node WCAG checks confirmed white/navy-800 **13.77**, amber-100/navy-800 **12.36**, sky-600/amber-50 **3.95**, white/rose-600 **4.70**. The table math is plausible; F1 concerns actual misapplication. Unicode scan found **zero em/en dashes** in the spec.

No implementation files changed. No build/tests/browser checks run: this gate reviews a draft design, not built UI. Side-by-side renders and real-kid/performance results remain future acceptance evidence; self-assigned visual 5/5 scores are targets, not measurements. Require revision of F1-F8, explicit OM-3 authorization and the normal human design gate before implementation.
