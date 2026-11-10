-- CR-134 r184 fix (0078): identity-separated per-IP fetch buckets.
--
-- 0076/0077 raised authed caps but kept charging the SHARED
-- fq_ip_calls:/fq_ip_rows: keys for both identities. Classroom traffic
-- pushes the shared counter past 60 calls / 2500 rows, then guests on
-- the same school IP trip the guest caps even though the comments
-- claimed the budgets were separate.
--
-- Fix: authenticated callers charge dedicated fq_ip_auth_* buckets
-- (400 calls / 30000 rows - the 0076 classroom sizing); guests keep
-- charging fq_ip_* (60 / 2500). Neither identity can exhaust the
-- other's allowance. Per-uid and shared public pools are unchanged.

create or replace function practice.fetch_questions(
  p_grade smallint, p_subject text, p_count integer default 20,
  p_skills text[] default null::text[], p_min_difficulty smallint default null::smallint,
  p_mode text default 'practice'::text
)
returns setof jsonb
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  v_uid text := coalesce(auth.uid()::text, 'anon');
  v_ip text := practice.client_ip();
  v_rows int := greatest(1, least(p_count, 200));
  v_actor text := coalesce(auth.uid()::text, 'guest:' || coalesce(practice.client_ip(), 'unknown'));
  v_secret text;
  v_ids text[] := '{}';
  rec record;
begin
  -- service_role (pipelines, admin jobs) bypasses the student caps only -
  -- rows are still keyless (0046); full rows stay table-level access.
  if auth.role() = 'service_role' then
    return query
      select practice.strip_bank_row(j)
      from practice.fetch_questions__impl(
        p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j;
    return;
  end if;
  if v_ip is not null
     and (practice.check_rate_limit('fq_ip_auth_calls:' || v_ip, 400, 3600) < 0
       or practice.check_rate_limit_weighted('fq_ip_auth_rows:' || v_ip, v_rows, 30000, 3600) < 0) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  if practice.check_rate_limit('fq_uid_calls:' || v_uid, 60, 3600) < 0
     or practice.check_rate_limit_weighted('fq_uid_rows:' || v_uid, v_rows, 4000, 3600) < 0 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'leak_wm_secret' limit 1;
  -- CR-102: keyless rows - strip_bank_row removes answer + explanation_vi.
  for rec in
    select practice.strip_bank_row(j) as r
    from practice.fetch_questions__impl(
      p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j
  loop
    v_ids := v_ids || (rec.r->>'id');
    return next rec.r || practice.leak_wm_tag(rec.r->>'id', v_actor, v_secret);
  end loop;
  perform practice.log_fetch_audit('fetch_questions', v_ids, v_actor);
end;
$$;

grant execute on function practice.fetch_questions(smallint, text, integer, text[], smallint, text)
  to authenticated, service_role;

create or replace function practice.fetch_questions_adaptive(
  p_grade smallint, p_subject text, p_count integer default 20,
  p_skills text[] default null::text[], p_min_difficulty smallint default null::smallint,
  p_mode text default 'practice'::text
)
returns setof jsonb
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  v_uid text := coalesce(auth.uid()::text, 'anon');
  v_ip text := practice.client_ip();
  v_rows int := greatest(1, least(p_count, 200));
  v_actor text := coalesce(auth.uid()::text, 'guest:' || coalesce(practice.client_ip(), 'unknown'));
  v_secret text;
  v_ids text[] := '{}';
  rec record;
begin
  if auth.role() = 'service_role' then
    return query
      select practice.strip_bank_row(j)
      from practice.fetch_questions_adaptive__impl(
        p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j;
    return;
  end if;
  -- r104: charge the SHARED fq_ip_auth_* buckets, not a parallel set -
  -- separate keys would let a caller exhaust one wrapper's allowance
  -- and re-draw through the other, doubling the aggregate cap the 0049
  -- anti-splitting design put in place. (Renamed fq_ip_* -> fq_ip_auth_*
  -- in 0078 so authed load can never trip the stricter guest bucket.)
  if v_ip is not null
     and (practice.check_rate_limit('fq_ip_auth_calls:' || v_ip, 400, 3600) < 0
       or practice.check_rate_limit_weighted('fq_ip_auth_rows:' || v_ip, v_rows, 30000, 3600) < 0) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  if practice.check_rate_limit('fq_uid_calls:' || v_uid, 60, 3600) < 0
     or practice.check_rate_limit_weighted('fq_uid_rows:' || v_uid, v_rows, 4000, 3600) < 0 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'leak_wm_secret' limit 1;
  for rec in
    select practice.strip_bank_row(j) as r
    from practice.fetch_questions_adaptive__impl(
      p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j
  loop
    v_ids := v_ids || (rec.r->>'id');
    return next rec.r || practice.leak_wm_tag(rec.r->>'id', v_actor, v_secret);
  end loop;
  perform practice.log_fetch_audit('fetch_questions_adaptive', v_ids, v_actor);
end;
$$;

grant execute on function practice.fetch_questions_adaptive(smallint, text, integer, text[], smallint, text)
  to authenticated, service_role;
revoke all on function practice.fetch_questions_adaptive(smallint, text, integer, text[], smallint, text)
  from public, anon;

create or replace function practice.fetch_questions_public(
  p_grade smallint, p_subject text, p_count integer default 20,
  p_skills text[] default null::text[], p_min_difficulty smallint default null::smallint,
  p_mode text default 'practice'::text, p_guest_ticket text default null::text
)
returns setof jsonb
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  v_ip text := practice.client_ip();
  v_rows int := greatest(1, least(p_count, 200));
  v_actor text := coalesce(auth.uid()::text, 'guest:' || coalesce(practice.client_ip(), 'unknown'));
  v_secret text;
  v_ids text[] := '{}';
  rec record;
begin
  if auth.uid() is null and not practice.verify_guest_ticket(p_guest_ticket) then
    raise exception 'guest_challenge_required' using errcode = 'PT401';
  end if;
  if v_ip is not null then
    if auth.uid() is not null then
      -- Authenticated classroom: school-NAT caps from 0076, charged to
      -- the dedicated auth buckets so guests behind the same NAT keep
      -- their own untouched allowance.
      if practice.check_rate_limit('fq_ip_auth_calls:' || v_ip, 400, 3600) < 0
         or practice.check_rate_limit_weighted('fq_ip_auth_rows:' || v_ip, v_rows, 30000, 3600) < 0 then
        raise exception 'rate_limited' using errcode = 'PT429';
      end if;
    elsif practice.check_rate_limit('fq_ip_calls:' || v_ip, 60, 3600) < 0
       or practice.check_rate_limit_weighted('fq_ip_rows:' || v_ip, v_rows, 2500, 3600) < 0 then
      raise exception 'rate_limited' using errcode = 'PT429';
    end if;
  end if;
  -- Authenticated callers keep their per-uid budget here too: without
  -- this charge the public wrapper would bypass the 4000-row uid cap on
  -- the authed path and become the stronger scraping route. Charging
  -- the SHARED fq_uid_* keys also blocks uid double-draw across the two
  -- paths (the 0049 anti-splitting design).
  if auth.uid() is not null
     and (practice.check_rate_limit('fq_uid_calls:' || auth.uid()::text, 60, 3600) < 0
       or practice.check_rate_limit_weighted('fq_uid_rows:' || auth.uid()::text, v_rows, 4000, 3600) < 0) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  -- The shared public pool bounds the anonymous surface; authenticated
  -- callers are already bounded by per-uid caps elsewhere and must not
  -- drain the guest budget (a classroom would starve every guest).
  if auth.uid() is null
     and (practice.check_rate_limit('fq_pub_calls', 300, 3600) < 0
       or practice.check_rate_limit_weighted('fq_pub_rows', v_rows, 8000, 3600) < 0) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'leak_wm_secret' limit 1;
  for rec in
    select practice.strip_bank_row(j) as r
    from practice.fetch_questions_public__impl(
      p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j
  loop
    v_ids := v_ids || (rec.r->>'id');
    return next rec.r || practice.leak_wm_tag(rec.r->>'id', v_actor, v_secret);
  end loop;
  perform practice.log_fetch_audit('fetch_questions_public', v_ids, v_actor);
end;
$$;

grant execute on function practice.fetch_questions_public(smallint, text, integer, text[], smallint, text, text)
  to anon, authenticated, service_role;
