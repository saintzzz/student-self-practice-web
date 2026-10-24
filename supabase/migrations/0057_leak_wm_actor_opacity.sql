-- CR-109 r115 fix (0057): guest actor opacity + fuller wm payload.
--
-- r115 major: v_actor baked 'guest:' || raw client_ip() into
-- qb_fetch_audit.actor - the raw IP sat next to the pseudonymous
-- ip_hash column it exists to replace. Guest actor is now
-- 'guest:' || first16(ip_hash) - stable per source, no raw IP.
--
-- r115 minor: wm signed only id:actor despite the documented
-- id|actor|ip_hash|rpc payload - two fetches by one uid from
-- different IPs produced identical tags, blurring attribution.
-- leak_wm_tag now signs the full payload; same uid on a new IP or
-- a different RPC yields a different tag.
--
-- The 3-arg helper overload is dropped so no caller can tag with
-- the weaker payload.

create or replace function practice.leak_wm_tag(
  p_row_id text, p_actor text, p_ip_hash text, p_rpc text, p_secret text
)
returns jsonb
language sql
stable
as $$
  select case when p_secret is null then '{}'::jsonb
    else jsonb_build_object('wm',
      left(encode(extensions.hmac(
        (p_row_id || '|' || p_actor || '|' ||
         coalesce(p_ip_hash, '') || '|' || p_rpc)::bytea,
        p_secret::bytea, 'sha256'), 'hex'), 16))
  end;
$$;

revoke all on function practice.leak_wm_tag(text, text, text, text, text)
  from public, anon, authenticated;
drop function if exists practice.leak_wm_tag(text, text, text);

-- ---------- fetch_questions ----------
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
  v_ip_hash text := case when v_ip is null then null
    else encode(extensions.digest(v_ip::bytea, 'sha256'), 'hex') end;
  v_rows int := greatest(1, least(p_count, 200));
  v_actor text := coalesce(auth.uid()::text,
    'guest:' || coalesce(left(v_ip_hash, 16), 'unknown'));
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
     and (practice.check_rate_limit('fq_ip_calls:' || v_ip, 100, 3600) < 0
       or practice.check_rate_limit_weighted('fq_ip_rows:' || v_ip, v_rows, 3000, 3600) < 0) then
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
    return next rec.r || practice.leak_wm_tag(
      rec.r->>'id', v_actor, v_ip_hash, 'fetch_questions', v_secret);
  end loop;
  perform practice.log_fetch_audit('fetch_questions', v_ids, v_actor);
end;
$$;

grant execute on function practice.fetch_questions(smallint, text, integer, text[], smallint, text)
  to authenticated, service_role;

-- ---------- fetch_questions_adaptive ----------
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
  v_ip_hash text := case when v_ip is null then null
    else encode(extensions.digest(v_ip::bytea, 'sha256'), 'hex') end;
  v_rows int := greatest(1, least(p_count, 200));
  v_actor text := coalesce(auth.uid()::text,
    'guest:' || coalesce(left(v_ip_hash, 16), 'unknown'));
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
  -- r104: charge the SHARED fq_* buckets, not a parallel fqa_* set -
  -- separate buckets would let a caller exhaust the adaptive allowance
  -- and re-draw through fetch_questions, doubling the aggregate cap
  -- the 0049 anti-splitting design put in place.
  if v_ip is not null
     and (practice.check_rate_limit('fq_ip_calls:' || v_ip, 100, 3600) < 0
       or practice.check_rate_limit_weighted('fq_ip_rows:' || v_ip, v_rows, 3000, 3600) < 0) then
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
    return next rec.r || practice.leak_wm_tag(
      rec.r->>'id', v_actor, v_ip_hash, 'fetch_questions_adaptive', v_secret);
  end loop;
  perform practice.log_fetch_audit('fetch_questions_adaptive', v_ids, v_actor);
end;
$$;

grant execute on function practice.fetch_questions_adaptive(smallint, text, integer, text[], smallint, text)
  to authenticated, service_role;
revoke all on function practice.fetch_questions_adaptive(smallint, text, integer, text[], smallint, text)
  from public, anon;

-- ---------- fetch_questions_public: guest path (ticket required) ----------
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
  v_ip_hash text := case when v_ip is null then null
    else encode(extensions.digest(v_ip::bytea, 'sha256'), 'hex') end;
  v_rows int := greatest(1, least(p_count, 200));
  v_actor text := coalesce(auth.uid()::text,
    'guest:' || coalesce(left(v_ip_hash, 16), 'unknown'));
  v_secret text;
  v_ids text[] := '{}';
  rec record;
begin
  if auth.uid() is null and not practice.verify_guest_ticket(p_guest_ticket) then
    raise exception 'guest_challenge_required' using errcode = 'PT401';
  end if;
  if v_ip is not null
     and (practice.check_rate_limit('fq_ip_calls:' || v_ip, 60, 3600) < 0
       or practice.check_rate_limit_weighted('fq_ip_rows:' || v_ip, v_rows, 2500, 3600) < 0) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  if practice.check_rate_limit('fq_pub_calls', 300, 3600) < 0
     or practice.check_rate_limit_weighted('fq_pub_rows', v_rows, 8000, 3600) < 0 then
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
    return next rec.r || practice.leak_wm_tag(
      rec.r->>'id', v_actor, v_ip_hash, 'fetch_questions_public', v_secret);
  end loop;
  perform practice.log_fetch_audit('fetch_questions_public', v_ids, v_actor);
end;
$$;

grant execute on function practice.fetch_questions_public(smallint, text, integer, text[], smallint, text, text)
  to anon, authenticated, service_role;
