-- CR-58 + CR-59: skill-targeted + difficulty-filtered question fetch.
-- p_skill text -> p_skills text[] (bucket UI gom nhieu qb skill);
-- p_min_difficulty smallint -> tang nang cao (difficulty >= N).
-- Doi signature nen drop + recreate; grant lai nguyen trang.

drop function if exists practice.fetch_questions(smallint, text, int, text, text);
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
      and case when p_mode = 'mock'
            then (q.publication_policy->>'mockEligible')::boolean
            else (q.publication_policy->>'practiceEligible')::boolean
          end
    order by coalesce(q.variant_group_id, q.id), random()
  ) t
  order by random()
  limit p_count;
$$;

grant execute on function practice.fetch_questions(smallint, text, int, text, text[], smallint) to authenticated;

drop function if exists practice.fetch_questions_public(smallint, text, int);
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
    order by coalesce(q.variant_group_id, q.id), random()
  ) t
  order by random()
  limit p_count;
$$;

revoke all on function practice.fetch_questions_public(smallint, text, int, text[], smallint) from public;
grant execute on function practice.fetch_questions_public(smallint, text, int, text[], smallint) to anon, authenticated;

-- CR-59 tooling grant: the authored-advanced pipeline (scripts/gen-advanced-bank.mjs
-- --push) inserts via PostgREST as service_role. Data writers need explicit grants
-- on the practice schema tables; read paths were unaffected.
grant insert, update on practice.qb_questions to service_role;
