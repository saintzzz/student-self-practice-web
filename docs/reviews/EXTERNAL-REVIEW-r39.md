# External Review - Round 39 (Codex CLI)

Reviewer: codex-cli (real external run). Scope: commit 7aa99b1, HEAD=7aa99b1.

1. [severity major] src/games/GameScreen.tsx:197 - “Chọn màn” preserves `seed`; selecting the same level repeats identical questions and the same award objective, so subsequent completed runs receive no new award. - Generate a fresh seed whenever a level is selected.

2. [severity minor] src/lib/engagement/store.ts:439 - Omitting `level` records an L1 objective but updates only the aggregate best; `gameLevelStars(gameId, 1)` remains zero for these callers. - Normalize `level ?? 1` once and always update both best-star keys.

3. [severity minor] src/games/GameScreen.tsx:115 - Speed bonus ignores performance: an immediate zero-point loss can display “+điểm nhanh,” rewarding failure over successful play. - Gate the bonus on successful completion or scale it by earned accuracy.

Repository reads were policy-blocked; findings are based on the supplied diff. Deployed UI was not verified.

