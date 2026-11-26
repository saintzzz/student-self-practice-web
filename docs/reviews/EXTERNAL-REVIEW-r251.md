# External Review - Round 251 (codex)

Reviewer: codex (real external run). Scope: commit HEAD, HEAD=ec3099d.

1. [severity minor] src/components/ClassLanternCard.tsx:67 - `role="status"` mounts with its message only after fetching; no live region exists beforehand because line 42 returns `null`. The achievement is readable but may go unannounced - mount an empty status region before fetching, then populate it when `met` resolves. ([w3.org](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22))

