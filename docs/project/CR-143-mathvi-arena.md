# CR-143: math-vi live arena (đấu trường toán)

Research: `docs/research/edu-apps/2026-W47.md` G2 - VioEdu's arena
events drew 5M+ VN students; gamification meta-analyses find
competition + collaboration is the strongest combo for behavioral
outcomes. Our realtime race infra (`arenaLive.ts`: presence roster,
broadcast progress, RPC persistence) exists but serves EN only.

## Problem

math-vi (~1175 items, visual puzzles since CR-136) has no social/live
mode. Live class play is the proven VN engagement pattern (đấu trường)
and a differentiator vs pure self-practice.

## Scope (proposal)

- Extend the arena lobby/race flow to the math-vi bank: host picks
  grade + math-vi program, joiners race the same seed (existing
  LiveRoom contract already carries gradeId/programId).
- Accuracy-primary scoring: correct count is the score; completion
  timeMs is tiebreak only, never displayed as the leaderboard metric
  (Kahoot speed-scoring critique - W47 G5 guardrail).
- Reuse the existing arena UI shell + LiveScore; math questions render
  via the math-vi question components (incl. visual-puzzle).
- Team/coop variant explicitly OUT of v1 (BACKLOG item 8).

## Acceptance

- Two signed-in clients can run a math-vi race end-to-end; roster and
  progress update over realtime.
- Final standings rank by correct count, tiebreak by timeMs.
- Guest/offline path degrades gracefully (existing pattern).
- Full SDLC + external review.
