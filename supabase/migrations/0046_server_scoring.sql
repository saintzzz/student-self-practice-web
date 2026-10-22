-- CR-102: server-side scoring - the real anti-scrape moat.
--
-- Until now every bank fetch shipped `answer` + `explanation_vi` in the
-- row payload - the curated answer keys were the scrapeable asset. This
-- migration strips them from every fetch surface and adds a rate-limited
-- scoring oracle: the verdict is computed in the DB, and the only key
-- material that ever leaves is per-attempt disclosure (which the review
-- screen needs pedagogically anyway).
--
-- Surfaces closed: fetch_questions, fetch_questions_public (wrapper
-- bodies replaced - same rate budgets as 0044), fetch_form,
-- assignment_form (both renamed to *__impl + revoked, re-wrapped).
--
-- Deliberate exception: `reorder` rows KEEP `answer` - the client runs
-- isWordOrderCorrect (grammar-aware: adjunct fronting, inversion,
-- conjunct swap) which cannot be re-implemented in SQL. A reorder
-- "answer" is just a correct sentence, not a choice key - low standalone
-- value, and a tiny fraction of the bank.
--
-- Oracle economics: extracting one MCQ key costs up to 4 guess calls;
-- at the caps below a full-bank key drain takes orders of magnitude
-- longer than the 150 calls it took before 0044.

-- ---------- rename + lock the form fetchers ----------
alter function practice.fetch_form(text) rename to fetch_form__impl;
alter function practice.assignment_form(uuid) rename to assignment_form__impl;

revoke all on function practice.fetch_form__impl(text)
  from public, anon, authenticated;
revoke all on function practice.assignment_form__impl(uuid)
  from public, anon, authenticated;

-- ---------- answer stripper ----------
create or replace function practice.strip_bank_row(j jsonb)
returns jsonb
language sql
immutable
as $function$
  select case when j->>'question_type' = 'reorder'
    then j - 'explanation_vi'
    else j - 'answer' - 'explanation_vi'
  end
$function$;

revoke all on function practice.strip_bank_row(jsonb)
  from public, anon, authenticated;

-- ---------- re-wrap the question fetchers (same budgets as 0044) ----------
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
begin
  if practice.check_rate_limit('fq_pub_calls', 300, 3600) < 0
     or practice.check_rate_limit_weighted(
          'fq_pub_rows', greatest(1, least(p_count, 200)), 8000, 3600) < 0 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  return query
    select practice.strip_bank_row(j)
    from practice.fetch_questions_public__impl(
      p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j;
end;
$function$;

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
begin
  if auth.role() = 'service_role' then
    return query
      select practice.strip_bank_row(j)
      from practice.fetch_questions__impl(
        p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j;
    return;
  end if;
  if practice.check_rate_limit('fq_uid_calls:' || v_uid, 60, 3600) < 0
     or practice.check_rate_limit_weighted(
          'fq_uid_rows:' || v_uid, greatest(1, least(p_count, 200)), 4000, 3600) < 0 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  return query
    select practice.strip_bank_row(j)
    from practice.fetch_questions__impl(
      p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j;
end;
$function$;

-- ---------- re-wrap the form fetchers ----------
create function practice.fetch_form(p_form_id text)
returns setof jsonb
language plpgsql
security definer
set search_path to 'practice', 'pg_catalog'
as $function$
declare
  v_uid text := coalesce(auth.uid()::text, 'anon');
begin
  if auth.role() <> 'service_role'
     and practice.check_rate_limit('ff_calls:' || v_uid, 60, 3600) < 0 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  return query
    select practice.strip_bank_row(j) from practice.fetch_form__impl(p_form_id) j;
end;
$function$;

create function practice.assignment_form(p_assignment_id uuid)
returns setof jsonb
language plpgsql
security definer
set search_path to 'practice', 'pg_catalog'
as $function$
declare
  v_uid text := coalesce(auth.uid()::text, 'anon');
begin
  if auth.role() <> 'service_role'
     and practice.check_rate_limit('af_calls:' || v_uid, 60, 3600) < 0 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  return query
    select practice.strip_bank_row(j) from practice.assignment_form__impl(p_assignment_id) j;
end;
$function$;

grant execute on function practice.fetch_form(text)
  to anon, authenticated, service_role;
grant execute on function practice.assignment_form(uuid)
  to authenticated, service_role;

-- ---------- client-equivalent normalizers ----------
-- Mirrors examSession.normalize: lower, punctuation -> space, collapse
-- whitespace, fold number words 0-10 into digits.
create or replace function practice.bank_norm(s text)
returns text
language sql
immutable
as $function$
  select btrim(regexp_replace(regexp_replace(
    lower(coalesce(s, '')),
    '[.,!?;:''"’`\-]', ' ', 'g'), '\s+', ' ', 'g'))
$function$;

create or replace function practice.bank_norm_answer(s text)
returns text
language plpgsql
immutable
as $function$
declare
  v_norm text := practice.bank_norm(s);
  v_words text[] := string_to_array(v_norm, ' ');
  v_map jsonb := '{"zero":"0","one":"1","two":"2","three":"3","four":"4","five":"5","six":"6","seven":"7","eight":"8","nine":"9","ten":"10"}'::jsonb;
begin
  return (
    select string_agg(coalesce(v_map->>w, w), '')
    from unnest(v_words) w
  );
end;
$function$;

revoke all on function practice.bank_norm(text) from public, anon, authenticated;
revoke all on function practice.bank_norm_answer(text) from public, anon, authenticated;

-- ---------- the scoring oracle ----------
-- p_attempts = [{"question_id": "...", "response": {...}}]
--   response shapes: {"index": n} | {"bool": b} | {"text": "..."}
-- Returns per attempt: {question_id, correct, correct_answer,
--   correct_answer_text, explanation_vi}.
create or replace function practice.score_bank_attempts(p_attempts jsonb)
returns setof jsonb
language plpgsql
security definer
set search_path to 'practice', 'pg_catalog'
as $function$
declare
  v_uid text := coalesce(auth.uid()::text, 'anon');
  v_n int := greatest(1, case when jsonb_typeof(coalesce(p_attempts, '[]'::jsonb)) = 'array'
                              then jsonb_array_length(p_attempts) else 1 end);
  v_att jsonb;
  v_q record;
  v_correct boolean;
  v_text text;
  v_expected boolean;
  v_choice jsonb;
begin
  if auth.role() <> 'service_role' then
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
    case v_q.question_type
      when 'mcq', 'image-to-word-mcq', 'word-to-image-mcq', 'visual-mcq', 'visual-count-mcq' then
        v_correct := coalesce((v_att->'response'->>'index')::int, -1)
                     = (v_q.answer->>'index')::int;
        v_choice := v_q.choices -> ((v_q.answer->>'index')::int);
        v_text := case jsonb_typeof(v_choice)
          when 'object' then coalesce(v_choice->>'text', v_choice->>'label', v_choice->>'word', v_choice->>'assetId')
          else btrim(v_choice::text, '"') end;
      when 'true-false' then
        v_expected := coalesce(
          (v_q.answer->>'boolean')::boolean,
          lower(coalesce(v_q.answer->>'text', '')) = 'true',
          (v_q.choices->>0 = 'True' and (v_q.answer->>'index')::int = 0));
        v_correct := (v_att->'response'->>'bool')::boolean = v_expected;
        v_text := case when v_expected then 'True' else 'False' end;
      when 'text-answer' then
        v_correct := practice.bank_norm_answer(v_att->'response'->>'text')
                     in (
                       practice.bank_norm_answer(v_q.answer->>'text'),
                       (select practice.bank_norm_answer(x)
                          from jsonb_array_elements_text(
                            coalesce(v_q.answer->'accepted', '[]'::jsonb)) x)
                     );
        v_text := coalesce(v_q.answer->>'text', v_q.answer->'accepted'->>0);
      when 'reorder' then
        -- Client-side isWordOrderCorrect is authoritative for semantic
        -- alternates; this branch only fires on the exact order.
        v_correct := practice.bank_norm(
                       coalesce(v_att->'response'->>'text',
                         (select string_agg(x.word, ' ' order by x.ord)
                            from jsonb_array_elements_text(
                              coalesce(v_att->'response'->'picked', '[]'::jsonb))
                            with ordinality as x(word, ord))))
                     = practice.bank_norm(v_q.answer->>'text');
        v_text := v_q.answer->>'text';
      else
        v_correct := false;
    end case;

    return query select jsonb_build_object(
      'question_id', v_q.id,
      'correct', v_correct,
      'correct_answer', v_q.answer,
      'correct_answer_text', v_text,
      'explanation_vi', v_q.explanation_vi);
  end loop;
  return;
end;
$function$;

grant execute on function practice.score_bank_attempts(jsonb)
  to anon, authenticated, service_role;
