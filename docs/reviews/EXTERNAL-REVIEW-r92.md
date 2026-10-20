# External Review - Round 92 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: base e3af294, HEAD=45ae927.

1. [major] src/components/ExamScreen.tsx:300 - Owner resolution is still asynchronous. Finishing before `getSession()` resolves persists `forUser: ''`; if submission fails, the replay guard deletes that pending result on re-entry, losing the attempt. - Resolve ownership before enabling the exam; block persistence/submission until a valid owner exists, and preserve pending data while authentication is unresolved.

Review limited to supplied diff; repository access was blocked by execution policy.

