# External Review - Round 150 (codex)

Reviewer: codex (real external run). Scope: commit d22f486, HEAD=d22f486.

1. [severity major] src/components/scene/LandArt.tsx:74 - Viewport-relative fading does not separate art from content: on tall screens, the first grade card and waypoints start inside the fully opaque upper 50%; scrolling moves subsequent content through that same artwork. The heading and prompt also remain unprotected, contradicting the new surface rule. - Fix by confining art to a dedicated hero region and placing map content on an opaque surface; give overlapping header copy its own surface.

