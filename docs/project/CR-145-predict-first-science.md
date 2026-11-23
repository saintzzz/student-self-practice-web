# CR-145: predict-first science round (POE wrapper)

Research: `docs/research/edu-apps/2026-W48.md` G2 - POE
(Predict-Observe-Explain) meta-analysis of 35 studies: g=0.979 overall,
elementary band g=1.015, the strongest measured science effect we
surveyed. The active ingredient is committing to a prediction before
the correct claim appears, then reconciling - not hands-on materials
(Slavin: kits alone ES=+0.02).

## Problem

Every khoa-hoc item asks for the answer directly. The child never
stakes a claim, so a correct answer confirms nothing and a wrong one
surprises nothing - the prediction-commit-then-correct cycle that the
evidence says drives elementary science learning never runs.

## Scope (proposal - NOT this cycle)

- A predict-first variant for science MCQ items: the question appears
  with its options, the child taps what they predict is true (no
  scoring), the item then runs normally - answer, verdict, and the
  CR-144 "Goi y" feedback - with a one-line reconcile note when the
  prediction was wrong ("Ban doan X - thuc ra Y vi...").
- Prediction tap is explicitly ungraded - it must never feed skill
  stats, streaks, or adaptive signals (guardrail mirrors CR-106 taught
  semantics).
- Candidate homes: a dedicated "Du doan" practice mode on the khoa-hoc
  track first; exam/mock sittings stay predict-free.
- Needs a small session-flow change + child-readable design pass
  (Designer phase, not a one-line patch).

## Acceptance (when picked up)

- Prediction is committed before the answer step and visibly reconciled
  after; ungraded end-to-end.
- Works for generated science items without touching EN/math flows.
- Full SDLC + external review.
