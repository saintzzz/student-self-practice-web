# External Review - Round 223 (codex)

Reviewer: codex (real external run). Scope: commit 77ef7ca, HEAD=77ef7ca.

1. [severity major] src/lib/qb/bank.ts:290 - Quarantine checks only whether *any* asset survives. Mixed-path rows can retain an unrelated prompt image or lose required option images and fall back to answer-revealing labels. - Fix: validate required prompt/option assets after filtering; drop rows whose required images no longer resolve.

2. [severity minor] src/games/games/OddOneOut.tsx:70 - New hooks occur after `if (!q) return null`, violating hook ordering and crashing if props switch between empty and populated round pools. - Fix: move both hooks above the early return.

