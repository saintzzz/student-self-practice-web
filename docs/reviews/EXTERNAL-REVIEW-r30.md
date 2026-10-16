# External Review - Round 30 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 2d4df5a, HEAD=2d4df5a.

1. [major] src/components/PicturePairMatchingQuestion.tsx:36 - `touch-pan-y` lets the browser claim vertical gestures and cancel pointer events, breaking vertical/diagonal touch drags between tiles. - Use `touch-action: none` on tiles while drag is enabled; preserve scrolling outside tiles.

2. [minor] src/hooks/useDragTile.tsx:49 - Cleanup leaves the pending animation frame alive. Releasing/cancelling before it runs recreates the ghost and hover state after the drag ends, leaving stale UI onscreen. - Cancel the frame during cleanup and guard its callback against an ended session.

3. [minor] src/components/DemoHint.tsx:80 - Reduced-motion disables the animation, so `onAnimationEnd` never fires. The amber dot remains over the control until another interaction and never completes automatically. - Skip the hint under reduced-motion or dismiss it with a cleaned-up timeout.

Review based on the supplied diff; local inspection was blocked by execution policy.

