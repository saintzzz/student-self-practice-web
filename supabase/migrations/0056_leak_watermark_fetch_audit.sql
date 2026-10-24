-- CR-109 lop-1 #3/#4 (0056): leak watermark + fetch audit.
--
-- Two forensic layers for bank-drain incidents:
--   qb_fetch_audit records (actor, ip_hash, rpc, question_ids, ts) for
--   every student-path fetch - a leaked row id maps to the fetchers
--   who received it.
--   wm: each emitted row carries `wm` = first 16 hex of
--   hmac_sha256(id || ':' || actor, vault secret) - invisible to the
--   client (extra key, ignored by renderers) and survives in dumps
--   that keep row fields; a candidate actor is verified by
--   recomputation against the audit log's candidate set.
--
-- service_role bypass arms stay unmarked - pipeline context is not a
-- drain surface. Audit is exception-swallowed: forensics must never
-- break a fetch.

create table if not exists practice.qb_fetch_audit (
  id bigint generated always as identity primary key,
  actor text not null,
  ip_hash text,
  rpc text not null,
  question_ids text[] not null,
  fetched_at timestamptz not null default now()
);
alter table practice.qb_fetch_audit enable row level security;
revoke all on practice.qb_fetch_audit from public, anon, authenticated;
create index if not exists qb_fetch_audit_fetched_at
  on practice.qb_fetch_audit (fetched_at desc);
create index if not exists qb_fetch_audit_actor
  on practice.qb_fetch_audit (actor);

create or replace function practice.log_fetch_audit(
  p_rpc text, p_question_ids text[], p_actor text
)
returns void
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
begin
  insert into practice.qb_fetch_audit(actor, ip_hash, rpc, question_ids)
  values (
    p_actor,
    case when practice.client_ip() is null then null
         else encode(extensions.digest(practice.client_ip()::bytea, 'sha256'), 'hex')
    end,
    p_rpc, p_question_ids);
exception when others then
  null; -- forensics must never break a fetch
end;
$$;

revoke all on function practice.log_fetch_audit(text, text[], text)
  from public, anon, authenticated;

-- The emit pattern is identical across the three fetch wrappers:
-- strip, tag, collect ids, return. A helper keeps the three sites
-- byte-identical and keeps the vault read hoisted per call by the
-- caller (vault view per row would be a real cost).
create or replace function practice.leak_wm_tag(
  p_row_id text, p_actor text, p_secret text
)
returns jsonb
language sql
stable
as $$
  select case when p_secret is null then '{}'::jsonb
    else jsonb_build_object('wm',
      left(encode(extensions.hmac(
        (p_row_id || ':' || p_actor)::bytea, p_secret::bytea, 'sha256'), 'hex'), 16))
  end;
$$;

revoke all on function practice.leak_wm_tag(text, text, text)
  from public, anon, authenticated;

-- ---------- fetch_questions: student path gains wm + audit ----------
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
    return next rec.r || practice.leak_wm_tag(rec.r->>'id', v_actor, v_secret);
  end loop;
  perform practice.log_fetch_audit('fetch_questions', v_ids, v_actor);
end;
$$;

grant execute on function practice.fetch_questions(smallint, text, integer, text[], smallint, text)
  to authenticated, service_role;

-- ---------- fetch_questions_adaptive: same treatment ----------
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
    return next rec.r || practice.leak_wm_tag(rec.r->>'id', v_actor, v_secret);
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
  v_rows int := greatest(1, least(p_count, 200));
  v_actor text := coalesce(auth.uid()::text, 'guest:' || coalesce(practice.client_ip(), 'unknown'));
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
    return next rec.r || practice.leak_wm_tag(rec.r->>'id', v_actor, v_secret);
  end loop;
  perform practice.log_fetch_audit('fetch_questions_public', v_ids, v_actor);
end;
$$;

grant execute on function practice.fetch_questions_public(smallint, text, integer, text[], smallint, text, text)
  to anon, authenticated, service_role;
