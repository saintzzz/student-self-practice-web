# External Review - Round 247 (codex)

Reviewer: codex (real external run). Scope: commit 46a08b0, HEAD=46a08b0.

1. [severity major] scripts/artgen/run-flow.mjs:78 - Settling timeout still advances to the next asset: the returned error triggers `continue` at line 132 while generation remains active. A late output can enter the next asset’s candidate set and poison its resume marker. An in-memory simulation reproduced `B.png` receiving `/asb/A-late`. - Abort the entire run on settling timeout, propagate failure past the per-asset catch, and associate outputs with their submitted request before saving.

