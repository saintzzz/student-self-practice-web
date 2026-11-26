# External Review - Round 250 (codex)

Reviewer: codex (real external run). Scope: base dd3dc4f~1, HEAD=8392c82.

1. [severity major] src/lib/content/imageSemantics.ts:92 - Grapes re-enter counting pools without a working fallback: the vocabulary image and emoji override reference the **same WebP**. If that file fails, both tiers fail and native 🍇 shows bunches, teaching the wrong quantity - retain the exclusion until an independent, count-safe fallback exists; test image-load failure.

2. [severity major] scripts/artgen/run-flow.mjs:156 - `continue` skips the circuit-breaker check and delay on every no-image response. An in-memory reproduction submitted 40 consecutive failures despite `FAIL_BREAKER = 8` - route unsuccessful responses through the shared breaker and pacing logic.

3. [severity major] supabase/migrations/0083_class_week_lanterns.sql:39 - `program = 'batch'` also counts placement tests: `savePlacementResult()` omits `program`, inheriting the database’s `'batch'` default. Classes can earn completion credit and stickers without completing practice batches - distinguish placement results explicitly and exclude them from the aggregate, including existing rows.

4. [severity minor] src/components/ClassLanternCard.tsx:33 - Reward keys use the browser’s local week, while the SQL aggregate uses the database session’s week. Around Monday midnight these can disagree, recording the previous week’s achievement under the new week - return an authoritative week key from the RPC using an explicit timezone and use it for claims.

5. [severity minor] src/components/ClassLanternCard.tsx:51 - `aria-hidden` hides the achievement message as well as the decorative dots. Screen-reader users never hear that the goal was reached or the sticker awarded - hide only the dots/icons and expose the achievement text through a status region.

