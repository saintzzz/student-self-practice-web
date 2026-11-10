# External Review - Round 181 (codex)

Reviewer: codex (real external run). Scope: commit fac86af, HEAD=fac86af.

1. [major] [scripts/publish-mathvi-assets.mjs](/Users/kazu.nx/devin_app/student-self-practice-web/scripts/publish-mathvi-assets.mjs:66) - `RX_MORE` describes a comparison, but renders it as subtraction: the given smaller amount is shown as part of the larger total and the difference as unknown. This misrepresents the word problem. Render it with `kind: 'compare'`, ordering the larger and smaller values correctly.

2. [major] [scripts/lib-mathviz.mjs](/Users/kazu.nx/devin_app/student-self-practice-web/scripts/lib-mathviz.mjs:242) - Equal-part bars shrink below the 18px `?` label for common divisions such as 56 ÷ 8; labels spill across segment boundaries, obscuring the equal parts. Use a compact layout or reduce the label size when segments are narrow.

3. [minor] [scripts/lib-mathviz.mjs](/Users/kazu.nx/devin_app/student-self-practice-web/scripts/lib-mathviz.mjs:216) - For close comparison values, the unknown gap can be too narrow for its label (e.g. a one-unit difference), so text overflows into the known bar. Keep the label outside the bar or size the gap to fit.

4. [minor] [scripts/lib-mathviz.mjs](/Users/kazu.nx/devin_app/student-self-practice-web/scripts/lib-mathviz.mjs:256) - `Math.max(40, …)` makes the known part at least 40px even when it is a much smaller fraction of the whole, so the diagram teaches a misleading proportion. Scale both segments consistently or avoid implying scale.

