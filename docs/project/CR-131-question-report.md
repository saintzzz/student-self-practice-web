# CR-131 - "Báo lỗi câu này" (one-tap question report)

## Why

Bank has 132k+ questions. Quality issues surface only when a user
notices wrong answer/typo/bad audio - and has no way to tell us. A
one-tap report button under the explanation turns every attempt into a
QA signal for the content pipeline (learned from Cupimath competitive
audit, docs/research/competitive-cupimath.md finding #3).

## Scope

- `question_reports` table: question_id (text, works for both bank and
  generated questions), student/session ref, report kind (wrong-answer |
  typo | confusing | audio | other), free note (optional, 200 chars),
  created_at, resolved_at/resolved_by.
- RLS: insert-only for authenticated + guest session tokens; select
  restricted to staff. No PII beyond profile id.
- UI: small text button "Báo lỗi câu này" under the explanation panel in
  the feedback state (exam review + game round review). Opens a 4-chip
  picker + optional note, one tap to submit, toast confirmation. Hidden
  after submit (idempotent per question per student).
- Admin surface: defer to a later CR - reports land in the table, a
  weekly digest can reuse existing reporting infra.

## Non-goals

No admin triage UI, no auto-removal of questions, no rate limiting
beyond one report per question per student per day.

## Impact

- New migration + RLS (supabase).
- Touch points: explanation/feedback component(s) in exam + game flow,
  i18n copy (hyphen only), one unit test for the insert path.
- Zero effect on existing question rendering when the table is empty.
