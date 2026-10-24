# External Review - Round 134 (codex)

Reviewer: codex (real external run). Scope: commit 08d34d3, HEAD=08d34d3.

1. [severity major] scripts/polish-explanations.mjs:178 - English terms absent from prompt/choices/answer fall back to Vietnamese matching. An explanation teaching `'can'` alongside answer `could` still accepts a rewrite containing only `cần`. - Classify quoted terms using the original explanation’s semantics; require literal preservation for English terms even when absent from question context.

2. [severity major] scripts/polish-explanations.mjs:179 - Substring matching accepts `candy` as preservation of taught `can`, allowing vocabulary removal to pass validation. Reproduced with `missing=false`. - Match complete English tokens/phrases with Unicode-aware boundaries.

