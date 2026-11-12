# External Review - Round 196 (codex)

Reviewer: codex (real external run). Scope: commit f29c433, HEAD=f29c433.

1. [minor] `src/components/PwaUi.tsx:76` - If `promptInstall()` rejects, readiness is never cleared and the consumed install prompt remains available-looking. Clear readiness in a `finally` handler.

