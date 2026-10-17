# External Review - Round 35 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit a632452, HEAD=a632452.

1. [major] src/lib/ui/tokens.ts:116 - White text on the new 400-to-600 gradients fails WCAG AA contrast; amber is approximately 1.7:1–3.2:1, below 4.5:1 for the small labels and taglines. Shared styles affect hub tiles and all game cards; translucent subtitles and expanded brightness worsen contrast. Fix: darken the gradients or place text on an opaque surface with verified contrast across every tone and state.

Repository inspection was blocked by execution policy; review is limited to the supplied diff.

