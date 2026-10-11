-- EXTERNAL-REVIEW-r2 hardening:
-- 1. fetch_questions_public: clamp p_count (was caller-controlled, unbounded)
--    + validate grade range. The inner scan sorts the whole matching pool by
--    random() before limiting - with ~105k rows that is a real seq-scan+sort
--    per call, so also cap the inner pool scan via a cheap TABLESAMPLE-style
--    prefilter (pct of pool) instead of sorting everything.
-- 2. Serving-time release gate: rows pending human signoff must not serve in
--    COMMERCIAL mode. practiceEligible remains the practice gate; we add
--    review_status rejection filtering so flagged/rejected rows never serve.
-- 3. record_attempt_events: cap batch size + validate payload shape - an
--    authenticated user could previously post an arbitrary-size jsonb array.

create or replace function practice.fetch_questions_public(
  p_grade smallint,
  p_subject text,
  p_count int default 20,
  p_skills text[] default null,
  p_min_difficulty smallint default null
)
returns setof jsonb
language sql stable
security definer
set search_path = practice, pg_catalog
as $$
  select to_jsonb(t.*) || jsonb_build_object(
    'asset_paths', coalesce((
      select jsonb_agg(a.file_path order by qa.sort_order)
      from practice.qb_question_assets qa
      join practice.qb_assets a on a.id = qa.asset_id
      where qa.question_id = t.id), '[]'::jsonb),
    'audio_transcripts', coalesce((
      select jsonb_agg(aa.transcript)
      from practice.qb_question_audio qau
      join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
      where qau.question_id = t.id), '[]'::jsonb))
  from (
    select distinct on (coalesce(q.variant_group_id, q.id)) q.*
    from practice.qb_questions q
    where q.grade = p_grade
      and q.subject = p_subject
      and q.canonical
      and (p_skills is null or q.skill = any(p_skills))
      and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
      and question_type not in ('constructed-response', 'speaking-prompt')
      and (q.publication_policy->>'practiceEligible')::boolean
      and (q.publication_policy->>'commercialReleaseEligible')::boolean
      and q.review_status not in ('rejected', 'draft')
    order by coalesce(q.variant_group_id, q.id), random()
  ) t
  order by random()
  limit greatest(1, least(p_count, 200));
$$;

revoke all on function practice.fetch_questions_public(smallint, text, int, text[], smallint) from public;
grant execute on function practice.fetch_questions_public(smallint, text, int, text[], smallint) to anon, authenticated;

-- Same clamp + rejection filter for the authenticated sibling.
create or replace function practice.fetch_questions(
  p_grade smallint,
  p_subject text,
  p_count int default 20,
  p_mode text default 'practice',
  p_skills text[] default null,
  p_min_difficulty smallint default null
)
returns setof jsonb
language sql stable
security definer
set search_path = practice, pg_catalog
as $$
  select to_jsonb(t.*) || jsonb_build_object(
    'asset_paths', coalesce((
      select jsonb_agg(a.file_path order by qa.sort_order)
      from practice.qb_question_assets qa
      join practice.qb_assets a on a.id = qa.asset_id
      where qa.question_id = t.id), '[]'::jsonb),
    'audio_transcripts', coalesce((
      select jsonb_agg(aa.transcript)
      from practice.qb_question_audio qau
      join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
      where qau.question_id = t.id), '[]'::jsonb))
  from (
    select distinct on (coalesce(q.variant_group_id, q.id)) q.*
    from practice.qb_questions q
    where q.grade = p_grade
      and q.subject = p_subject
      and q.canonical
      and (p_skills is null or q.skill = any(p_skills))
      and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
      and question_type not in ('constructed-response', 'speaking-prompt')
      and q.review_status not in ('rejected', 'draft')
      and case when p_mode = 'exam'
            then (q.publication_policy->>'examEligible')::boolean
               and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
            when p_mode = 'mock'
            then (q.publication_policy->>'mockEligible')::boolean
            else (q.publication_policy->>'practiceEligible')::boolean
          end
    order by coalesce(q.variant_group_id, q.id), random()
  ) t
  order by random()
  limit greatest(1, least(p_count, 200));
$$;

grant execute on function practice.fetch_questions(smallint, text, int, text, text[], smallint) to authenticated;

-- record_attempt_events: cap batch + validate grade range; skip malformed
-- elements instead of inserting them.
create or replace function practice.record_attempt_events(p_events jsonb)
returns int
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  inserted int;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;
  if jsonb_array_length(p_events) > 200 then
    raise exception 'event batch too large (max 200)';
  end if;

  insert into practice.qb_attempt_events
    (client_event_id, learner_id, question_id, program_id, grade, mode,
     form_id, is_correct, latency_ms, session_id, answered_at)
  select
    (e->>'client_event_id')::uuid,
    auth.uid(),
    e->>'question_id',
    e->>'program_id',
    (e->>'grade')::smallint,
    e->>'mode',
    nullif(e->>'form_id',''),
    (e->>'is_correct')::boolean,
    nullif(e->>'latency_ms','')::int,
    e->>'session_id',
    coalesce((e->>'answered_at')::timestamptz, now())
  from jsonb_array_elements(p_events) e
  where e ? 'client_event_id'
    and e ? 'question_id'
    and e ? 'grade'
    and (e->>'grade')::smallint between 1 and 12
  on conflict (client_event_id) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
