-- CR-102 fix: new 0046 functions kept default PUBLIC EXECUTE (same
-- bug class as r98). Lock to named roles only.
revoke all on function practice.fetch_form(text) from public, anon;
revoke all on function practice.assignment_form(uuid) from public, anon;
revoke all on function practice.score_bank_attempts(jsonb) from public;

grant execute on function practice.fetch_form(text) to anon, authenticated, service_role;
grant execute on function practice.assignment_form(uuid) to authenticated, service_role;
grant execute on function practice.score_bank_attempts(jsonb) to anon, authenticated, service_role;
