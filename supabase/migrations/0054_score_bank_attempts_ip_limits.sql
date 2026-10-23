-- CR-106 review r107: 0052's CREATE OR REPLACE of score_bank_attempts
-- silently dropped the per-IP rate-limit layer added in 0049
-- (sba_ip_calls / sba_ip). Multiple accounts sharing one NAT (a real
-- classroom) could then pool their per-uid budgets and extract far more
-- answer keys than intended. Re-apply the function with the IP block
-- restored verbatim from 0049, keeping the taught tag from 0052.
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
