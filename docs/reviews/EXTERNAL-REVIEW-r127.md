# External Review - Round 127 (codex)

Reviewer: codex (real external run). Scope: commit fa84f4d, HEAD=fa84f4d.

1. [severity major] scripts/group-dup-prompts.mjs:126 - Only existing VG members enter `desired`; duplicate rows with NULL VG remain ungrouped, even when a shared ID is minted. Reproduced with two ungrouped duplicates. - Assign every bucket member to the shared ID.

2. [severity major] scripts/group-dup-prompts.mjs:130 - Overlapping buckets overwrite assignments using original groups rather than computing transitive closure. Reproduced: buckets A/B and B/C leave A separate, allowing identical questions to co-appear. - Compute connected components across buckets and existing groups, then assign one ID per component.

3. [severity major] scripts/repair-form-refs.mjs:207 - Missing question IDs only print a warning; `--apply` still drops those slots, patches shortened forms, and exits successfully. This contradicts the promised fail-loudly behavior. - Abort before any PATCH when `missingIds` is nonempty; report affected forms for resolution.

