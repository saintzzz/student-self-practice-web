# External Review - Round 192 (codex)

Reviewer: codex (real external run). Scope: commit 0c3ca05, HEAD=0c3ca05.

1. [major] `public/images/v6/math-vi/mathvi-opt-*.svg` (all files) - Each image nests a second full-size SVG (`viewBox="0 0 360 220"`) inside a 340×200 viewport at (10,10), then draws the answer-letter badge over it. The inner content is therefore scaled and clipped while the badge obscures the diagram; several labels near the bottom are especially vulnerable. - Remove the redundant inner SVG and draw the diagram directly in the outer viewBox, reserving space for the badge.

2. [major] `public/images/v6/math-vi/mathvi-opt-044b6b5dfb.svg:1` - The diagram says “86 chia 2 phần” but shows two unknown parts with no indication that they are equal; the same ambiguity affects the other “chia đều” assets. - Label the parts as equal or otherwise make the equal-sharing relationship explicit so the image teaches the intended operation.

3. [minor] `public/images/v6/math-vi/mathvi-opt-09caa1b5d5.svg:1` - The “104 và 102” comparison draws the difference as only 4 units wide, then places “?” outside the bar, making the unknown visually detached and hard to interpret. Similar 1-unit differences occur in other comparison assets. - Set a minimum visible difference width and keep the question mark centered inside it.

