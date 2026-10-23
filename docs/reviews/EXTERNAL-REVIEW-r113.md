# External Review - Round 113 (codex)

Reviewer: codex (real external run). Scope: commit 236bdcd, HEAD=236bdcd.

1. [severity major] src/lib/qb/turnstile.ts:136 - Ticket minting still has an unbounded `fetch()` and response-body read. A stalled gate request keeps `inflight` pending and blocks subsequent guest attempts despite the new script timeout. - Apply an AbortController deadline through response-body consumption; clear its timer in `finally` so failure releases `inflight` and permits retry.

