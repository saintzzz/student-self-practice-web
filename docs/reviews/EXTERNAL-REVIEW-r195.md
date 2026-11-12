# External Review - Round 195 (codex)

Reviewer: codex (real external run). Scope: commit 53d71cd, HEAD=53d71cd.

1. [major] `public/sw.js:100` - Activation deletes every Cache Storage entry on the origin except this worker’s two caches, which can erase caches owned by unrelated apps or workers. Delete only prior `vieschool-static-*` and `vieschool-media-*` versions.

2. [minor] `src/components/PwaUi.tsx:61` - After `promptInstall()` consumes the install event, `installReady` stays true, so the chip remains visible and subsequent taps report “unavailable.” Clear the ready state when the prompt resolves or the app is installed.

