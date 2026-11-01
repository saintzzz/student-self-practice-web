# External Review - Round 152 (codex)

Reviewer: codex (real external run). Scope: commit 031c549, HEAD=031c549.

1. [severity major] src/components/GradeSelect.tsx:133 - Unconditional `-mt-[14vh]` depends on the image hero reserving space. If both WebP assets fail, `LandArt` falls back to `LandScene`’s fixed hero, removing that space and pulling login/PIN/sign-out controls above the viewport. - Fix by reserving the same hero region for both image and vector renderers; verify with both image requests blocked.

