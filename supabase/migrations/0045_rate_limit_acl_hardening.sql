-- CR-101 r98 follow-up: ACL hardening for the rate-limit surface.
--
-- External review r98 (verified against remote proacl):
--   BLOCKER  check_rate_limit_weighted was created without an EXECUTE
--            revoke -> default PUBLIC EXECUTE let anon rewrite any bucket
--            (weight 0 + window 0 resets, negative weight subtracts quota).
--   MAJOR    the new fetch_questions wrapper also kept default PUBLIC
--            EXECUTE -> anon gained a separate 'anon' 60-call/4,000-row
--            budget outside the advertised guest caps.
-- Fix: revoke PUBLIC/anon on the helper + the authenticated wrapper,
-- tighten the public wrapper to named roles only, and guard the helper
-- against non-positive weights/windows defence-in-depth.

revoke all on function practice.check_rate_limit_weighted(text, integer, integer, integer)
  from public, anon, authenticated;

revoke all on function practice.fetch_questions(smallint, text, integer, text[], smallint, text)
  from public, anon;

revoke all on function practice.fetch_questions_public(smallint, text, integer, text[], smallint, text)
  from public;

grant execute on function practice.fetch_questions(smallint, text, integer, text[], smallint, text)
  to authenticated, service_role;
grant execute on function practice.fetch_questions_public(smallint, text, integer, text[], smallint, text)
  to anon, authenticated, service_role;

-- Defence in depth: even if a future grant mistake re-exposes the helper,
-- it must not accept weights/windows that can drain or reset buckets.
create or replace function practice.check_rate_limit_weighted(
  p_bucket text, p_weight integer, p_max integer, p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path to 'practice', 'pg_catalog'
as $function$
declare
  v_count int;
begin
  if p_weight < 1 or p_max < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit_args';
  end if;
  insert into practice.rate_limits (bucket, window_start, count)
  values (p_bucket, now(), p_weight)
  on conflict (bucket) do update
    set count = case
        when practice.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then p_weight
        else practice.rate_limits.count + p_weight
      end,
      window_start = case
        when practice.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else practice.rate_limits.window_start
      end
  returning count into v_count;
  if v_count > p_max then
    return -1;
  end if;
  return p_max - v_count;
end;
$function$;

revoke all on function practice.check_rate_limit_weighted(text, integer, integer, integer)
  from public, anon, authenticated;
