# External Review - Round 201 (codex)

Reviewer: codex (real external run). Scope: commit f6c43ed, HEAD=f6c43ed.

1. [minor] `src/components/ClassShowScreen.tsx:77` - `history.back()` fires `popstate` asynchronously, so quickly reopening the screen can register a new listener before that event arrives; it then calls `onBack()` and unexpectedly closes the reopened screen. Suppress the pending pop for this in-app back, or wait for the pop before allowing re-entry.

