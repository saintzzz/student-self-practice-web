# External Review - Round 128 (codex)

Reviewer: codex (real external run). Scope: commit f324b08, HEAD=f324b08.

1. [severity major] scripts/group-dup-prompts.mjs:165 - Freshly minted IDs bypass the holder check and can collide with another component’s reused `dup-*` ID, merging unrelated questions. Mocked reproduction: apple duplicates with NULL groups receive `dup-hash(apple)` already held by banana duplicates; all four end up grouped together. - Allocate IDs across components centrally; check generated IDs against existing holders and reserved assignments, and generate a distinct ID on conflict.

