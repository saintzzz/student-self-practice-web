# External Review - Round 254 (codex)

Reviewer: codex (real external run). Scope: commit 49cf28f, HEAD=49cf28f.

1. [severity major] scripts/artgen/run-flow-video.mjs:70-74 - Error detection scans the last 400 characters of the entire page, including previous failures and prompt text. Reproduced: “Previous request: error. Current request: generation has started.” returns a nonfatal failure immediately. The next asset starts while the current render remains pending, preserving the misattribution bug. - Fix: correlate terminal failure with the current request; abort on ambiguous errors.

2. [severity major] src/components/LoopingVideo.tsx:59-70 - Visible videos still autoplay and loop indefinitely without a user pause mechanism. Reduced-motion gating and offscreen pausing leave the previous accessibility finding unresolved for users viewing the page with default preferences. - Fix: provide an accessible pause/stop control outside decorative `aria-hidden` containers, or stop motion automatically.

3. [severity minor] src/components/LoopingVideo.tsx:34-57 - The playback effect depends only on `src`, although reduced motion can remove and recreate the video without changing that URL. Reproduced: mount with reduced motion enabled, then disable it; the video mounts with zero visibility listeners or intersection observers. Subsequent hidden/offscreen playback is unmanaged. - Fix: make effect setup and cleanup follow the actual video node and mounting gate.

