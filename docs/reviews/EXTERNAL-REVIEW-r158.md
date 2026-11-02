# External Review - Round 158 (codex)

Reviewer: codex (real external run). Scope: commit bf9fc70, HEAD=bf9fc70.

1. [severity major] src/games/sources.ts:113 - Filters short words **after** sampling, producing fewer rounds or none. Reproduced: `missingLetterRounds('grade-1', '2603', 5)` returns `[]`; the game renders blank and never ends. - Filter eligible words before sampling; handle empty pools explicitly.

2. [severity major] src/games/games/SentenceScramble.tsx:70 - Wrong submissions reset the same round; subsequent success still earns full credit. A run with mistakes can report perfect points and receive flawless stars, contrary to the one-submit requirement. - Advance after each submission, or track failed rounds and exclude their retry successes from accuracy scoring.

3. [severity minor] src/games/sources.ts:124 - Distractors exclude the answer but can duplicate each other. Reproduced: grade 5, seed `1`, “pagoda” yields `['a', 'k', 'k', 'k']`, reducing four choices to two. - Generate three distinct distractors using a set.

