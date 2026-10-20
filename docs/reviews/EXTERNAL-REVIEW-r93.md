# External Review - Round 93 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: base 45ae927, HEAD=1db83b8.

1. [major] src/components/ExamScreen.tsx:342 - Failed or null `getSession()` still produces `forUser: ''`, which is persisted and submitted. If submission fails, replay later deletes this payload when authentication recovers because `'' !== uid`, permanently losing the result. - Require a nonempty owner before persisting/submitting; retain the result and retry owner resolution on authentication recovery.

Review limited to supplied diff; repository access was blocked by execution policy.

