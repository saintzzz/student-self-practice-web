# External Review - Round 139 (codex)

Reviewer: codex (real external run). Scope: commit 062a417, HEAD=062a417.

1. [severity major] scripts/polish-explanations.mjs:226 - Whole-phrase protection depends on every word being in `LEXICON`. An unseen English word triggers the fallback, which still discards numbers and word order: `'can frobnicate 10'` accepts `Cụm đúng là "frobnicate can 20".` - Preserve ordered tokens, including numbers and punctuation, for mixed terms too; allow diacritic restoration only for identified Vietnamese spans.

