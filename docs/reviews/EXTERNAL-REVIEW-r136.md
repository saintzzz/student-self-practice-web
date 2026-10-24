# External Review - Round 136 (codex)

Reviewer: codex (real external run). Scope: commit b1cb966, HEAD=b1cb966.

1. [severity major] scripts/polish-explanations.mjs:83 - Rewrite-controlled classification still permits English vocabulary deletion. When quoted `can` is absent from question context, `Em cần dùng động từ khuyết thiếu.` passes preservation despite dropping `can` (reproduced). - Determine language from trusted original context or explicit annotations; never let proposed output weaken literal English preservation.

2. [severity major] scripts/polish-explanations.mjs:80 - Question context is assumed to be English. With prompt `Translate xin chao into English.`, original quoted `xin chao`, and valid rewrite `Nghĩa là xin chào.`, validation rejects the diacritic repair (reproduced). Substring matching also accepts incidental occurrences as classification evidence. - Use language-aware annotations and boundary-aware context matching; allow Vietnamese gloss repairs even when glosses appear in the prompt.

