# External Review - Round 82 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 6b1e96f, HEAD=6b1e96f.

1. [major] src/index.css:240 - All feedback moods now animate infinitely, replacing the previous one-shot/two-play policy. Persistent bouncing distracts children during feedback and provides no pause mechanism - restore finite iterations for happy, celebrating, greeting, thinking and encouraging; retain reduced-motion support.

2. [minor] src/components/mascot/MascotArt.tsx:39 - One failed image permanently forces this component instance into SVG fallback, including subsequent moods and sizes. `key={file}` on the child image cannot reset the parent’s `failed` state - track failure by asset URL or key `MascotArt` by the resolved asset.

Review limited to supplied diff; local inspection was blocked by execution policy.

