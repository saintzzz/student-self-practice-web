# External Review - Round 137 (codex)

Reviewer: codex (real external run). Scope: commit 26cba04, HEAD=26cba04.

1. [severity major] scripts/polish-explanations.mjs:94 - One unknown word makes an entire English phrase gloss-eligible. With `snore` absent from the bank lexicon, quoted `can snore` accepts `Bạn ấy cần snore khi ngủ.`, losing protected `can` (reproduced). - Default unknown terms to literal preservation; require explicit gloss annotations to permit diacritic restoration.

2. [severity major] scripts/polish-explanations.mjs:209 - Gloss fallback accepts incidental substrings. With `ten` absent from the lexicon, quoted `ten` accepts `Em chọn thì hiện tại (present tense).` because `ten` occurs inside `tense` (reproduced). - Require word boundaries on normalized gloss matches.

3. [severity major] scripts/polish-explanations.mjs:94 - Core English membership also blocks legitimate Vietnamese gloss repairs: original `nghia la 'no'` cannot become `có nghĩa là nó` because `no` is always classified English (reproduced). - Classify each quoted occurrence using trusted language annotations; a global word list cannot resolve bilingual collisions.

