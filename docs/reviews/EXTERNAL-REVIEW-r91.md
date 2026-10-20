# External Review - Round 91 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: base ffc40f3, HEAD=e3af294.

1. [major] src/components/ExamScreen.tsx:330 - Payload is persisted before asynchronous owner tagging, and replay accepts missing `forUser`. Closing/reloading before tagging leaves answers that another account can submit; switching accounts before `getSession()` resolves can also tag the wrong owner. Fix: capture the authenticated owner before creating/persisting the payload, require an exact owner match on replay, and discard ownerless legacy payloads.

Review limited to supplied diff; repository access was blocked by execution policy.

