# External Review - Round 138 (codex)

Reviewer: codex (real external run). Scope: commit 0d15a06, HEAD=0d15a06.

1. [severity major] scripts/polish-explanations.mjs:71 - `dich` misclassifies the English source as a Vietnamese gloss: `Dich 'can' sang tieng Viet.` accepts `Cần được dịch sang tiếng Việt.`, dropping taught `can` (reproduced). - Use explicit occurrence language annotations; translation instructions alone cannot identify glosses.

2. [severity major] scripts/polish-explanations.mjs:222 - Per-word checks lose phrase order: `'dog bites man' la cau dung.` accepts `Câu đúng là "man bites dog".`, reversing meaning (reproduced). - Preserve complete English phrases with bounded literal matching.

3. [severity major] scripts/polish-explanations.mjs:222 - `lexWords()` discards numbers, leaving numeric quotes unchecked: `'10' la dap an dung.` accepts `Đáp án đúng là 20.` (reproduced). - Preserve numeric and other nonalphabetic quoted content through whole-term validation.

