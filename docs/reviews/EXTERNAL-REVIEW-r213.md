# External Review - Round 213 (codex)

Reviewer: codex (real external run). Scope: base 6c55bcf, HEAD=0e8c844.

1. [major] `scripts/gen-template-math-sci.mjs:1224` - `--patch` adds feedback to live rows but never replaces their choices. Older live plant questions can therefore keep the “candy and toys” distractor despite the CR requiring junk distractors to be replaced. Patch the affected choices and recompute the answer index and content hash, or verify and report that no such live rows remain.

2. [major] `src/data/scienceBank.ts:53` - The G1–2 plant question still uses “milk,” “bread,” and “toys” instead of the documented misconception that plants get food from soil. Replace a distractor with “from the soil” and explain what soil provides versus what plants make themselves.

