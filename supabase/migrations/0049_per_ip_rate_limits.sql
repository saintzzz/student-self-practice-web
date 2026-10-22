-- Per-IP rate limits on the public bank surfaces.
--
-- Threat fixed: the guest caps added in 0044/0046 are GLOBAL shared pools
-- (`fq_pub_calls` 300/hr, `sba_guest` 2000 attempts/hr). One scraper IP
-- burns the whole shared pool (denial-of-wallet for real guests) AND gets
-- the full 8000 rows/hr fetch budget from a single address. Per-uid caps
-- do not help: guest traffic is all `anon`.
--
-- Fix: bucket by client IP from the PostgREST request.headers GUC. The
-- LAST x-forwarded-for entry is used - the edge appends the real TCP peer
-- after any client-supplied (spoofable) prefix. Caps are sized so an
-- honest classroom behind one school NAT fits (~30 kids = ~30 fetches +
-- ~700 score attempts/hr) while a single-IP scraper is cut to a fraction
-- of the old budget. Global pools stay as the multi-IP backstop. Per-IP
-- buckets are checked FIRST so a blocked IP stops consuming the shared
-- pool immediately.
--
-- This is the self-hostable equivalent of the deferred Turnstile gate:
-- no external account, pure SQL, zero client changes.

create or replace function practice.client_ip()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_headers jsonb;
  v_xff text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    return null;
  end;
  v_xff := v_headers ->> 'x-forwarded-for';
  if v_xff is null or btrim(v_xff) = '' then
    return null;
  end if;
  -- last entry = the IP the edge appended (real peer); earlier entries may
  -- be client-spoofed. PG >= 14 supports negative split_part index.
  return btrim(split_part(v_xff, ',', -1));
end;
$function$;

revoke all on function practice.client_ip() from public, anon, authenticated;

-- fetch_questions_public: per-IP ceiling runs FIRST, then the global
-- pool. 60 calls + 2500 rows/IP/hr: a whole classroom fits, a scraper
-- gets ~1/3 of the old single-IP budget.
create or replace function practice.fetch_questions_public(
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
  v_ip text := practice.client_ip();
  v_rows int := greatest(1, least(p_count, 200));
begin
  -- fail-open: no XFF (non-PostgREST path) -> skip per-IP, global pool
  -- still applies, never worse than the pre-0049 state.
  if v_ip is not null
     and (practice.check_rate_limit('fq_ip_calls:' || v_ip, 60, 3600) < 0
       or practice.check_rate_limit_weighted('fq_ip_rows:' || v_ip, v_rows, 2500, 3600) < 0) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  if practice.check_rate_limit('fq_pub_calls', 300, 3600) < 0
     or practice.check_rate_limit_weighted('fq_pub_rows', v_rows, 8000, 3600) < 0 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  -- CR-102: keyless rows - strip_bank_row removes answer + explanation_vi.
  return query
    select practice.strip_bank_row(j)
    from practice.fetch_questions_public__impl(
      p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j;
end;
$function$;

-- fetch_questions: same shared per-IP buckets (fq_ip_*) so an attacker
-- cannot split budget across the two fetch surfaces. Authed callers keep
-- their per-uid caps on top. (Body verbatim from 0044 - only the v_ip
-- preamble was added.)
create or replace function practice.fetch_questions(
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
  v_ip text := practice.client_ip();
  v_rows int := greatest(1, least(p_count, 200));
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
  -- CR-102: keyless rows - strip_bank_row removes answer + explanation_vi.
  return query
    select practice.strip_bank_row(j)
    from practice.fetch_questions__impl(
      p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j;
end;
$function$;

-- score_bank_attempts: guest bucket gains a per-IP layer (sba_ip_*) ahead
-- of the shared guest pool; authed callers keep per-uid caps plus the
-- same per-IP ceiling to brake account-farm scraping. 200 calls + 1500
-- attempts/IP/hr fits ~30 kids on one NAT. Body is otherwise VERBATIM
-- from the deployed version (0046 + 0048 fixes) - only the preamble and
-- the v_ip declaration changed.
create or replace function practice.score_bank_attempts(p_attempts jsonb)
returns setof jsonb
language plpgsql
security definer
set search_path = 'practice', 'pg_catalog'
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
begin
  if auth.role() <> 'service_role' then
    if v_ip is not null
       and (practice.check_rate_limit('sba_ip_calls:' || v_ip, 200, 3600) < 0
         or practice.check_rate_limit_weighted('sba_ip:' || v_ip, v_n, 1500, 3600) < 0) then
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
      'explanation_vi', v_q.explanation_vi);
  end loop;
  return;
end;
$function$;

grant execute on function practice.fetch_questions_public(smallint, text, integer, text[], smallint, text)
  to anon, authenticated, service_role;
grant execute on function practice.fetch_questions(smallint, text, integer, text[], smallint, text)
  to authenticated, service_role;
grant execute on function practice.score_bank_attempts(jsonb)
  to anon, authenticated, service_role;
