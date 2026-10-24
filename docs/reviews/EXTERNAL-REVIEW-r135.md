# External Review - Round 135 (codex)

Reviewer: codex (real external run). Scope: commit e131cec, HEAD=e131cec.

1. [severity major] scripts/polish-explanations.mjs:77 - Vietnamese word-list collisions classify English `it`, `ten`, and `rat` as glosses. Reproduced: `Đáp án ít.` passes preservation of `it`, allowing taught vocabulary removal and bypassing boundary checks. - Use question context and explicit language annotations to disambiguate; require literal, boundary-aware preservation for English terms.

2. [severity major] scripts/polish-explanations.mjs:191 - Vietnamese glosses outside the word list become English terms. Reproduced: original `'xin chao'` rejects the valid rewrite `Nghĩa là xin chào.`, preventing legitimate diacritic repairs. - Classify glosses using explanation context or explicit annotations instead of defaulting every unrecognized phrase to English.

