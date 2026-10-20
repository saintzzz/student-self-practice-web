# External Review - Round 90 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: base ce5d715, HEAD=ffc40f3.

1. [major] src/components/ExamScreen.tsx:405 - Stored submissions are keyed only by assignment ID. Switching accounts in the same tab can replay the previous student’s answers as the current student. Fix: include the authenticated user ID in the key and verify ownership before replay.

2. [major] src/components/ExamScreen.tsx:416 - Failed replay falls through to a new sitting, whose completion overwrites the unacknowledged payload. A transient outage can still lose the original submission. Fix: retain the pending payload and block a new sitting until acknowledged or explicitly discarded.

3. [minor] src/lib/qb/bank.ts:444 - Removing the zero-question check allows an empty form to return a non-null exam because `0 === 0`. Fix: reject both empty forms and partially unrenderable forms.

Review limited to the supplied diff; repository reads were blocked by execution policy.

