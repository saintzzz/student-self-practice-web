# External Review - Round 151 (codex)

Reviewer: codex (real external run). Scope: commit 6607e02, HEAD=6607e02.

1. [severity major] src/lib/ui/tokens.ts:308 - Absolute positioning reserves no layout space: the header and map still overlap the 62vh artwork, which remains fully opaque through 42vh. GradeSelect’s heading and prompt still lack protective surfaces, so r150’s readability issue remains unresolved. - Fix by reserving a dedicated hero region, placing the map below it on an opaque surface, and giving overlapping header copy an opaque backing.

