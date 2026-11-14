# External Review - Round 200 (codex)

Reviewer: codex (real external run). Scope: commit ed0e3b6, HEAD=ed0e3b6.

1. [major] [src/components/ClassShowScreen.tsx:74] In-app “Quay lại” leaves the pushed `classshow` history entry behind. Re-entering skips `pushState` because that stale entry still matches, so the next platform back can exit the WebView instead of returning to the hub. Remove or consume the entry on in-app back, and ensure each show entry is paired with its own pop handler.

