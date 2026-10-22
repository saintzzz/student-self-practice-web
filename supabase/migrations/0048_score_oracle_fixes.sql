-- CR-102 r99 follow-up: oracle correctness + disclosure tightening.
--
-- 1. text-answer scoring used a SCALAR subquery inside IN(...) - rows
--    with >=2 accepted alternatives errored the whole batch. Fixed with
--    EXISTS over accepted + the primary text.
-- 2. true-false expected-bool: the text branch returned FALSE for a
--    missing answer->>'text' (coalesce('','')='true' is non-null false),
--    so the validated choices/index fallback never ran - index-only keys
--    scored inverted. Text branch now yields NULL unless text exists.
-- 3. NULL poisoning: missing answer keys (e.g. no ->>'text') made
--    comparisons NULL, and `v_typed AND NULL` leaked NULL verdicts.
--    Comparisons now use IS TRUE and the final verdict is coalesced.
-- 4. Structured key disclosure (correct_answer) now requires a
--    type-appropriate response. An empty/mistyped attempt still gets a
--    verdict + correct_answer_text + explanation_vi (skipped questions
--    need them on the review sheet) but NOT the structured blob - the
--    richer leak (accepted[] variants, index values) requires a real
--    typed attempt. Honest economics: disclosure is ~1 scored call per
--    key regardless; the binding defense is the rate cap.

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
  v_typed boolean;
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

revoke all on function practice.score_bank_attempts(jsonb) from public;
grant execute on function practice.score_bank_attempts(jsonb) to anon, authenticated, service_role;
