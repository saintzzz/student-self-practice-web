# External Review - Round 214 (codex)

Reviewer: codex (real external run). Scope: base 6c55bcf, HEAD=3cc0d84.

1. [major] [scripts/gen-template-math-sci.mjs](/Users/kazu.nx/devin_app/student-self-practice-web/scripts/gen-template-math-sci.mjs:1224) - `--patch` adds feedback but never updates live choices, so existing rows can retain junk distractors despite CR-144’s acceptance criteria. Patch affected choices and recompute the answer index and content hash, or verify none remain.

2. [major] [src/data/scienceBank.ts](/Users/kazu.nx/devin_app/student-self-practice-web/src/data/scienceBank.ts:53) - The plant-growth question lists “milk” and “bread” as distractors, and its correct answer omits nutrients even though plants need them. Replace the implausible choices with likely misconceptions and clarify that soil provides water and minerals while plants make their own food.

3. [major] [scripts/gen-template-math-sci.mjs](/Users/kazu.nx/devin_app/student-self-practice-web/scripts/gen-template-math-sci.mjs:796) - The generated plant-growth answer says plants need “water, sunlight and air,” while the choices include “food from the soil.” This risks teaching that soil nutrients are unnecessary. Include nutrients in the correct answer and distinguish nutrients from food plants make.

## Triage (post-r214)

1. Resolved with evidence. A full approved-row sweep (choices `cs` queries over
   the known junk lexicon) found zero `candy and toys` rows and 6 approved rows
   with genuine junk distractors (daylight, Earth-orbit, animal-needs,
   healthy-food x2, bird-cover, window-material prompts). All were PATCHed in
   place: plausible misconception choices, rebuilt `distractor_feedback`, fresh
   `content_hash`. Remaining lexicon hits (`paper`, `sand`, `a pencil` in
   material/friction prompts) are legitimate distractors, not junk. `--patch` is
   a completed one-shot migration; choice-rewrite machinery is not warranted.
2. Fixed. Bundled G1-2 plant distractors milk/bread swapped for `a pot` and
   `juice` (naive-model picks); `food from the soil` retained; explanationVi now
   states soil supplies water + minerals while plants make their own food.
3. Fixed. Generator correct answer now `water, sunlight, air and nutrients`;
   all 7 live plant-need rows patched to match (5 tpl + 2 legacy variants).
   `food from the soil` fb now reads: soil gives water and minerals - plants
   make their own food.

