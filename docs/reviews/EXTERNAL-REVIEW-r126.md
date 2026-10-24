# External Review - Round 126 (codex)

Reviewer: codex (real external run). Scope: commit c2493d1, HEAD=c2493d1.

1. [severity major] scripts/group-dup-prompts.mjs:85 - Reassigning a member from existing group B to A leaves its other B variants behind, allowing previously excluded variants to co-appear. - Merge entire connected variant groups, including members outside the duplicate bucket.

2. [severity major] scripts/repair-form-refs.mjs:81 - Replacement candidates require only `approved`, bypassing canonical, commercial-release and approval gates enforced by `_assignment_mint_form`. Student assignment forms can receive questions excluded from their serving pool. - Apply assignment eligibility rules to assignment forms; restrict rubric exceptions to appropriate teacher forms.

3. [severity major] scripts/group-dup-prompts.mjs:73 - Duplicate identity omits `passage`. Questions with identical generic prompts, statements and answers but different passages are merged, suppressing distinct reading questions from exams. - Include passage and question type in the identity key.

4. [severity minor] scripts/repair-form-refs.mjs:124 - A missing question produces neither bad status nor a duplicate, so its ID is retained and its answer key skipped. The repair leaves an unservable slot. - Handle `!q` explicitly and fail with the affected form IDs when replacement metadata is unavailable.

