# External Review - Round 260 (codex)

Reviewer: codex (real external run). Scope: commit 1227c5d, HEAD=1227c5d.

1. [severity major] src/games/GameScreen.tsx:170 - Award checking runs only after standalone games. Completing the qualifying level through `GameSection` or merging progress across devices leaves `game-master` locked until another standalone game finishes. Reproduced: merging 5 + 5 mastered games yields 10 eligible games without the sticker; explicitly calling `checkGameMaster()` grants it. Fix: evaluate after `recordGameResult` updates best scores and after loading/merging saved progress; add embedded-completion and sync-threshold regression tests.

