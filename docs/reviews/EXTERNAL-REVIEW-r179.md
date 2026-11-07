# External Review - Round 179 (codex)

Reviewer: codex (real external run). Scope: commit 8c73235, HEAD=8c73235.

1. [major] [scripts/lib-mathviz.mjs](/Users/kazu.nx/devin_app/student-self-practice-web/scripts/lib-mathviz.mjs:126) - Group diagrams pass bare nouns such as `cam` to `emojiFor`, whose keys require forms like `quả cam`; it falls back to blue dots. The image can claim “4 và 3 cam” while showing no oranges. Normalize the noun keys or pass the correct emoji in the spec.

2. [minor] [scripts/lib-mathviz.mjs](/Users/kazu.nx/devin_app/student-self-practice-web/scripts/lib-mathviz.mjs:152) - `halfRow` puts each extra row 55px lower, but `vizFor` permits up to 16 total objects. A group of 9 or more gets a row clipped below the 220px SVG viewBox. Increase the canvas or constrain and lay out rows to fit.

