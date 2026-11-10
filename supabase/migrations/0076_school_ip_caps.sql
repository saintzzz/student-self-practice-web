-- CR-134 (0076): school-deployment per-IP caps.
--
-- Problem: a VN classroom is 40-45 students behind ONE school NAT IP.
-- The 0049/0051/0056 authed per-IP caps (100 calls / 3000 rows per hour)
-- were sized for a household, not a school: one 120-question mock exam
-- for 30 students already draws 3600 rows and trips PT429 mid-lesson.
-- score_bank_attempts is worse: 1500 weighted rows per IP per hour vs
-- 40 students x 120 answers = 4800.
--
-- Fix: raise AUTHENTICATED per-IP caps to classroom scale. The per-uid
-- caps are unchanged and remain the real abuse bound - accounts are
-- admin-provisioned (no self-serve signup), so an attacker cannot mint
-- accounts to multiply a uid budget through the wider IP bucket.
-- Guest/public IP caps (fq_ip_* 60/2500 inside fetch_questions_public,
-- sba_guest_*) stay exactly as they were - the unauthenticated path is
-- still the scraping surface and keeps its household sizing.
--
-- New authed IP caps: 400 calls/hr, 30000 weighted rows/hr
-- (3 classes x 45 HS x ~200 rows, with retry headroom).
-- sba: 400 calls/hr, 30000 weighted rows/hr.

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
     and (practice.check_rate_limit('fq_ip_calls:' || v_ip, 400, 3600) < 0
       or practice.check_rate_limit_weighted('fq_ip_rows:' || v_ip, v_rows, 30000, 3600) < 0) then
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
  -- r104: charge the SHARED fq_* buckets, not a parallel fqa_* set -
  -- separate buckets would let a caller exhaust the adaptive allowance
  -- and re-draw through fetch_questions, doubling the aggregate cap
  -- the 0049 anti-splitting design put in place.
  if v_ip is not null
     and (practice.check_rate_limit('fq_ip_calls:' || v_ip, 400, 3600) < 0
       or practice.check_rate_limit_weighted('fq_ip_rows:' || v_ip, v_rows, 30000, 3600) < 0) then
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

create or replace function practice.score_bank_attempts(p_attempts jsonb)
returns setof jsonb
language plpgsql
security definer
set search_path to 'practice', 'pg_catalog'
as $function$
declare
  v_uid text := coalesce(auth.uid()::text, 'anon');
  v_ip text := practice.client_ip();
  v_n int := greatest(1, case when jsonb_typeof(coalesce(p_attempts, '[]'::jsonb)) = 'array'
                              then jsonb_array_length(p_attempts) else 1 end);
  v_att jsonb;
  v_q record;
  v_correct boolean;
  v_text text;
  v_expected boolean;
  v_choice jsonb;
  v_typed boolean;
  v_taught boolean;
begin
  if auth.role() <> 'service_role' then
    if v_ip is not null
       and (practice.check_rate_limit('sba_ip_calls:' || v_ip, 400, 3600) < 0
         or practice.check_rate_limit_weighted('sba_ip:' || v_ip, v_n, 30000, 3600) < 0) then
      raise exception 'rate_limited' using errcode = 'PT429';
    end if;
    if auth.uid() is not null then
      if practice.check_rate_limit('sba_uid_calls:' || v_uid, 200, 3600) < 0
         or practice.check_rate_limit_weighted('sba_uid:' || v_uid, v_n, 800, 3600) < 0 then
        raise exception 'rate_limited' using errcode = 'PT429';
      end if;
    elsif practice.check_rate_limit('sba_guest_calls', 400, 3600) < 0
       or practice.check_rate_limit_weighted('sba_guest', v_n, 2000, 3600) < 0 then
      raise exception 'rate_limited' using errcode = 'PT429';
    end if;
  end if;

  if jsonb_typeof(p_attempts) is distinct from 'array' then
    return;
  end if;

  for v_att in select * from jsonb_array_elements(p_attempts)
  loop
    select id, question_type, choices, answer, explanation_vi
      into v_q
      from practice.qb_questions
      where id = v_att->>'question_id';
    if not found then
      return query select jsonb_build_object(
        'question_id', v_att->>'question_id',
        'correct', false, 'correct_answer', null,
        'correct_answer_text', null, 'explanation_vi', null);
      continue;
    end if;

    -- CR-106: tag taught rows. Grading still runs (fixed-form sittings
    -- must not lose scored items); the flag lets the client mark the
    -- attempt ungraded.
    v_taught := auth.uid() is not null and exists (
      select 1 from practice.taught_marks tm
      where tm.account_id = auth.uid() and tm.question_id = v_q.id);

    v_correct := false;
    v_text := null;
    v_typed := false;
    case v_q.question_type
      when 'mcq', 'image-to-word-mcq', 'word-to-image-mcq', 'visual-mcq', 'visual-count-mcq' then
        v_typed := jsonb_typeof(v_att->'response'->'index') = 'number';
        v_correct := v_typed and (v_att->'response'->>'index')::int = (v_q.answer->>'index')::int;
        v_choice := v_q.choices -> ((v_q.answer->>'index')::int);
        v_text := case jsonb_typeof(v_choice)
          when 'object' then coalesce(v_choice->>'text', v_choice->>'label', v_choice->>'word', v_choice->>'assetId')
          else btrim(v_choice::text, '"') end;
      when 'true-false' then
        v_typed := jsonb_typeof(v_att->'response'->'bool') = 'boolean';
        v_expected := coalesce(
          (v_q.answer->>'boolean')::boolean,
          case when v_q.answer ? 'text'
               then lower(v_q.answer->>'text') = 'true' end,
          case when v_q.choices->>0 = 'True' and v_q.choices->>1 = 'False'
               then (v_q.answer->>'index')::int = 0 end);
        v_correct := v_typed and (v_att->'response'->>'bool')::boolean = v_expected;
        v_text := case when v_expected then 'True' else 'False' end;
      when 'text-answer' then
        v_typed := jsonb_typeof(v_att->'response'->'text') = 'string';
        v_correct := v_typed and (
          (practice.bank_norm_answer(v_att->'response'->>'text')
            = practice.bank_norm_answer(v_q.answer->>'text')) is true
          or exists (
            select 1 from jsonb_array_elements_text(
              coalesce(v_q.answer->'accepted', '[]'::jsonb)) x
            where (practice.bank_norm_answer(x)
                  = practice.bank_norm_answer(v_att->'response'->>'text')) is true)
        );
        v_text := coalesce(v_q.answer->>'text', v_q.answer->'accepted'->>0);
      when 'reorder' then
        -- typed = string text OR a picked array (presence alone is not
        -- enough: {"text":null} / {"text":false} must NOT pass the gate).
        v_typed := jsonb_typeof(v_att->'response'->'text') = 'string'
                or jsonb_typeof(v_att->'response'->'picked') = 'array';
        v_correct := v_typed and (practice.bank_norm(
                       coalesce(v_att->'response'->>'text',
                         (select string_agg(x.word, ' ' order by x.ord)
                            from jsonb_array_elements_text(
                              coalesce(v_att->'response'->'picked', '[]'::jsonb))
                            with ordinality as x(word, ord))))
                     = practice.bank_norm(v_q.answer->>'text')) is true;
        v_text := v_q.answer->>'text';
      else
        v_correct := false;
    end case;

    return query select jsonb_build_object(
      'question_id', v_q.id,
      'correct', coalesce(v_correct, false),
      'correct_answer', case when v_typed then v_q.answer else null end,
      'correct_answer_text', v_text,
      'explanation_vi', v_q.explanation_vi,
      'taught', v_taught);
  end loop;
  return;
end;
$function$;

revoke all on function practice.score_bank_attempts(jsonb) from public;
grant execute on function practice.score_bank_attempts(jsonb) to anon, authenticated, service_role;
