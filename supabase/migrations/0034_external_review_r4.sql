-- EXTERNAL-REVIEW-r4 fixes
-- 1. anon needs USAGE on schema practice so fetch_questions_public works on
--    a fresh migration replay (r4: deployed manual grants masked this).
-- 2. qb_item_stats: authenticated select grant used by ReviewQueueCard.
-- 3. fetch_questions_public: the public surface IS the commercial product -
--    only rows whose commercial approval flag was cleared may serve.
--    Two-pass sampling: a fixed random()<0.35 prefilter starves small pools
--    (a 1-row pool returns nothing 65% of calls). Pass 1 samples 35%; if
--    fewer than requested rows came back, pass 2 tops up without the
--    prefilter, excluding ids already returned.
-- 4. fetch_questions: same two-pass + restored question_type exclusion.
-- 5. record_attempt_events: per-element insert - one malformed event can no
--    longer roll back the other 199 in a batch.

grant usage on schema practice to anon;
grant select on practice.qb_item_stats to authenticated;

create or replace function practice.fetch_questions_public(
  p_grade smallint,
  p_subject text,
  p_count int default 20,
  p_skills text[] default null,
  p_min_difficulty smallint default null,
  p_mode text default 'practice'
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = practice, pg_catalog
as $$
declare
  n int := greatest(1, least(p_count, 200));
  got int := 0;
  seen text[] := '{}';
  rec record;
begin
  for rec in
    select t.* from (
      select distinct on (coalesce(q.variant_group_id, q.id)) q.*
      from practice.qb_questions q
      where q.grade = p_grade
        and q.subject = p_subject
        and q.canonical
        and (p_skills is null or q.skill = any(p_skills))
        and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
        and question_type not in ('constructed-response', 'speaking-prompt')
        and q.review_status not in ('rejected', 'draft')
        and (q.publication_policy->>'commercialReleaseEligible')::boolean
        and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
        and case when p_mode in ('mock','exam')
              then (q.publication_policy->>'mockEligible')::boolean
                 and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
              else (q.publication_policy->>'practiceEligible')::boolean
            end
        and random() < 0.35
      order by coalesce(q.variant_group_id, q.id), random()
    ) t
    order by random()
    limit n
  loop
    got := got + 1;
    seen := seen || rec.id;
    return next to_jsonb(rec) || jsonb_build_object(
      'asset_paths', coalesce((
        select jsonb_agg(a.file_path order by qa.sort_order)
        from practice.qb_question_assets qa
        join practice.qb_assets a on a.id = qa.asset_id
        where qa.question_id = rec.id), '[]'::jsonb),
      'audio_transcripts', coalesce((
        select jsonb_agg(aa.transcript)
        from practice.qb_question_audio qau
        join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
        where qau.question_id = rec.id), '[]'::jsonb));
  end loop;

  if got < n then
    for rec in
      select t.* from (
        select distinct on (coalesce(q.variant_group_id, q.id)) q.*
        from practice.qb_questions q
        where q.grade = p_grade
          and q.subject = p_subject
          and q.canonical
          and (p_skills is null or q.skill = any(p_skills))
          and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
          and question_type not in ('constructed-response', 'speaking-prompt')
          and (q.publication_policy->>'commercialReleaseEligible')::boolean
          and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
          and case when p_mode in ('mock','exam')
                then (q.publication_policy->>'mockEligible')::boolean
                   and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
                else (q.publication_policy->>'practiceEligible')::boolean
              end
          and q.review_status not in ('rejected', 'draft')
          and not (q.id = any(seen))
        order by coalesce(q.variant_group_id, q.id), random()
      ) t
      order by random()
      limit n - got
    loop
      return next to_jsonb(rec) || jsonb_build_object(
        'asset_paths', coalesce((
          select jsonb_agg(a.file_path order by qa.sort_order)
          from practice.qb_question_assets qa
          join practice.qb_assets a on a.id = qa.asset_id
          where qa.question_id = rec.id), '[]'::jsonb),
        'audio_transcripts', coalesce((
          select jsonb_agg(aa.transcript)
          from practice.qb_question_audio qau
          join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
          where qau.question_id = rec.id), '[]'::jsonb));
    end loop;
  end if;
  return;
end;
$$;
revoke all on function practice.fetch_questions_public(smallint, text, int, text[], smallint, text) from public;
grant execute on function practice.fetch_questions_public(smallint, text, int, text[], smallint, text)
  to anon, authenticated, service_role;
-- the old 5-arg signature must not linger with different behaviour
drop function if exists practice.fetch_questions_public(smallint, text, int, text[], smallint);

create or replace function practice.fetch_questions(
  p_grade smallint,
  p_subject text,
  p_count int default 20,
  p_mode text default 'practice',
  p_skills text[] default null,
  p_min_difficulty smallint default null
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = practice, pg_catalog
as $$
declare
  n int := greatest(1, least(p_count, 200));
  got int := 0;
  seen text[] := '{}';
  rec record;
begin
  for rec in
    select t.* from (
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
                 and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
              else (q.publication_policy->>'practiceEligible')::boolean
            end
        and random() < 0.35
      order by coalesce(q.variant_group_id, q.id), random()
    ) t
    order by random()
    limit n
  loop
    got := got + 1;
    seen := seen || rec.id;
    return next to_jsonb(rec) || jsonb_build_object(
      'asset_paths', coalesce((
        select jsonb_agg(a.file_path order by qa.sort_order)
        from practice.qb_question_assets qa
        join practice.qb_assets a on a.id = qa.asset_id
        where qa.question_id = rec.id), '[]'::jsonb),
      'audio_transcripts', coalesce((
        select jsonb_agg(aa.transcript)
        from practice.qb_question_audio qau
        join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
        where qau.question_id = rec.id), '[]'::jsonb));
  end loop;

  if got < n then
    for rec in
      select t.* from (
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
                   and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
                else (q.publication_policy->>'practiceEligible')::boolean
              end
          and not (q.id = any(seen))
        order by coalesce(q.variant_group_id, q.id), random()
      ) t
      order by random()
      limit n - got
    loop
      return next to_jsonb(rec) || jsonb_build_object(
        'asset_paths', coalesce((
          select jsonb_agg(a.file_path order by qa.sort_order)
          from practice.qb_question_assets qa
          join practice.qb_assets a on a.id = qa.asset_id
          where qa.question_id = rec.id), '[]'::jsonb),
        'audio_transcripts', coalesce((
          select jsonb_agg(aa.transcript)
          from practice.qb_question_audio qau
          join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
          where qau.question_id = rec.id), '[]'::jsonb));
    end loop;
  end if;
  return;
end;
$$;
revoke all on function practice.fetch_questions(smallint, text, int, text, text[], smallint)
  from public, anon;
grant execute on function practice.fetch_questions(smallint, text, int, text, text[], smallint)
  to authenticated, service_role;

-- per-element insert: a malformed event skips instead of rolling back the
-- whole batch; valid neighbours still land.
create or replace function practice.record_attempt_events(p_events jsonb)
returns int
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  inserted int := 0;
  rc int;
  e jsonb;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;
  if jsonb_array_length(p_events) > 200 then
    raise exception 'event batch too large (max 200)';
  end if;

  for e in select value from jsonb_array_elements(p_events) loop
    begin
      if e->>'client_event_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         or e->>'grade' !~ '^[1-5]$'
         or e->>'question_id' is null then
        continue;
      end if;
      insert into practice.qb_attempt_events
        (client_event_id, learner_id, question_id, program_id, grade, mode,
         form_id, is_correct, latency_ms, session_id, answered_at)
      values (
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
        coalesce((e->>'answered_at')::timestamptz, now()))
      on conflict (client_event_id) do nothing;
      get diagnostics rc = row_count;
      inserted := inserted + rc;
    exception when others then
      continue;
    end;
  end loop;
  return inserted;
end;
$$;
revoke all on function practice.record_attempt_events(jsonb) from public, anon;
grant execute on function practice.record_attempt_events(jsonb) to authenticated, service_role;

-- verification pipeline tables are service_role-only; RLS ON with no
-- policies denies anon/authenticated while service_role bypasses RLS.
alter table practice.qb_verify_todo enable row level security;
alter table practice.qb_verify_verdicts enable row level security;
alter table practice.qa_tokens enable row level security;
