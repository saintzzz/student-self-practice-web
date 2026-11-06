# External Review - Round 177 (codex)

Reviewer: codex (real external run). Scope: commit 4249abe, HEAD=4249abe.

1. [minor] `scripts/gen-template-mathvi.mjs:160` - G2 can generate a “how many more” question with `c2 > c1`, making the premise false and the answer negative. Ensure `c1 > c2` when generating the pair.

