-- CR-101: anti-scrape rate limiting on the question-bank RPCs.
--
-- Threat: fetch_questions_public is anon-callable with p_count up to 200
-- and no throttle - a loop can drain the whole curated bank (prompt +
-- answer + explanation = the moat) in ~150 calls. RLS already blocks raw
-- table SELECT; this caps the RPC surface that legitimately must exist.
--
-- Design: rename the originals to *__impl (bodies untouched), revoke
-- direct EXECUTE so PostgREST cannot route around the wrappers, then
-- re-create the public names as thin rate-checking wrappers with the
-- same signatures/grants. Buckets:
--   public  - global guest budget: 300 calls AND 8,000 rows per hour
--   authed  - per-uid: 60 calls AND 4,000 rows per hour
-- Legit sessions cost ~1-2 calls of <=200 rows, so real students sit far
-- below the caps; a drain now needs hours of saturated global traffic,
-- and the rate_limits rows double as an alarm signal.
-- service_role bypasses: pipelines/jobs run under it.

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

alter function practice.fetch_questions_public(smallint, text, integer, text[], smallint, text)
  rename to fetch_questions_public__impl;
alter function practice.fetch_questions(smallint, text, integer, text[], smallint, text)
  rename to fetch_questions__impl;

revoke all on function practice.fetch_questions_public__impl(smallint, text, integer, text[], smallint, text)
  from public, anon, authenticated;
revoke all on function practice.fetch_questions__impl(smallint, text, integer, text[], smallint, text)
  from public, anon, authenticated;

create function practice.fetch_questions_public(
  p_grade smallint, p_subject text, p_count integer default 20,
  p_skills text[] default null::text[], p_min_difficulty smallint default null::smallint,
  p_mode text default 'practice'::text
)
returns setof jsonb
language plpgsql
security definer
set search_path to 'practice', 'pg_catalog'
as $function$
begin
  if practice.check_rate_limit('fq_pub_calls', 300, 3600) < 0
     or practice.check_rate_limit_weighted(
          'fq_pub_rows', greatest(1, least(p_count, 200)), 8000, 3600) < 0 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  return query
    select * from practice.fetch_questions_public__impl(
      p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode);
end;
$function$;

create function practice.fetch_questions(
  p_grade smallint, p_subject text, p_count integer default 20,
  p_skills text[] default null::text[], p_min_difficulty smallint default null::smallint,
  p_mode text default 'practice'::text
)
returns setof jsonb
language plpgsql
security definer
set search_path to 'practice', 'pg_catalog'
as $function$
declare
  v_uid text := coalesce(auth.uid()::text, 'anon');
begin
  -- service_role (pipelines, admin jobs) bypasses the student caps.
  if auth.role() = 'service_role' then
    return query
      select * from practice.fetch_questions__impl(
        p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode);
    return;
  end if;
  if practice.check_rate_limit('fq_uid_calls:' || v_uid, 60, 3600) < 0
     or practice.check_rate_limit_weighted(
          'fq_uid_rows:' || v_uid, greatest(1, least(p_count, 200)), 4000, 3600) < 0 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  return query
    select * from practice.fetch_questions__impl(
      p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode);
end;
$function$;

grant execute on function practice.fetch_questions_public(smallint, text, integer, text[], smallint, text)
  to anon, authenticated, service_role;
grant execute on function practice.fetch_questions(smallint, text, integer, text[], smallint, text)
  to authenticated, service_role;
