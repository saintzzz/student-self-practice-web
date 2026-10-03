-- CR-48 Phase 2: question-serving layer.
-- fetch_questions: random sample ton trong publicationPolicy +
--   variantGroupId (khong lap bien the trong 1 fetch) +
--   loai rubric-type (constructed-response, speaking-prompt) khoi pool
--   auto-score.
-- fetch_form: tra danh sach cau dung thu tu cua assessment form V6.
-- Ca hai tra jsonb = row qb_questions + asset_paths (file_path theo
--   sort_order) + audio_transcripts (transcript canonical - app dung
--   TTS runtime, khong import WAV).
-- SECURITY INVOKER - select policy qb_questions_select da mo cho
-- authenticated; RPC khong leo quyen.

create or replace function practice.fetch_questions(
  p_grade smallint,
  p_subject text,
  p_count int default 20,
  p_mode text default 'practice',
  p_skill text default null
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
      and (p_skill is null or q.skill = p_skill)
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

create or replace function practice.fetch_form(p_form_id text)
returns setof jsonb
language sql stable
as $$
  select to_jsonb(q.*) || jsonb_build_object(
    'asset_paths', coalesce((
      select jsonb_agg(a.file_path order by qa.sort_order)
      from practice.qb_question_assets qa
      join practice.qb_assets a on a.id = qa.asset_id
      where qa.question_id = q.id), '[]'::jsonb),
    'audio_transcripts', coalesce((
      select jsonb_agg(aa.transcript)
      from practice.qb_question_audio qau
      join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
      where qau.question_id = q.id), '[]'::jsonb))
  from practice.qb_exam_forms f
  cross join lateral jsonb_array_elements_text(f.payload->'questionIds')
       with ordinality as ids(qid, ord)
  join practice.qb_questions q on q.id = ids.qid
  where f.id = p_form_id
  order by ids.ord;
$$;

grant execute on function practice.fetch_questions(smallint, text, int, text, text) to authenticated;
grant execute on function practice.fetch_form(text) to authenticated;
