# External Review - Round 258 (codex)

Reviewer: codex (real external run). Scope: commit 7810d33, HEAD=7810d33.

1. [severity minor] scripts/artgen/run-flow-video.mjs:57 - Boundary reads the first `.ProseMirror`, but submission types into the last (line 45). With multiple editors, the active prompt remains counted, recreating the swallowed-rejection timeout. Extracted callbacks reproduce boundary=345, post-rejection length=40, detected=null. - Fix: measure the same editor targeted by `box`, or track new response nodes directly.

