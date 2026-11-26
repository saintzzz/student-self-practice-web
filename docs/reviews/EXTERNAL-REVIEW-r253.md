# External Review - Round 253 (codex)

Reviewer: codex (real external run). Scope: commit 2de92eb, HEAD=2de92eb.

1. [severity major] src/components/LoopingVideo.tsx:26 - Every clip autoplays indefinitely, including under reduced motion, with no pause mechanism. CSS animation guards do not stop video playback - use `usePrefersReducedMotion()` to render the still fallback and provide an accessible pause control for ongoing motion.

2. [severity major] src/components/LoopingVideo.tsx:24 - The claimed reduced-data fallback is absent: `src` and autoplay are unconditional. Each hero clip is 2.8–3.6 MB; `preload="metadata"` does not cap autoplay downloads - gate video mounting/source assignment on data-saving preferences and retain the still image.

3. [severity major] scripts/artgen/run-flow-video.mjs:74 - A stopped agent response after 90 seconds is treated as generation failure despite the documented ~5-minute render. The next asset then starts while the previous render remains pending; its late card can be downloaded under the next asset’s filename - wait for explicit generation failure or the full render deadline, and correlate cards with their originating request.

4. [severity minor] scripts/artgen/run-flow-video.mjs:105 - Default `projectHint` is only `cfedce1d`, but navigation uses it as the complete project ID. The script finds the correct open tab, then navigates away to a truncated project URL - extract and preserve the full project URL from the matched tab, or require a complete ID.

5. [severity minor] src/components/LoopingVideo.tsx:20 - `failed` permanently hides the mounted component after one error, even when `src` changes. Switching lands after a failed clip cannot recover - scope failure state to the failed URL or key the component by `src`.

