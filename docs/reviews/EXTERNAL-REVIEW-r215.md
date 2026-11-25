# External Review - Round 215 (codex)

Reviewer: codex (real external run). Scope: commit 1edf275, HEAD=1edf275.

1. [severity major] src/components/StartBatchScreen.tsx:575 - `lg:items-center` vertically centers the hero against the entire expanded ModeHub. Opening “Luyện & thi” pushes the primary “Chơi” CTA below the viewport and creates a large empty area above the hero; confirmed in `desktop-30-learn-cards.png` - use `lg:items-start` to keep the hero anchored when sections expand.

2. [severity minor] scripts/cr143-verify.mjs:43 - `[data-testid^="game-shelf-"]` matches no component; game entries use `game-card-*`. The conditional silently skips game verification while reporting success - target an enabled `game-card-*` and require picker/play assertions.

3. [severity minor] scripts/cr143-verify.mjs:61 - The Supabase abort pattern also blocks Vite’s `/src/lib/supabase/client.ts` module, preventing app startup. The saved `tablet-00-splash.png` is entirely white, so it provides no skeleton verification - intercept only backend requests, hold a request that actually controls auth loading, and assert the loading status and skeleton are visible before capture.

