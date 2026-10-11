# CR-68 - Server-side score attestation (deferred r4 finding)

## Finding (external-review r4, Medium)

`practice.results` allows authenticated self-inserts with caller-supplied
`points`, `correct_count`, `time_used_sec`; `weekly_leaderboard` sums those
points; arena RPCs accept supplied scores. A student can forge competitive
results with a crafted REST call.

## Why deferred

Fixing requires moving scoring server-side: an RPC that accepts
`(form_id | session_id, answers)` and computes points from the trusted
question snapshot + recorded attempt events, with `results` insert locked
to that RPC. That changes the whole results write path (3 call sites in
`src/lib/practiceResults.ts`, guest-vs-auth differences, offline
buffering) - too large to land inside the r4 fix round.

## Design (approved direction)

1. `practice.submit_result(p_grade, p_program, p_form_id, p_answers jsonb,
   p_started_at)` - SECURITY DEFINER RPC. For form-based sessions it
   re-scores against `qb_exam_forms.question_ids`; for practice sessions it
   joins `qb_attempt_events` (already recorded server-side with
   `learner_id = auth.uid()`) and ignores any client claim that has no
   matching attempt event.
2. `results` insert policy tightened to `practice.is_admin()` or the RPC
   (drop `results_self_insert`), keeping select self/admin.
3. `weekly_leaderboard` unchanged (still sums results.points) once writes
   are trusted.
4. Client keeps instant local feedback; the stored row comes only from the
   RPC response.

## Interim mitigation already in place

- `qb_attempt_events` records every answer server-side, so forged rows are
  detectable by joining results vs attempt counts.
- Leaderboard audience is the demo class today - no money/grades depend on
  it yet. Must land before any real school deployment.
