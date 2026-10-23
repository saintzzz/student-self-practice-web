# External Review - Round 112 (codex)

Reviewer: codex (real external run). Scope: commit ff0c6ef, HEAD=ff0c6ef.

1. [severity major] src/lib/qb/turnstile.ts:62 - The timeout starts only after `await loadScript()`. A stalled script request never reaches it, leaving `inflight` pending indefinitely and blocking every subsequent guest attempt. - Bound script loading too; on timeout, reject, remove the script element, and reset `scriptPromise` so retry loads afresh.

